const twd = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 });

export function formatPrice(value: number): string {
  return `$${twd.format(value)}`;
}

/** momo 以「折」呈現折扣，例如 售價 790 / 原價 1290 → 6.1 折 */
export function discountLabel(price: number, originalPrice?: number): string | null {
  if (!originalPrice || originalPrice <= price || originalPrice === 0) return null;
  const ratio = Math.floor((price / originalPrice) * 100) / 10;
  return `${ratio.toFixed(1).replace(/\.0$/, "")}折`;
}

export function formatCount(value: number): string {
  if (value >= 10_000) return `${(value / 10_000).toFixed(1).replace(/\.0$/, "")}萬`;
  return twd.format(value);
}
