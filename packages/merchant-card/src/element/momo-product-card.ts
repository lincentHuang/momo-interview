import { LitElement, html, nothing, svg, type PropertyValues, type TemplateResult } from "lit";
import { discountLabel, formatCount, formatPrice } from "../core/pricing";
import { pluginRegistry, type ResolvedPlugin } from "../plugins/registry";
import type { CardSlot } from "../plugins/types";
import { parseCard, type Card, type CardLayout } from "../schema/card.schema";
import { getSharedStore } from "../store/shared-store";
import type { CardRecord, CardRuntimeState } from "../store/types";
import { cardStyles } from "./styles";
import { rendererFor } from "./variants";

const heartIcon = (filled: boolean) => html`<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
  ${svg`<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"
    fill=${filled ? "currentColor" : "none"} stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`}
</svg>`;

const cartIcon = html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  ${svg`<path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2"/><circle cx="9.5" cy="20" r="1.2"/><circle cx="17" cy="20" r="1.2"/>`}
</svg>`;

type Source =
  | { kind: "ok"; card: Card; state: CardRuntimeState; synced: boolean }
  | { kind: "invalid"; issues: Array<{ path: string; message: string }> }
  | { kind: "missing"; reason: string };

/**
 * <momo-product-card>
 *
 * 資料來源（優先序由高到低）：
 *   1. `.card` property   — 框架宿主直接傳物件
 *   2. `data` attribute   — JSON 字串，適合 SSR / CMS / 純 HTML
 *   3. `card-id` attribute — 從共享 Store 讀取，並跨分頁 / 跨宿主即時同步（Showroom 編輯立即反映）
 *
 * 對外事件（bubbles + composed，可穿越 Shadow DOM）：
 *   momo-card:click / momo-card:favorite-change / momo-card:add-to-cart / momo-card:error / momo-card:impression(plugin)
 * 可查詢狀態：`invalid` attribute、`issues` getter
 */
export class MomoProductCard extends LitElement {
  static override styles = cardStyles;

  static override properties = {
    cardId: { type: String, attribute: "card-id", reflect: true },
    data: { type: String },
    card: { attribute: false },
    layout: { type: String },
    _now: { state: true },
    _localState: { state: true },
    _record: { state: true },
    _pluginsVersion: { state: true },
  };

  declare cardId: string | null;
  declare data: string | null;
  declare card: unknown;
  /** 覆寫卡片自身的 layout（宿主依版面決定） */
  declare layout: CardLayout | null;

  declare private _now: number;
  declare private _localState: CardRuntimeState;
  declare private _record: CardRecord | undefined;
  declare private _pluginsVersion: number;

  private unsubscribers: Array<() => void> = [];
  private pluginCleanups: Array<() => void> = [];
  private pluginSetupKey = "";
  private ticker: ReturnType<typeof setInterval> | null = null;
  private lastReportedError = "";

  constructor() {
    super();
    this.cardId = null;
    this.data = null;
    this.card = undefined;
    this.layout = null;
    this._now = Date.now();
    this._localState = { favorite: false, cartQty: 0 };
    this._record = undefined;
    this._pluginsVersion = 0;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribers.push(pluginRegistry.subscribe(() => this._pluginsVersion++));
    this.bindStore();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribers.splice(0).forEach((u) => u());
    this.teardownPlugins();
    this.stopTicker();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("cardId") && this.isConnected) this.bindStore();
  }

  protected override updated(): void {
    const source = this.resolveSource();
    this.syncTicker(source);
    this.syncPluginLifecycles(source);
    this.reportError(source);
  }

  // ---------- 資料來源 ----------

  private storeUnsub: (() => void) | null = null;

  private bindStore() {
    this.storeUnsub?.();
    this.storeUnsub = null;
    if (!this.cardId) {
      this._record = undefined;
      return;
    }
    const store = getSharedStore();
    const id = this.cardId;
    const read = () => {
      const next = store.get(id);
      if (next !== this._record) this._record = next;
    };
    read();
    this.storeUnsub = store.subscribe(read);
    this.unsubscribers.push(() => this.storeUnsub?.());
  }

  private resolveSource(): Source {
    if (this.card !== undefined) return this.fromRaw(this.card);
    if (this.data) {
      try {
        return this.fromRaw(JSON.parse(this.data));
      } catch {
        return { kind: "invalid", issues: [{ path: "data", message: "不是合法的 JSON" }] };
      }
    }
    if (this.cardId) {
      return this._record
        ? { kind: "ok", card: this._record.card, state: this._record.state, synced: true }
        : { kind: "missing", reason: `找不到商品「${this.cardId}」` };
    }
    return { kind: "missing", reason: "請提供 card-id、data 或 card" };
  }

  private fromRaw(raw: unknown): Source {
    const parsed = parseCard(raw);
    return parsed.ok
      ? { kind: "ok", card: parsed.card, state: this._localState, synced: false }
      : { kind: "invalid", issues: parsed.issues };
  }

  // ---------- 互動 ----------

  private emit(type: string, detail?: unknown) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  /** Optimistic：本地立即更新，同步模式下同時寫入 Store 廣播給其他宿主 */
  private updateState(card: Card, synced: boolean, patch: Partial<CardRuntimeState>) {
    if (synced) getSharedStore().updateState(card.id, patch);
    else this._localState = { ...this._localState, ...patch };
  }

  private onToggleFavorite(e: Event, card: Card, state: CardRuntimeState, synced: boolean) {
    e.stopPropagation();
    const favorite = !state.favorite;
    this.updateState(card, synced, { favorite });
    this.emit("momo-card:favorite-change", { cardId: card.id, favorite });
  }

  private onAddToCart(e: Event, card: Card, state: CardRuntimeState, synced: boolean) {
    e.stopPropagation();
    const cartQty = state.cartQty + 1;
    this.updateState(card, synced, { cartQty });
    this.emit("momo-card:add-to-cart", { cardId: card.id, price: card.price, cartQty });
  }

  // ---------- 生命週期：倒數 / plugin setup / 錯誤回報 ----------

  private syncTicker(source: Source) {
    const needsTick = source.kind === "ok" && rendererFor(source.card.variant).ticking === true;
    if (needsTick && !this.ticker) this.ticker = setInterval(() => (this._now = Date.now()), 1000);
    if (!needsTick) this.stopTicker();
  }

  private stopTicker() {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }

  private syncPluginLifecycles(source: Source) {
    const card = source.kind === "ok" ? source.card : null;
    const key = card ? `${this._pluginsVersion}|${card.id}|${card.variant}|${JSON.stringify(card.extensions)}` : "";
    if (key === this.pluginSetupKey) return;
    this.pluginSetupKey = key;
    this.teardownPlugins();
    if (!card) return;
    for (const { plugin, config } of pluginRegistry.resolve(card)) {
      if (!plugin.setup) continue;
      try {
        const cleanup = plugin.setup({ host: this, card, config, emit: (t, d) => this.emit(t, d) });
        if (cleanup) this.pluginCleanups.push(cleanup);
      } catch (err) {
        console.warn(`[momo-card] plugin "${plugin.id}" setup 失敗`, err);
      }
    }
  }

  private teardownPlugins() {
    this.pluginCleanups.splice(0).forEach((fn) => fn());
  }

  /**
   * 錯誤同時以「事件」與「可查詢狀態」兩種方式提供：
   * 事件可能在宿主掛上監聽器之前就發生（bundle 載入當下即升級元素），
   * 因此另外反映 `invalid` attribute 與 `issues` getter，宿主任何時候都能查詢。
   */
  get issues(): ReadonlyArray<{ path: string; message: string }> {
    const source = this.resolveSource();
    return source.kind === "invalid" ? source.issues : [];
  }

  private reportError(source: Source) {
    const key = source.kind === "invalid" ? JSON.stringify(source.issues) : "";
    this.toggleAttribute("invalid", key !== "");
    if (key && key !== this.lastReportedError) this.emit("momo-card:error", { cardId: this.cardId, issues: (source as { issues: unknown }).issues });
    this.lastReportedError = key;
  }

  // ---------- 渲染 ----------

  private renderSlot(card: Card, slot: CardSlot): Array<TemplateResult | null> {
    return pluginRegistry.resolve(card, slot).map(({ plugin, config }: ResolvedPlugin) => {
      try {
        return plugin.render?.({ card, config }) ?? null;
      } catch (err) {
        console.warn(`[momo-card] plugin "${plugin.id}" render 失敗`, err);
        return null; // 單一 plugin 失敗不影響卡片
      }
    });
  }

  protected override render() {
    void this._pluginsVersion; // plugin 註冊變動時觸發重繪
    const source = this.resolveSource();

    if (source.kind === "invalid") {
      return html`<div class="card card--error" part="card" role="alert">
        商品資料格式錯誤
        <ul>${source.issues.map((i) => html`<li>${i.path || "(root)"}：${i.message}</li>`)}</ul>
      </div>`;
    }
    if (source.kind === "missing") {
      return html`<div class="card card--empty" part="card">${source.reason}</div>`;
    }

    const { card, state, synced } = source;
    const renderer = rendererFor(card.variant);
    const layout = this.layout ?? card.layout;
    const discount = discountLabel(card.price, card.originalPrice);
    const inactive = renderer.inactive?.(card as never, this._now) ?? false;

    return html`
      <article
        part="card"
        class="card card--${layout} card--${card.variant} ${inactive ? "expired" : ""}"
        @click=${() => this.emit("momo-card:click", { cardId: card.id })}
      >
        <div class="media" part="media">
          <img src=${card.imageUrl} alt=${card.title} loading="lazy" />
          <div class="media-top">${renderer.mediaTop?.(card as never, this._now) ?? nothing}${this.renderSlot(card, "media-top")}</div>
          <div class="media-bottom">${renderer.mediaBottom?.(card as never, this._now) ?? nothing}${this.renderSlot(card, "media-bottom")}</div>
        </div>
        <div class="body">
          <h3 class="title" part="title" title=${card.title}>${card.title}</h3>
          <div class="badges">${this.renderSlot(card, "badges")}</div>
          <div class="price-row" part="price">
            <span class="price"><small>$</small>${formatPrice(card.price).slice(1)}</span>
            ${card.originalPrice && card.originalPrice > card.price ? html`<s class="original">${formatPrice(card.originalPrice)}</s>` : nothing}
            ${discount ? html`<span class="discount">${discount}</span>` : nothing}
          </div>
          <div class="price-extra">${this.renderSlot(card, "price-extra")}</div>
          ${renderer.body?.(card as never, this._now) ?? nothing}
          <div class="meta">
            <span>
              ${card.rating !== undefined ? html`<span class="rating">★ ${card.rating.toFixed(1)}</span>` : nothing}
              ${card.reviewCount ? html`(${formatCount(card.reviewCount)})` : nothing}
              ${card.variant === "standard" && card.soldCount ? html` · 已售 ${formatCount(card.soldCount)}` : nothing}
            </span>
            <span class="actions" part="actions">
              ${state.cartQty > 0 ? html`<span class="cart-qty" aria-live="polite">×${state.cartQty}</span>` : nothing}
              <button
                class="icon-btn"
                aria-label=${state.favorite ? "取消收藏" : "加入收藏"}
                aria-pressed=${state.favorite ? "true" : "false"}
                @click=${(e: Event) => this.onToggleFavorite(e, card, state, synced)}
              >${heartIcon(state.favorite)}</button>
              <button
                class="icon-btn icon-btn--cart"
                aria-label="加入購物車"
                ?disabled=${inactive}
                @click=${(e: Event) => this.onAddToCart(e, card, state, synced)}
              >${cartIcon}</button>
            </span>
          </div>
          ${this.renderSlot(card, "footer")}
        </div>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "momo-product-card": MomoProductCard;
  }
}
