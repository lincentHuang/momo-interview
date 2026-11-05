"use client";

import { useState } from "react";
import { MomoCard } from "@/features/card-preview";
import { useCardDraftContext } from "../context/card-draft-context";
import { JsonInspector } from "./json-inspector";

interface LogEntry {
  id: number;
  at: string;
  type: string;
  detail: string;
}

/**
 * 檢視器：開發者向的資訊（事件、同步中的互動狀態、原始 JSON 與 rev）。
 * 從設計頁拆出來，讓設計頁只保留「編輯卡片」這件事。
 */
export function InspectView() {
  const { record, draft, issues } = useCardDraftContext();
  const [log, setLog] = useState<LogEntry[]>([]);

  if (!record || !draft) return <div className="h-[480px] animate-pulse rounded-xl bg-white" aria-busy="true" />;

  const push = (type: string) => (detail: unknown) =>
    setLog((prev) =>
      [{ id: Date.now() + Math.random(), at: new Date().toLocaleTimeString("zh-TW"), type, detail: JSON.stringify(detail) }, ...prev].slice(0, 10),
    );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="space-y-4">
        <section aria-label="互動預覽" className="rounded-xl border border-line bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold">互動預覽</h2>
          <p className="mb-4 text-xs text-muted">與嵌入頁相同的元件（非編輯模式）。點擊、收藏、加入購物車會記錄在下方。</p>
          <div className="flex justify-center rounded-lg bg-surface-muted p-4 sm:p-6">
            <MomoCard
              cardId={record.card.id}
              style={{ width: record.card.layout === "list" ? 420 : 240, maxWidth: "100%" }}
              onCardClick={push("momo-card:click")}
              onFavoriteChange={push("momo-card:favorite-change")}
              onAddToCart={push("momo-card:add-to-cart")}
              onImpression={push("momo-card:impression")}
            />
          </div>
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <section aria-label="互動狀態" className="rounded-xl border border-line bg-white p-4 text-xs">
            <h2 className="mb-2 text-sm font-semibold">互動狀態（跨宿主同步）</h2>
            <p>收藏：{record.state.favorite ? "♥ 已收藏" : "♡ 未收藏"}</p>
            <p>購物車：{record.state.cartQty} 件</p>
          </section>
          <section aria-label="卡片事件" className="rounded-xl border border-line bg-white p-4 text-xs">
            <h2 className="mb-2 text-sm font-semibold">卡片事件</h2>
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
          </section>
        </div>
      </div>

      <section aria-label="JSON 與同步" className="rounded-xl border border-line bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">JSON / 同步</h2>
        <JsonInspector draft={draft} record={record} issues={issues} />
      </section>
    </div>
  );
}
