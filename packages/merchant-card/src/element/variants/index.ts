import { html, nothing, svg, type TemplateResult } from "lit";
import { formatRemaining, remaining } from "../../core/countdown";
import { formatCount } from "../../core/pricing";
import type { CardOf, CardVariant } from "../../schema/card.schema";

export interface VariantRenderer<V extends CardVariant> {
  mediaTop?: (card: CardOf<V>, now: number) => TemplateResult | typeof nothing;
  mediaBottom?: (card: CardOf<V>, now: number) => TemplateResult | typeof nothing;
  body?: (card: CardOf<V>, now: number) => TemplateResult | typeof nothing;
  /** 價格前的標籤（限時搶購為「限搶價」） */
  priceLabel?: string;
  /** 有值時以文字主按鈕取代購物車圖示（限時搶購的「搶」） */
  ctaLabel?: string;
  /** 是否需要每秒重繪（倒數計時） */
  ticking?: boolean;
  /** 是否呈現「已結束」灰階 */
  inactive?: (card: CardOf<V>, now: number) => boolean;
}

/**
 * momo 排行旗標：盾形色塊 + 上方小字 TOP + 名次。
 * 實測首頁「你的精選好物榜」：前三名為暖色系、第 4 名起為灰色。
 */
const RANK_COLORS: Record<number, string> = { 1: "#FF4343", 2: "#FF7A1A", 3: "#F5B400" };

function rankFlag(rank: number) {
  const color = RANK_COLORS[rank] ?? "#A3A3A3";
  return html`<span class="rank-flag" aria-label="第 ${rank} 名">
    <svg viewBox="0 0 24 30" aria-hidden="true">${svg`<path fill=${color} d="M0 0h24v25.28a1 1 0 0 1-.684.948L12 30 .684 26.228A1 1 0 0 1 0 25.279z"/>`}</svg>
    ${rank <= 3 ? html`<small>TOP</small>` : nothing}
    <b>${rank}</b>
  </span>`;
}

/**
 * 每個 variant 的專屬呈現。用 mapped type 讓 TS 強制「新增 variant 必須補上 renderer」。
 * 共用區塊（圖片、促銷短語、標題、價格、評分、plugin slots、互動按鈕）由 MomoProductCard 統一負責。
 */
export const variantRenderers: { [V in CardVariant]: VariantRenderer<V> } = {
  standard: {},

  "flash-sale": {
    ticking: true,
    priceLabel: "限搶價",
    ctaLabel: "搶",
    inactive: (card, now) => remaining(card.endsAt, now).expired || card.stockRemaining === 0,
    mediaBottom: (card, now) => {
      const r = remaining(card.endsAt, now);
      return html`<div class="flash-banner">
        <span>限時搶購</span>
        ${r.expired ? html`<span>已結束</span>` : html`<span>倒數 <time aria-label="剩餘時間">${formatRemaining(r)}</time></span>`}
      </div>`;
    },
    body: (card) => {
      const pct =
        card.stockTotal !== undefined ? Math.min(100, Math.round(((card.stockTotal - card.stockRemaining) / card.stockTotal) * 100)) : null;
      return html`<div class="stock">
        <span class="stock-left">${card.stockRemaining === 0 ? "已搶光" : `最後${formatCount(card.stockRemaining)}組`}</span>
        ${pct !== null
          ? html`<div class="stock-bar" role="progressbar" aria-label="已搶購" aria-valuenow=${pct} aria-valuemin="0" aria-valuemax="100">
              <span style="width:${pct}%"></span>
            </div>`
          : nothing}
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
    mediaTop: (card) => rankFlag(card.rank),
    body: (card) => html`<span class="rank-category">${card.rankCategory} 第 ${card.rank} 名</span>`,
  },
};

export function rendererFor<V extends CardVariant>(variant: V): VariantRenderer<V> {
  return variantRenderers[variant] as VariantRenderer<V>;
}
