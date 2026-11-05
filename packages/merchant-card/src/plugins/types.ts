import type { TemplateResult } from "lit";
import type { Card, CardVariant } from "../schema/card.schema";
import type { FieldDescriptor } from "../schema/fields";

/**
 * 卡片上的可擴充插槽。核心 renderer 只負責「在哪裡放」，plugin 決定「放什麼」。
 *
 *  ┌──────────────────────┐
 *  │ media-top    (角標)   │
 *  │        [image]       │
 *  │ media-bottom (橫幅)   │
 *  ├──────────────────────┤
 *  │ title                │
 *  │ badges  (標籤列)      │
 *  │ price  + price-extra │
 *  │ footer               │
 *  └──────────────────────┘
 */
export const CARD_SLOTS = ["media-top", "media-bottom", "badges", "price-extra", "footer"] as const;
export type CardSlot = (typeof CARD_SLOTS)[number];

/** 最小化的驗證介面（相容 zod 的 safeParse），讓 plugin 不被綁定在特定驗證函式庫 */
export interface ConfigSchema<C> {
  safeParse(value: unknown): { success: true; data: C } | { success: false; error: { issues: unknown } };
}

export interface PluginRenderContext<C> {
  card: Card;
  config: C;
}

export interface PluginSetupContext<C> extends PluginRenderContext<C> {
  /** 卡片 host element（可用於 IntersectionObserver 等生命週期需求） */
  host: HTMLElement;
  /** 以卡片為來源發出 composed CustomEvent，宿主頁面可直接監聽 */
  emit: (type: string, detail?: unknown) => void;
}

export interface CardPlugin<C extends Record<string, unknown> = Record<string, unknown>> {
  /** 全域唯一；同時是 card.extensions 的 key */
  id: string;
  name: string;
  description: string;
  /** 不渲染 UI 的 plugin（例如曝光追蹤）可省略 slot / render */
  slot?: CardSlot;
  /** 同一 slot 內的排序，越小越前面 */
  order?: number;
  /** 限定可用的 variant；省略代表全部可用 */
  variants?: ReadonlyArray<CardVariant>;
  /**
   * config 驗證。任何具備 safeParse 的物件皆可（zod schema 或手寫）；
   * 省略時直接以 defaults 合併原始 config，適合無建置流程的宿主快速擴充。
   */
  configSchema?: ConfigSchema<C>;
  defaults: C;
  /** 編輯器據此自動產生控制項 */
  fields: ReadonlyArray<FieldDescriptor>;
  render?: (ctx: PluginRenderContext<C>) => TemplateResult | null;
  /** 卡片掛載時呼叫；回傳 cleanup 於卸載或 config 變更時執行 */
  setup?: (ctx: PluginSetupContext<C>) => void | (() => void);
}

/** 讓 plugin 作者取得完整型別推導的 helper */
export function definePlugin<C extends Record<string, unknown>>(plugin: CardPlugin<C>): CardPlugin<C> {
  return plugin;
}
