# PRD — Merchant Card Showroom

## 目標

分析 momo 商品卡類型，建立 Card Showroom：

- 列出所有商品卡 / 展示單一商品卡
- 商品卡細節調整介面，狀態持久化在瀏覽器端
- 提供 `sample.html`，以 Web Component / `<script>` 方式使用商品卡
- Bonus：高重用卡片架構、Schema / Plugin 擴充、跨宿主狀態一致性

## 非目標

- 不呼叫任何真實 momo API 或圖片資源
- 不追求完整商業功能（結帳、會員）與 UI 像素級還原

## 決策紀錄

- **2026-11-05｜選擇題目 B**：範圍邊界清楚，能在時限內把架構深度做足（schema、plugin、跨宿主同步），比題目 A 的大範圍頁面仿製更能展現平台級設計能力。
- **2026-11-05｜Next.js 16（App Router）作為 Showroom，npm workspaces monorepo**：卡片核心獨立成 `packages/merchant-card`，以 package 邊界強制「卡片不依賴 Showroom」。選 npm workspaces 而非 pnpm / turborepo：兩個 package 不需要額外工具。
- **2026-11-05｜卡片核心採框架無關的 Lit Web Component（使用者決定）**：替代方案是「React 元件 + 包成 WC」。選 Lit 因為嵌入端輕量、最貼近真實跨團隊 SDK（JSP / jQuery / Vue 宿主都能用）；代價是 Showroom 需要一層 React 包裝。
- **2026-11-05｜Radix Primitives 作為 UI 底層（使用者決定）**：無樣式 primitives 提供 a11y 與鍵盤行為，樣式自行以 tokens 控制。Radix 只用於 Showroom，不進卡片（Portal 與 Shadow DOM 不相容）。feature 一律經 `@/shared/ui` 使用，由 ESLint 強制。
- **2026-11-05｜樣式：Showroom 用 Tailwind v4，卡片用純 CSS + CSS 變數（使用者決定）**：卡片需注入 Shadow DOM 並讓宿主可換主題，純 CSS + `--momo-card-*` 最單純。
- **2026-11-05｜行銷標籤移出核心 schema，改由 Plugin 管理**：行銷需求變動最頻繁，不應每次都修改卡片核心並重新發版；未註冊的 extension 保留資料、不渲染，確保向前相容。
- **2026-11-05｜同步策略：BroadcastChannel + storage event + localStorage，整筆紀錄 LWW（rev + origin）**：滿足「單人多分頁 / 多宿主」情境且可證明收斂；不採 CRDT 以控制複雜度。已知限制：同時修改同一張卡的不同欄位時後寫者覆蓋。
- **2026-11-05｜讀到較新 schema 版本時進入唯讀**：避免舊版程式碼覆寫新版資料（部署期間新舊分頁並存）。
- **2026-11-05｜Plugin configSchema 改為 duck-typed `safeParse` 介面，不 re-export zod**：re-export 整包 `z` 使 IIFE bundle 從 42KB 膨脹到 107KB（gzip）；同時讓無建置流程的宿主可以不寫驗證直接註冊 plugin。
- **2026-11-05｜刪除 / 新增卡片不做**：LWW 下的刪除需要 tombstone，時限內優先保證既有卡片同步正確，以「重設」取代。
- **2026-11-05｜以 feature 為單位漸進式 commit（使用者決定）**：呈現演進過程，每個 commit 附 Co-Authored-By。
- **2026-11-05｜E2E 用 production build（next start :3100）、固定 2 workers**：貼近部署行為且不干擾開發中的 dev server；多分頁測試在 4 workers 下 CPU 飽和導致逾時，2 workers 穩定（連跑兩輪 18/18）。
- **2026-11-05｜卡片錯誤採「事件 + 可查詢狀態」雙管道**：Custom Element 在 bundle 載入當下即升級，初次渲染的事件可能早於宿主監聽器；只靠事件會漏接。
- **2026-11-05｜Showroom 改為 sidebar App Shell，次要資訊各自成頁（使用者需求）**：目錄頁移除類型分析與全部重設、編輯器移除 JSON / 事件記錄，改放到「類型分析 / 模組庫 / 嵌入指南 / 設定與同步」與編輯器的「檢視器」子頁，讓目錄與設計頁只保留主要任務。
- **2026-11-05｜商品卡加入 WYSIWYG 拖曳模組編輯（使用者需求）**：模組的位置以卡片層級的 `placements` 覆寫 plugin 預設 slot / order，與 `extensions`（啟用與設定）分開；Schema 升到 v3。雖然欄位有預設值仍需升版——v2 程式碼會剝除未知欄位、寫回時弄丟排版，升版讓舊分頁進入既有的唯讀保護。
- **2026-11-05｜拖放採原生 HTML5 DnD + composedPath，不引入 dnd-kit**：卡片內部在 Shadow DOM，函式庫的碰撞偵測拿不到插槽節點；卡片只在 `editable` 模式輸出 `data-slot / data-plugin-id` 標記，拖放邏輯留在編輯器。代價是原生 DnD 不支援觸控，以「＋」按鈕與屬性面板的換插槽 / 上下移動作為替代。
- **2026-11-05｜新增「活動角標」（media-top）與「購物金回饋」（footer）內建模組**：原本這兩個插槽沒有任何內建模組，拖曳編輯缺乏可展示的組合。
- **2026-11-05｜卡片樣式與欄位對齊 momo 首頁實測（使用者需求），Schema 升到 v4**：新增 subtitle / images / videoUrl / url / priceFrom，`soldCount` 改為共用欄位；限時搶購由「已售 / 總量」改為 `stockRemaining`（momo 只提供「最後 N 組」，總量改選填）。移除折數顯示——momo 列表不顯示折數，折扣資訊由促銷短語承載。
- **2026-11-05｜momo 行銷標全部以 plugin 實作，不進核心 schema**：速 / 折價券 / 登記 / 贈品 / 檔期活動標 / 店⁺ / 預購 / 圖片角標 / 底部橫幅。檔期標（雙11必買等）每檔次不同，只定義「文字 + 底色 + 圖片」通用形狀；同一卡片只取第一個檔期標。折價券移到標籤列（與官網位置一致），金額改選填。
- **2026-11-05｜真實資料串接採「adapter + 伺服器端代理」，預設用錄製快照**：momo 前台 API 非公開、跨網域被 CORS 擋、有 WAF 且無版本承諾——因此 client 只在伺服器端執行、不做任何防護規避；回應經 raw schema（looseObject）與 CardSchema 兩道驗證，單一商品錯誤只進 rejected、單一 API 失敗只進 errors。預設快照兼顧「不依賴外部網站」的原始要求與離線展示，即時模式為選用並快取 5 分鐘。正式上線應改接 momo 商品 feed / 合作 API，只需替換 client。
- **2026-11-05｜直播區塊不串接**：首頁 API 的直播區塊只有標題圖、沒有商品資料；live variant 保留種子資料示範，並在頁面上標示「未渲染」原因。
