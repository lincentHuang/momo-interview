# momo 首頁商品資料格式分析與串接方式

> 實測對象：`https://www.momoshop.com.tw/main/Main.jsp`（桌機版，2026-11-05）
> 錄製樣本：[`packages/merchant-card/src/adapters/momo/snapshot/`](../packages/merchant-card/src/adapters/momo/snapshot/)（真實回應，只裁切商品數量）
> 對應程式：[`packages/merchant-card/src/adapters/momo/`](../packages/merchant-card/src/adapters/momo/)

## 1. 首頁有哪些商品卡

momo 首頁由 `getMainPageV5` 回傳的「區塊（block）」由上而下組成，以 `blockTypeId` 區分。其中**有商品卡**的區塊如下：

| 區塊（blockTypeId） | 畫面上的樣子 | 卡片特徵 | 對應 variant / layout |
| --- | --- | --- | --- |
| 你的精選好物榜（`bt_r_chart`） | 關鍵字分頁 + 橫向捲動 | TOP 盾形旗標（1–3 暖色、4 起灰色）、促銷短語、評分、總銷量 | `ranking` / grid |
| 輪播商品 100 品（`bt_7_777`） | 「超取$190 免運」、「今日暢銷榜」橫式卡輪播 | 左圖右文、mo店+ / 預購小標、「起」價 | `standard` / list |
| 限時搶購商品（`bt_7_713`） | 「超級限搶」5 欄格狀，區塊標題倒數 | 圖片底部檔期橫幅、紅色粗體短語、「限搶價」、「最後 N 組」、紅色「搶」按鈕 | `flash-sale` / grid |
| 你可能會喜歡（`bt_r_waterfall`） | 5 欄瀑布流、捲動載入 | 多圖圓點、影片播放鈕、星等 + 評價數、「速 最快今日」、行銷標列、總銷量 | `standard` / grid |
| 十合一看板_直播（`bt_7_620`） | 開播時段才有商品 | 首頁 API 只給標題圖 | `live`（資料需另接直播 API） |

其餘區塊（`bt_7_701` 輪播大看板、`bt_7_702` 十小福、`bt_7_703` 品牌直式看板、`bt_7_708` 圖示看板、`bt_7_706` 銀行看板、`bt_r_gywts` 猜你想搜…）是 `adInfo` 圖片廣告，不是商品卡。

### 一張 momo 商品卡由哪些元素組成

```
┌───────────────────────────┐
│ [TOP 1]          [活動貼紙] │ ← 排行旗標 / imgTagUrl
│          商品圖      ▶      │ ← imgUrl、vodUrl（播放鈕）
│ [11/5限定｜滿額登記送1080mo] │ ← imgBottomTagUrl（檔期橫幅圖）
│          • ○ ○ ○           │ ← imgUrlArray（多圖）
├───────────────────────────┤
│ 滿1件享95折                  │ ← goodsSubName / subTitle（紅字）
│ 【品牌】商品名稱兩行截斷…     │ ← goodsName / title
│ 限搶價 $3,333起  $10,800     │ ← goodsPriceModel / marketPriceModel（strPrice「起」）
│ ★★★★★ (1,071)              │ ← 另一支 API：getGoodsSaleCountsV2
│ [速 最快今日][雙11必買]       │ ← icon[] displayLayer 0
│ [折價券][登記][贈品]          │ ← icon[] displayLayer 1
│ 總銷量>1.5萬     最後53組 [搶]│ ← saleCount / remainingAmount
└───────────────────────────┘
```

## 2. API 一覽

全部是 `POST` + `Content-Type: application/json`，回應外框一致：`{ success: boolean, resultCode: "200", resultMessage, ... }`。

| 用途 | 端點 | Request body | 回應重點 |
| --- | --- | --- | --- |
| 首頁區塊 | `https://www.momoshop.com.tw/api/moecapp/goods/getMainPageV5` | `{}` | `mainInfo[]`：限搶、輪播商品已內嵌 `contentInfo[]` |
| 精選榜關鍵字 | `…/api/moecapp/getFeaturedGoodsKeywords` | `{ rc:"", visitorID:"", host:"momoshop", abTestingGroup:"groupB" }` | `resultList[]: { value, methodName, sourceOrigin }` |
| 精選榜商品 | `…/api/moecapp/getFeaturedGoodsList` | `{ host, keyword, curPage, methodName, sourceOrigin, mdiv }` | `resultList.goodsList[]`（順序即名次） |
| 你可能會喜歡 | `…/api/moecapp/getRecommendGoods` | `{ host, data: { curPage, curGoodsInfoListSize, mdiv, pageType:"2", recommendType:"11", imgType:"webp", custNo:"", categoryCode:"", ccguid:"", ccsession:"" } }` | `rtnData.goodsInfoList[]`、`curPage` / `maxPage` |
| 評分 / 銷量 | `https://eccapi.momoshop.com.tw/user/getGoodsSaleCountsV2` | `{ host, goodsCode: string[] }` | `saleInfo[goodsCode]: { rating, ratingTimes, saleCount }` |

注意：精選榜的 `curPage` 不是分頁頁碼，而是**關鍵字在分頁清單中的位置**（1-based）。

## 3. 欄位格式與陷阱

### 兩種商品形狀

同一個「商品」在不同 API 欄位名稱不同，adapter 收斂成同一張 `Card`：

| Card 欄位 | 推薦 / 精選榜（goodsInfo） | 首頁區塊（contentInfo） | 清洗 |
| --- | --- | --- | --- |
| `id` | `goodsCode` | `goodsCode` → `blockItem.itemAttrs.goodsCode` → `actionUrl` 的 `i_code` | 加區塊前綴，同商品可同時出現在多區塊 |
| `title` | `goodsName` | `title` | 實測可超過 100 字 → schema 上限 150，畫面兩行截斷 |
| `subtitle` | `goodsSubName` | `subTitle` | 截 40 字 |
| `imageUrl` | `imgUrl`（`_OL`） | `contentImage`（`_OR`） | |
| `images` | `imgUrlArray` | — | 排除 `_OR`（與主圖同一張照片的另一尺寸） |
| `videoUrl` | `vodUrl` | `vodUrl` | 空字串視為無 |
| `price` | `goodsPriceModel.basePrice.price` | 同左 | **字串含千分位**：`"1,090"` → `1090`；缺 model 時退回 `goodsPrice: "$1,690"` |
| `priceFrom` | `basePrice.strPrice === "起"` | 同左 | 多規格最低價 |
| `originalPrice` | `marketPriceModel.basePrice.price` | 同左 | 只保留「大於售價」的值 |
| `url` | 純數字代碼 → `GoodsDetail.jsp?i_code=` | `TP` 開頭（mo店+）→ `action.actionUrl` | |
| `rating` / `reviewCount` / `soldCount` | 另一支 API | — | `"(1,071)"` → 1071、`"總銷量>1.5萬"` → 15000（只有區間下限） |

### 限時搶購專屬

- `remainingAmount: "53"` → `stockRemaining`。momo **不提供活動總量**，所以 schema v4 把「已搶 %」改為「最後 N 組」，`stockTotal` 變選填。
- 結束時間：每個商品 `actionV2.extraValue.limitGoodsSellInterval.endDate`（epoch ms），缺漏才用區塊 `headerInfo.endTime`。
- 區塊標題倒數底色 `headerInfo.countDownBgColor: "#D62872"`。

### 行銷標 → Plugin

| 原始資料 | 判斷方式 | Plugin |
| --- | --- | --- |
| `icon.iconContent === "速"`，圖片 `fastDely_earliest_today_s.png` | 內容 + 圖檔名 | `fast-delivery`（最快今日 / 明日） |
| `icon.iconContentType === "isCp"` | 型別 | `coupon` |
| `icon.iconContentType === "isRegister"` | 型別 | `register` |
| `icon.iconContentType === "isGift"` | 型別 | `gift` |
| 其他 icon（雙11必買、衝上熱銷…） | 無型別、內容每檔期不同 | `campaign-tag`（文字 + 底色 + 選填圖片） |
| `goodsTag.content === "&#24215;&#8314;"` | **HTML entity** 解碼 →「店⁺」 | `store-plus` |
| `goodsTag.content === "&#38928;"` | 解碼 →「預」 | `pre-order` |
| `imgTagUrl` / `imgBottomTagUrl` | 有值 | `image-tag` / `bottom-banner` |

其他陷阱：`blockName`、`itemAttrs.goodsName` 是 percent-encoding（`+` 代表空白）；`displayLayer` 是字串 `"0"` / `"1"`；部分區塊的 `basePrice` 是空物件。

## 4. 串接方式（直接可用）

```ts
import { createMomoClient, loadMomoHomepage } from "@momo/merchant-card/momo";

// 必須在伺服器端執行：momo API 不允許跨網域（CORS）
const page = await loadMomoHomepage(createMomoClient());
for (const section of page.sections) {
  section.kind;      // "flash-sale" | "ranking" | "carousel" | "waterfall"
  section.cards;     // 已通過 CardSchema 驗證的 Card[]
  section.rejected;  // 資料不合法而略過的商品與原因
}
page.errors;         // 區塊層級失敗（例如推薦 API 逾時），不影響其他區塊
```

卡片可直接交給 Web Component：

```js
document.querySelector("momo-product-card").card = page.sections[0].cards[0];
```

Showroom 內建的代理：

| 路由 | 說明 |
| --- | --- |
| `GET /api/momo/home?source=snapshot` | 錄製快照（預設；不對 momo 發請求，限搶時間平移到現在之後） |
| `GET /api/momo/home?source=live` | 即時呼叫 momo，伺服器端快取 5 分鐘 |
| `GET /api/momo/featured?source=&keyword=&mdiv=&keywords=` | 精選榜切換關鍵字 |

### 防禦設計

1. **兩道驗證邊界**：raw schema（`raw.ts`，looseObject，只驗 adapter 會讀的欄位）→ `CardSchema`。momo 加欄位不會壞；改欄位會得到明確的 `MomoApiError("回應格式與預期不符")`。
2. **商品層級隔離**：單一商品轉換失敗進 `rejected`，不影響同區塊其他商品；次要 API 失敗進 `errors`，不影響其他區塊。
3. **時間用絕對值**：`endsAt` 存 epoch ms，跨分頁 / 跨宿主同步不漂移。

### 限制與正式上線建議

- 這些是 momo 網站前端自用 API，**不是公開 API**：沒有版本承諾，且有 WAF，可能拒絕非瀏覽器來源的請求。client 不做任何規避，失敗時直接回報錯誤，Showroom 會提示改用快照。
- 正式串接應改走 momo 提供的商品 feed / 合作 API。屆時只需替換 `client.ts`（取得資料），`map.ts`（欄位對應）與卡片元件不必改。
- 直播區塊的商品不在首頁 API 中，`live` variant 目前由 Showroom 種子資料示範。
- 呼叫頻率請自行節流；Showroom 的即時模式有 5 分鐘快取。
