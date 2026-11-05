import type { CardSlot } from "@momo/merchant-card";

/**
 * 拖放命中判斷（純 DOM 幾何運算，不含 React 狀態）。
 *
 * 卡片在 Shadow DOM 內，宿主拿不到內部節點的 CSS selector，但：
 *   - 拖曳事件是 composed，可由 composedPath() 取得 shadow 內的原始節點
 *   - 已掛載的 shadowRoot（open mode）可直接查詢 [data-slot] / [data-plugin-id]
 * 因此卡片只需在 editable 模式輸出 data-* 標記，拖放邏輯完全留在宿主（編輯器）。
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SlotTarget {
  kind: "slot";
  slot: CardSlot;
  index: number;
  /** 相對於 canvas 的座標，用於繪製提示 */
  slotRect: Rect;
  caret: Rect | null;
}

/** 指標距離卡片邊緣多少 px 內仍視為「在卡片上」，降低對準難度 */
const SNAP_MARGIN = 28;

function relative(r: DOMRect, origin: DOMRect): Rect {
  return { x: r.left - origin.left, y: r.top - origin.top, width: r.width, height: r.height };
}

function distance(r: DOMRect, x: number, y: number): number {
  const dx = Math.max(r.left - x, 0, x - r.right);
  const dy = Math.max(r.top - y, 0, y - r.bottom);
  return Math.hypot(dx, dy);
}

/** 由事件路徑找出被拖曳 / 點擊的模組 id（穿透 Shadow DOM） */
export function moduleIdFromEvent(event: Event): string | null {
  for (const node of event.composedPath()) {
    if (node instanceof HTMLElement && node.dataset.pluginId) return node.dataset.pluginId;
    if (node instanceof HTMLElement && node.tagName === "MOMO-PRODUCT-CARD") return null;
  }
  return null;
}

/** 指標是否在卡片（含吸附邊界）範圍內 */
export function isOverCard(host: HTMLElement, x: number, y: number): boolean {
  return distance(host.getBoundingClientRect(), x, y) <= SNAP_MARGIN;
}

/**
 * 找出最接近指標的插槽與插入位置。
 * 插槽內模組以 flex-wrap 排列，插入位置 = 指標「之後」的模組數（上一列、或同列且越過中線）。
 */
export function findSlotTarget(host: HTMLElement, canvas: HTMLElement, draggingId: string, x: number, y: number): SlotTarget | null {
  const root = host.shadowRoot;
  if (!root || !isOverCard(host, x, y)) return null;

  let best: { el: HTMLElement; d: number } | null = null;
  for (const el of root.querySelectorAll<HTMLElement>("[data-slot]")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue; // 不可見的插槽
    const d = distance(r, x, y);
    if (!best || d < best.d) best = { el, d };
  }
  if (!best) return null;

  const items = [...best.el.querySelectorAll<HTMLElement>(":scope > [data-plugin-id]")].filter((el) => el.dataset.pluginId !== draggingId);
  let index = 0;
  for (const el of items) {
    const r = el.getBoundingClientRect();
    if (y > r.bottom || (y >= r.top && x > r.left + r.width / 2)) index++;
  }

  const origin = canvas.getBoundingClientRect();
  let caret: Rect | null = null;
  if (items.length > 0) {
    const ref = items[Math.min(index, items.length - 1)].getBoundingClientRect();
    const left = index < items.length ? ref.left - 3 : ref.right + 1;
    caret = { x: left - origin.left, y: ref.top - origin.top - 2, width: 2, height: ref.height + 4 };
  }

  return {
    kind: "slot",
    slot: best.el.dataset.slot as CardSlot,
    index,
    slotRect: relative(best.el.getBoundingClientRect(), origin),
    caret,
  };
}

export function sameTarget(a: SlotTarget | null, b: SlotTarget | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.slot === b.slot && a.index === b.index && a.slotRect.x === b.slotRect.x && a.slotRect.y === b.slotRect.y;
}
