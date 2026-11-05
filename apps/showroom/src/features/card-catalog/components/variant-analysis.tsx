import { BUILTIN_PLUGINS, CARD_SLOT_LABELS, CARD_SLOTS, VARIANTS } from "@momo/merchant-card";

/** 領域分析結果：直接由 schema 定義產生，文件與程式碼不會走鐘 */
export function VariantAnalysis() {
  return (
    <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
      <section aria-labelledby="variant-heading" className="rounded-xl border border-line bg-white p-5">
        <h2 id="variant-heading" className="mb-1 text-sm font-semibold">
          商品卡類型 <span className="font-normal text-muted">· variant（業務型態）</span>
        </h2>
        <p className="mb-4 text-xs text-muted">決定卡片的專屬資訊，以 Discriminated Union 建模；新增 variant 時 TypeScript 會強制補齊 renderer。</p>
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
      </section>

      <section aria-labelledby="slot-heading" className="rounded-xl border border-line bg-white p-5">
        <h2 id="slot-heading" className="mb-1 text-sm font-semibold">
          行銷附加資訊 <span className="font-normal text-muted">· plugin × slot</span>
        </h2>
        <p className="mb-4 text-xs text-muted">變動最頻繁的需求交給 plugin；卡片只提供插槽，編輯器可把模組拖到任一插槽。</p>
        <ul className="space-y-3">
          {CARD_SLOTS.map((slot) => {
            const plugins = BUILTIN_PLUGINS.filter((p) => p.slot === slot);
            return (
              <li key={slot} className="flex items-start gap-3 text-xs">
                <code className="w-24 shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] text-muted">{slot}</code>
                <span>
                  <span className="font-medium text-ink">{CARD_SLOT_LABELS[slot]}</span>
                  <span className="text-muted"> — 預設模組：{plugins.map((p) => p.name).join("、") || "無"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
