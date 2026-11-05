"use client";

import type { CardVariant } from "@momo/merchant-card";
import { Accordion, AccordionItem, AccordionTrigger, Switch } from "@/shared/ui";
import { useAvailablePlugins } from "../hooks/use-plugins";
import { setPluginField, togglePlugin, type FieldIssues } from "../lib/draft";
import { SchemaForm } from "./schema-form";

type Draft = Record<string, unknown> & { extensions?: Record<string, Record<string, unknown>> };

/** 由 Plugin Registry 動態產生：註冊新的 plugin 後，這裡會自動出現對應的開關與欄位 */
export function PluginPanel({
  draft,
  issues,
  onUpdate,
}: {
  draft: Draft;
  issues: FieldIssues;
  onUpdate: (fn: (d: Draft) => Draft) => void;
}) {
  const plugins = useAvailablePlugins(draft.variant as CardVariant);
  const extensions = draft.extensions ?? {};
  const enabledIds = plugins.filter((p) => p.id in extensions).map((p) => p.id);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        行銷附加資訊以 plugin 形式掛載在卡片的 slot 上。核心卡片不認識任何一個 plugin，新增 plugin 不需要修改卡片或編輯器。
      </p>
      <Accordion type="multiple" defaultValue={enabledIds} className="space-y-2">
        {plugins.map((plugin) => {
          const enabled = plugin.id in extensions;
          return (
            <AccordionItem
              key={plugin.id}
              value={plugin.id}
              header={
                <>
                  <Switch
                    checked={enabled}
                    aria-label={`啟用${plugin.name}`}
                    onCheckedChange={(on) => onUpdate((d) => togglePlugin(d, plugin.id, on))}
                  />
                  <AccordionTrigger className="group flex flex-1 items-center justify-between text-left">
                    <span>
                      <span className="text-sm font-medium">{plugin.name}</span>
                      <span className="ml-2 text-xs text-muted">{plugin.slot ? `slot: ${plugin.slot}` : "無 UI · 生命週期"}</span>
                    </span>
                    <span className="text-muted transition-transform group-data-[state=open]:rotate-180">▾</span>
                  </AccordionTrigger>
                </>
              }
            >
              <p className="mb-3 text-xs text-muted">{plugin.description}</p>
              {enabled ? (
                <SchemaForm
                  fields={plugin.fields}
                  values={{ ...plugin.defaults, ...extensions[plugin.id] }}
                  issues={issues}
                  issuePrefix={`extensions.${plugin.id}.`}
                  onChange={(key, value) => onUpdate((d) => setPluginField(d, plugin.id, key, value))}
                />
              ) : (
                <p className="text-xs text-muted">啟用後可調整設定</p>
              )}
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
