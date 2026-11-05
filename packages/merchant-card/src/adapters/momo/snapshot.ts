import type { MomoClient } from "./client";
import featuredKeywords from "./snapshot/featured-goods-keywords.json";
import featuredList from "./snapshot/featured-goods-list.json";
import saleCounts from "./snapshot/goods-sale-counts.json";
import mainPage from "./snapshot/main-page-v5.json";
import recommend from "./snapshot/recommend-goods.json";
import { RawFeaturedKeywordsResponse, RawFeaturedListResponse, RawMainPageResponse, RawRecommendResponse, RawSaleCountsResponse } from "./raw";

/**
 * 錄製於 2026-11-05 的 momo 首頁 API 回應（已裁切商品數量，欄位與結構原封不動）。
 *
 * 用途：
 *  - 測試：adapter 對真實回應的對應規則有回歸保護
 *  - 離線展示：不連外也能看到「真實資料長相」的首頁情境
 * 限時搶購的結束時間會平移到「現在」之後，否則錄製當下的檔次早已結束。
 */
export const SNAPSHOT_RECORDED_AT = 1793844877809;

type Json = Record<string, unknown>;

/** 把錄製資料中的時間欄位平移 offset 毫秒 */
function shiftTimes<T>(value: T, offset: number): T {
  const TIME_KEYS = new Set(["endTime", "serverTime", "startDate", "endDate"]);
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Json = {};
      for (const [k, x] of Object.entries(v as Json)) out[k] = TIME_KEYS.has(k) && typeof x === "number" ? x + offset : walk(x);
      return out;
    }
    return v;
  };
  return walk(value) as T;
}

export function createSnapshotClient(options: { now?: () => number } = {}): MomoClient {
  const now = options.now ?? Date.now;
  return {
    getMainPage: async () => RawMainPageResponse.parse(shiftTimes(mainPage, now() - SNAPSHOT_RECORDED_AT)),
    getRecommendGoods: async () => RawRecommendResponse.parse(recommend),
    getFeaturedKeywords: async () => RawFeaturedKeywordsResponse.parse(featuredKeywords),
    getFeaturedGoodsList: async () => RawFeaturedListResponse.parse(featuredList),
    getSaleCounts: async () => RawSaleCountsResponse.parse(saleCounts),
  };
}
