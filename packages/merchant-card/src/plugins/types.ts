import type { TemplateResult } from "lit";
import type { Card, CardSlot, CardVariant } from "../schema/card.schema";
import type { FieldDescriptor } from "../schema/fields";
import type { CardRuntimeState } from "../store/types";

/** 插槽定義在 schema 層（placements 需驗證 slot 名稱），這裡 re-export 維持原本的引用路徑 */
export { CARD_SLOT_LABELS, CARD_SLOTS, type CardSlot } from "../schema/card.schema";

/** 最小化的驗證介面（相容 zod 的 safeParse），讓 plugin 不被綁定在特定驗證函式庫 */
export interface ConfigSchema<C> {
  safeParse(value: unknown): { success: true; data: C } | { success: false; error: { issues: unknown } };
}

/**
 * 卡片提供給 plugin 的互動能力（收藏 / 加入購物車這類「有狀態」的模組使用）。
 * 狀態本身仍由卡片管理（同步模式寫入 Store、獨立模式存在卡片內），plugin 只負責呈現與觸發。
 */
export interface CardRuntime {
  state: CardRuntimeState;
  toggleFavorite: () => void;
  addToCart: () => void;
  /** 卡片處於「已結束」狀態（例如限搶倒數結束），購買類按鈕應停用 */
  inactive: boolean;
  /** variant 建議的購買按鈕文字（限時搶購為「搶」）；add-to-cart 的 auto 樣式據此改用角落頁籤 */
  ctaLabel?: string;
}

export interface PluginRenderContext<C> {
  card: Card;
  config: C;
  /** 由 <momo-product-card> 提供；在卡片外單獨呼叫 render 時可能不存在 */
  runtime?: CardRuntime;
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
  /** 預設插槽；卡片可透過 `placements` 覆寫成其他插槽 */
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
