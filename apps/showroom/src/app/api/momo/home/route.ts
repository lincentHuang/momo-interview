import { errorResponse, getHomepage, parseSource } from "@/features/momo-home/server";

/** GET /api/momo/home?source=snapshot|live → MomoHomepage（區塊 + 已驗證的 Card） */
export async function GET(request: Request) {
  const source = parseSource(new URL(request.url).searchParams.get("source"));
  try {
    return Response.json({ source, ...(await getHomepage(source)) });
  } catch (err) {
    return errorResponse(err);
  }
}
