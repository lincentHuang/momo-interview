"use client";

import { CARD_SCHEMA_VERSION, DEFAULT_CHANNEL_NAME, DEFAULT_STORAGE_KEY, getSharedStore, pluginRegistry, registerBuiltinPlugins, type CardPlugin, type CardRecord, type CardStore, type CardVariant, type StoreSnapshot } from "@momo/merchant-card";
import { useSyncExternalStore } from "react";

/**
 * React ↔ 框架無關 Store 的唯一橋接點。
 *
 * - Store 本身住在 @momo/merchant-card（與 Web Component 共用同一個實例）
 * - 透過 useSyncExternalStore 訂閱，避免 tearing
 * - Server snapshot 回傳 null：localStorage 只存在瀏覽器，SSR 時一律顯示 skeleton，避免 hydration mismatch
 */
let runtimeReady = false;
function runtime(): CardStore {
  if (!runtimeReady) {
    registerBuiltinPlugins();
    runtimeReady = true;
  }
  return getSharedStore();
}

const subscribe = (cb: () => void) => runtime().subscribe(cb);
const getSnapshot = (): StoreSnapshot => runtime().getSnapshot();
const getServerSnapshot = (): StoreSnapshot | null => null;

/** null 代表尚未在瀏覽器端 hydrate */
export function useStoreSnapshot(): StoreSnapshot | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useCardRecords(): CardRecord[] | null {
  const snapshot = useStoreSnapshot();
  return snapshot ? Object.values(snapshot.records) : null;
}

/** undefined = 找不到；null = 尚未 hydrate */
export function useCardRecord(id: string): CardRecord | undefined | null {
  const snapshot = useStoreSnapshot();
  return snapshot ? snapshot.records[id] : null;
}

export type CardActions = Pick<CardStore, "upsertCard" | "updateState" | "resetCard" | "resetAll">;

/**
 * 寫入操作。延遲取得 Store：render 階段（含 SSR）不會建立 Store，只有事件觸發時才會。
 */
const actions: CardActions = {
  upsertCard: (input) => runtime().upsertCard(input),
  updateState: (id, patch) => runtime().updateState(id, patch),
  resetCard: (id) => runtime().resetCard(id),
  resetAll: () => runtime().resetAll(),
};

export function useCardActions(): CardActions {
  return actions;
}

const subscribePlugins = (cb: () => void) => pluginRegistry.subscribe(cb);
const getPluginsVersion = () => {
  runtime(); // 確保內建 plugin 已註冊（只在瀏覽器端呼叫）
  return pluginRegistry.getVersion();
};

/**
 * 已註冊的 plugin（傳入 variant 時只回傳該 variant 可用的）。
 * registry 在執行期動態註冊 / 移除時自動更新；SSR 時回傳空陣列。
 */
export function usePlugins(variant?: CardVariant): CardPlugin[] | null {
  const version = useSyncExternalStore(subscribePlugins, getPluginsVersion, () => -1);
  if (version === -1) return null;
  return variant ? pluginRegistry.available({ variant }) : pluginRegistry.list();
}

export interface StoreInfo {
  schemaVersion: number;
  storageKey: string;
  channelName: string;
  /** 本分頁的寫入來源識別（LWW 平手時的決勝依據） */
  origin: string;
  broadcastChannel: boolean;
}

/** 同步機制的診斷資訊（設定頁使用）；SSR 時為 null */
export function useStoreInfo(): StoreInfo | null {
  const snapshot = useStoreSnapshot();
  if (!snapshot) return null;
  return {
    schemaVersion: CARD_SCHEMA_VERSION,
    storageKey: DEFAULT_STORAGE_KEY,
    channelName: DEFAULT_CHANNEL_NAME,
    origin: runtime().origin,
    broadcastChannel: typeof BroadcastChannel !== "undefined",
  };
}
