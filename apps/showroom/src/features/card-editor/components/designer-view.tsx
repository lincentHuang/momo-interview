"use client";

import { addPlugin, placePlugin, removePlugin, type CardLayout, type CardVariant } from "@momo/merchant-card";
import { useRef, useState } from "react";
import { usePlugins } from "@/features/card-store";
import { cn } from "@/shared/lib/cn";
import { Tabs, TabsContent, TabsList, TabsTrigger, TrashIcon } from "@/shared/ui";
import { useCardDraftContext } from "../context/card-draft-context";
import { useModuleDnd } from "../hooks/use-module-dnd";
import { setField, withModules, type ModuleDraft } from "../lib/draft";
import { ContentPanel } from "./content-panel";
import { DesignCanvas } from "./design-canvas";
import { ModulePalette } from "./module-palette";
import { ModulePanel } from "./module-panel";

type InspectorTab = "content" | "modules";

/**
 * 所見即所得設計頁：畫布 ｜ 右側編輯面板（內容 / 模組）
 *
 *  - 編輯面板固定在右側（sticky、內部捲動），改內容或模組時卡片一直在視線內
 *  - 「模組」分頁：上半是卡片上的模組（設定、換插槽、排序），下半是模組庫——拖到卡片插槽或按「＋」加入
 *  - 卡片上的模組可拖曳換位置 / 換插槽；拖回右側面板即移除
 *  - 點選卡片上的模組 → 切到「模組」並展開它的設定；點卡片本體 → 切到「內容」
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

  const removing = dnd.drag?.source === "card";
  const addModule = (id: string) => {
    update(withModules((d) => addPlugin(d, id)));
    select(id);
  };

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
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

      {/* 右側編輯面板：拖曳卡片上的模組到這裡＝移除 */}
      <aside
        aria-label="編輯面板"
        onDragOver={removing ? dnd.removeDragOver : undefined}
        onDrop={removing ? dnd.removeDrop : undefined}
        className={cn(
          "relative flex min-w-0 flex-col rounded-xl border border-line bg-white transition-colors",
          "lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)]",
          removing && "border-dashed border-danger/50",
          removing && dnd.removeActive && "bg-red-50",
        )}
      >
        {/* 遮罩接住指標：避免放在表單欄位上時，被 input 原生的文字拖放吃掉 */}
        {removing && (
          <div className="absolute inset-0 z-10 grid place-items-center rounded-xl bg-white/85 text-sm text-danger">
            <span className="flex items-center gap-2">
              <TrashIcon /> 放開以移除模組
            </span>
          </div>
        )}
        <Tabs value={tab} onValueChange={(v) => setTab(v as InspectorTab)} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="shrink-0 px-3 pt-1">
            <TabsTrigger value="content">內容{contentIssueCount > 0 && <Badge n={contentIssueCount} />}</TabsTrigger>
            <TabsTrigger value="modules">
              模組
              {moduleIssueCount > 0 ? <Badge n={moduleIssueCount} /> : <span className="ml-1.5 text-xs text-muted">{enabledCount}</span>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="content" className="min-h-0 flex-1 overflow-y-auto p-4">
            <ContentPanel draft={draft} issues={issues} onUpdate={update} />
          </TabsContent>
          <TabsContent value="modules" className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
            <PaneSection title="卡片上的模組">
              <ModulePanel draft={moduleDraft} plugins={available} issues={issues} selected={selected} onSelect={setSelected} onUpdate={update} />
            </PaneSection>
            <PaneSection title="模組庫">
              <ModulePalette
                plugins={allPlugins}
                variant={variant}
                enabledIds={enabledIds}
                onAdd={addModule}
                onDragStart={dnd.paletteDragStart}
                onDragEnd={dnd.end}
              />
            </PaneSection>
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
}

function PaneSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Badge({ n }: { n: number }) {
  return <span className="ml-1.5 rounded-full bg-danger px-1.5 text-[10px] text-white">{n}</span>;
}
