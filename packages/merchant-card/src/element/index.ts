/**
 * Web Component 入口（瀏覽器專用，含副作用）：
 *   - 註冊內建 plugin
 *   - customElements.define("momo-product-card")
 *
 * IIFE 版本會把所有 export 掛在 window.MomoCard，
 * 並額外 re-export lit 的 `html`，讓無建置流程的宿主也能撰寫自訂 plugin。
 * （刻意不 re-export zod 的 `z`：整包 namespace 無法 tree-shake，會讓 bundle 膨脹數倍）
 */
import { registerBuiltinPlugins } from "../plugins/builtin";
import { pluginRegistry } from "../plugins/registry";
import { MomoProductCard } from "./momo-product-card";

export * from "../index";
export { MomoProductCard };
export { html } from "lit";

export const TAG_NAME = "momo-product-card";

registerBuiltinPlugins();
if (!customElements.get(TAG_NAME)) customElements.define(TAG_NAME, MomoProductCard);

/** 宿主端語法糖：MomoCard.registerPlugin(plugin) */
export const registerPlugin: typeof pluginRegistry.register = (plugin, opts) => pluginRegistry.register(plugin, opts);
