import type { Card } from "../schema/card.schema";
import type { CardPlugin, CardSlot } from "./types";

type AnyPlugin = CardPlugin<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Listener = () => void;

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
    const out: ResolvedPlugin[] = [];
    for (const [id, raw] of Object.entries(card.extensions)) {
      const plugin = this.plugins.get(id);
      if (!plugin) continue; // 未註冊的 extension 保留資料但不渲染（向前相容）
      if (plugin.variants && !plugin.variants.includes(card.variant)) continue;
      if (slot !== undefined && plugin.slot !== slot) continue;
      const parsed = plugin.configSchema.safeParse({ ...plugin.defaults, ...raw });
      if (!parsed.success) {
        console.warn(`[momo-card] plugin "${id}" config 不合法，改用預設值`, parsed.error.issues);
      }
      out.push({ plugin, config: parsed.success ? parsed.data : plugin.defaults });
    }
    return out.sort((a, b) => (a.plugin.order ?? 0) - (b.plugin.order ?? 0));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const l of this.listeners) l();
  }
}

const KEY = Symbol.for("momo-card.plugin-registry");
type GlobalWithRegistry = typeof globalThis & { [KEY]?: PluginRegistry };

export const pluginRegistry: PluginRegistry = ((globalThis as GlobalWithRegistry)[KEY] ??= new PluginRegistry());
