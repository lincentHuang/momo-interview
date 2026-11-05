import { BUILTIN_PLUGINS, VARIANTS } from "@momo/merchant-card";

/** 領域分析結果：直接由 schema 定義產生，文件與程式碼不會走鐘 */
export function VariantAnalysis() {
  return (
    <section aria-labelledby="analysis-heading" className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="rounded-xl border border-line bg-white p-5">
        <h2 id="analysis-heading" className="mb-3 text-sm font-semibold">
          商品卡類型分析 <span className="font-normal text-muted">· variant（業務型態）</span>
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          {Object.values(VARIANTS).map((v) => (
            <div key={v.variant} className="rounded-lg bg-surface-muted p-3">
              <dt className="flex items-center gap-2 text-sm font-medium">
                {v.label}
                <code className="rounded bg-white px-1 text-[11px] text-muted">{v.variant}</code>
              </dt>
              <dd className="mt-1 text-xs text-muted">出現於：{v.foundIn}</dd>
              <dd className="mt-1 text-xs text-muted">專屬欄位：{v.fields.map((f) => f.label).join("、") || "—"}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-xl border border-line bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">
          行銷附加資訊 <span className="font-normal text-muted">· plugin</span>
        </h2>
        <ul className="space-y-2">
          {BUILTIN_PLUGINS.map((p) => (
            <li key={p.id} className="text-xs">
              <span className="font-medium text-ink">{p.name}</span>
              <span className="text-muted"> — {p.description}</span>
              {p.slot && <code className="ml-1 rounded bg-surface-muted px-1 text-[11px] text-muted">{p.slot}</code>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
