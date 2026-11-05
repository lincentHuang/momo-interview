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
- 2026-11-05：實測 momo 首頁（getMainPageV5 / 精選好物榜 / 推薦 / 評分銷量 API）並錄製真實回應快照；卡片樣式依實測 tokens 重做（促銷短語、「起」價、星等、總銷量、TOP 旗標、限搶價 / 最後 N 組 /「搶」、多圖圓點、影片鈕），新增 7 個 momo 行銷標 plugin，schema 升 v4（`packages/merchant-card/src/element`、`plugins/builtin`、`schema`）
- 2026-11-05：momo 真實資料 adapter（raw schema → Card、client、首頁組合、快照 client）＋ 12 個單元測試；Showroom `/momo` 首頁情境頁（快照 / 即時切換、區塊匯入目錄）、`/api/momo/*` 伺服器端代理、類型分析頁資料格式摘要、`docs/momo-data-format.md`（`packages/merchant-card/src/adapters/momo`、`features/momo-home`、`app/api/momo`）
- 2026-11-05：新增卡片（目錄頁按鈕 + 空白格、選類型 / 名稱 / 售價後直接進設計頁、自訂卡片標記、隨機 id 防撞號）；設計頁改為畫布 + 右側編輯面板（內容 / 模組分頁，模組庫併入右側）；E2E 30 個全過（`features/card-catalog/components/new-card-dialog.tsx`、`features/card-editor/components/designer-view.tsx`、`shared/ui/dialog.tsx`、`e2e/designer.spec.ts`）
- 2026-11-05：收藏 / 加入購物車改為可選模組（`favorite` / `add-to-cart` plugin、新插槽 `actions`、plugin render 取得 `runtime`），schema 升 v5 自動補上；卡片等高（React 包裝填滿外層、促銷短語保留一行、輪播圓點疊在圖上）；標籤列單行依重要度排列、放不下收起（編輯模式淡色提示）；商品圖改為 scroll-snap 輪播（滑動 / 箭頭 / 圓點），影片可在卡片內播放（YouTube / 影音檔）；單元 44、E2E 32 全過（`packages/merchant-card/src/element`、`plugins/builtin`、`schema/migrate.ts`、`features/card-preview/momo-card.tsx`、`e2e/sample.spec.ts`）
- 2026-11-05：橫式卡對齊 momo 品牌旗艦橫向卡（淺灰底大圓角、圖片內縮白底圓角、價格放大並與標題拉開，momo 首頁橫向列寬 340px）；加入購物車模組新增樣式設定（自動 / 圓形圖示 / 整條按鈕 / 角落頁籤 / 圖片按鈕，角落與圖片可選卡片右下 / 右上 / 互動列），限搶卡自動顯示右下「搶」頁籤，移除卡片上的「×N 已加購」顯示（`plugins/builtin/index.ts`、`element/styles.ts`）
