"use client";

import type { CardLayout, CardPlugin } from "@momo/merchant-card";
import { useState, type DragEvent, type KeyboardEvent, type MouseEvent, type RefObject } from "react";
import { MomoCard } from "@/features/card-preview";
import { cn } from "@/shared/lib/cn";
import { BoltIcon, CloseIcon, ToggleGroup } from "@/shared/ui";
import type { DragSource, DropTarget } from "../hooks/use-module-dnd";
import { moduleIdFromEvent } from "../lib/drop-target";

const WIDTHS = [
  { value: "180", label: "手機" },
  { value: "240", label: "桌機" },
  { value: "320", label: "放大" },
  { value: "420", label: "寬版" },
] as const;
type Width = (typeof WIDTHS)[number]["value"];

const LAYOUTS = [
  { value: "grid", label: "直式" },
  { value: "list", label: "橫式" },
] as const;

/**
 * 設計畫布：正式的 <momo-product-card>（editable 模式）＋ 拖放提示層。
 * 畫面上看到的就是嵌入後的樣子——編輯模式只多了插槽虛線與模組外框。
 */
export function DesignCanvas({
  cardId,
  layout,
  selected,
  drag,
  target,
  behaviorModules,
  canvasRef,
  onLayoutChange,
  onSelect,
  onFocusContent,
  onRemove,
  dnd,
}: {
  cardId: string;
  layout: CardLayout;
  selected: string | null;
  drag: DragSource | null;
  target: DropTarget;
  behaviorModules: CardPlugin[];
  canvasRef: RefObject<HTMLDivElement | null>;
  onLayoutChange: (layout: CardLayout) => void;
  onSelect: (id: string | null) => void;
  onFocusContent: () => void;
  onRemove: (id: string) => void;
  dnd: {
    cardDragStart: (e: DragEvent) => void;
    canvasDragOver: (e: DragEvent) => void;
    canvasDragLeave: (e: DragEvent) => void;
    canvasDrop: (e: DragEvent) => void;
    end: () => void;
  };
}) {
  const [width, setWidth] = useState<Width>(layout === "list" ? "420" : "320");

  const onClick = (event: MouseEvent) => {
    const id = moduleIdFromEvent(event.nativeEvent);
    if (id) onSelect(id);
    else if ((event.target as HTMLElement).closest("momo-product-card")) onFocusContent(); // 點卡片本體 → 編輯內容
    else onSelect(null);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!selected) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onRemove(selected);
    }
    if (event.key === "Escape") onSelect(null);
  };

  return (
    <section aria-label="設計畫布" className="flex min-w-0 flex-col rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup aria-label="畫布寬度" value={width} options={WIDTHS} onValueChange={setWidth} />
          <ToggleGroup
            aria-label="版型"
            value={layout}
            options={LAYOUTS}
            onValueChange={(next) => {
              onLayoutChange(next);
              setWidth(next === "list" ? "420" : "320");
            }}
          />
        </div>
        <p className="text-[11px] text-muted">拖曳模組調整位置 · 點選模組編輯 · Delete 移除</p>
      </div>

      <div
        ref={canvasRef}
        role="application"
        aria-label="卡片編輯區（可拖放模組）"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onDragStart={dnd.cardDragStart}
        onDragOver={dnd.canvasDragOver}
        onDragLeave={dnd.canvasDragLeave}
        onDrop={dnd.canvasDrop}
        onDragEnd={dnd.end}
        className={cn(
          "relative grid min-h-[480px] flex-1 place-items-center overflow-auto p-10 outline-none",
          "bg-[radial-gradient(circle,#e6e6ea_1px,transparent_1px)] [background-size:16px_16px]",
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40",
        )}
      >
        <MomoCard
          cardId={cardId}
          editable
          selectedModule={selected}
          style={{ width: Number(width) }}
          className={cn("transition-shadow", drag && target?.kind === "behavior" && "rounded-[10px] ring-2 ring-brand ring-offset-4")}
        />

        {/* 拖放提示層（座標由 drop-target 換算為相對於畫布） */}
        {target?.kind === "slot" && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div
              className="absolute rounded-md bg-brand/10 ring-2 ring-brand"
              style={{ left: target.slotRect.x - 3, top: target.slotRect.y - 3, width: target.slotRect.width + 6, height: Math.max(target.slotRect.height, 22) + 6 }}
            />
            {target.caret && (
              <div
                className="absolute rounded-full bg-brand"
                style={{ left: target.caret.x, top: target.caret.y, width: 3, height: target.caret.height }}
              />
            )}
          </div>
        )}
        <span role="status" aria-live="polite" className="sr-only">
          {target?.kind === "slot" ? `放到插槽 ${target.slot} 第 ${target.index + 1} 個位置` : target?.kind === "behavior" ? "放開以啟用行為模組" : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2 text-xs">
        <span className="flex items-center gap-1 text-muted">
          <BoltIcon className="size-3.5" /> 行為模組
        </span>
        {behaviorModules.length === 0 ? (
          <span className="text-muted">無（可將「行為模組」拖到卡片上啟用）</span>
        ) : (
          behaviorModules.map((p) => (
            <span
              key={p.id}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border py-0.5 pl-2.5 pr-1",
                selected === p.id ? "border-brand bg-brand-soft text-brand" : "border-line",
              )}
            >
              <button type="button" onClick={() => onSelect(p.id)} className="focus-visible:outline-2 focus-visible:outline-brand">
                {p.name}
              </button>
              <button
                type="button"
                aria-label={`移除${p.name}`}
                onClick={() => onRemove(p.id)}
                className="grid size-5 place-items-center rounded-full text-muted hover:bg-surface-muted hover:text-ink"
              >
                <CloseIcon className="size-3" />
              </button>
            </span>
          ))
        )}
      </div>
    </section>
  );
}
