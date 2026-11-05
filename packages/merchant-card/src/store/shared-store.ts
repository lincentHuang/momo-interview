import { createFixtures } from "../schema/fixtures";
import { createCardStore, type CardStore } from "./card-store";

const KEY = Symbol.for("momo-card.shared-store");
type GlobalWithStore = typeof globalThis & { [KEY]?: CardStore };

/**
 * 頁面層級的單例 Store。
 * Showroom（React）與 <momo-product-card sync> 透過它共用同一份狀態；
 * 不同分頁 / 不同宿主（sample.html）再透過 BroadcastChannel + localStorage 彼此同步。
 */
export function getSharedStore(): CardStore {
  const g = globalThis as GlobalWithStore;
  return (g[KEY] ??= createCardStore({ seed: () => createFixtures() }));
}
