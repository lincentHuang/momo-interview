import { parseCard, pluginRegistry, type Card, type PlacementTarget } from "@momo/merchant-card";

/** 欄位路徑 → 錯誤訊息（路徑格式與 zod issue path 一致，例如 `extensions.coupon.amount`） */
export type FieldIssues = Record<string, string>;

export type DraftValidation = { ok: true; card: Card } | { ok: false; issues: FieldIssues };

/**
 * 編輯器的驗證邊界：卡片 schema + 已啟用 plugin 的 config schema。
 * 卡片 schema 刻意把 extensions 視為開放 record（向前相容），
 * 所以 plugin config 的嚴格驗證放在「編輯」這一側，阻止不合法的設定被寫入 / 廣播。
 */
export function validateDraft(draft: unknown): DraftValidation {
  const issues: FieldIssues = {};
  const parsed = parseCard(draft);
  if (!parsed.ok) {
    for (const i of parsed.issues) issues[i.path || "_"] ??= i.message;
    return { ok: false, issues };
  }
  for (const [id, raw] of Object.entries(parsed.card.extensions)) {
    const plugin = pluginRegistry.get(id);
    if (!plugin?.configSchema) continue;
    const result = plugin.configSchema.safeParse({ ...plugin.defaults, ...raw });
    if (!result.success) {
      for (const i of result.error.issues as Array<{ path: PropertyKey[]; message: string }>) {
        issues[["extensions", id, ...i.path.map(String)].join(".")] ??= i.message;
      }
    }
  }
  return Object.keys(issues).length ? { ok: false, issues } : { ok: true, card: parsed.card };
}

export type Draft = Record<string, unknown> & { extensions?: Record<string, Record<string, unknown>> };

/** 版位運算（@momo/merchant-card 的 placePlugin 等）需要的草稿形狀；variant 在草稿中永遠存在 */
export type ModuleDraft = Draft & PlacementTarget;

/** 包裝版位運算，讓它能直接作為 update(fn) 的參數 */
export function withModules(fn: (d: ModuleDraft) => ModuleDraft): (d: Draft) => Draft {
  return (d) => fn(d as ModuleDraft);
}

export function setField(draft: Draft, key: string, value: unknown): Draft {
  const next = { ...draft };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next;
}

export function setPluginField(draft: Draft, pluginId: string, key: string, value: unknown): Draft {
  const extensions = { ...(draft.extensions ?? {}) };
  extensions[pluginId] = { ...(extensions[pluginId] ?? {}), [key]: value };
  return { ...draft, extensions };
}

