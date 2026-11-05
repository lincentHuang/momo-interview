import { placeholderImage, VARIANTS, type CardInput, type CardVariant } from "@momo/merchant-card";

const ID_PREFIX: Record<CardVariant, string> = {
  standard: "std",
  "flash-sale": "flash",
  live: "live",
  ranking: "rank",
};

/**
 * 新卡片 id：variant 前綴 + 隨機尾碼。
 * 不用流水號——兩個分頁同時新增時流水號會撞號，而 Store 是 LWW，撞號 = 互相覆蓋。
 */
export function newCardId(variant: CardVariant, existing: ReadonlySet<string>, random: () => string = randomSuffix): string {
  for (;;) {
    const id = `${ID_PREFIX[variant]}-${random()}`;
    if (!existing.has(id)) return id;
  }
}

function randomSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 6);
}

/**
 * 只填 schema 必填欄位的空白卡片；variant 專屬欄位沿用 VARIANTS 表的預設值，
 * 其餘交給編輯器補（新增後直接導到設計頁）。
 */
export function createBlankCard({
  id,
  variant,
  title,
  price,
  now = Date.now(),
}: {
  id: string;
  variant: CardVariant;
  title: string;
  price: number;
  now?: number;
}): CardInput {
  const label = title.replace(/^【[^】]*】/, "").slice(0, 6) || "新商品";
  const hue = [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 0);
  return {
    id,
    title,
    imageUrl: placeholderImage(label, hue),
    price,
    ...VARIANTS[variant].defaults(now),
  } as CardInput;
}
