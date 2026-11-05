import type { Card } from "../../schema/card.schema";
import type { MomoClient } from "./client";
import { applySaleInfo, columnGoodsToCard, featuredGoodsToCard, goodsCodeOf, goodsInfoToCard, limitBuyToCard, type MapResult } from "./map";
import type { RawMainBlock } from "./raw";

/**
 * 把 momo 首頁 API 組合成「區塊 + 卡片」，這就是 Showroom /momo 頁面與任何宿主可以直接渲染的格式。
 *
 * momo 首頁的商品資料分散在 4 支 API：
 *   1. getMainPageV5            區塊清單；限時搶購（bt_7_713）、輪播商品（bt_7_777）直接內嵌 contentInfo
 *   2. getFeaturedGoods*        「你的精選好物榜」（bt_r_chart）：先取關鍵字，再取該關鍵字的商品
 *   3. getRecommendGoods        「你可能會喜歡」（bt_r_waterfall）瀑布流，分頁載入
 *   4. getGoodsSaleCountsV2     評分 / 評價數 / 總銷量，以 goodsCode 批次補查
 * 次要 API 失敗只影響該區塊（errors），不讓整頁失敗。
 */

export type MomoSectionKind = "flash-sale" | "ranking" | "carousel" | "waterfall";

export interface MomoKeyword {
  value: string;
  methodName?: string;
  sourceOrigin?: string;
}

export interface MomoSection {
  id: string;
  kind: MomoSectionKind;
  title: string;
  /** momo 區塊標題是圖片（375:55），有就用圖、沒有用 title 文字 */
  headerImage?: string;
  /** 版位代碼，翻頁 / 埋點時需帶回 */
  mdiv: string;
  /** flash-sale：本檔次結束時間 */
  endsAt?: number;
  /** ranking：關鍵字分頁 */
  keywords?: MomoKeyword[];
  activeKeyword?: string;
  /** waterfall：分頁狀態 */
  page?: { current: number; max: number };
  cards: Card[];
  /** 資料不合法而被略過的商品（不影響其他商品） */
  rejected: Array<{ goodsCode: string; reason: string }>;
}

export interface MomoHomepage {
  fetchedAt: number;
  sections: MomoSection[];
  /** 區塊層級的失敗（例如推薦 API 逾時） */
  errors: Array<{ section: string; message: string }>;
  /** 偵測到但目前未對應卡片的商品區塊（例如直播區塊非開播時段沒有商品） */
  skipped: Array<{ blockTypeId: string; name: string; reason: string }>;
}

export interface LoadHomepageOptions {
  /** 是否補查評分 / 銷量（多一次請求） */
  withSaleInfo?: boolean;
  /** 每個輪播區塊最多取幾個商品（momo 一次給 100 個） */
  carouselLimit?: number;
  now?: () => number;
}

/** 分流合法 / 不合法商品；同一區塊重複出現的商品只保留第一個（卡片 id 需唯一） */
function collect(results: MapResult[]) {
  const cards: Card[] = [];
  const rejected: MomoSection["rejected"] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (!r.ok) rejected.push({ goodsCode: r.goodsCode, reason: r.reason });
    else if (!seen.has(r.card.id)) {
      seen.add(r.card.id);
      cards.push(r.card);
    }
  }
  return { cards, rejected };
}

const decode = (s: string | undefined) => {
  try {
    return decodeURIComponent((s ?? "").replace(/\+/g, " "));
  } catch {
    return s ?? "";
  }
};

function carouselTitle(block: RawMainBlock, index: number): string {
  const action = (block.headerInfo as { action?: { actionValue?: unknown } } | undefined)?.action?.actionValue;
  if (typeof action === "string" && action) return `${action}精選`;
  return index === 0 ? "店+ 精選" : "即時熱銷榜";
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** 精選好物榜某個關鍵字分頁（切換分頁時單獨呼叫） */
export async function loadFeaturedGoods(
  client: MomoClient,
  params: { keyword: string; keywords: ReadonlyArray<MomoKeyword>; mdiv: string },
): Promise<Pick<MomoSection, "cards" | "rejected">> {
  const index = params.keywords.findIndex((k) => k.value === params.keyword);
  const meta = params.keywords[index];
  const res = await client.getFeaturedGoodsList({
    keyword: params.keyword,
    curPage: index + 1,
    mdiv: params.mdiv,
    methodName: meta?.methodName,
    sourceOrigin: meta?.sourceOrigin,
  });
  const goods = res.resultList?.goodsList ?? [];
  return collect(goods.map((g, i) => featuredGoodsToCard(g, i + 1, params.keyword)));
}

export async function loadMomoHomepage(client: MomoClient, options: LoadHomepageOptions = {}): Promise<MomoHomepage> {
  const { withSaleInfo = true, carouselLimit = 20, now = Date.now } = options;
  const main = await client.getMainPage();
  const sections: MomoSection[] = [];
  const errors: MomoHomepage["errors"] = [];
  const skipped: MomoHomepage["skipped"] = [];
  const pending: Array<Promise<void>> = [];
  let carouselIndex = 0;

  for (const block of main.mainInfo) {
    const mdiv = block.mdiv ?? block.blockTypeId;
    const name = decode(block.blockName);
    const headerImage = block.headerInfo?.headerImage;

    switch (block.blockTypeId) {
      case "bt_7_713": {
        const endsAt = block.headerInfo?.endTime;
        const { cards, rejected } = collect((block.contentInfo ?? []).map((c) => limitBuyToCard(c, endsAt)));
        sections.push({ id: mdiv, kind: "flash-sale", title: "限時搶購", headerImage, mdiv, endsAt, cards, rejected });
        break;
      }
      case "bt_7_777": {
        const items = (block.contentInfo ?? []).slice(0, carouselLimit);
        const { cards, rejected } = collect(items.map((c) => columnGoodsToCard(c, { idPrefix: `momo-c${carouselIndex}` })));
        sections.push({ id: mdiv, kind: "carousel", title: carouselTitle(block, carouselIndex), headerImage, mdiv, cards, rejected });
        carouselIndex++;
        break;
      }
      case "bt_r_chart": {
        const section: MomoSection = { id: mdiv, kind: "ranking", title: name || "你的精選好物榜", headerImage, mdiv, cards: [], rejected: [] };
        sections.push(section);
        pending.push(
          (async () => {
            const kw = await client.getFeaturedKeywords();
            section.keywords = kw.resultList.map((k) => ({ value: k.value, methodName: k.methodName, sourceOrigin: k.sourceOrigin }));
            const first = section.keywords[0];
            if (!first) return;
            section.activeKeyword = first.value;
            Object.assign(section, await loadFeaturedGoods(client, { keyword: first.value, keywords: section.keywords, mdiv }));
          })().catch((err) => void errors.push({ section: section.title, message: errorMessage(err) })),
        );
        break;
      }
      case "bt_r_waterfall": {
        const section: MomoSection = { id: mdiv, kind: "waterfall", title: name || "你可能會喜歡", headerImage, mdiv, cards: [], rejected: [] };
        sections.push(section);
        pending.push(
          (async () => {
            const res = await client.getRecommendGoods({ mdiv, curPage: 1 });
            const data = res.rtnData;
            Object.assign(section, collect((data?.goodsInfoList ?? []).map((g) => goodsInfoToCard(g, { idPrefix: "momo-rec" }))));
            section.page = { current: Number(data?.curPage ?? 1), max: Number(data?.maxPage ?? 1) };
          })().catch((err) => void errors.push({ section: section.title, message: errorMessage(err) })),
        );
        break;
      }
      case "bt_7_620":
        skipped.push({ blockTypeId: block.blockTypeId, name, reason: "直播區塊在首頁 API 只提供標題圖，商品需另由直播頻道 API 取得" });
        break;
      default:
        break; // 其他為廣告 / 看板區塊（adInfo），不是商品卡
    }
  }

  await Promise.all(pending);

  if (withSaleInfo) {
    // momo 只對排行榜與推薦商品顯示評分 / 銷量，這裡依循相同範圍
    const targets = sections.filter((s) => s.kind === "ranking" || s.kind === "waterfall");
    const codes = [...new Set(targets.flatMap((s) => s.cards.map(goodsCodeOf)))];
    if (codes.length > 0) {
      try {
        const { saleInfo } = await client.getSaleCounts(codes);
        for (const s of targets) s.cards = s.cards.map((c) => applySaleInfo(c, saleInfo[goodsCodeOf(c)]));
      } catch (err) {
        errors.push({ section: "評分 / 銷量", message: errorMessage(err) });
      }
    }
  }

  return { fetchedAt: now(), sections, errors, skipped };
}
