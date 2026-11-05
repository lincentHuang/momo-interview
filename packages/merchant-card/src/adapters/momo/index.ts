/**
 * @momo/merchant-card/momo —— momo 真實資料串接
 *
 *   import { createMomoClient, loadMomoHomepage } from "@momo/merchant-card/momo";
 *   const page = await loadMomoHomepage(createMomoClient());   // 伺服器端執行（CORS）
 *   page.sections[0].cards  // 已通過 CardSchema 驗證，可直接交給 <momo-product-card>.card
 *
 * 純邏輯、無 DOM 依賴，可在 Node / Edge / 瀏覽器使用；不會被打包進 Web Component bundle。
 */
export * from "./raw";
export * from "./map";
export { createMomoClient, MomoApiError, type MomoClient, type MomoClientOptions } from "./client";
export * from "./homepage";
export { createSnapshotClient, SNAPSHOT_RECORDED_AT } from "./snapshot";
