import {
  createMomoClient,
  createSnapshotClient,
  loadFeaturedGoods,
  loadMomoHomepage,
  MomoApiError,
  type MomoHomepage,
  type MomoKeyword,
  type MomoSection,
} from "@momo/merchant-card/momo";
import { cacheLife } from "next/cache";

/**
 * 伺服器端資料存取：momo 前台 API 不允許跨網域，因此一律由 Route Handler 代理。
 *
 * - snapshot：2026-11-05 錄製的真實回應（預設；離線可用、不對 momo 發請求）
 * - live：即時呼叫 momo，5 分鐘快取。momo 可能以 WAF 拒絕伺服器來源請求，失敗時回傳錯誤由前端提示改用快照
 */
export type MomoSource = "snapshot" | "live";

export function parseSource(value: string | null): MomoSource {
  return value === "live" ? "live" : "snapshot";
}

async function liveHomepage(): Promise<MomoHomepage> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  return loadMomoHomepage(createMomoClient({ timeoutMs: 8000 }));
}

async function liveFeatured(keyword: string, keywords: MomoKeyword[], mdiv: string) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  return loadFeaturedGoods(createMomoClient({ timeoutMs: 8000 }), { keyword, keywords, mdiv });
}

export function getHomepage(source: MomoSource): Promise<MomoHomepage> {
  return source === "live" ? liveHomepage() : loadMomoHomepage(createSnapshotClient());
}

export function getFeatured(source: MomoSource, params: { keyword: string; keywords: MomoKeyword[]; mdiv: string }): Promise<Pick<MomoSection, "cards" | "rejected">> {
  return source === "live" ? liveFeatured(params.keyword, params.keywords, params.mdiv) : loadFeaturedGoods(createSnapshotClient(), params);
}

export function errorResponse(err: unknown): Response {
  const message = err instanceof Error ? err.message : String(err);
  const endpoint = err instanceof MomoApiError ? err.endpoint : undefined;
  return Response.json({ error: `momo API 呼叫失敗：${message}`, endpoint }, { status: 502 });
}
