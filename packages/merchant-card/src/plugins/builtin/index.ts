import { html } from "lit";
import { z } from "zod";
import { formatPrice } from "../../core/pricing";
import { pluginRegistry } from "../registry";
import { definePlugin } from "../types";

/** momo 的到貨承諾標籤（8H到貨 / 24H到貨 / 超商取貨） */
export const fastDeliveryPlugin = definePlugin({
  id: "fast-delivery",
  name: "快速到貨",
  description: "顯示到貨時效承諾標籤",
  slot: "badges",
  order: 0,
  configSchema: z.object({ label: z.enum(["8H到貨", "24H到貨", "超商取貨"]) }),
  defaults: { label: "8H到貨" },
  fields: [
    {
      kind: "select",
      key: "label",
      label: "到貨時效",
      options: [
        { value: "8H到貨", label: "8H到貨" },
        { value: "24H到貨", label: "24H到貨" },
        { value: "超商取貨", label: "超商取貨" },
      ],
    },
  ],
  render: ({ config }) => html`<span class="tag tag--delivery">${config.label}</span>`,
});

export const couponPlugin = definePlugin({
  id: "coupon",
  name: "折價券",
  description: "售價旁顯示可領取的折價券",
  slot: "price-extra",
  order: 0,
  configSchema: z.object({ amount: z.number().int().positive().max(10000) }),
  defaults: { amount: 100 },
  fields: [{ kind: "number", key: "amount", label: "折抵金額", min: 1, step: 10, unit: "元" }],
  render: ({ config }) => html`<span class="tag tag--coupon">券 ${formatPrice(config.amount)}</span>`,
});

export const giftPlugin = definePlugin({
  id: "gift",
  name: "贈品",
  description: "顯示滿額贈 / 加贈資訊",
  slot: "badges",
  order: 10,
  configSchema: z.object({ text: z.string().min(1).max(16) }),
  defaults: { text: "送好禮" },
  fields: [{ kind: "text", key: "text", label: "贈品文案", maxLength: 16 }],
  render: ({ config }) => html`<span class="tag tag--gift">${config.text}</span>`,
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
  giftPlugin,
  installmentPlugin,
  impressionTrackerPlugin,
] as const;

export function registerBuiltinPlugins(): void {
  for (const p of BUILTIN_PLUGINS) {
    if (!pluginRegistry.get(p.id)) pluginRegistry.register(p);
  }
}
