"use client";

import {
  CARD_SLOT_LABELS,
  CARD_SLOTS,
  effectivePlacement,
  placePlugin,
  removePlugin,
  shiftPlugin,
  slotOrder,
  type CardPlugin,
  type CardSlot,
} from "@momo/merchant-card";
import { useEffect } from "react";
import { Accordion, AccordionItem, AccordionTrigger, ArrowDownIcon, ArrowUpIcon, Label, Select, TrashIcon, Tooltip } from "@/shared/ui";
import { setPluginField, withModules, type Draft, type FieldIssues, type ModuleDraft } from "../lib/draft";
import { SchemaForm } from "./schema-form";

const SLOT_OPTIONS = CARD_SLOTS.map((s) => ({ value: s, label: CARD_SLOT_LABELS[s] }));

/**
 * 已加入卡片的模組：依插槽分組、依實際渲染順序排列。
 * 這裡同時是拖曳操作的「鍵盤替代方案」——換插槽、上下移動、移除都有對應按鈕。
 */
export function ModulePanel({
  draft,
  plugins,
  issues,
  selected,
  onSelect,
  onUpdate,
}: {
  draft: ModuleDraft;
  plugins: CardPlugin[];
  issues: FieldIssues;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (fn: (d: Draft) => Draft) => void;
}) {
  const byId = new Map(plugins.map((p) => [p.id, p]));
  const enabled = Object.keys(draft.extensions ?? {}).filter((id) => byId.has(id));
  const behavior = enabled.filter((id) => !byId.get(id)?.render);
  const groups = CARD_SLOTS.map((slot) => ({ slot, ids: slotOrder(draft, slot) })).filter((g) => g.ids.length > 0);

  useEffect(() => {
    if (selected) document.getElementById(`module-${selected}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  if (enabled.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
        卡片上還沒有模組。
        <br />
        從左側模組面板拖曳到卡片上，或按「＋」加入。
      </div>
    );
  }

  const renderItem = (id: string, position?: { index: number; count: number }) => {
    const plugin = byId.get(id)!;
    const placement = effectivePlacement(plugin, draft.placements);
    const prefix = `extensions.${id}.`;
    const hasIssue = Object.keys(issues).some((k) => k.startsWith(prefix));
    return (
      <AccordionItem
        key={id}
        value={id}
        className={hasIssue ? "border-danger" : selected === id ? "border-brand ring-1 ring-brand" : undefined}
        header={
          <>
            <AccordionTrigger id={`module-${id}`} className="group flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
              <span className="truncate text-sm font-medium">
                {plugin.name}
                {hasIssue && <span className="ml-1.5 text-xs text-danger">設定有誤</span>}
              </span>
              <span aria-hidden className="text-muted transition-transform group-data-[state=open]:rotate-180">
                ▾
              </span>
            </AccordionTrigger>
            {position && (
              <>
                <IconButton
                  label={`${plugin.name}往前移`}
                  disabled={position.index === 0}
                  onClick={() => onUpdate(withModules((d) => shiftPlugin(d, id, -1)))}
                >
                  <ArrowUpIcon className="size-4" />
                </IconButton>
                <IconButton
                  label={`${plugin.name}往後移`}
                  disabled={position.index === position.count - 1}
                  onClick={() => onUpdate(withModules((d) => shiftPlugin(d, id, 1)))}
                >
                  <ArrowDownIcon className="size-4" />
                </IconButton>
              </>
            )}
            <IconButton
              label={`移除${plugin.name}`}
              onClick={() => {
                if (selected === id) onSelect(null);
                onUpdate(withModules((d) => removePlugin(d, id)));
              }}
            >
              <TrashIcon className="size-4" />
            </IconButton>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-muted">{plugin.description}</p>
          {placement && (
            <div className="space-y-1.5">
              <Label htmlFor={`slot-${id}`}>擺放位置</Label>
              <Select
                id={`slot-${id}`}
                value={placement.slot}
                options={SLOT_OPTIONS}
                onValueChange={(slot) =>
                  onUpdate(withModules((d) => placePlugin(d, id, slot as CardSlot, slotOrder(d, slot as CardSlot).length)))
                }
              />
            </div>
          )}
          <SchemaForm
            fields={plugin.fields}
            values={{ ...plugin.defaults, ...draft.extensions?.[id] }}
            issues={issues}
            issuePrefix={prefix}
            onChange={(key, value) => onUpdate((d) => setPluginField(d, id, key, value))}
          />
        </div>
      </AccordionItem>
    );
  };

  return (
    <Accordion type="single" collapsible value={selected ?? ""} onValueChange={(v) => onSelect(v || null)} className="space-y-5">
      {groups.map(({ slot, ids }) => (
        <section key={slot} aria-label={CARD_SLOT_LABELS[slot]} className="space-y-2">
          <h3 className="flex items-center gap-2 text-xs font-medium text-muted">
            {CARD_SLOT_LABELS[slot]}
            <code className="rounded bg-surface-muted px-1 text-[10px]">{slot}</code>
          </h3>
          {ids.map((id, index) => renderItem(id, { index, count: ids.length }))}
        </section>
      ))}
      {behavior.length > 0 && (
        <section aria-label="行為模組" className="space-y-2">
          <h3 className="text-xs font-medium text-muted">行為模組（無畫面）</h3>
          {behavior.map((id) => renderItem(id))}
        </section>
      )}
    </Accordion>
  );
}

function IconButton({ label, children, ...props }: { label: string; children: React.ReactNode } & React.ComponentProps<"button">) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-30"
        {...props}
      >
        {children}
      </button>
    </Tooltip>
  );
}
