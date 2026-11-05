import type { CardSlot, CardVariant, Placement } from "../schema/card.schema";
import { effectivePlacement, pluginRegistry, type PluginRegistry } from "./registry";

export { effectivePlacement };

/**
 * 版位（placement）運算：WYSIWYG 編輯器拖曳模組時使用的純函式。
 *
 * 只依賴卡片的 variant / extensions / placements，因此可直接作用在「編輯中、尚未通過驗證」的草稿上。
 * 回傳新物件，不修改輸入（React state / Store 都需要 immutable 更新）。
 */
export interface PlacementTarget {
  variant: CardVariant;
  extensions?: Record<string, Record<string, unknown>>;
  placements?: Record<string, Placement>;
}

/** 某個插槽內已啟用 plugin 的 id，依實際渲染順序排列 */
export function slotOrder(target: PlacementTarget, slot: CardSlot, registry: PluginRegistry = pluginRegistry): string[] {
  const entries: Array<{ id: string; order: number; index: number }> = [];
  Object.keys(target.extensions ?? {}).forEach((id, index) => {
    const plugin = registry.get(id);
    if (!plugin || (plugin.variants && !plugin.variants.includes(target.variant))) return;
    const placement = effectivePlacement(plugin, target.placements);
    if (placement?.slot === slot) entries.push({ id, order: placement.order, index });
  });
  // 與 registry.resolve 相同的排序規則（order 相同時維持 extensions 的插入順序）
  return entries.sort((a, b) => a.order - b.order || a.index - b.index).map((e) => e.id);
}

/**
 * 把 plugin 放到 `slot` 的第 `index` 個位置（尚未啟用則以預設值啟用）。
 * 目標插槽內所有 plugin 都會寫入連續的 order，確保結果與拖曳當下看到的順序一致。
 */
export function placePlugin<T extends PlacementTarget>(
  target: T,
  pluginId: string,
  slot: CardSlot,
  index: number,
  registry: PluginRegistry = pluginRegistry,
): T {
  const plugin = registry.get(pluginId);
  if (!plugin?.render) return target;
  const extensions = { ...(target.extensions ?? {}) };
  extensions[pluginId] ??= { ...plugin.defaults };

  const ids = slotOrder({ ...target, extensions }, slot, registry).filter((id) => id !== pluginId);
  ids.splice(Math.max(0, Math.min(index, ids.length)), 0, pluginId);

  const placements = { ...(target.placements ?? {}) };
  ids.forEach((id, i) => (placements[id] = { slot, order: i * 10 }));
  return { ...target, extensions, placements };
}

/** 啟用無版位的行為模組，或把版位模組加到它的預設插槽尾端 */
export function addPlugin<T extends PlacementTarget>(target: T, pluginId: string, registry: PluginRegistry = pluginRegistry): T {
  const plugin = registry.get(pluginId);
  if (!plugin) return target;
  if (plugin.render && plugin.slot) {
    return placePlugin(target, pluginId, plugin.slot, slotOrder(target, plugin.slot, registry).length, registry);
  }
  return { ...target, extensions: { ...(target.extensions ?? {}), [pluginId]: { ...plugin.defaults } } };
}

/** 停用 plugin：同時移除設定與版位覆寫 */
export function removePlugin<T extends PlacementTarget>(target: T, pluginId: string): T {
  const extensions = { ...(target.extensions ?? {}) };
  const placements = { ...(target.placements ?? {}) };
  delete extensions[pluginId];
  delete placements[pluginId];
  return { ...target, extensions, placements };
}

/** 在同一插槽內前後移動一格（鍵盤操作的替代方案） */
export function shiftPlugin<T extends PlacementTarget>(
  target: T,
  pluginId: string,
  delta: -1 | 1,
  registry: PluginRegistry = pluginRegistry,
): T {
  const plugin = registry.get(pluginId);
  const placement = plugin && effectivePlacement(plugin, target.placements);
  if (!placement) return target;
  const ids = slotOrder(target, placement.slot, registry);
  const next = ids.indexOf(pluginId) + delta;
  if (next < 0 || next >= ids.length) return target;
  return placePlugin(target, pluginId, placement.slot, next, registry);
}
