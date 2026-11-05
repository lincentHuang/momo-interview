import { CARD_SCHEMA_VERSION, parseCard, type CardInput } from "../schema/card.schema";
import { migrateCard } from "../schema/migrate";
import { shouldReplace } from "./merge";
import type { CardRecord, CardRuntimeState, StoreSnapshot, SyncChannel, SyncMessage } from "./types";

export const DEFAULT_STORAGE_KEY = "momo-card:store";
export const DEFAULT_CHANNEL_NAME = "momo-card:sync";

const EMPTY_STATE: CardRuntimeState = { favorite: false, cartQty: 0 };

interface PersistedSnapshot {
  schemaVersion: number;
  records: Record<string, unknown>;
}

export interface CardStoreOptions {
  storageKey?: string;
  channelName?: string;
  /** 儲存區為空時的種子資料；同時作為 resetCard 的還原來源 */
  seed?: () => CardInput[];
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
  channel?: SyncChannel | null;
  /** 監聽 storage event 的 window（BroadcastChannel 不可用時的備援） */
  eventTarget?: Pick<Window, "addEventListener" | "removeEventListener"> | null;
  origin?: string;
  now?: () => number;
}

export type UpsertResult = { ok: true; record: CardRecord } | { ok: false; issues: Array<{ path: string; message: string }> };

export interface CardStore {
  getSnapshot(): StoreSnapshot;
  get(id: string): CardRecord | undefined;
  /** 寫入卡片設定（會經過 schema 驗證，不合法則拒絕寫入） */
  upsertCard(input: unknown): UpsertResult;
  updateState(id: string, patch: Partial<CardRuntimeState>): void;
  resetCard(id: string): void;
  resetAll(): void;
  subscribe(listener: () => void): () => void;
  readonly origin: string;
  destroy(): void;
}

function randomOrigin(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function defaultStorage(): Pick<Storage, "getItem" | "setItem"> | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // Safari 隱私模式 / sandbox iframe 可能直接 throw
  }
}

function defaultChannel(name: string): SyncChannel | null {
  return typeof BroadcastChannel === "undefined" ? null : (new BroadcastChannel(name) as unknown as SyncChannel);
}

/**
 * 跨分頁 / 跨宿主的卡片狀態 Store
 *
 *   寫入： validate → rev+1 → 記憶體 → read-merge-write localStorage → BroadcastChannel 廣播
 *   接收： BroadcastChannel（即時）＋ storage event（備援）→ 版本遷移 → validate → LWW 合併
 *
 * 所有外部資料進入前都經過 migrate + parseCard，壞資料只會被丟棄，不會讓 UI 掛掉。
 */
export function createCardStore(options: CardStoreOptions = {}): CardStore {
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const channel = options.channel === undefined ? defaultChannel(options.channelName ?? DEFAULT_CHANNEL_NAME) : options.channel;
  const eventTarget = options.eventTarget === undefined ? (typeof window === "undefined" ? null : window) : options.eventTarget;
  const origin = options.origin ?? randomOrigin();
  const now = options.now ?? Date.now;

  let snapshot: StoreSnapshot = { records: {}, readonly: false };
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((l) => l());

  /** 外部 raw record → 合法 CardRecord（含版本遷移）；失敗回傳 null */
  function hydrateRecord(raw: unknown, fromVersion: number): CardRecord | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Partial<CardRecord> & { card?: unknown };
    try {
      const migrated = fromVersion === CARD_SCHEMA_VERSION ? r.card : migrateCard(r.card, fromVersion);
      const parsed = parseCard(migrated);
      if (!parsed.ok) {
        console.warn("[momo-card] 丟棄不合法的卡片資料", parsed.issues);
        return null;
      }
      return {
        card: parsed.card,
        state: { ...EMPTY_STATE, ...(r.state ?? {}) },
        rev: typeof r.rev === "number" ? r.rev : 0,
        updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
        origin: typeof r.origin === "string" ? r.origin : "",
      };
    } catch (err) {
      console.warn("[momo-card] 卡片資料遷移失敗", err);
      return null;
    }
  }

  function readPersisted(): { version: number; records: CardRecord[] } | null {
    if (!storage) return null;
    let parsed: PersistedSnapshot;
    try {
      const raw = storage.getItem(storageKey);
      if (!raw) return null;
      parsed = JSON.parse(raw) as PersistedSnapshot;
    } catch {
      return null;
    }
    const version = typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : 1;
    if (version > CARD_SCHEMA_VERSION) return { version, records: [] };
    const records = Object.values(parsed.records ?? {})
      .map((r) => hydrateRecord(r, version))
      .filter((r): r is CardRecord => r !== null);
    return { version, records };
  }

  /** 合併多筆 record，回傳是否有變動 */
  function mergeRecords(incoming: CardRecord[]): boolean {
    let next: Record<string, CardRecord> | null = null;
    for (const rec of incoming) {
      const current = (next ?? snapshot.records)[rec.card.id];
      if (shouldReplace(current, rec)) {
        next ??= { ...snapshot.records };
        next[rec.card.id] = rec;
      }
    }
    if (next) snapshot = { ...snapshot, records: next };
    return next !== null;
  }

  function enterReadonly(version: number) {
    if (snapshot.readonly) return;
    console.warn(`[momo-card] 偵測到較新的資料版本 v${version}（目前 v${CARD_SCHEMA_VERSION}），此分頁改為唯讀，請重新整理`);
    snapshot = { ...snapshot, readonly: true };
  }

  function persist() {
    if (!storage || snapshot.readonly) return;
    // read-merge-write：先合併其他分頁可能剛寫入、但訊息尚未抵達的資料，避免覆蓋
    const persisted = readPersisted();
    if (persisted && persisted.version > CARD_SCHEMA_VERSION) return enterReadonly(persisted.version);
    if (persisted) mergeRecords(persisted.records);
    const data: PersistedSnapshot = { schemaVersion: CARD_SCHEMA_VERSION, records: { ...snapshot.records } };
    try {
      storage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn("[momo-card] 無法寫入 localStorage（可能超出容量）", err);
    }
  }

  function commit(record: CardRecord) {
    if (snapshot.readonly) {
      console.warn("[momo-card] 唯讀模式，忽略寫入");
      return;
    }
    mergeRecords([record]);
    persist();
    channel?.postMessage({ type: "upsert", schemaVersion: CARD_SCHEMA_VERSION, record });
    emit();
  }

  function nextRecord(id: string, card: CardRecord["card"], state: CardRuntimeState): CardRecord {
    const current = snapshot.records[id];
    return { card, state, rev: (current?.rev ?? 0) + 1, updatedAt: now(), origin };
  }

  function seedRecords(): CardRecord[] {
    return (options.seed?.() ?? [])
      .map((input) => parseCard(input))
      .filter((r) => r.ok)
      .map((r) => ({ card: r.card, state: { ...EMPTY_STATE }, rev: 1, updatedAt: now(), origin }));
  }

  // ---- 初始化 ----
  const initial = readPersisted();
  if (initial && initial.version > CARD_SCHEMA_VERSION) enterReadonly(initial.version);
  else if (initial) mergeRecords(initial.records);

  if (Object.keys(snapshot.records).length === 0 && !snapshot.readonly) {
    mergeRecords(seedRecords());
    persist();
  } else if (initial && initial.version < CARD_SCHEMA_VERSION) {
    persist(); // 把遷移後的資料寫回，之後不必每次都遷移
  }

  // ---- 接收端 ----
  const onChannelMessage = (event: MessageEvent<SyncMessage>) => {
    const msg = event.data;
    if (!msg || msg.type !== "upsert") return;
    if (msg.schemaVersion > CARD_SCHEMA_VERSION) {
      enterReadonly(msg.schemaVersion);
      emit();
      return;
    }
    const rec = hydrateRecord(msg.record, msg.schemaVersion);
    if (rec && mergeRecords([rec])) emit();
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey) return;
    const persisted = readPersisted();
    if (!persisted) return;
    if (persisted.version > CARD_SCHEMA_VERSION) {
      enterReadonly(persisted.version);
      emit();
      return;
    }
    if (mergeRecords(persisted.records)) emit();
  };

  channel?.addEventListener("message", onChannelMessage);
  eventTarget?.addEventListener("storage", onStorage as EventListener);

  return {
    origin,
    getSnapshot: () => snapshot,
    get: (id) => snapshot.records[id],
    upsertCard(input) {
      const parsed = parseCard(input);
      if (!parsed.ok) return parsed;
      const id = parsed.card.id;
      const record = nextRecord(id, parsed.card, snapshot.records[id]?.state ?? { ...EMPTY_STATE });
      commit(record);
      return { ok: true, record };
    },
    updateState(id, patch) {
      const current = snapshot.records[id];
      if (!current) return;
      commit(nextRecord(id, current.card, { ...current.state, ...patch }));
    },
    resetCard(id) {
      const seeded = seedRecords().find((r) => r.card.id === id);
      if (seeded) commit(nextRecord(id, seeded.card, { ...EMPTY_STATE }));
    },
    resetAll() {
      for (const seeded of seedRecords()) commit(nextRecord(seeded.card.id, seeded.card, { ...EMPTY_STATE }));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      channel?.close();
      eventTarget?.removeEventListener("storage", onStorage as EventListener);
      listeners.clear();
    },
  };
}
