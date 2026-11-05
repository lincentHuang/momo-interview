# Progress

- 2026-11-05：建立 npm workspaces monorepo（Next.js 16 showroom + merchant-card 套件）（`package.json`、`apps/showroom`、`packages/merchant-card`）
- 2026-11-05：商品卡領域模型、版本遷移、Plugin Registry 與 5 個內建 plugin（`packages/merchant-card/src/schema`、`src/plugins`）
- 2026-11-05：跨分頁 / 跨宿主同步 Store（LWW、read-merge-write、唯讀保護）＋ 18 個單元測試（`src/store`、`src/__tests__`）
- 2026-11-05：`<momo-product-card>` Lit Web Component，ES / IIFE 打包 42KB gzip（`src/element`、`vite.config.ts`）
- 2026-11-05：Showroom：Radix 共用 UI、目錄、Schema 驅動編輯器、分享連結、ESLint feature 邊界（`apps/showroom/src`）
- 2026-11-05：sample.html 純 HTML 嵌入範例；瀏覽器實測編輯器 ↔ sample.html 雙向同步（`apps/showroom/public/sample.html`）
- 2026-11-05：README（架構、取捨、演進）、PRD 決策紀錄（`README.md`、`PRD.md`）
- 2026-11-05：Playwright E2E 18 個（跨分頁同步、驗證、分享連結、Shadow DOM、執行期 plugin）；修正首次渲染時 momo-card:error 事件遺失（`apps/showroom/e2e`、`element/momo-product-card.ts`）
- 2026-11-05：Showroom sidebar App Shell（桌機可收合、手機抽屜），拆出模組庫 / 類型分析 / 嵌入指南 / 設定與同步頁，編輯器分「設計 / 檢視器」子頁（`shared/layout/app-shell.tsx`、`app/*`、`features/module-library`、`features/settings`）
- 2026-11-05：商品卡 WYSIWYG 拖曳模組編輯：schema v3 `placements`、`editable` 模式、版位純函式＋8 個單元測試、新增 2 個內建模組；設計器（模組面板 / 畫布 / 屬性面板）與 8 個 E2E（`packages/merchant-card/src/plugins/placement.ts`、`features/card-editor`、`e2e/designer.spec.ts`）
