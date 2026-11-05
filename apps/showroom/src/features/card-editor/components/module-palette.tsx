"use client";

import { CARD_SLOT_LABELS, VARIANTS, type CardPlugin, type CardVariant } from "@momo/merchant-card";
import type { DragEvent } from "react";
import { cn } from "@/shared/lib/cn";
import { BoltIcon, GripIcon, PlusIcon } from "@/shared/ui";

/**
 * 模組庫：可拖曳到卡片上的模組（只列出尚未加入的；已加入的在上方「卡片上的模組」）。
 * 每個項目也有「＋」按鈕，鍵盤與觸控裝置不必拖曳。
 */
export function ModulePalette({
  plugins,
  variant,
  enabledIds,
  onAdd,
  onDragStart,
  onDragEnd,
}: {
  plugins: CardPlugin[];
  variant: CardVariant;
  enabledIds: ReadonlySet<string>;
  onAdd: (id: string) => void;
  onDragStart: (event: DragEvent, id: string) => void;
  onDragEnd: () => void;
}) {
  const rest = plugins.filter((p) => !enabledIds.has(p.id));
  const usable = (p: CardPlugin) => !p.variants || p.variants.includes(variant);
  const visual = rest.filter((p) => p.render && usable(p));
  const behavior = rest.filter((p) => !p.render && usable(p));
  const unavailable = rest.filter((p) => !usable(p));
  const item = (p: CardPlugin) => <Item key={p.id} plugin={p} variant={variant} onAdd={onAdd} onDragStart={onDragStart} onDragEnd={onDragEnd} />;

  if (rest.length === 0) return <p className="px-1 text-xs text-muted">所有模組都已加入卡片。</p>;

  return (
    <div className="space-y-4">
      {visual.length > 0 && (
        <Group title="版位模組" hint="拖到卡片上的插槽">
          {visual.map(item)}
        </Group>
      )}
      {behavior.length > 0 && (
        <Group title="行為模組" hint="拖到卡片任意處啟用">
          {behavior.map(item)}
        </Group>
      )}
      {unavailable.length > 0 && (
        <Group title="此類型不適用" hint={VARIANTS[variant].label}>
          {unavailable.map(item)}
        </Group>
      )}
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-baseline justify-between px-1 text-xs font-semibold">
        {title}
        <span className="font-normal text-muted">{hint}</span>
      </h2>
      <ul className="grid grid-cols-2 gap-1.5">{children}</ul>
    </section>
  );
}

function Item({
  plugin,
  variant,
  onAdd,
  onDragStart,
  onDragEnd,
}: {
  plugin: CardPlugin;
  variant: CardVariant;
  onAdd: (id: string) => void;
  onDragStart: (event: DragEvent, id: string) => void;
  onDragEnd: () => void;
}) {
  const unavailable = Boolean(plugin.variants && !plugin.variants.includes(variant));
  const status = unavailable ? "不適用" : plugin.slot ? CARD_SLOT_LABELS[plugin.slot] : "生命週期";

  return (
    <li
      draggable={!unavailable}
      onDragStart={(e) => onDragStart(e, plugin.id)}
      onDragEnd={onDragEnd}
      data-module={plugin.id}
      className={cn(
        "group flex min-w-0 items-center gap-1.5 rounded-lg border py-1.5 pl-1.5 pr-1 text-left transition-colors",
        unavailable ? "cursor-not-allowed border-transparent bg-surface-muted opacity-60" : "cursor-grab border-line bg-white hover:border-brand active:cursor-grabbing",
      )}
      title={plugin.description}
    >
      <span className="text-muted/60 group-hover:text-brand" aria-hidden>
        {plugin.render ? <GripIcon className="size-4" /> : <BoltIcon className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{plugin.name}</span>
        <span className="block truncate text-[11px] text-muted">{status}</span>
      </span>
      {!unavailable && (
        <button
          type="button"
          aria-label={`加入${plugin.name}`}
          onClick={() => onAdd(plugin.id)}
          className="grid size-6 shrink-0 place-items-center rounded-md text-muted hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
        >
          <PlusIcon className="size-4" />
        </button>
      )}
    </li>
  );
}
