import { CARD_SCHEMA_VERSION } from "./card.schema";

/**
 * Schema 版本遷移
 *
 * 卡片資料會被持久化在使用者瀏覽器（localStorage）並在多個宿主間廣播，
 * 因此「舊版資料」一定會長期存在。每次 schema 破壞性變更都要在這裡加一個 step。
 *
 * v1 → v2：行銷標籤由 `badges: string[]` 改為 plugin 管理的 `extensions` record。
 */
type Raw = Record<string, unknown>;
type MigrationStep = (card: Raw) => Raw;

const LEGACY_BADGE_TO_PLUGIN: Record<string, { id: string; config: Raw }> = {
  "fast-delivery": { id: "fast-delivery", config: {} },
  coupon: { id: "coupon", config: {} },
  gift: { id: "gift", config: {} },
};

const steps: Record<number, MigrationStep> = {
  // from v1
  1: (card) => {
    const { badges, ...rest } = card;
    const extensions: Raw = { ...((rest.extensions as Raw | undefined) ?? {}) };
    if (Array.isArray(badges)) {
      for (const badge of badges) {
        const mapped = typeof badge === "string" ? LEGACY_BADGE_TO_PLUGIN[badge] : undefined;
        if (mapped) extensions[mapped.id] = mapped.config;
      }
    }
    return { ...rest, extensions };
  },
};

export function migrateCard(raw: unknown, fromVersion: number): unknown {
  if (fromVersion > CARD_SCHEMA_VERSION) {
    throw new Error(`無法降級：資料版本 v${fromVersion} 高於目前支援的 v${CARD_SCHEMA_VERSION}`);
  }
  let card = raw as Raw;
  for (let v = fromVersion; v < CARD_SCHEMA_VERSION; v++) {
    const step = steps[v];
    if (!step) throw new Error(`缺少 v${v} → v${v + 1} 的遷移步驟`);
    card = step(card);
  }
  return card;
}
