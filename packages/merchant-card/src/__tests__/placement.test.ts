import { BUILTIN_PLUGINS, PluginRegistry, addPlugin, createFixtures, migrateCard, parseCard, placePlugin, removePlugin, shiftPlugin, slotOrder } from "../index";

function setup() {
  const reg = new PluginRegistry();
  BUILTIN_PLUGINS.forEach((p) => reg.register(p));
  const base = parseCard({ ...createFixtures(0)[0], extensions: { "fast-delivery": {}, gift: {}, installment: {} } });
  if (!base.ok) throw new Error();
  return { reg, card: base.card };
}

describe("placement（WYSIWYG 版位）", () => {
  it("未覆寫時沿用 plugin 宣告的 slot / order", () => {
    const { reg, card } = setup();
    expect(slotOrder(card, "badges", reg)).toEqual(["fast-delivery", "gift"]);
    expect(slotOrder(card, "price-extra", reg)).toEqual(["installment"]);
  });

  it("拖到同插槽的指定位置會重排，且 registry.resolve 依相同順序渲染", () => {
    const { reg, card } = setup();
    const next = placePlugin(card, "gift", "badges", 0, reg);
    expect(slotOrder(next, "badges", reg)).toEqual(["gift", "fast-delivery"]);
    const parsed = parseCard(next);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(reg.resolve(parsed.card, "badges").map((r) => r.plugin.id)).toEqual(["gift", "fast-delivery"]);
  });

  it("跨插槽移動：從原插槽消失、出現在目標插槽", () => {
    const { reg, card } = setup();
    const next = placePlugin(card, "installment", "badges", 1, reg);
    expect(slotOrder(next, "price-extra", reg)).toEqual([]);
    expect(slotOrder(next, "badges", reg)).toEqual(["fast-delivery", "installment", "gift"]);
  });

  it("拖入未啟用的模組會以預設值啟用；行為模組沒有版位", () => {
    const { reg, card } = setup();
    const next = placePlugin(card, "corner-label", "footer", 0, reg);
    expect(next.extensions["corner-label"]).toEqual({ text: "momo獨家" });
    expect(slotOrder(next, "footer", reg)).toEqual(["corner-label"]);
    expect(placePlugin(card, "impression-tracker", "footer", 0, reg)).toBe(card);
    expect(addPlugin(card, "impression-tracker", reg).extensions["impression-tracker"]).toEqual({ threshold: 0.5 });
  });

  it("shift 在插槽內前後移動，邊界時不變", () => {
    const { reg, card } = setup();
    expect(slotOrder(shiftPlugin(card, "gift", -1, reg), "badges", reg)).toEqual(["gift", "fast-delivery"]);
    expect(shiftPlugin(card, "fast-delivery", -1, reg)).toBe(card);
  });

  it("移除時同時清掉設定與版位", () => {
    const { reg, card } = setup();
    const next = removePlugin(placePlugin(card, "gift", "footer", 0, reg), "gift");
    expect(next.extensions.gift).toBeUndefined();
    expect(next.placements.gift).toBeUndefined();
  });

  it("v2 → v3 遷移補上 placements", () => {
    const v2 = { ...createFixtures(0)[0] };
    const migrated = migrateCard(v2, 2) as Record<string, unknown>;
    expect(migrated.placements).toEqual({});
    expect(parseCard(migrated).ok).toBe(true);
  });

  it("拒絕不存在的插槽名稱", () => {
    expect(parseCard({ ...createFixtures(0)[0], placements: { gift: { slot: "nowhere", order: 0 } } }).ok).toBe(false);
  });
});
