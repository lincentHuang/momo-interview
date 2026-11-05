import type { Card } from "../schema/card.schema";

/** 使用者對卡片的互動狀態（與卡片「設定」分開：設定由 Showroom 編輯，互動狀態由任何宿主產生） */
export interface CardRuntimeState {
  favorite: boolean;
  cartQty: number;
}

/**
 * 一筆可同步的紀錄。
 * rev + origin 構成 Last-Writer-Wins 的全序：rev 大者勝；rev 相同時 origin 字典序大者勝，
 * 因此任意順序收到訊息，所有分頁最終都會收斂到同一個值。
 */
export interface CardRecord {
  card: Card;
  state: CardRuntimeState;
  rev: number;
  updatedAt: number;
  origin: string;
}

export interface StoreSnapshot {
  records: Readonly<Record<string, CardRecord>>;
  /** 偵測到更新版本的資料（新部署的分頁寫入）時進入唯讀，避免舊程式碼覆蓋新資料 */
  readonly: boolean;
}

export type SyncMessage =
  | { type: "upsert"; schemaVersion: number; record: CardRecord }
  | { type: "hello"; schemaVersion: number; origin: string };

/** 可注入的通道介面（測試或不支援 BroadcastChannel 的環境可替換） */
export interface SyncChannel {
  postMessage(message: SyncMessage): void;
  addEventListener(type: "message", listener: (event: MessageEvent<SyncMessage>) => void): void;
  close(): void;
}
