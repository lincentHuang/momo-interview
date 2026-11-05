import { parseCard, type Card } from "../../schema/card.schema";
import { createFixtures } from "../../schema/fixtures";
import type { CardRecord } from "../../store/types";
import type { MomoSectionKind } from "./homepage";

/**
 * momo 首頁各區塊對應的預設樣板卡 ID（對應 createFixtures 中的種子卡片）：
 *   - 限時搶購 (flash-sale)        → flash-earbuds
 *   - 你的精選好物榜 (ranking)     → rank-rice
 *   - 橫式輪播 (carousel / list)   → std-towel
 *   - 你可能會喜歡 (waterfall)     → std-airfryer
 */
export const MOMO_SECTION_TEMPLATE_IDS: Readonly<Record<MomoSectionKind, string>> = {
  "flash-sale": "flash-earbuds",
  ranking: "rank-rice",
  carousel: "std-towel",
  waterfall: "std-airfryer",
};

/** 樣板卡 ID 對應的 momo 首頁區塊名稱（用於目錄與編輯器提示） */
export const MOMO_TEMPLATE_SECTION_LABELS: Readonly<Record<string, string>> = {
  "flash-earbuds": "限時搶購",
  "rank-rice": "你的精選好物榜",
  "std-towel": "橫式輪播",
  "std-airfryer": "你可能會喜歡",
};

/**
 * 來自 momo API 單一商品原始資料的行銷標籤（map.ts 的 tagsToExtensions / imageExtensions）。
 * 預設保留各商品自身標籤，僅當使用者在樣板卡明確「新增 / 修改 / 移除」時才整區覆寫。
 */
export const MOMO_PRODUCT_TAG_IDS: ReadonlySet<string> = new Set([
  "fast-delivery",
  "coupon",
  "register",
  "gift",
  "campaign-tag",
  "store-plus",
  "pre-order",
  "image-tag",
  "bottom-banner",
]);

const SEED_TEMPLATES: Readonly<Record<string, Card>> = Object.fromEntries(
  createFixtures(0)
    .map((c) => parseCard(c))
    .filter((r): r is { ok: true; card: Card } => r.ok)
    .map((r) => [r.card.id, r.card]),
);

function sameConfig(a: Record<string, unknown> | undefined, b: Record<string, unknown> | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * 將樣板卡的「樣式與模組設定」套用到 momo 首頁商品卡：
 *   1. 版型（layout）與所有模組版位（placements）跟隨樣板卡
 *   2. 互動與非 API 模組（favorite、add-to-cart 樣式與位置、installment、corner-label、cashback…）由樣板卡決定啟用與設定
 *   3. momo 商品自身的行銷標（速、折價券、登記、贈品、檔期標、店⁺、預購、圖片角標、底部橫幅）：
 *      - 預設保留該商品從 momo API 轉出的標籤（同時跟隨樣板卡的 placements 版位設定）
 *      - 若使用者在樣板卡移除了種子原有的標籤 → 整區隱藏該標籤
 *      - 若使用者在樣板卡新增了種子沒有的標籤，或修改了標籤設定 → 套用樣板設定
 */
export function applyCardTemplate(card: Card, template: Card): Card {
  const seed = SEED_TEMPLATES[template.id];
  const extensions: Record<string, Record<string, unknown>> = {};

  // 1. 商品原本從 momo API 帶來的行銷標
  for (const [id, config] of Object.entries(card.extensions)) {
    if (!MOMO_PRODUCT_TAG_IDS.has(id)) continue;
    const hadInSeed = seed ? id in seed.extensions : false;
    const hasInTemplate = id in template.extensions;
    if (hadInSeed && !hasInTemplate) {
      // 使用者在樣板卡移除了這個標籤 → 整區隱藏
      continue;
    }
    if (hasInTemplate && (!hadInSeed || !sameConfig(template.extensions[id], seed?.extensions[id]))) {
      extensions[id] = template.extensions[id]!;
    } else {
      extensions[id] = config;
    }
  }

  // 2. 樣板卡啟用的模組（互動模組、額外模組，以及使用者在樣板卡新增或修改的 momo 行銷標）
  for (const [id, config] of Object.entries(template.extensions)) {
    if (!MOMO_PRODUCT_TAG_IDS.has(id)) {
      extensions[id] = config;
      continue;
    }
    const hadInSeed = seed ? id in seed.extensions : false;
    const modifiedFromSeed = !hadInSeed || !sameConfig(config, seed?.extensions[id]);
    if (modifiedFromSeed && !(id in extensions)) {
      extensions[id] = config;
    }
  }

  return {
    ...card,
    layout: template.layout,
    extensions,
    placements: { ...template.placements, ...card.placements },
  };
}

/**
 * 結合共享 Store 的紀錄解析 momo 首頁區塊的商品卡：
 *   - 若單張商品已匯入目錄且經過個別編輯（rev > 1 且最後修改時間不早於樣板卡），直接採用該張卡的設定
 *   - 否則將區塊對應的樣板卡設定即時套用到商品卡上
 */
export function resolveSectionCards(
  cards: ReadonlyArray<Card>,
  kind: MomoSectionKind,
  records: Readonly<Record<string, CardRecord>> | undefined,
): Card[] {
  if (!records) return [...cards];
  const templateId = MOMO_SECTION_TEMPLATE_IDS[kind];
  const templateRecord = records[templateId];
  return cards.map((rawCard) => {
    const itemRecord = records[rawCard.id];
    const individuallyEdited = itemRecord && itemRecord.rev > 1 && (!templateRecord || itemRecord.updatedAt >= templateRecord.updatedAt);
    if (individuallyEdited) {
      return itemRecord.card;
    }
    const base = itemRecord?.card ?? rawCard;
    return templateRecord ? applyCardTemplate(base, templateRecord.card) : base;
  });
}
