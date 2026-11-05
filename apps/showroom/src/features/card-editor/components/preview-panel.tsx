"use client";

import type { CardLayout, CardRecord } from "@momo/merchant-card";
import { useState } from "react";
import { MomoCard } from "@/features/card-preview";
import { ToggleGroup } from "@/shared/ui";

const WIDTHS = [
  { value: "180", label: "手機 2 欄" },
  { value: "240", label: "桌機 5 欄" },
  { value: "420", label: "列表" },
] as const;

type Width = (typeof WIDTHS)[number]["value"];

interface LogEntry {
  id: number;
  at: string;
  type: string;
  detail: string;
}

export function PreviewPanel({ record }: { record: CardRecord }) {
  const [width, setWidth] = useState<Width>(record.card.layout === "list" ? "420" : "240");
  const [layout, setLayout] = useState<CardLayout | "auto">("auto");
  const [log, setLog] = useState<LogEntry[]>([]);

  const push = (type: string) => (detail: unknown) =>
    setLog((prev) => [{ id: Date.now() + Math.random(), at: new Date().toLocaleTimeString("zh-TW"), type, detail: JSON.stringify(detail) }, ...prev].slice(0, 6));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup aria-label="預覽寬度" value={width} options={WIDTHS} onValueChange={setWidth} />
        <ToggleGroup
          aria-label="版型覆寫"
          value={layout}
          options={[
            { value: "auto", label: "依設定" },
            { value: "grid", label: "直式" },
            { value: "list", label: "橫式" },
          ]}
          onValueChange={setLayout}
        />
      </div>

      <div className="grid min-h-[420px] place-items-center rounded-xl border border-dashed border-line bg-[radial-gradient(circle,#e6e6ea_1px,transparent_1px)] [background-size:16px_16px] p-8">
        <MomoCard
          cardId={record.card.id}
          layout={layout === "auto" ? undefined : layout}
          style={{ width: Number(width) }}
          onCardClick={push("momo-card:click")}
          onFavoriteChange={push("momo-card:favorite-change")}
          onAddToCart={push("momo-card:add-to-cart")}
          onImpression={push("momo-card:impression")}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-3 text-xs">
          <p className="mb-2 font-semibold">互動狀態（跨宿主同步）</p>
          <p>收藏：{record.state.favorite ? "♥ 已收藏" : "♡ 未收藏"}</p>
          <p>購物車：{record.state.cartQty} 件</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-3 text-xs">
          <p className="mb-2 font-semibold">卡片事件</p>
          {log.length === 0 ? (
            <p className="text-muted">點擊卡片、收藏或加入購物車試試</p>
          ) : (
            <ul className="space-y-1 font-mono text-[11px]">
              {log.map((l) => (
                <li key={l.id} className="truncate" title={l.detail}>
                  <span className="text-muted">{l.at}</span> <span className="text-brand">{l.type}</span> {l.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
