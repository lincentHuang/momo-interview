"use client";

import { addPlugin, placePlugin, removePlugin, type CardLayout, type CardVariant } from "@momo/merchant-card";
import { useRef, useState } from "react";
import { usePlugins } from "@/features/card-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui";
import { useCardDraftContext } from "../context/card-draft-context";
import { useModuleDnd } from "../hooks/use-module-dnd";
import { setField, withModules, type ModuleDraft } from "../lib/draft";
import { ContentPanel } from "./content-panel";
import { DesignCanvas } from "./design-canvas";
import { ModulePalette } from "./module-palette";
import { ModulePanel } from "./module-panel";

type InspectorTab = "content" | "modules";

/**
 * 所見即所得設計頁：模組面板 ｜ 畫布 ｜ 屬性面板
 *
 *  - 從左側拖曳模組到卡片的插槽（或按「＋」加到預設插槽）
 *  - 卡片上的模組可拖曳換位置 / 換插槽；拖回左側面板即移除
 *  - 點選卡片上的模組 → 右側切到「模組」並展開它的設定；點卡片本體 → 切到「內容」
 *
 * 所有操作都是對草稿的純函式轉換（placePlugin / removePlugin…），經 schema 驗證後寫入共享 Store，
 * 因此其他分頁與 sample.html 會即時看到排版變化。
 */
export function DesignerView() {
  const { draft, issues, update } = useCardDraftContext();
  const variant = (draft?.variant ?? "standard") as CardVariant;
  const allPlugins = usePlugins();
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<InspectorTab>("content");
  const canvasRef = useRef<HTMLDivElement>(null);

  const select = (id: string | null) => {
    setSelected(id);
    if (id) setTab("modules");
  };

  const dnd = useModuleDnd({
    canvasRef,
    getPlugin: (id) => allPlugins?.find((p) => p.id === id),
    onPlace: (id, slot, index) => {
      update(withModules((d) => placePlugin(d, id, slot, index)));
      select(id);
    },
    onEnable: (id) => {
      update(withModules((d) => addPlugin(d, id)));
      select(id);
    },
    onRemove: (id) => {
      update(withModules((d) => removePlugin(d, id)));
      if (selected === id) setSelected(null);
    },
  });

  if (!draft || !allPlugins) return <div className="h-[600px] animate-pulse rounded-xl bg-white" aria-busy="true" />;

  const moduleDraft = draft as ModuleDraft;
  const enabledIds = new Set(Object.keys(moduleDraft.extensions ?? {}));
  const available = allPlugins.filter((p) => !p.variants || p.variants.includes(variant));
  const behaviorModules = available.filter((p) => !p.render && enabledIds.has(p.id));
  const moduleIssueCount = Object.keys(issues).filter((k) => k.startsWith("extensions.")).length;
  const contentIssueCount = Object.keys(issues).length - moduleIssueCount;
  const enabledCount = available.filter((p) => enabledIds.has(p.id)).length;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1fr)_340px] 2xl:grid-cols-[240px_minmax(0,1fr)_380px]">
      <ModulePalette
        plugins={allPlugins}
        variant={variant}
        enabledIds={enabledIds}
        drag={dnd.drag}
        removeActive={dnd.removeActive}
        onAdd={(id) => {
          update(withModules((d) => addPlugin(d, id)));
          select(id);
        }}
        onDragStart={dnd.paletteDragStart}
        onDragEnd={dnd.end}
        onRemoveDragOver={dnd.removeDragOver}
        onRemoveDrop={dnd.removeDrop}
      />

      <DesignCanvas
        cardId={String(draft.id)}
        layout={(draft.layout as CardLayout | undefined) ?? "grid"}
        selected={selected}
        drag={dnd.drag}
        target={dnd.target}
        behaviorModules={behaviorModules}
        canvasRef={canvasRef}
        onLayoutChange={(layout) => update((d) => setField(d, "layout", layout))}
        onSelect={select}
        onFocusContent={() => {
          setSelected(null);
          setTab("content");
        }}
        onRemove={(id) => {
          update(withModules((d) => removePlugin(d, id)));
          if (selected === id) setSelected(null);
        }}
        dnd={dnd}
      />

      <section aria-label="屬性面板" className="rounded-xl border border-line bg-white p-4 lg:col-span-2 xl:col-span-1">
        <Tabs value={tab} onValueChange={(v) => setTab(v as InspectorTab)}>
          <TabsList>
            <TabsTrigger value="content">內容{contentIssueCount > 0 && <Badge n={contentIssueCount} />}</TabsTrigger>
            <TabsTrigger value="modules">
              模組
              {moduleIssueCount > 0 ? <Badge n={moduleIssueCount} /> : <span className="ml-1.5 text-xs text-muted">{enabledCount}</span>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="content">
            <ContentPanel draft={draft} issues={issues} onUpdate={update} />
          </TabsContent>
          <TabsContent value="modules">
            <ModulePanel draft={moduleDraft} plugins={available} issues={issues} selected={selected} onSelect={setSelected} onUpdate={update} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

function Badge({ n }: { n: number }) {
  return <span className="ml-1.5 rounded-full bg-danger px-1.5 text-[10px] text-white">{n}</span>;
}
