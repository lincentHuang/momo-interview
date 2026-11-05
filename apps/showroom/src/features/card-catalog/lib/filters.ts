import { CARD_LAYOUTS, CARD_VARIANTS, type CardLayout, type CardVariant } from "@momo/merchant-card";

/** Catalog 的檢視條件存在 URL（可分享、可上一頁），並經過白名單解析 */
export interface CatalogFilters {
  variant: CardVariant | "all";
  layout: CardLayout | "auto";
}

export function parseFilters(params: URLSearchParams): CatalogFilters {
  const variant = params.get("variant");
  const layout = params.get("layout");
  return {
    variant: (CARD_VARIANTS as readonly string[]).includes(variant ?? "") ? (variant as CardVariant) : "all",
    layout: (CARD_LAYOUTS as readonly string[]).includes(layout ?? "") ? (layout as CardLayout) : "auto",
  };
}

export function toSearch(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.variant !== "all") params.set("variant", filters.variant);
  if (filters.layout !== "auto") params.set("layout", filters.layout);
  const s = params.toString();
  return s ? `?${s}` : "";
}
