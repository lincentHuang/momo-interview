# Frontend Take Home Evaluation（Senior / Principal）完整解析與指南

---

## 一、 原文結構化轉錄（PDF 完整內容）

### 1. 評估目的
本評估希望了解候選人在現代 Web Engineering 環境中的：
- 架構與可維護性思維
- Production / Delivery Thinking
- AI / Agent 協作與工程判斷能力

**我們更重視：**
- 問題拆解 / 系統演進能力
- Tradeoff Thinking / Delivery Quality
- **而不只是功能完成度。**

---

### 2. 時間限制
#### Phase 1 — Design / Planning（約 1 小時）
可與 AI / Agents 討論：
- 架構方向
- Workflow Planning
- Implementation Strategy

> 建議保留設計筆記、Tradeoff 分析與 AI / Agent 協作紀錄，作為後續 On-site Discussion 的一部分。

#### Phase 2 — Implementation（約 1~2 小時）
開始與 AI / Agents 協作開發。
時間將以：
- First Commit 至最後 Commit
- 或第一個 Commit 後約 120 分鐘內的 Commits
作為主要參考。

> 請在有限時間內做出合理取捨，並說明哪些部分優先、哪些部分刻意不做。若時間不足，可優先完成核心架構與設計方向。

---

### 3. 題目（二選一）

#### 選項 A：Mocking momoshop
參考並建立 momo 電商網站（純前端實作，無任何真實網站 API 呼叫）。

- **建議路由（至少一個）：**
  - `/`, `/search/...`
  - `/goods/...`, `/discover/...`, `/live/...`
- **可自由決定：**
  - Component Architecture / Routing
  - State Management / Rendering Strategy / Mock Data Structure
  - 可自行設計並使用 Mock Data，不需串接真實後端。
- **考核重點：**
  - 實作結果與真實網站的差異
  - 開發流程規劃與 Agent 協作效率評估/分析
- **Bonus：**
  - Human-Agent Iteration Architecture（人機協作迭代架構）
  - Validation / Observability Thinking（驗證與可觀測性思維）

#### 選項 B：Merchant Card Showroom
分析真實 momo 電商商品卡類型，建立 Card Showroom。

- **基本需求（至少一個卡片）：**
  - 列出所有商品卡 / 展示單一商品卡
  - 商品卡細節調整介面 — Browser-side Persistence（瀏覽器端狀態持久化）
  - 提供 `sample.html` 使用上述商品卡的範例（可以是 Web Component 或 `<script>` 載入的方式）
- **Bonus：**
  - Reusable Card Architecture（高重用卡片架構）
  - Schema / Plugin Extensibility（Schema 驅動 / 插件擴充性）
  - State Consistency Strategy（跨宿主環境的狀態一致性策略）

---

### 4. 技術限制與提交內容
- **技術限制：**
  - 不限框架與工具，可自由使用：Codex / Claude / Gemini / Cursor / Copilot ... 及任何 OSS Libraries。
  - **我們更重視：** Engineering Judgment / Maintainability、AI / Agent Supervision Capability。
  - 不需追求完整商業功能或 UI 精緻度，我們更重視系統設計、可維護性與工程判斷。
- **提交內容：**
  - Source Code（GitHub Repo 或 Zip with Git History）
  - Git History（包含 Agent Co-authored Logs）
  - README / Docs / 架構與 Tradeoff 說明 / 後續演進方向
  - *README 與 Commit History 也將作為評估的一部分。請將自己視為：**此系統的長期維護者，而不只是功能實作者。***

---

## 二、 深度策略分析（Senior / Principal 視角）

這份測驗非常明確地針對 **Staff / Principal / 資深前端架構師** 設計，核心考察點並非「手刻頁面的速度」，而是**「如何駕馭 AI Agent 建立具備長期演進能力的工業級架構」**。

### 1. 關鍵得分細節（隱藏考點）
1. **Commit 計時機制（120 分鐘窗口）**：
   - 題目明言：「時間將以 First Commit 至最後 Commit，或第一個 Commit 後約 120 分鐘內的 Commits 作為主要參考」。
   - **關鍵策略**：**在 Phase 1（架構設計、需求拆解、分析真實網站結構、撰寫 Prompt 與架構藍圖 / Spec）絕對不要先下 `git commit`！** 等到設計文件與實作計畫完全就緒，進入 Phase 2 準備開始生成程式碼時，再進行 `First Commit`，並保持每 15~20 分鐘有清晰、語意明確且帶有 `Co-authored-by` 的漸進式 Commit 紀錄。
2. **AI / Agent 監督能力（Supervision Capability）**：
   - 面試官不希望看到「丟一句話給 AI 吐出整包義大利麵程式碼」。
   - 他們想看到你如何**約束 AI**（例如：先定義好 TypeScript Interface / Zod Schema / 架構邊界 / 設計規範檔案，再讓 Agent 依照契約填充實作），以及當 AI 產出不合規的架構時，你如何進行修正與驗收。
3. **「長期維護者」視角**：
   - 你的程式碼與文件必須回答：「如果下個月有 10 個工程師或 10 個 AI Agent 同時在這個 Repo 開發新頁面/新商品卡，這個架構如何防止腐化？」

---

### 2. 題目二選一：優劣勢與選題建議

| 比較維度 | 題目 A：Mocking momoshop | 題目 B：Merchant Card Showroom |
| :--- | :--- | :--- |
| **核心技術挑戰** | 複雜高密度電商頁面的模組化、Mock 資料契約設計、路由與狀態分層、人機迭代閉環驗證 | 跨框架/跨頁面嵌入（Web Components / SDK）、Schema-Driven UI、Playground 狀態同步與持久化 |
| **時間掌控度 (1~2hr)** | 範圍較大，容易不小心花太多時間在 UI 細節，需嚴格定義 Scope（例如專注做好 `/` 首頁與 `/search` 或 `/goods`） | **邊界非常清晰**，3 個基本需求加上 3 個 Bonus 剛好對應一個微前端/Design System 級別的精巧架構，極易在 2 小時內做深做透 |
| **展現 Principal 深度的方式** | 展現 **App-level Architecture**：BFF Mock 契約層、Server/Client 狀態分離、Observability（埋點/錯誤邊界/效能監控抽象）、AI 自動化視覺/DOM 對齊驗證 | 展現 **Platform / Design System Architecture**：Compound Components / Schema-driven 渲染引擎、Shadow DOM 樣式隔離或 CSS Variables 主題化、主站與第三方頁面透過 `<script>` 嵌入時的狀態同步 |
| **適合對象** | 擅長大型電商主站架構、Next.js / React 生態系、全站狀態與資料流設計、自動化測試與觀測機制 | 擅長跨團隊元件庫、微前端（Web Components / Widget SDK）、高度抽象的 Schema/Plugin 系統設計 |

#### 💡 選題分析：
- **選 B（Merchant Card Showroom）的優勢**：
  momo 電商有極多變體的商品卡（一般搜尋卡、限時搶購卡、直播商品卡、折價券標籤卡、多規格卡）。如果選擇 **題目 B**，你可以在 1.5 小時內把「**架構深度**」拉到滿分：
  1. 用 **Schema-driven + Slot/Plugin 架構** 定義商品卡（處理千變萬化的行銷 Badge、價格區塊、CTA 按鈕）。
  2. 提供一個即時預覽與調整參數的 **Showroom Playground**（使用 `localStorage` + URL Search Params 進行 Browser-side Persistence 與狀態分享）。
  3. 透過打包產出（或 Custom Elements `customElements.define('momo-product-card', ...)`）提供一個純靜態 `sample.html`，展示外部系統僅需一行 `<script>` 與 `<momo-product-card>` 即可嵌入並雙向同步狀態。
- **選 A（Mocking momoshop）的優勢**：
  如果你想展現你對 **大型高流量電商系統整體運作（Routing、Search Filter 狀態管理、商品頁規格選擇器、Observability 埋點系統、以及如何用 Agent 自動抓取/比對真實網站結構）** 的掌控力，題目 A 的發揮空間很大，尤其在 Bonus 的「Human-Agent Iteration Architecture（如何建立一套讓 Agent 自動比對實作與真實 momo 差異並自我修正的工作流）」會非常驚豔。

---

### 3. 高分交付架構藍圖建議（README 必備結構）

無論選擇 A 或 B，你的 `README.md` 與設計文件建議包含以下章節（完全命中評分標準）：

1. **Architecture Overview & System Boundaries（系統架構與邊界設計）**
   - 架構圖（Mermaid）與核心模組職責劃分。
2. **Scope & Deliberate Trade-offs（有限時間內的取捨決策）**
   - **P0（優先實作並確保工業級品質）**：核心資料契約（Schema）、擴充機制、狀態持久化、核心互動。
   - **P1/P2（刻意不做但留好擴充介面）**：複雜動畫、完整後端認證、邊緣瀏覽器相容等，並清楚說明「為什麼不做」以及「架構上預留了哪個 Hook/Interface 供未來接手」。
3. **Human-Agent Collaboration Workflow（AI 協作工作流與監督紀錄）**
   - 記錄你如何將 Phase 1 的規劃轉化為護欄（Guardrails / Spec），讓 Agent 在 Phase 2 高效產出，以及你在哪些關鍵節點介入修正了 Agent 的設計（展現 Engineering Judgment）。
4. **Evolution & Production Readiness（系統演進與上線準備）**
   - 驗證與可觀測性（Observability / Telemetry / Schema Validation）、效能優化策略、團隊協作擴展方向。
