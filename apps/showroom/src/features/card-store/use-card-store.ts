"use client";

import { getSharedStore, registerBuiltinPlugins, type CardRecord, type CardStore, type StoreSnapshot } from "@momo/merchant-card";
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
