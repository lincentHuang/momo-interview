/**
 * momo 首頁資料格式摘要（完整版：docs/momo-data-format.md）。
 * 靜態內容，Server Component。
 */
const BLOCKS = [
  { id: "bt_r_chart", name: "你的精選好物榜", look: "關鍵字分頁、TOP 旗標、評分、總銷量", card: "ranking" },
  { id: "bt_7_777", name: "輪播商品（超取免運 / 今日暢銷榜）", look: "左圖右文、店⁺ / 預購、「起」價", card: "standard · list" },
  { id: "bt_7_713", name: "限時搶購", look: "檔期橫幅圖、限搶價、最後 N 組、「搶」", card: "flash-sale" },
  { id: "bt_r_waterfall", name: "你可能會喜歡", look: "多圖、影片、星等、速 最快今日、行銷標列", card: "standard · grid" },
  { id: "bt_7_620", name: "十合一看板_直播", look: "首頁 API 只有標題圖", card: "live（需另接 API）" },
];

const APIS = [
  { name: "getMainPageV5", body: "{}", out: "mainInfo[]，限搶 / 輪播內嵌 contentInfo[]" },
  { name: "getFeaturedGoodsKeywords → getFeaturedGoodsList", body: "{ keyword, curPage = 關鍵字位置 }", out: "goodsList[]，順序即名次" },
  { name: "getRecommendGoods", body: "{ data: { curPage, mdiv, recommendType: \"11\" } }", out: "goodsInfoList[]、maxPage" },
  { name: "getGoodsSaleCountsV2（eccapi）", body: "{ goodsCode: string[] }", out: "{ rating, ratingTimes: \"(1,071)\", saleCount: \"總銷量>1.5萬\" }" },
];

const PITFALLS = [
  ["價格是字串且含千分位", "\"1,090\" → 1090；basePrice.strPrice === \"起\" → priceFrom"],
  ["兩種商品形狀", "goodsName / imgUrl（推薦、精選榜）vs title / contentImage（首頁區塊）"],
  ["HTML entity", "goodsTag \"&#24215;&#8314;\" →「店⁺」→ store-plus plugin"],
  ["限搶沒有總量", "只有 remainingAmount → schema v4 改為 stockRemaining（最後 N 組）"],
  ["銷量只有區間", "「總銷量>1.5萬」→ soldCount 15000（下限），呈現時再格式化"],
  ["非公開 API", "跨網域被 CORS 擋、有 WAF、無版本承諾 → 伺服器端代理 + 兩道 schema 驗證"],
];

export function MomoDataFormat() {
  return (
    <section id="data-format" aria-labelledby="data-format-title" className="mt-10 scroll-mt-6 space-y-5">
      <header>
        <h2 id="data-format-title" className="text-lg font-semibold tracking-tight">
          momo 首頁資料格式與串接
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          實測 www.momoshop.com.tw 首頁（2026-11-05）。原始回應經 <code>@momo/merchant-card/momo</code> 的 adapter 轉成已驗證的 Card，
          可直接交給 <code>&lt;momo-product-card&gt;</code>；完整欄位對照見 <code>docs/momo-data-format.md</code>。
        </p>
      </header>

      <Table
        caption="首頁商品區塊 → 卡片類型"
        head={["區塊", "畫面特徵", "對應卡片"]}
        rows={BLOCKS.map((b) => [
          <span key="n">
            {b.name}
            <code className="ml-1 text-xs text-muted">{b.id}</code>
          </span>,
          b.look,
          <code key="c">{b.card}</code>,
        ])}
      />
      <Table caption="商品資料 API（皆為 POST JSON）" head={["端點", "Request", "回應重點"]} rows={APIS.map((a) => [<code key="n">{a.name}</code>, <code key="b">{a.body}</code>, a.out])} />
      <Table caption="格式陷阱與處理" head={["問題", "處理方式"]} rows={PITFALLS} />

      <pre className="overflow-x-auto rounded-lg bg-ink p-4 text-xs leading-relaxed text-white">
        {`import { createMomoClient, loadMomoHomepage } from "@momo/merchant-card/momo";

// 伺服器端執行（CORS）；Showroom 已提供 GET /api/momo/home?source=live
const page = await loadMomoHomepage(createMomoClient());
cardElement.card = page.sections[0].cards[0];   // 已通過 CardSchema 驗證`}
      </pre>
    </section>
  );
}

function Table({ caption, head, rows }: { caption: string; head: string[]; rows: Array<Array<React.ReactNode>> }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="border-b border-line px-4 py-2.5 text-left text-sm font-medium">{caption}</caption>
        <thead className="bg-surface-muted text-xs text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-line align-top">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
