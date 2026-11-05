import type { z } from "zod";
import {
  RawFeaturedKeywordsResponse,
  RawFeaturedListResponse,
  RawMainPageResponse,
  RawRecommendResponse,
  RawSaleCountsResponse,
} from "./raw";

/**
 * momo 前台 API client（2026-11 實測端點，皆為 POST + JSON）。
 *
 * ⚠️ 這些是 momo 網站前端自用的 API，不是公開 API：
 *   - 瀏覽器端跨網域呼叫會被 CORS 擋下 → 必須由自己的後端代理（Showroom 用 Next.js Route Handler）
 *   - 沒有版本承諾，欄位可能隨時調整 → 回應一律經過 raw schema 驗證，形狀不符時明確報錯而非默默壞掉
 *   - momo 有 WAF：非瀏覽器來源的請求可能被拒（實測 HTTP 406）。本 client 不做任何規避，
 *     遇到時直接拋出 MomoApiError；正式串接應走 momo 提供的商品 feed / 合作 API，adapter（map.ts）可直接沿用
 *   - 請控制頻率並加快取（Showroom 預設快取 5 分鐘）
 *
 * 只依賴標準 fetch，可在 Node 18+、Edge runtime、瀏覽器（同源代理後）執行；測試時注入假的 fetch。
 */
export interface MomoClientOptions {
  fetch?: typeof fetch;
  /** 預設 https://www.momoshop.com.tw/api */
  baseUrl?: string;
  /** 評分 / 銷量 API，預設 https://eccapi.momoshop.com.tw */
  saleBaseUrl?: string;
  /** "momoshop"（桌機）或 "ecmobile"（行動版），影響回傳的圖片尺寸與區塊 */
  host?: "momoshop" | "ecmobile";
  /** 額外 header（例如合作 API 的授權 token）；瀏覽器端的 forbidden header 會被忽略 */
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export class MomoApiError extends Error {
  constructor(
    message: string,
    readonly endpoint: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "MomoApiError";
  }
}

export interface MomoClient {
  /** 首頁所有區塊（限時搶購、輪播商品已內嵌 contentInfo；精選榜 / 推薦需另外呼叫） */
  getMainPage(): Promise<z.output<typeof RawMainPageResponse>>;
  /** 首頁「你可能會喜歡」瀑布流，curPage 從 1 開始 */
  getRecommendGoods(params: { mdiv: string; curPage?: number; loadedCount?: number }): Promise<z.output<typeof RawRecommendResponse>>;
  /** 精選好物榜的關鍵字分頁 */
  getFeaturedKeywords(): Promise<z.output<typeof RawFeaturedKeywordsResponse>>;
  /** 精選好物榜某關鍵字的商品；curPage = 關鍵字在分頁中的位置（1-based） */
  getFeaturedGoodsList(params: { keyword: string; curPage: number; mdiv: string; methodName?: string; sourceOrigin?: string }): Promise<
    z.output<typeof RawFeaturedListResponse>
  >;
  /** 批次查詢評分 / 評價數 / 總銷量 */
  getSaleCounts(goodsCodes: ReadonlyArray<string>): Promise<z.output<typeof RawSaleCountsResponse>>;
}

export function createMomoClient(options: MomoClientOptions = {}): MomoClient {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const baseUrl = (options.baseUrl ?? "https://www.momoshop.com.tw/api").replace(/\/$/, "");
  const saleBaseUrl = (options.saleBaseUrl ?? "https://eccapi.momoshop.com.tw").replace(/\/$/, "");
  const host = options.host ?? "momoshop";
  const timeoutMs = options.timeoutMs ?? 10_000;

  async function post<S extends z.ZodType>(url: string, body: unknown, schema: S): Promise<z.output<S>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await doFetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...options.headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      throw new MomoApiError(controller.signal.aborted ? `逾時（${timeoutMs}ms）` : "網路錯誤", url, err);
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new MomoApiError(`HTTP ${res.status}`, url);
    const json: unknown = await res.json().catch(() => undefined);
    const parsed = schema.safeParse(json);
    if (!parsed.success) throw new MomoApiError("回應格式與預期不符（momo API 可能已改版）", url, parsed.error.issues.slice(0, 5));
    const data = parsed.data as { success?: boolean; resultCode?: string; resultMessage?: string };
    if (data.success === false || (data.resultCode && data.resultCode !== "200")) {
      throw new MomoApiError(`業務錯誤 ${data.resultCode ?? ""} ${data.resultMessage ?? ""}`.trim(), url);
    }
    return parsed.data;
  }

  return {
    getMainPage: () => post(`${baseUrl}/moecapp/goods/getMainPageV5`, {}, RawMainPageResponse),

    getRecommendGoods: ({ mdiv, curPage = 1, loadedCount = 0 }) =>
      post(
        `${baseUrl}/moecapp/getRecommendGoods`,
        {
          host,
          data: {
            categoryCode: "",
            ccguid: "",
            ccsession: "",
            curGoodsInfoListSize: loadedCount,
            curPage,
            custNo: "",
            imgType: "webp",
            mdiv,
            pageType: "2",
            recommendType: "11",
          },
        },
        RawRecommendResponse,
      ),

    getFeaturedKeywords: () =>
      post(`${baseUrl}/moecapp/getFeaturedGoodsKeywords`, { rc: "", visitorID: "", host, abTestingGroup: "groupB" }, RawFeaturedKeywordsResponse),

    getFeaturedGoodsList: ({ keyword, curPage, mdiv, methodName = "", sourceOrigin = "" }) =>
      post(
        `${baseUrl}/moecapp/getFeaturedGoodsList`,
        { host, keyword, curPage, methodName, sourceOrigin, mdiv },
        RawFeaturedListResponse,
      ),

    getSaleCounts: (goodsCodes) =>
      post(`${saleBaseUrl}/user/getGoodsSaleCountsV2`, { host, goodsCode: [...goodsCodes] }, RawSaleCountsResponse),
  };
}
