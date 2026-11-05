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
