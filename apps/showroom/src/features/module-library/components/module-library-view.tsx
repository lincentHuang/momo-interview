"use client";

import { CARD_SLOT_LABELS, VARIANTS, type CardPlugin } from "@momo/merchant-card";
import { usePlugins } from "@/features/card-store";
import { PageHeader } from "@/shared/layout/page-header";
import { BoltIcon, PuzzleIcon } from "@/shared/ui";

const SNIPPET = `import { html, registerPlugin } from "@momo/merchant-card/element";

registerPlugin({
  id: "double11",
  name: "雙 11 角標",
  description: "活動期間的圖片角標",
  slot: "media-top",              // 預設插槽，編輯器可拖到其他插槽
  defaults: { text: "11.11" },
  fields: [{ kind: "text", key: "text", label: "角標文字" }],
  render: ({ config }) => html\`<span class="tag tag--solid">\${config.text}</span>\`,
});`;

/** 已註冊模組一覽：由 Plugin Registry 動態產生，宿主執行期註冊的模組也會出現在這裡 */
export function ModuleLibraryView() {
  const plugins = usePlugins();
  const visual = plugins?.filter((p) => p.render) ?? [];
  const behavior = plugins?.filter((p) => !p.render) ?? [];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="模組庫"
        description="卡片上的行銷資訊都是可插拔的模組。在編輯器中把模組拖到卡片的任一插槽即可加入；新增模組不需要修改卡片或編輯器。"
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-8">
          <ModuleGroup title="版位模組" hint="渲染在卡片插槽上，可拖曳調整位置與順序" icon={<PuzzleIcon />} plugins={plugins ? visual : null} />
          <ModuleGroup title="行為模組" hint="沒有畫面，在卡片生命週期中執行（例如埋點）" icon={<BoltIcon />} plugins={plugins ? behavior : null} />
        </div>

        <aside className="min-w-0 space-y-3 xl:sticky xl:top-6 xl:self-start">
          <h2 className="text-sm font-semibold">自訂模組</h2>
          <p className="text-xs text-muted">
            任何宿主都能在執行期註冊模組；已渲染的卡片會自動重繪。<code className="rounded bg-white px-1">fields</code> 讓編輯器自動產生設定表單。
          </p>
          <pre className="overflow-auto rounded-lg bg-ink p-4 font-mono text-[11px] leading-relaxed text-white">{SNIPPET}</pre>
        </aside>
      </div>
    </div>
  );
}

function ModuleGroup({
  title,
  hint,
  icon,
  plugins,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  plugins: CardPlugin[] | null;
}) {
  return (
    <section aria-label={title} className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted">{hint}</span>
      </div>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        {plugins === null
          ? Array.from({ length: 4 }, (_, i) => <li key={i} className="h-32 animate-pulse rounded-xl bg-white" />)
          : plugins.map((p) => (
              <li key={p.id} className="flex gap-3 rounded-xl border border-line bg-white p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">{icon}</span>
                <div className="min-w-0 space-y-1.5">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {p.name}
                    <code className="rounded bg-surface-muted px-1 text-[11px] font-normal text-muted">{p.id}</code>
                  </p>
                  <p className="text-xs text-muted">{p.description}</p>
                  <dl className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                    {p.slot && (
                      <div className="flex gap-1">
                        <dt>預設插槽</dt>
                        <dd className="text-ink">{CARD_SLOT_LABELS[p.slot]}</dd>
                      </div>
                    )}
                    <div className="flex gap-1">
                      <dt>適用</dt>
                      <dd className="text-ink">{p.variants ? p.variants.map((v) => VARIANTS[v].label).join("、") : "全部類型"}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>設定</dt>
                      <dd className="text-ink">{p.fields.map((f) => f.label).join("、") || "—"}</dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
      </ul>
    </section>
  );
}
