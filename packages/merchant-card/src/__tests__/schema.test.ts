import { CARD_SCHEMA_VERSION, createFixtures, discountLabel, migrateCard, parseCard, switchVariant } from "../index";

describe("CardSchema", () => {
  it("所有 fixtures 都通過驗證", () => {
    for (const f of createFixtures(0)) expect(parseCard(f).ok).toBe(true);
  });

  it("拒絕原價低於售價", () => {
    const [first] = createFixtures(0);
    const result = parseCard({ ...first, originalPrice: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.path).toBe("originalPrice");
  });

  it("拒絕 variant 專屬欄位缺漏", () => {
    expect(parseCard({ id: "x", variant: "flash-sale", title: "t", imageUrl: "i", price: 1 }).ok).toBe(false);
  });

  it("切換 variant 時保留共用欄位並補上新預設值", () => {
    const parsed = parseCard(createFixtures(0).find((f) => f.variant === "ranking"));
    if (!parsed.ok) throw new Error();
    const next = switchVariant(parsed.card, "flash-sale", 1000);
    expect(next.title).toBe(parsed.card.title);
    expect(next.subtitle).toBe(parsed.card.subtitle);
    expect(next.soldCount).toBe(parsed.card.soldCount);
    expect(next.variant).toBe("flash-sale");
    expect(parseCard(next).ok).toBe(true);
    expect("rank" in next).toBe(false);
  });

  it("剩餘數量不可超過活動總量", () => {
    const flash = createFixtures(0).find((f) => f.variant === "flash-sale")!;
    const result = parseCard({ ...flash, stockRemaining: 600, stockTotal: 500 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.path).toBe("stockRemaining");
  });
});

describe("migrateCard", () => {
  it("v1 badges → v2 extensions", () => {
    const v1 = { id: "a", variant: "standard", title: "t", imageUrl: "i", price: 10, badges: ["coupon", "unknown"] };
    const migrated = migrateCard(v1, 1) as Record<string, unknown>;
    expect(migrated.badges).toBeUndefined();
    expect(migrated.extensions).toEqual({ coupon: {} });
    expect(parseCard(migrated).ok).toBe(true);
  });

  it("v3 flash-sale stockSold → v4 stockRemaining", () => {
    const v3 = { id: "f", variant: "flash-sale", title: "t", imageUrl: "i", price: 10, endsAt: 1, stockTotal: 500, stockSold: 382, extensions: {}, placements: {} };
    const migrated = migrateCard(v3, 3) as Record<string, unknown>;
    expect(migrated.stockSold).toBeUndefined();
    expect(migrated.stockRemaining).toBe(118);
    expect(parseCard(migrated).ok).toBe(true);
  });

  it("v1 資料可一路遷移到最新版", () => {
    const v1 = { id: "f", variant: "flash-sale", title: "t", imageUrl: "i", price: 10, endsAt: 1, stockTotal: 10, stockSold: 3, badges: ["gift"] };
    expect(parseCard(migrateCard(v1, 1)).ok).toBe(true);
  });

  it("拒絕高於目前版本的資料", () => {
    expect(() => migrateCard({}, CARD_SCHEMA_VERSION + 1)).toThrow();
  });
});

describe("pricing", () => {
  it("以「折」表示折扣", () => {
    expect(discountLabel(790, 1290)).toBe("6.1折");
    expect(discountLabel(500, 1000)).toBe("5折");
    expect(discountLabel(1000, 1000)).toBeNull();
  });
});
