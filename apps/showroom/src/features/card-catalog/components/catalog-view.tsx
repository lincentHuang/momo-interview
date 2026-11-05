"use client";

import { VARIANTS, type CardVariant } from "@momo/merchant-card";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CardSkeleton, MomoCard } from "@/features/card-preview";
import { useCardActions, useCardRecords } from "@/features/card-store";
import { Button, ToggleGroup } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { parseFilters, toSearch, type CatalogFilters } from "../lib/filters";
import { VariantAnalysis } from "./variant-analysis";

const VARIANT_OPTIONS = [
  { value: "all" as const, label: "全部" },
  ...(Object.values(VARIANTS).map((v) => ({ value: v.variant, label: v.label })) as Array<{ value: CardVariant; label: string }>),
];

const LAYOUT_OPTIONS = [
  { value: "auto" as const, label: "依卡片設定" },
  { value: "grid" as const, label: "直式" },
  { value: "list" as const, label: "橫式" },
];

export function CatalogView() {
  const router = useRouter();
  const pathname = usePathname();
  const filters = parseFilters(useSearchParams());
  const records = useCardRecords();
  const actions = useCardActions();

  const update = (patch: Partial<CatalogFilters>) =>
    router.replace(`${pathname}${toSearch({ ...filters, ...patch })}`, { scroll: false });

  const visible = records
    ?.filter((r) => filters.variant === "all" || r.card.variant === filters.variant)
    .sort((a, b) => a.card.id.localeCompare(b.card.id));

  return (
    <div className="space-y-8">
      <VariantAnalysis />

      <section aria-labelledby="catalog-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="catalog-heading" className="text-lg font-semibold">
            商品卡目錄 {visible && <span className="text-sm font-normal text-muted">（{visible.length}）</span>}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup aria-label="依類型篩選" value={filters.variant} options={VARIANT_OPTIONS} onValueChange={(variant) => update({ variant })} />
            <ToggleGroup aria-label="版型" value={filters.layout} options={LAYOUT_OPTIONS} onValueChange={(layout) => update({ layout })} />
            <Button size="sm" variant="ghost" onClick={() => actions.resetAll()}>
              全部重設
            </Button>
          </div>
        </div>

        <ul
          className={cn(
            "grid gap-4",
            filters.layout === "list" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
          )}
        >
          {visible
            ? visible.map((r) => {
                const layout = filters.layout === "auto" ? r.card.layout : filters.layout;
                return (
                  <li key={r.card.id} className={cn("space-y-2", layout === "list" && filters.layout === "auto" && "col-span-2")}>
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span className="rounded bg-white px-1.5 py-0.5 font-medium">{VARIANTS[r.card.variant].label}</span>
                      <span className="font-mono">rev {r.rev}</span>
                    </div>
                    <MomoCard
                      cardId={r.card.id}
                      layout={filters.layout === "auto" ? undefined : filters.layout}
                      onCardClick={() => router.push(`/cards/${r.card.id}`)}
                    />
                  </li>
                );
              })
            : Array.from({ length: 5 }, (_, i) => (
                <li key={i}>
                  <CardSkeleton />
                </li>
              ))}
        </ul>
        <p className="text-xs text-muted">點擊卡片進入編輯器；收藏 ♡ 與購物車 🛒 狀態會即時同步到其他分頁與 sample.html。</p>
      </section>
    </div>
  );
}
