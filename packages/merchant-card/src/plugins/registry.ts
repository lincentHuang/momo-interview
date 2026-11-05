import type { Card, Placement } from "../schema/card.schema";
import type { CardPlugin, CardSlot } from "./types";

type AnyPlugin = CardPlugin<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Listener = () => void;

/** plugin 在這張卡片上的實際版位；無 UI 的 plugin 回傳 null */
export function effectivePlacement(plugin: AnyPlugin, placements: Record<string, Placement> | undefined): Placement | null {
  if (!plugin.render) return null;
  const override = placements?.[plugin.id];
  if (override) return override;
  return plugin.slot ? { slot: plugin.slot, order: plugin.order ?? 0 } : null;
}

export interface ResolvedPlugin {
  plugin: AnyPlugin;
  config: Record<string, unknown>;
}

/**
 * Plugin Registry
 *
 * - 掛在 globalThis 上：同一頁面若同時載入多份 bundle（例如 ES + IIFE、或不同團隊各自引入），
 *   仍共用同一份 registry，避免「註冊了但另一份卡片看不到」。
 * - 註冊 / 移除時通知所有卡片重新渲染，因此宿主可在卡片渲染後才動態註冊 plugin。
 */
export class PluginRegistry {
  private plugins = new Map<string, AnyPlugin>();
  private listeners = new Set<Listener>();
  private version = 0;

  register(plugin: AnyPlugin, { override = false } = {}): () => void {
    if (this.plugins.has(plugin.id) && !override) {
      console.warn(`[momo-card] plugin "${plugin.id}" 已註冊，若要覆蓋請傳入 { override: true }`);
      return () => this.unregister(plugin.id);
    }
    this.plugins.set(plugin.id, plugin);
    this.notify();
    return () => this.unregister(plugin.id);
  }

  unregister(id: string): void {
    if (this.plugins.delete(id)) this.notify();
  }

  get(id: string): AnyPlugin | undefined {
    return this.plugins.get(id);
  }

  list(): AnyPlugin[] {
    return [...this.plugins.values()];
  }

  /** 該卡片可用（variant 相容）的 plugin */
  available(card: Pick<Card, "variant">): AnyPlugin[] {
    return this.list().filter((p) => !p.variants || p.variants.includes(card.variant));
  }

  /**
   * 解析卡片上啟用的 plugin + 驗證後的 config。
   * config 不合法時退回 defaults 並警告——單一 plugin 壞掉不應讓整張卡片掛掉。
   */
  resolve(card: Card, slot?: CardSlot): ResolvedPlugin[] {
    const out: Array<ResolvedPlugin & { order: number }> = [];
    for (const [id, raw] of Object.entries(card.extensions)) {
      const plugin = this.plugins.get(id);
      if (!plugin) continue; // 未註冊的 extension 保留資料但不渲染（向前相容）
      if (plugin.variants && !plugin.variants.includes(card.variant)) continue;
      // 卡片的 placements 可覆寫 plugin 宣告的預設 slot / order（WYSIWYG 拖曳結果）
      const placement = effectivePlacement(plugin, card.placements);
      if (slot !== undefined && placement?.slot !== slot) continue;
      const order = placement?.order ?? plugin.order ?? 0;
      const merged = { ...plugin.defaults, ...raw };
      if (!plugin.configSchema) {
        out.push({ plugin, config: merged, order });
        continue;
      }
      const parsed = plugin.configSchema.safeParse(merged);
      if (!parsed.success) {
        console.warn(`[momo-card] plugin "${id}" config 不合法，改用預設值`, parsed.error.issues);
      }
      out.push({ plugin, config: parsed.success ? parsed.data : plugin.defaults, order });
    }
    // Array.prototype.sort 為穩定排序：order 相同時維持 extensions 的插入順序
    return out.sort((a, b) => a.order - b.order).map(({ plugin, config }) => ({ plugin, config }));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** 每次註冊變動遞增；供 React useSyncExternalStore 等需要穩定 snapshot 的訂閱者使用 */
  getVersion(): number {
    return this.version;
  }

  private notify() {
    this.version++;
    for (const l of this.listeners) l();
  }
}

const KEY = Symbol.for("momo-card.plugin-registry");
type GlobalWithRegistry = typeof globalThis & { [KEY]?: PluginRegistry };

export const pluginRegistry: PluginRegistry = ((globalThis as GlobalWithRegistry)[KEY] ??= new PluginRegistry());
