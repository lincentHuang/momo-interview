import type { Card, CardOf, CardVariant } from "./card.schema";
import type { FieldDescriptor } from "./fields";

/**
 * Variant 定義表：每個 variant 的 metadata + 可編輯欄位 + 預設值工廠。
 * 編輯器與 Catalog 皆由這張表驅動；新增 variant = 新增 schema + 在此登錄 + 加一個 renderer。
 */
export interface VariantDefinition<V extends CardVariant = CardVariant> {
  variant: V;
  label: string;
  /** 在 momo 真實網站中出現的位置（領域分析結論） */
  foundIn: string;
  fields: ReadonlyArray<FieldDescriptor>;
  /** 從其他 variant 切換過來時，補齊此 variant 專屬欄位 */
  defaults: (now: number) => Omit<CardOf<V>, keyof SharedKeys>;
}

type SharedKeys = Pick<Card, "id" | "title" | "imageUrl" | "price" | "originalPrice" | "rating" | "reviewCount" | "layout" | "extensions">;

export const BASE_FIELDS: ReadonlyArray<FieldDescriptor> = [
  { kind: "text", key: "title", label: "商品名稱", maxLength: 80 },
  { kind: "number", key: "price", label: "售價", min: 0, step: 10, unit: "元" },
  { kind: "number", key: "originalPrice", label: "原價（劃線價）", min: 0, step: 10, unit: "元" },
  { kind: "number", key: "rating", label: "評分", min: 0, max: 5, step: 0.1 },
  { kind: "number", key: "reviewCount", label: "評價數", min: 0, step: 1 },
  {
    kind: "select",
    key: "layout",
    label: "版型",
    options: [
      { value: "grid", label: "直式（Grid）" },
      { value: "list", label: "橫式（List）" },
    ],
  },
];

export const VARIANTS: { [V in CardVariant]: VariantDefinition<V> } = {
  standard: {
    variant: "standard",
    label: "一般商品卡",
    foundIn: "搜尋結果、分類列表、推薦商品",
    fields: [{ kind: "number", key: "soldCount", label: "已售出", min: 0, step: 1 }],
    defaults: () => ({ variant: "standard", soldCount: 0 }),
  },
  "flash-sale": {
    variant: "flash-sale",
    label: "限時搶購卡",
    foundIn: "限時瘋搶、整點特賣、首頁活動區塊",
    fields: [
      { kind: "countdown", key: "endsAt", label: "距離結束", maxMinutes: 24 * 60 },
      { kind: "number", key: "stockTotal", label: "活動總量", min: 1, step: 1 },
      { kind: "number", key: "stockSold", label: "已搶購", min: 0, step: 1 },
    ],
    defaults: (now) => ({ variant: "flash-sale", endsAt: now + 3 * 60 * 60 * 1000, stockTotal: 100, stockSold: 0 }),
  },
  live: {
    variant: "live",
    label: "直播商品卡",
    foundIn: "momo 直播、影音導購",
    fields: [
      {
        kind: "select",
        key: "liveStatus",
        label: "直播狀態",
        options: [
          { value: "live", label: "直播中" },
          { value: "upcoming", label: "即將開播" },
          { value: "replay", label: "精彩回放" },
        ],
      },
      { kind: "number", key: "viewers", label: "觀看人數", min: 0, step: 100 },
      { kind: "text", key: "hostName", label: "主持人", maxLength: 20 },
    ],
    defaults: () => ({ variant: "live", liveStatus: "live", viewers: 0 }),
  },
  ranking: {
    variant: "ranking",
    label: "排行榜卡",
    foundIn: "熱銷排行、分類 TOP 榜",
    fields: [
      { kind: "number", key: "rank", label: "名次", min: 1, max: 100, step: 1 },
      { kind: "text", key: "rankCategory", label: "榜單分類", maxLength: 20 },
    ],
    defaults: () => ({ variant: "ranking", rank: 1, rankCategory: "熱銷" }),
  },
};

/** 切換 variant：保留共用欄位，捨棄舊 variant 專屬欄位，補上新 variant 預設值 */
export function switchVariant(card: Card, next: CardVariant, now = Date.now()): Card {
  if (card.variant === next) return card;
  const shared: SharedKeys = {
    id: card.id,
    title: card.title,
    imageUrl: card.imageUrl,
    price: card.price,
    originalPrice: card.originalPrice,
    rating: card.rating,
    reviewCount: card.reviewCount,
    layout: card.layout,
    extensions: card.extensions,
  };
  return { ...shared, ...VARIANTS[next].defaults(now) } as Card;
}
