import { parseCard } from "../index";
import {
  applySaleInfo,
  columnGoodsToCard,
  createMomoClient,
  createSnapshotClient,
  decodeEntities,
  goodsInfoToCard,
  limitBuyToCard,
  loadMomoHomepage,
  MomoApiError,
  parseMoney,
  parseSaleCount,
  tagsToExtensions,
} from "../adapters/momo";
import mainPage from "../adapters/momo/snapshot/main-page-v5.json";
import recommend from "../adapters/momo/snapshot/recommend-goods.json";

describe("momo 清洗工具", () => {
  it("金額與銷量字串", () => {
    expect(parseMoney("1,090")).toBe(1090);
    expect(parseMoney("")).toBeUndefined();
    expect(parseMoney("$52,999")).toBe(52999);
    expect(parseSaleCount("總銷量>1.5萬")).toBe(15000);
    expect(parseSaleCount("總銷量>3,000")).toBe(3000);
    expect(parseSaleCount(undefined)).toBeUndefined();
  });

  it("HTML entity：店⁺ / 預", () => {
    expect(decodeEntities("&#24215;&#8314;")).toBe("店⁺");
    expect(decodeEntities("&#38928;")).toBe("預");
  });

  it("行銷標對應到 plugin", () => {
    const ext = tagsToExtensions(
      [
        { iconContent: "速", iconImgUrl: "https://x/fastDely_earliest_today_s.png", displayLayer: "0" },
        { iconContent: "折價券", iconContentType: "isCp", iconBgColor: "#FF4C76" },
        { iconContent: "登記", iconContentType: "isRegister" },
        { iconContent: "贈品", iconContentType: "isGift" },
        { iconContent: "雙11必買", iconBgColor: "#BE0211", iconImgUrl: "https://x/d11.png" },
        { iconContent: "衝上熱銷" },
      ],
      [{ content: "&#24215;&#8314;" }],
    );
    expect(ext).toEqual({
      "fast-delivery": { label: "最快今日" },
      coupon: {},
      register: {},
      gift: { text: "贈品" },
      "campaign-tag": { text: "雙11必買", color: "#BE0211", imageUrl: "https://x/d11.png" },
      "store-plus": {},
    });
  });
});

describe("momo 錄製回應 → Card", () => {
  const blocks = mainPage.mainInfo as Array<{ blockTypeId: string; contentInfo?: unknown[]; headerInfo?: { endTime?: number } }>;

  it("推薦商品：每一筆都轉成合法卡片，主圖不重複放進 images", () => {
    const list = recommend.rtnData.goodsInfoList;
    const results = list.map((g) => goodsInfoToCard(g));
    expect(results.every((r) => r.ok)).toBe(true);
    for (const r of results) {
      if (!r.ok) continue;
      expect(r.card.url).toMatch(/GoodsDetail\.jsp\?i_code=\d+/);
      expect(r.card.images.some((u) => /_OR[_.]/.test(u))).toBe(false);
    }
  });

  it("限時搶購：結束時間、剩餘組數、劃線價", () => {
    const block = blocks.find((b) => b.blockTypeId === "bt_7_713")!;
    const raw = block.contentInfo![0] as { remainingAmount: string };
    const r = limitBuyToCard(raw, block.headerInfo?.endTime);
    expect(r.ok).toBe(true);
    if (!r.ok || r.card.variant !== "flash-sale") return;
    expect(r.card.stockRemaining).toBe(Number(raw.remainingAmount));
    expect(r.card.endsAt).toBeGreaterThan(0);
    expect(r.card.originalPrice).toBeGreaterThan(r.card.price);
  });

  it("輪播商品：「起」價與 mo店+ 標", () => {
    const items = blocks.filter((b) => b.blockTypeId === "bt_7_777").flatMap((b) => b.contentInfo ?? []);
    const cards = items.map((c) => columnGoodsToCard(c)).flatMap((r) => (r.ok ? [r.card] : []));
    expect(cards.length).toBe(items.length);
    expect(cards.some((c) => c.priceFrom)).toBe(true);
    expect(cards.some((c) => "store-plus" in c.extensions)).toBe(true);
    expect(cards.every((c) => c.layout === "list")).toBe(true);
  });

  it("單一商品資料壞掉只會被拒絕，不會拋錯", () => {
    const r = goodsInfoToCard({ goodsCode: "1", goodsName: "x", imgUrl: "i", goodsPriceModel: { basePrice: { price: "" } } });
    expect(r).toEqual({ ok: false, goodsCode: "1", reason: "缺少售價" });
    expect(goodsInfoToCard(null).ok).toBe(false);
  });

  it("合併評分 / 銷量", () => {
    const r = goodsInfoToCard(recommend.rtnData.goodsInfoList[0]);
    if (!r.ok) throw new Error(r.reason);
    const card = applySaleInfo(r.card, { rating: "4.9", ratingTimes: "(1,071)", saleCount: "總銷量>1.5萬" });
    expect(card).toMatchObject({ rating: 4.9, reviewCount: 1071, soldCount: 15000 });
    expect(parseCard(card).ok).toBe(true);
  });
});

describe("loadMomoHomepage", () => {
  it("錄製資料組成四種區塊，限時搶購時間平移到未來", async () => {
    const now = 2_000_000_000_000;
    const page = await loadMomoHomepage(createSnapshotClient({ now: () => now }), { now: () => now });
    expect(page.errors).toEqual([]);
    expect(page.sections.map((s) => s.kind).sort()).toEqual(["carousel", "carousel", "flash-sale", "ranking", "waterfall"]);
    const flash = page.sections.find((s) => s.kind === "flash-sale")!;
    expect(flash.endsAt).toBeGreaterThan(now);
    for (const s of page.sections) expect(new Set(s.cards.map((c) => c.id)).size).toBe(s.cards.length);
    const ranking = page.sections.find((s) => s.kind === "ranking")!;
    expect(ranking.cards.map((c) => (c.variant === "ranking" ? c.rank : 0))).toEqual([1, 2, 3, 4, 5]);
    expect(ranking.keywords?.length).toBeGreaterThan(1);
    const waterfall = page.sections.find((s) => s.kind === "waterfall")!;
    expect(waterfall.cards.some((c) => c.soldCount !== undefined)).toBe(true);
    expect(page.skipped.map((s) => s.blockTypeId)).toEqual(["bt_7_620"]);
  });

  it("次要 API 失敗只記錄在 errors", async () => {
    const snap = createSnapshotClient();
    const page = await loadMomoHomepage({ ...snap, getRecommendGoods: () => Promise.reject(new Error("逾時")) });
    expect(page.errors).toEqual([{ section: "你可能會喜歡", message: "逾時" }]);
    expect(page.sections.find((s) => s.kind === "flash-sale")!.cards.length).toBeGreaterThan(0);
  });
});

describe("createMomoClient", () => {
  const fakeFetch = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it("以 POST JSON 呼叫正確端點", async () => {
    const f = fakeFetch(mainPage);
    await createMomoClient({ fetch: f }).getMainPage();
    expect(f).toHaveBeenCalledWith("https://www.momoshop.com.tw/api/moecapp/goods/getMainPageV5", expect.objectContaining({ method: "POST", body: "{}" }));
  });

  it("形狀不符 / 業務錯誤 / HTTP 錯誤都轉成 MomoApiError", async () => {
    await expect(createMomoClient({ fetch: fakeFetch({ foo: 1 }) }).getMainPage()).rejects.toBeInstanceOf(MomoApiError);
    await expect(
      createMomoClient({ fetch: fakeFetch({ success: false, resultCode: "400", resultMessage: "請求參數錯誤" }) }).getFeaturedKeywords(),
    ).rejects.toThrow("請求參數錯誤");
    await expect(createMomoClient({ fetch: fakeFetch({}, 503) }).getMainPage()).rejects.toThrow("HTTP 503");
  });
});
