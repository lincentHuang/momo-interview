import { z } from "zod";
import { zhTW } from "zod/locales";

// 驗證錯誤訊息使用繁體中文（會直接顯示在卡片錯誤狀態與編輯器）
z.config(zhTW());

/**
 * 商品卡領域模型（Domain Model）
 *
 * 分析 momo 搜尋頁 / 分類頁 / 直播頁 / 排行榜後，歸納出「一張商品卡」由兩個正交維度組成：
 *   1. variant（業務型態）：決定卡片專屬資訊，用 Discriminated Union 表達
 *      - standard   一般商品卡（搜尋、分類列表）
 *      - flash-sale 限時搶購卡（倒數計時 + 已搶購進度）
 *      - live       直播商品卡（直播狀態 + 觀看人數）
 *      - ranking    排行榜卡（名次 + 榜單分類）
 *   2. extensions（行銷附加資訊）：快速到貨、折價券、贈品、分期…
 *      這類需求變動最頻繁，交由 Plugin 管理，核心 schema 只保留一個開放的 record。
 *
 * layout（grid / list）屬於「呈現」維度，與 variant 正交。
 */
export const CARD_SCHEMA_VERSION = 2;

export const CARD_VARIANTS = ["standard", "flash-sale", "live", "ranking"] as const;
export type CardVariant = (typeof CARD_VARIANTS)[number];

export const CARD_LAYOUTS = ["grid", "list"] as const;
export type CardLayout = (typeof CARD_LAYOUTS)[number];

const money = z.number().int().nonnegative();

const baseShape = {
  id: z.string().min(1),
  title: z.string().min(1).max(80),
  imageUrl: z.string().min(1),
  price: money,
  originalPrice: money.optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().nonnegative().optional(),
  layout: z.enum(CARD_LAYOUTS).default("grid"),
  /** pluginId → plugin config；key 存在即代表啟用該 plugin */
  extensions: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
};

export const StandardCardSchema = z.object({
  ...baseShape,
  variant: z.literal("standard"),
  soldCount: z.number().int().nonnegative().optional(),
});

export const FlashSaleCardSchema = z.object({
  ...baseShape,
  variant: z.literal("flash-sale"),
  /** 結束時間（epoch ms）。用絕對時間而非「剩餘秒數」，跨分頁 / 跨宿主同步時才不會漂移 */
  endsAt: z.number().int(),
  stockTotal: z.number().int().positive(),
  stockSold: z.number().int().nonnegative(),
});

export const LiveCardSchema = z.object({
  ...baseShape,
  variant: z.literal("live"),
  liveStatus: z.enum(["live", "upcoming", "replay"]),
  viewers: z.number().int().nonnegative(),
  hostName: z.string().max(20).optional(),
});

export const RankingCardSchema = z.object({
  ...baseShape,
  variant: z.literal("ranking"),
  rank: z.number().int().min(1).max(100),
  rankCategory: z.string().max(20),
});

export const CardSchema = z
  .discriminatedUnion("variant", [StandardCardSchema, FlashSaleCardSchema, LiveCardSchema, RankingCardSchema])
  .superRefine((card, ctx) => {
    if (card.originalPrice !== undefined && card.originalPrice < card.price) {
      ctx.addIssue({ code: "custom", path: ["originalPrice"], message: "原價不可低於售價" });
    }
    if (card.variant === "flash-sale" && card.stockSold > card.stockTotal) {
      ctx.addIssue({ code: "custom", path: ["stockSold"], message: "已售數量不可超過總量" });
    }
  });

/** 經過驗證後的卡片（default 已補齊） */
export type Card = z.output<typeof CardSchema>;
/** 宿主提供的原始輸入（default 欄位可省略） */
export type CardInput = z.input<typeof CardSchema>;
export type CardOf<V extends CardVariant> = Extract<Card, { variant: V }>;

export type ParseResult = { ok: true; card: Card } | { ok: false; issues: Array<{ path: string; message: string }> };

/** 所有外部輸入（宿主屬性、localStorage、BroadcastChannel、URL）都必須經過這個邊界 */
export function parseCard(input: unknown): ParseResult {
  const result = CardSchema.safeParse(input);
  if (result.success) return { ok: true, card: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  };
}
