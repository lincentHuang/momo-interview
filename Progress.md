# Progress

- 2026-11-05：建立 npm workspaces monorepo（Next.js 16 showroom + merchant-card 套件）（`package.json`、`apps/showroom`、`packages/merchant-card`）
- 2026-11-05：商品卡領域模型、版本遷移、Plugin Registry 與 5 個內建 plugin（`packages/merchant-card/src/schema`、`src/plugins`）
- 2026-11-05：跨分頁 / 跨宿主同步 Store（LWW、read-merge-write、唯讀保護）＋ 18 個單元測試（`src/store`、`src/__tests__`）
- 2026-11-05：`<momo-product-card>` Lit Web Component，ES / IIFE 打包 42KB gzip（`src/element`、`vite.config.ts`）
- 2026-11-05：Showroom：Radix 共用 UI、目錄、Schema 驅動編輯器、分享連結、ESLint feature 邊界（`apps/showroom/src`）
- 2026-11-05：sample.html 純 HTML 嵌入範例；瀏覽器實測編輯器 ↔ sample.html 雙向同步（`apps/showroom/public/sample.html`）
- 2026-11-05：README（架構、取捨、演進）、PRD 決策紀錄（`README.md`、`PRD.md`）
