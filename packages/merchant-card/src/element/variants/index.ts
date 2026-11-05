import { html, nothing, type TemplateResult } from "lit";
import { formatRemaining, remaining } from "../../core/countdown";
import { formatCount } from "../../core/pricing";
import type { CardOf, CardVariant } from "../../schema/card.schema";

export interface VariantRenderer<V extends CardVariant> {
  mediaTop?: (card: CardOf<V>, now: number) => TemplateResult | typeof nothing;
  mediaBottom?: (card: CardOf<V>, now: number) => TemplateResult | typeof nothing;
  body?: (card: CardOf<V>, now: number) => TemplateResult | typeof nothing;
  /** 是否需要每秒重繪（倒數計時） */
  ticking?: boolean;
  /** 是否呈現「已結束」灰階 */
  inactive?: (card: CardOf<V>, now: number) => boolean;
}

/**
 * 每個 variant 的專屬呈現。用 mapped type 讓 TS 強制「新增 variant 必須補上 renderer」。
 * 共用區塊（圖片、標題、價格、plugin slots、互動按鈕）由 MomoProductCard 統一負責。
 */
export const variantRenderers: { [V in CardVariant]: VariantRenderer<V> } = {
  standard: {},

  "flash-sale": {
    ticking: true,
    inactive: (card, now) => remaining(card.endsAt, now).expired,
    mediaBottom: (card, now) => {
      const r = remaining(card.endsAt, now);
      return html`<div class="flash-banner">
        <span>⚡ 限時搶購</span>
        ${r.expired ? html`<span>已結束</span>` : html`<time aria-label="剩餘時間">${formatRemaining(r)}</time>`}
      </div>`;
    },
    body: (card) => {
      const pct = Math.min(100, Math.round((card.stockSold / card.stockTotal) * 100));
      return html`<div class="stock">
        <div class="stock-bar" role="progressbar" aria-valuenow=${pct} aria-valuemin="0" aria-valuemax="100">
          <span style="width:${pct}%"></span>
        </div>
        <span>${pct >= 100 ? "已搶光" : `已搶 ${pct}%`}</span>
      </div>`;
    },
  },

  live: {
    mediaTop: (card) => {
      if (card.liveStatus === "live")
        return html`<span class="tag tag--live"><span class="live-dot"></span>LIVE</span>
          <span class="tag tag--dark">${formatCount(card.viewers)} 觀看</span>`;
      if (card.liveStatus === "upcoming") return html`<span class="tag tag--dark">即將開播</span>`;
      return html`<span class="tag tag--dark">▶ 精彩回放</span>`;
    },
    body: (card) => (card.hostName ? html`<span class="rank-category">主持：${card.hostName}</span>` : nothing),
  },

  ranking: {
    mediaTop: (card) => html`<span class="rank rank--${card.rank <= 3 ? card.rank : "n"}">${card.rank}</span>`,
    body: (card) => html`<span class="rank-category">${card.rankCategory} 第 ${card.rank} 名</span>`,
  },
};

export function rendererFor<V extends CardVariant>(variant: V): VariantRenderer<V> {
  return variantRenderers[variant] as VariantRenderer<V>;
}
