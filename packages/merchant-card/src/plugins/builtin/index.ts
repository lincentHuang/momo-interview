import { html } from "lit";
import { z } from "zod";
import { formatPrice } from "../../core/pricing";
import { pluginRegistry } from "../registry";
import { definePlugin } from "../types";

/**
 * 以下標籤的配色、尺寸取自 momo 首頁實測（2026-11）：
 * 標籤高 18px、圓角 2px、11px 字；行銷標籤底色 #FF4C76（API icon.iconBgColor）。
 * adapter（adapters/momo）會把 API 的 icon / goodsTag 對應到這些 plugin。
 */

/** 到貨時效：momo 以紅底「速」字 + 時效文字呈現（API icon.iconContent === "速"） */
export const fastDeliveryPlugin = definePlugin({
  id: "fast-delivery",
  name: "快速到貨",
  description: "「速」到貨時效標籤",
  slot: "badges",
  order: 0,
  configSchema: z.object({ label: z.enum(["最快今日", "最快明日", "8H到貨", "24H到貨", "超商取貨"]) }),
  defaults: { label: "最快今日" },
  fields: [
    {
      kind: "select",
      key: "label",
      label: "到貨時效",
      options: [
        { value: "最快今日", label: "最快今日" },
        { value: "最快明日", label: "最快明日" },
        { value: "8H到貨", label: "8H到貨" },
        { value: "24H到貨", label: "24H到貨" },
        { value: "超商取貨", label: "超商取貨" },
      ],
    },
  ],
  render: ({ config }) => html`<span class="tag tag--fast"><b>速</b>${config.label}</span>`,
});

/** 折價券（API iconContentType === "isCp"）。momo 列表只顯示「折價券」，金額為選填 */
export const couponPlugin = definePlugin({
  id: "coupon",
  name: "折價券",
  description: "可領取折價券標籤",
  slot: "badges",
  order: 10,
  configSchema: z.object({ amount: z.number().int().positive().max(10000).optional() }),
  defaults: {},
  fields: [{ kind: "number", key: "amount", label: "折抵金額", min: 1, step: 10, unit: "元" }],
  render: ({ config }) => html`<span class="tag tag--promo tag--coupon">${config.amount ? `券 ${formatPrice(config.amount)}` : "折價券"}</span>`,
});

/** 登記活動（API iconContentType === "isRegister"）：登記後享回饋 */
export const registerPlugin = definePlugin({
  id: "register",
  name: "登記活動",
  description: "需登記的回饋活動標籤",
  slot: "badges",
  order: 20,
  defaults: {},
  fields: [],
  render: () => html`<span class="tag tag--promo">登記</span>`,
});

/** 贈品（API iconContentType === "isGift"） */
export const giftPlugin = definePlugin({
  id: "gift",
  name: "贈品",
  description: "滿額贈 / 加贈標籤",
  slot: "badges",
  order: 30,
  configSchema: z.object({ text: z.string().min(1).max(16) }),
  defaults: { text: "贈品" },
  fields: [{ kind: "text", key: "text", label: "標籤文字", maxLength: 16 }],
  render: ({ config }) => html`<span class="tag tag--promo">${config.text}</span>`,
});

/**
 * 檔期活動標（雙11必買、衝上熱銷、mo Pro…）。momo 以圖片或色塊呈現，內容每檔次都不同，
 * 因此只定義「文字 + 底色 + 選填圖片」的通用形狀，不寫死檔期名稱。
 */
export const campaignTagPlugin = definePlugin({
  id: "campaign-tag",
  name: "檔期活動標",
  description: "雙11必買 / 衝上熱銷等檔期標",
  slot: "badges",
  order: 5,
  configSchema: z.object({
    text: z.string().min(1).max(12),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    imageUrl: z.string().optional(),
  }),
  defaults: { text: "雙11必買", color: "#E4007F" },
  fields: [
    { kind: "text", key: "text", label: "標籤文字", maxLength: 12 },
    { kind: "text", key: "color", label: "底色（#RRGGBB）", maxLength: 7 },
    { kind: "text", key: "imageUrl", label: "標籤圖片網址（選填）" },
  ],
  render: ({ config }) =>
    config.imageUrl
      ? html`<img class="tag-img" src=${config.imageUrl} alt=${config.text} loading="lazy" />`
      : html`<span class="tag" style="background:${config.color};color:#fff">${config.text}</span>`,
});

/** mo店+（第三方店家商品，API goodsTag.content === "店⁺"，底色 #5E6999） */
export const storePlusPlugin = definePlugin({
  id: "store-plus",
  name: "mo店+",
  description: "mo店+ 店家商品標記（標題前）",
  slot: "badges",
  order: -10,
  defaults: {},
  fields: [],
  render: () => html`<span class="tag tag--store">店⁺</span>`,
});

/** 預購（API goodsTag.content === "預"，底色 #FF960A） */
export const preOrderPlugin = definePlugin({
  id: "pre-order",
  name: "預購",
  description: "預購商品標記",
  slot: "badges",
  order: -5,
  defaults: {},
  fields: [],
  render: () => html`<span class="tag tag--preorder">預購</span>`,
});

/** 商品圖右上角的活動圖標（API imgTagUrl，例如「最高送170mo」方形貼紙） */
export const imageTagPlugin = definePlugin({
  id: "image-tag",
  name: "圖片角標",
  description: "商品圖角落的活動貼紙圖",
  slot: "media-top",
  order: 20,
  configSchema: z.object({ imageUrl: z.string().min(1), alt: z.string().max(20).optional() }),
  defaults: { imageUrl: "" },
  fields: [
    { kind: "text", key: "imageUrl", label: "圖片網址" },
    { kind: "text", key: "alt", label: "替代文字", maxLength: 20 },
  ],
  render: ({ config }) => (config.imageUrl ? html`<img class="media-sticker" src=${config.imageUrl} alt=${config.alt ?? "活動標"} loading="lazy" />` : null),
});

/** 商品圖底部的活動橫幅（API imgBottomTagUrl，例如「11/5限定｜滿額登記送1080mo點」） */
export const bottomBannerPlugin = definePlugin({
  id: "bottom-banner",
  name: "圖片底部橫幅",
  description: "商品圖底部的檔期橫幅圖",
  slot: "media-bottom",
  order: 0,
  configSchema: z.object({ imageUrl: z.string().min(1), alt: z.string().max(20).optional() }),
  defaults: { imageUrl: "" },
  fields: [
    { kind: "text", key: "imageUrl", label: "圖片網址" },
    { kind: "text", key: "alt", label: "替代文字", maxLength: 20 },
  ],
  render: ({ config }) => (config.imageUrl ? html`<img class="media-banner" src=${config.imageUrl} alt=${config.alt ?? "檔期橫幅"} loading="lazy" />` : null),
});

export const installmentPlugin = definePlugin({
  id: "installment",
  name: "分期零利率",
  description: "顯示信用卡分期期數",
  slot: "price-extra",
  order: 10,
  variants: ["standard", "flash-sale", "ranking"],
  configSchema: z.object({ periods: z.number().int().min(3).max(36) }),
  defaults: { periods: 12 },
  fields: [{ kind: "number", key: "periods", label: "分期期數", min: 3, max: 36, step: 3, unit: "期" }],
  render: ({ config }) => html`<span class="tag tag--outline">${config.periods}期0利率</span>`,
});

/** 圖片左上角的活動角標（momo 獨家 / 新品 / 網路獨賣） */
export const cornerLabelPlugin = definePlugin({
  id: "corner-label",
  name: "活動角標",
  description: "商品圖角落的醒目標記",
  slot: "media-top",
  order: 10,
  configSchema: z.object({ text: z.enum(["momo獨家", "新品上市", "網路獨賣", "品牌旗艦"]) }),
  defaults: { text: "momo獨家" },
  fields: [
    {
      kind: "select",
      key: "text",
      label: "角標文字",
      options: [
        { value: "momo獨家", label: "momo獨家" },
        { value: "新品上市", label: "新品上市" },
        { value: "網路獨賣", label: "網路獨賣" },
        { value: "品牌旗艦", label: "品牌旗艦" },
      ],
    },
  ],
  render: ({ config }) => html`<span class="tag tag--solid">${config.text}</span>`,
});

/** 購物金回饋（以售價計算可得點數） */
export const cashbackPlugin = definePlugin({
  id: "cashback",
  name: "購物金回饋",
  description: "依售價計算回饋的 mo 幣",
  slot: "footer",
  order: 0,
  configSchema: z.object({ percent: z.number().min(1).max(30) }),
  defaults: { percent: 5 },
  fields: [{ kind: "number", key: "percent", label: "回饋比例", min: 1, max: 30, step: 1, unit: "%" }],
  render: ({ card, config }) =>
    html`<span class="cashback">回饋 ${config.percent}%・約 ${formatPrice(Math.floor((card.price * config.percent) / 100))} mo幣</span>`,
});

/**
 * 無 UI 的 plugin 範例：曝光追蹤。
 * 卡片可見面積超過門檻時發出一次 `momo-card:impression` 事件，由宿主串接自己的埋點系統。
 */
export const impressionTrackerPlugin = definePlugin({
  id: "impression-tracker",
  name: "曝光追蹤",
  description: "可見度達門檻時發出 momo-card:impression 事件",
  configSchema: z.object({ threshold: z.number().min(0.1).max(1) }),
  defaults: { threshold: 0.5 },
  fields: [{ kind: "number", key: "threshold", label: "可見比例門檻", min: 0.1, max: 1, step: 0.1 }],
  setup: ({ host, card, config, emit }) => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          emit("momo-card:impression", { cardId: card.id, threshold: config.threshold, at: Date.now() });
          io.disconnect();
        }
      },
      { threshold: config.threshold },
    );
    io.observe(host);
    return () => io.disconnect();
  },
});

export const BUILTIN_PLUGINS = [
  fastDeliveryPlugin,
  couponPlugin,
  registerPlugin,
  giftPlugin,
  campaignTagPlugin,
  storePlusPlugin,
  preOrderPlugin,
  imageTagPlugin,
  bottomBannerPlugin,
  installmentPlugin,
  cornerLabelPlugin,
  cashbackPlugin,
  impressionTrackerPlugin,
] as const;

export function registerBuiltinPlugins(): void {
  for (const p of BUILTIN_PLUGINS) {
    if (!pluginRegistry.get(p.id)) pluginRegistry.register(p);
  }
}
