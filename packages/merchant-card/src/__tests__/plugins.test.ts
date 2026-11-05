import { z } from "zod";
import { BUILTIN_PLUGINS, PluginRegistry, definePlugin, parseCard, createFixtures } from "../index";

function card(extensions: Record<string, Record<string, unknown>>, variant = "standard") {
  const base = createFixtures(0).find((f) => f.variant === variant)!;
  const parsed = parseCard({ ...base, extensions });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
  return parsed.card;
}

describe("PluginRegistry", () => {
  it("依 slot 與 order 解析啟用中的 plugin", () => {
    const reg = new PluginRegistry();
    BUILTIN_PLUGINS.forEach((p) => reg.register(p));
    const resolved = reg.resolve(card({ gift: {}, "fast-delivery": {}, coupon: { amount: 50 } }), "badges");
    expect(resolved.map((r) => r.plugin.id)).toEqual(["fast-delivery", "coupon", "gift"]);
  });

  it("收藏 / 購物車是可移除的 actions 模組", () => {
    const reg = new PluginRegistry();
    BUILTIN_PLUGINS.forEach((p) => reg.register(p));
    expect(reg.resolve(card({ favorite: {}, "add-to-cart": {} }), "actions").map((r) => r.plugin.id)).toEqual(["favorite", "add-to-cart"]);
    expect(reg.resolve(card({ "add-to-cart": {} }), "actions").map((r) => r.plugin.id)).toEqual(["add-to-cart"]);
    expect(reg.resolve(card({}), "actions")).toEqual([]);
  });

  it("加入購物車：舊資料 {} 補上預設樣式，不合法樣式退回預設", () => {
    const reg = new PluginRegistry();
    BUILTIN_PLUGINS.forEach((p) => reg.register(p));
    const [r] = reg.resolve(card({ "add-to-cart": {} }), "actions");
    expect(r?.config).toEqual({ style: "auto", position: "bottom-right", imageHeight: 36 });
    const [bar] = reg.resolve(card({ "add-to-cart": { style: "bar", label: "買" } }), "actions");
    expect(bar?.config).toMatchObject({ style: "bar", label: "買" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const [bad] = reg.resolve(card({ "add-to-cart": { style: "floating" } }), "actions");
    expect(bad?.config.style).toBe("auto");
    warn.mockRestore();
  });

  it("圖片角標與底部橫幅僅在第一張圖（imageIndex === 0）渲染", () => {
    const reg = new PluginRegistry();
    BUILTIN_PLUGINS.forEach((p) => reg.register(p));
    const c = card({
      "image-tag": { imageUrl: "https://example.com/tag.png" },
      "bottom-banner": { imageUrl: "https://example.com/banner.png" },
    });
    const [top] = reg.resolve(c, "media-top");
    const [bottom] = reg.resolve(c, "media-bottom");
    const baseRuntime = { state: { favorite: false, cartQty: 0 }, inactive: false, toggleFavorite: () => {}, addToCart: () => {} };

    expect(top?.plugin.render?.({ card: c, config: top.config, runtime: { ...baseRuntime, imageIndex: 0 } })).not.toBeNull();
    expect(bottom?.plugin.render?.({ card: c, config: bottom.config, runtime: { ...baseRuntime, imageIndex: 0 } })).not.toBeNull();
    expect(top?.plugin.render?.({ card: c, config: top.config, runtime: { ...baseRuntime, imageIndex: 1 } })).toBeNull();
    expect(bottom?.plugin.render?.({ card: c, config: bottom.config, runtime: { ...baseRuntime, imageIndex: 1 } })).toBeNull();
  });

  it("config 不合法時退回預設值，而非拋錯", () => {
    const reg = new PluginRegistry();
    BUILTIN_PLUGINS.forEach((p) => reg.register(p));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const [r] = reg.resolve(card({ installment: { periods: 1 } }), "price-extra");
    expect(r?.config).toEqual({ periods: 12 });
    warn.mockRestore();
  });

  it("尊重 variant 限制", () => {
    const reg = new PluginRegistry();
    BUILTIN_PLUGINS.forEach((p) => reg.register(p));
    expect(reg.resolve(card({ installment: {} }, "live"))).toHaveLength(0);
  });

  it("未註冊的 extension 被忽略（向前相容），註冊後通知訂閱者", () => {
    const reg = new PluginRegistry();
    const c = card({ double11: { text: "滿千送百" } });
    expect(reg.resolve(c)).toHaveLength(0);
    const listener = vi.fn();
    reg.subscribe(listener);
    reg.register(
      definePlugin({
        id: "double11",
        name: "雙11",
        description: "",
        slot: "media-top",
        configSchema: z.object({ text: z.string() }),
        defaults: { text: "" },
        fields: [],
      }),
    );
    expect(listener).toHaveBeenCalledOnce();
    expect(reg.resolve(c)[0]?.config).toEqual({ text: "滿千送百" });
  });
});
