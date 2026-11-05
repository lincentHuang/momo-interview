"use client";

import { CARD_SLOT_LABELS, VARIANTS, type CardPlugin, type CardVariant } from "@momo/merchant-card";
import type { DragEvent } from "react";
import { cn } from "@/shared/lib/cn";
import { BoltIcon, GripIcon, PlusIcon, TrashIcon } from "@/shared/ui";
import type { DragSource } from "../hooks/use-module-dnd";

/**
 * 模組面板：可拖曳到卡片上的模組清單。
 * 拖曳卡片上的模組回到這裡＝移除。每個項目也有「＋」按鈕，鍵盤與觸控裝置不必拖曳。
 */
export function ModulePalette({
  plugins,
  variant,
  enabledIds,
  drag,
  removeActive,
  onAdd,
  onDragStart,
  onDragEnd,
  onRemoveDragOver,
  onRemoveDrop,
}: {
  plugins: CardPlugin[];
  variant: CardVariant;
  enabledIds: ReadonlySet<string>;
  drag: DragSource | null;
  removeActive: boolean;
  onAdd: (id: string) => void;
  onDragStart: (event: DragEvent, id: string) => void;
  onDragEnd: () => void;
  onRemoveDragOver: (event: DragEvent) => void;
  onRemoveDrop: (event: DragEvent) => void;
}) {
  const visual = plugins.filter((p) => p.render);
  const behavior = plugins.filter((p) => !p.render);
  const removing = drag?.source === "card";

  return (
    <aside
      aria-label="模組面板"
      onDragOver={removing ? onRemoveDragOver : undefined}
      onDrop={removing ? onRemoveDrop : undefined}
      className={cn(
        "relative space-y-5 rounded-xl border border-line bg-white p-3 transition-colors",
        removing && "border-dashed border-danger/50",
        removing && removeActive && "bg-red-50",
      )}
    >
      {removing && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-xl bg-white/85 text-sm text-danger">
          <span className="flex items-center gap-2">
            <TrashIcon /> 放開以移除模組
          </span>
        </div>
      )}
      <Group title="版位模組" hint="拖到卡片上的插槽">
        {visual.map((p) => (
          <Item key={p.id} plugin={p} variant={variant} enabled={enabledIds.has(p.id)} onAdd={onAdd} onDragStart={onDragStart} onDragEnd={onDragEnd} />
        ))}
      </Group>
      {behavior.length > 0 && (
        <Group title="行為模組" hint="拖到卡片任意處啟用">
          {behavior.map((p) => (
            <Item key={p.id} plugin={p} variant={variant} enabled={enabledIds.has(p.id)} onAdd={onAdd} onDragStart={onDragStart} onDragEnd={onDragEnd} />
          ))}
        </Group>
      )}
    </aside>
  );
}

function Group({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-baseline justify-between px-1 text-xs font-semibold">
        {title}
        <span className="font-normal text-muted">{hint}</span>
      </h2>
      <ul className="space-y-1.5">{children}</ul>
    </section>
  );
}

function Item({
  plugin,
  variant,
  enabled,
  onAdd,
  onDragStart,
  onDragEnd,
}: {
  plugin: CardPlugin;
  variant: CardVariant;
  enabled: boolean;
  onAdd: (id: string) => void;
  onDragStart: (event: DragEvent, id: string) => void;
  onDragEnd: () => void;
}) {
  const unavailable = Boolean(plugin.variants && !plugin.variants.includes(variant));
  const status = unavailable ? `不適用${VARIANTS[variant].label}` : enabled ? "已在卡片上" : plugin.slot ? CARD_SLOT_LABELS[plugin.slot] : "生命週期";

  return (
    <li
      draggable={!unavailable}
      onDragStart={(e) => onDragStart(e, plugin.id)}
      onDragEnd={onDragEnd}
      data-module={plugin.id}
      className={cn(
        "group flex items-center gap-2 rounded-lg border px-2 py-2 text-left transition-colors",
        unavailable ? "cursor-not-allowed border-transparent bg-surface-muted opacity-60" : "cursor-grab border-line bg-white hover:border-brand active:cursor-grabbing",
      )}
      title={plugin.description}
    >
      <span className="text-muted/60 group-hover:text-brand" aria-hidden>
        {plugin.render ? <GripIcon className="size-4" /> : <BoltIcon className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{plugin.name}</span>
        <span className={cn("block truncate text-[11px]", enabled ? "text-emerald-700" : "text-muted")}>
          {enabled && !unavailable ? "✓ " : ""}
          {status}
        </span>
      </span>
      {!unavailable && !enabled && (
        <button
          type="button"
          aria-label={`加入${plugin.name}`}
          onClick={() => onAdd(plugin.id)}
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
        >
          <PlusIcon className="size-4" />
        </button>
      )}
    </li>
  );
}
