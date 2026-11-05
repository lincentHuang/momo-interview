import { CARD_SCHEMA_VERSION, createCardStore, createFixtures, type SyncChannel, type SyncMessage } from "../index";

/** 記憶體版 BroadcastChannel：同名 bus 上的其他成員會收到訊息（不含自己），可手動控制投遞時機 */
function createBus() {
  const members = new Set<{ deliver: (m: SyncMessage) => void }>();
  const queue: Array<() => void> = [];
  return {
    channel(): SyncChannel {
      const listeners: Array<(e: MessageEvent<SyncMessage>) => void> = [];
      const self = { deliver: (m: SyncMessage) => listeners.forEach((l) => l({ data: m } as MessageEvent<SyncMessage>)) };
      members.add(self);
      return {
        postMessage: (m) => members.forEach((o) => o !== self && queue.push(() => o.deliver(structuredClone(m)))),
        addEventListener: (_t, l) => listeners.push(l),
        close: () => members.delete(self),
      };
    },
    flush: () => queue.splice(0).forEach((fn) => fn()),
    shuffleFlush: () => queue.splice(0).reverse().forEach((fn) => fn()),
  };
}

function memoryStorage() {
  const map = new Map<string, string>();
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), map };
}

const seed = () => createFixtures(0);

describe("createCardStore", () => {
  it("空儲存區時以 seed 初始化並持久化", () => {
    const storage = memoryStorage();
    const store = createCardStore({ storage, channel: null, eventTarget: null, seed });
    expect(Object.keys(store.getSnapshot().records)).toHaveLength(seed().length);
    expect(JSON.parse(storage.map.get("momo-card:store")!).schemaVersion).toBe(CARD_SCHEMA_VERSION);
  });

  it("拒絕不合法的寫入", () => {
    const store = createCardStore({ storage: null, channel: null, eventTarget: null, seed });
    const result = store.upsertCard({ ...store.get("std-airfryer")!.card, price: -1 });
    expect(result.ok).toBe(false);
    expect(store.get("std-airfryer")!.card.price).toBe(3990);
  });

  it("透過 channel 即時同步到另一個分頁", () => {
    const bus = createBus();
    const storage = memoryStorage();
    const a = createCardStore({ storage, channel: bus.channel(), eventTarget: null, seed, origin: "a" });
    const b = createCardStore({ storage, channel: bus.channel(), eventTarget: null, seed, origin: "b" });
    const listener = vi.fn();
    b.subscribe(listener);
    a.upsertCard({ ...a.get("std-airfryer")!.card, title: "改名了" });
    bus.flush();
    expect(b.get("std-airfryer")!.card.title).toBe("改名了");
    expect(listener).toHaveBeenCalled();
  });

  it("並發寫入：訊息順序不同，兩端仍收斂到同一個值（LWW）", () => {
    const bus = createBus();
    const a = createCardStore({ storage: null, channel: bus.channel(), eventTarget: null, seed, origin: "a" });
    const b = createCardStore({ storage: null, channel: bus.channel(), eventTarget: null, seed, origin: "b" });
    a.upsertCard({ ...a.get("std-towel")!.card, price: 100 });
    b.upsertCard({ ...b.get("std-towel")!.card, price: 200 });
    bus.shuffleFlush();
    expect(a.get("std-towel")!.card.price).toBe(b.get("std-towel")!.card.price);
    expect(a.get("std-towel")!.card.price).toBe(200); // 同 rev，origin "b" > "a"
  });

  it("互動狀態（收藏）同樣跨分頁同步", () => {
    const bus = createBus();
    const a = createCardStore({ storage: null, channel: bus.channel(), eventTarget: null, seed, origin: "a" });
    const b = createCardStore({ storage: null, channel: bus.channel(), eventTarget: null, seed, origin: "b" });
    b.updateState("rank-rice", { favorite: true });
    bus.flush();
    expect(a.get("rank-rice")!.state.favorite).toBe(true);
  });

  it("載入 v1 資料時自動遷移並寫回", () => {
    const storage = memoryStorage();
    storage.setItem(
      "momo-card:store",
      JSON.stringify({
        schemaVersion: 1,
        records: { old: { card: { id: "old", variant: "standard", title: "舊卡", imageUrl: "x", price: 1, badges: ["gift"] }, rev: 3, origin: "z" } },
      }),
    );
    const store = createCardStore({ storage, channel: null, eventTarget: null, seed });
    expect(store.get("old")!.card.extensions).toEqual({ favorite: {}, "add-to-cart": {}, gift: {} });
    expect(JSON.parse(storage.map.get("momo-card:store")!).schemaVersion).toBe(CARD_SCHEMA_VERSION);
  });

  it("遇到較新版本資料時進入唯讀，不覆寫", () => {
    const storage = memoryStorage();
    const future = JSON.stringify({ schemaVersion: CARD_SCHEMA_VERSION + 1, records: {} });
    storage.setItem("momo-card:store", future);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = createCardStore({ storage, channel: null, eventTarget: null, seed });
    expect(store.getSnapshot().readonly).toBe(true);
    store.updateState("std-towel", { favorite: true });
    expect(storage.map.get("momo-card:store")).toBe(future);
    warn.mockRestore();
  });
});
