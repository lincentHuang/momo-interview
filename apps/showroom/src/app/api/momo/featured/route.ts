import { errorResponse, getFeatured, parseSource } from "@/features/momo-home/server";

/**
 * GET /api/momo/featured?source=&keyword=&mdiv=&keywords=<JSON>
 * 精選好物榜切換關鍵字分頁。keywords 帶回首頁回應中的分頁清單（momo 以分頁位置當 curPage）。
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const keyword = params.get("keyword") ?? "";
  const mdiv = params.get("mdiv") ?? "";
  let keywords: Array<{ value: string; methodName?: string; sourceOrigin?: string }> = [];
  try {
    keywords = JSON.parse(params.get("keywords") ?? "[]");
  } catch {
    return Response.json({ error: "keywords 不是合法的 JSON" }, { status: 400 });
  }
  if (!keyword || !Array.isArray(keywords) || !keywords.some((k) => k?.value === keyword)) {
    return Response.json({ error: "缺少 keyword，或 keyword 不在 keywords 清單中" }, { status: 400 });
  }
  try {
    return Response.json(await getFeatured(parseSource(params.get("source")), { keyword, keywords, mdiv }));
  } catch (err) {
    return errorResponse(err);
  }
}
