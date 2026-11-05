import { defaultActionExtensions, parseCard, type Card, type CardInput } from "../../schema/card.schema";
import { RawColumnGoods, RawGoodsInfo, type RawIcon, type RawPriceModel, type RawSaleInfo } from "./raw";

/**
 * momo 原始資料 → Card。
 *
 * 每個 mapper 都是純函式：輸入未知資料（unknown），輸出「已通過 CardSchema 驗證」的卡片或錯誤原因。
 * 單一商品資料異常只會被丟進 rejected，不會讓整個區塊失敗 —— 首頁一次 100+ 個商品，不能一顆壞就全白。
 */

export type MapResult = { ok: true; card: Card } | { ok: false; goodsCode: string; reason: string };

// ---------- 清洗工具 ----------

/** "1,090" → 1090；空字串、非數字回傳 undefined */
export function parseMoney(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && value.trim() !== "" ? Math.round(n) : undefined;
}

/** "總銷量>1.5萬" → 15000、"總銷量>3,000" → 3000。momo 只給區間下限，取下限 */
export function parseSaleCount(value: string | undefined): number | undefined {
  const m = value?.match(/([\d,.]+)\s*(萬)?/);
  if (!m?.[1]) return undefined;
  const n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return undefined;
  return Math.round(m[2] ? n * 10_000 : n);
}

/** "(1,071)" → 1071 */
export function parseRatingTimes(value: string | undefined): number | undefined {
  const n = parseMoney(value);
  return n === undefined ? undefined : n;
}

/** goodsTag.content 是 HTML entity："&#24215;&#8314;" →「店⁺」 */
export function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** priceModel 優先；缺漏時退回舊的格式化字串欄位（"$1,690"） */
function readPrice(model: RawPriceModel | undefined, legacy?: string): { value?: number; from: boolean } {
  const base = model?.basePrice;
  const value = parseMoney(base?.price) ?? parseMoney(legacy);
  return { value, from: base?.strPrice === "起" };
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const clip = (s: string | undefined, max: number) => (s ? s.trim().slice(0, max) || undefined : undefined);

/** 商品頁連結：純數字 goodsCode 是 momo 自營商品；TP 開頭是 mo店+，連結以 API 給的 actionUrl 為準 */
export function goodsUrl(goodsCode: string | undefined, actionUrl?: string): string | undefined {
  if (goodsCode && /^\d+$/.test(goodsCode)) return `https://www.momoshop.com.tw/goods/GoodsDetail.jsp?i_code=${goodsCode}`;
  return actionUrl || undefined;
}

// ---------- 行銷標 → plugin extensions ----------

type Extensions = Record<string, Record<string, unknown>>;

function fastDeliveryLabel(icon: RawIcon): string {
  const url = icon.iconImgUrl ?? "";
  if (/today/i.test(url)) return "最快今日";
  if (/tomorrow/i.test(url)) return "最快明日";
  return "24H到貨";
}

/**
 * icon[]（推薦 / 排行 API）與 goodsTag[]（首頁區塊）→ extensions。
 * 對應規則：
 *   iconContent "速"            → fast-delivery
 *   iconContentType isCp        → coupon
 *   iconContentType isRegister  → register
 *   iconContentType isGift      → gift
 *   goodsTag「店⁺」              → store-plus
 *   goodsTag「預」               → pre-order
 *   其他（雙11必買、衝上熱銷…）   → campaign-tag（只取第一個；檔期標同時只會強調一個）
 */
export function tagsToExtensions(icons: ReadonlyArray<RawIcon> = [], goodsTags: ReadonlyArray<{ content?: string; bgColor?: string; imgUrl?: string }> = []): Extensions {
  const ext: Extensions = {};
  for (const icon of icons) {
    const content = icon.iconContent?.trim() ?? "";
    if (content === "速") ext["fast-delivery"] = { label: fastDeliveryLabel(icon) };
    else if (icon.iconContentType === "isCp") ext.coupon = {};
    else if (icon.iconContentType === "isRegister") ext.register = {};
    else if (icon.iconContentType === "isGift") ext.gift = { text: content.slice(0, 16) || "贈品" };
    else if (content && !ext["campaign-tag"]) {
      ext["campaign-tag"] = {
        text: content.slice(0, 12),
        color: HEX.test(icon.iconBgColor ?? "") ? icon.iconBgColor! : "#E4007F",
        ...(icon.iconImgUrl ? { imageUrl: icon.iconImgUrl } : {}),
      };
    }
  }
  for (const tag of goodsTags) {
    const text = decodeEntities(tag.content ?? "").trim();
    if (/^店[⁺+]$/.test(text)) ext["store-plus"] = {};
    else if (text === "預") ext["pre-order"] = {};
    else if (text && !ext["campaign-tag"]) {
      ext["campaign-tag"] = { text: text.slice(0, 12), color: HEX.test(tag.bgColor ?? "") ? tag.bgColor! : "#E4007F" };
    }
  }
  return ext;
}

function imageExtensions(imgTagUrl?: string, imgBottomTagUrl?: string): Extensions {
  const ext: Extensions = {};
  if (imgTagUrl) ext["image-tag"] = { imageUrl: imgTagUrl };
  if (imgBottomTagUrl) ext["bottom-banner"] = { imageUrl: imgBottomTagUrl };
  return ext;
}

// ---------- 驗證邊界 ----------

function finalize(input: CardInput, goodsCode: string): MapResult {
  // 收藏 / 購物車是可選模組；momo 轉出的卡片預設開啟（行銷標以外的互動能力）
  const parsed = parseCard({ ...input, extensions: { ...defaultActionExtensions(), ...input.extensions } });
  if (parsed.ok) return { ok: true, card: parsed.card };
  return { ok: false, goodsCode, reason: parsed.issues.map((i) => `${i.path}：${i.message}`).join("；") };
}

function rejectRaw(raw: unknown, issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>): MapResult {
  const code = typeof raw === "object" && raw && "goodsCode" in raw ? String((raw as { goodsCode: unknown }).goodsCode) : "?";
  return { ok: false, goodsCode: code, reason: issues.map((i) => `${i.path.join(".")}：${i.message}`).join("；") };
}

/** 劃線價只在「真的比售價高」時保留；momo 偶有原價 = 售價 + 1 的資料，照樣保留（顯示與官網一致） */
function originalPrice(market: number | undefined, price: number): number | undefined {
  return market !== undefined && market > price ? market : undefined;
}

// ---------- mappers ----------

export interface MapOptions {
  /** 卡片 id 前綴；同一商品可能同時出現在多個區塊（例如限搶 + 熱銷），以前綴區分 */
  idPrefix?: string;
  layout?: "grid" | "list";
}

/** getRecommendGoods（你可能會喜歡）商品 → 一般商品卡 */
export function goodsInfoToCard(raw: unknown, opts: MapOptions = {}): MapResult {
  const r = RawGoodsInfo.safeParse(raw);
  if (!r.success) return rejectRaw(raw, r.error.issues);
  const g = r.data;
  const price = readPrice(g.goodsPriceModel, g.goodsPrice);
  if (price.value === undefined) return { ok: false, goodsCode: g.goodsCode, reason: "缺少售價" };
  const market = readPrice(g.marketPriceModel, g.marketPrice).value;
  return finalize(
    {
      id: `${opts.idPrefix ?? "momo"}-${g.goodsCode}`,
      variant: "standard",
      layout: opts.layout ?? "grid",
      title: g.goodsName.slice(0, 150),
      subtitle: clip(g.goodsSubName, 40),
      imageUrl: g.imgUrl,
      // imgUrlArray 第一張（_OR）與主圖是同一張照片的不同尺寸，排除後才是「其他角度」
      images: (g.imgUrlArray ?? []).filter((u) => !/_OR[_.]/.test(u) && u !== g.imgUrl).slice(0, 5),
      videoUrl: g.vodUrl || undefined,
      url: goodsUrl(g.goodsCode, g.action?.actionUrl),
      price: price.value,
      priceFrom: price.from,
      originalPrice: originalPrice(market, price.value),
      extensions: { ...tagsToExtensions(g.icon, g.goodsTag), ...imageExtensions(g.imgTagUrl, g.imgBottomTagUrl) },
    },
    g.goodsCode,
  );
}

/** getFeaturedGoodsList（你的精選好物榜）商品 → 排行榜卡；名次 = 陣列順序 */
export function featuredGoodsToCard(raw: unknown, rank: number, keyword: string, opts: MapOptions = {}): MapResult {
  const base = goodsInfoToCard(raw, { idPrefix: opts.idPrefix ?? "momo-rank", layout: opts.layout });
  if (!base.ok) return base;
  const { variant: _v, ...shared } = base.card;
  return finalize({ ...shared, variant: "ranking", rank, rankCategory: keyword.slice(0, 20) || "精選" }, base.card.id);
}

/** 首頁輪播商品區塊（bt_7_777，例如「超取$190免運」、「今日暢銷榜」）→ 一般商品卡（橫式） */
export function columnGoodsToCard(raw: unknown, opts: MapOptions = {}): MapResult {
  const r = RawColumnGoods.safeParse(raw);
  if (!r.success) return rejectRaw(raw, r.error.issues);
  const c = r.data;
  const code = c.goodsCode ?? c.blockItem?.itemAttrs?.goodsCode ?? c.action?.actionValue ?? "";
  const price = readPrice(c.goodsPriceModel).value;
  if (!code || price === undefined) return { ok: false, goodsCode: code || "?", reason: "缺少商品代碼或售價" };
  return finalize(
    {
      id: `${opts.idPrefix ?? "momo"}-${code}`,
      variant: "standard",
      layout: opts.layout ?? "list",
      title: c.title.slice(0, 150),
      subtitle: clip(c.subTitle, 40),
      imageUrl: c.contentImage,
      videoUrl: c.vodUrl || undefined,
      url: goodsUrl(code, c.action?.actionUrl),
      price,
      priceFrom: readPrice(c.goodsPriceModel).from,
      originalPrice: originalPrice(readPrice(c.marketPriceModel).value, price),
      extensions: { ...tagsToExtensions([], c.goodsTag), ...imageExtensions(c.imgTagUrl, c.imgBottomTagUrl) },
    },
    code,
  );
}

/**
 * 首頁限時搶購區塊（bt_7_713）→ 限時搶購卡。
 * 結束時間優先取每個商品的 actionV2.limitGoodsSellInterval.endDate，缺漏才用區塊 headerInfo.endTime。
 */
export function limitBuyToCard(raw: unknown, blockEndsAt: number | undefined, opts: MapOptions = {}): MapResult {
  const r = RawColumnGoods.safeParse(raw);
  if (!r.success) return rejectRaw(raw, r.error.issues);
  const c = r.data;
  // 限搶商品沒有頂層 goodsCode，藏在 blockItem.itemAttrs 或 actionUrl 的 i_code
  const code = c.goodsCode ?? c.blockItem?.itemAttrs?.goodsCode ?? c.action?.actionUrl?.match(/i_code=(\w+)/)?.[1] ?? "";
  const price = readPrice(c.goodsPriceModel).value;
  const endsAt = c.actionV2?.extraValue?.limitGoodsSellInterval?.endDate ?? blockEndsAt;
  if (!code || price === undefined || endsAt === undefined) return { ok: false, goodsCode: code || "?", reason: "缺少商品代碼、售價或結束時間" };
  return finalize(
    {
      id: `${opts.idPrefix ?? "momo-flash"}-${code}`,
      variant: "flash-sale",
      layout: opts.layout ?? "grid",
      title: c.title.slice(0, 150),
      subtitle: clip(c.subTitle, 40),
      imageUrl: c.contentImage,
      videoUrl: c.vodUrl || undefined,
      url: goodsUrl(code, c.action?.actionUrl),
      price,
      originalPrice: originalPrice(readPrice(c.marketPriceModel).value, price),
      endsAt,
      stockRemaining: parseMoney(c.remainingAmount) ?? 0,
      extensions: { ...tagsToExtensions([], c.goodsTag), ...imageExtensions(c.imgTagUrl, c.imgBottomTagUrl) },
    },
    code,
  );
}

/** 從卡片 id 取回 momo goodsCode（id 形如 `momo-rank-8928032`） */
export function goodsCodeOf(card: Pick<Card, "id">): string {
  return card.id.slice(card.id.lastIndexOf("-") + 1);
}

/** 合併 getGoodsSaleCountsV2 的評分 / 評價數 / 總銷量（另一支 API，需在拿到商品清單後批次補查） */
export function applySaleInfo(card: Card, info: RawSaleInfo | undefined): Card {
  if (!info) return card;
  const rating = info.rating ? Number(info.rating) : undefined;
  return {
    ...card,
    rating: rating !== undefined && Number.isFinite(rating) && rating > 0 ? Math.min(5, rating) : card.rating,
    reviewCount: parseRatingTimes(info.ratingTimes) ?? card.reviewCount,
    soldCount: parseSaleCount(info.saleCount) ?? card.soldCount,
  };
}
