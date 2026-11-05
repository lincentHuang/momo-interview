"use client";

import { VARIANTS, type CardVariant } from "@momo/merchant-card";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CardSkeleton, MomoCard } from "@/features/card-preview";
import { SEED_CARD_IDS, useCardRecords } from "@/features/card-store";
import { PageHeader } from "@/shared/layout/page-header";
import { Button, PlusIcon, ToggleGroup } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { parseFilters, toSearch, type CatalogFilters } from "../lib/filters";
import { NewCardDialog } from "./new-card-dialog";

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
  const [creating, setCreating] = useState(false);

  const update = (patch: Partial<CatalogFilters>) =>
    router.replace(`${pathname}${toSearch({ ...filters, ...patch })}`, { scroll: false });

  const visible = records
    ?.filter((r) => filters.variant === "all" || r.card.variant === filters.variant)
    .sort((a, b) => a.card.id.localeCompare(b.card.id));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={
          <>
            商品卡目錄 {visible && <span className="text-sm font-normal text-muted">（{visible.length}）</span>}
          </>
        }
        description="點擊任一張卡片進入所見即所得編輯器；收藏與購物車狀態會即時同步到其他分頁與嵌入頁面。"
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <PlusIcon className="size-4" /> 新增卡片
          </Button>
        }
      />
      <NewCardDialog open={creating} onOpenChange={setCreating} />

      <section aria-label="商品卡列表" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup aria-label="依類型篩選" value={filters.variant} options={VARIANT_OPTIONS} onValueChange={(variant) => update({ variant })} />
          <ToggleGroup aria-label="版型" value={filters.layout} options={LAYOUT_OPTIONS} onValueChange={(layout) => update({ layout })} />
        </div>

        <ul
          className={cn(
            "grid gap-4",
            filters.layout === "list" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
          )}
        >
          {visible
            ? visible.map((r) => {
                const layout = filters.layout === "auto" ? r.card.layout : filters.layout;
                return (
                  <li key={r.card.id} className={cn("space-y-2", layout === "list" && filters.layout === "auto" && "col-span-2")}>
                    <span className="flex gap-1">
                      <span className="rounded bg-white px-1.5 py-0.5 text-xs font-medium text-muted">{VARIANTS[r.card.variant].label}</span>
                      {!SEED_CARD_IDS.has(r.card.id) && <span className="rounded bg-brand-soft px-1.5 py-0.5 text-xs font-medium text-brand">自訂</span>}
                    </span>
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
          {visible && (
            <li className={cn("pt-7", filters.layout === "list" && "pt-0")}>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="grid h-full min-h-40 w-full place-items-center rounded-[10px] border-2 border-dashed border-line text-sm text-muted transition-colors hover:border-brand hover:bg-white hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
              >
                <span className="flex flex-col items-center gap-1.5">
                  <PlusIcon className="size-6" />
                  新增商品卡
                </span>
              </button>
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
