import { LitElement, html, nothing, svg, type PropertyValues, type TemplateResult } from "lit";
import { formatCount, formatPrice, formatSoldCount } from "../core/pricing";
import { pluginRegistry, type ResolvedPlugin } from "../plugins/registry";
import type { CardSlot } from "../plugins/types";
import { CARD_SLOT_LABELS, parseCard, type Card, type CardLayout } from "../schema/card.schema";
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

const playIcon = html`<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">${svg`<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>`}</svg>`;

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
 *   momo-card:click（detail 含 url）/ momo-card:favorite-change / momo-card:add-to-cart / momo-card:play-video
 *   momo-card:error / momo-card:impression(plugin)
 * 可查詢狀態：`invalid` attribute、`issues` getter
 *
 * 編輯模式（`editable` attribute）：供 WYSIWYG 編輯器使用。插槽以 `data-slot` 標示並顯示為放置區，
 * 每個 plugin 輸出包在 `[data-plugin-id][draggable]` 內；拖放邏輯由宿主透過 composedPath() 實作，
 * 卡片本身不認識「編輯器」——同一份元件在正式頁面與編輯器中渲染結果一致。
 */
export class MomoProductCard extends LitElement {
  static override styles = cardStyles;

  static override properties = {
    cardId: { type: String, attribute: "card-id", reflect: true },
    data: { type: String },
    card: { attribute: false },
    layout: { type: String },
    editable: { type: Boolean, reflect: true },
    selectedModule: { type: String, attribute: "selected-module" },
    _now: { state: true },
    _localState: { state: true },
    _record: { state: true },
    _pluginsVersion: { state: true },
    _imageIndex: { state: true },
  };

  declare cardId: string | null;
  declare data: string | null;
  declare card: unknown;
  /** 覆寫卡片自身的 layout（宿主依版面決定） */
  declare layout: CardLayout | null;
  declare editable: boolean;
  /** 編輯模式下高亮的 plugin id */
  declare selectedModule: string | null;

  declare private _now: number;
  declare private _localState: CardRuntimeState;
  declare private _record: CardRecord | undefined;
  declare private _pluginsVersion: number;
  declare private _imageIndex: number;

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
    this.editable = false;
    this.selectedModule = null;
    this._now = Date.now();
    this._localState = { favorite: false, cartQty: 0 };
    this._record = undefined;
    this._pluginsVersion = 0;
    this._imageIndex = 0;
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

  private onSelectImage(e: Event, index: number) {
    e.stopPropagation();
    this._imageIndex = index;
  }

  private onPlayVideo(e: Event, card: Card) {
    e.stopPropagation();
    this.emit("momo-card:play-video", { cardId: card.id, videoUrl: card.videoUrl });
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
      let out: TemplateResult | null = null;
      try {
        out = plugin.render?.({ card, config }) ?? null;
      } catch (err) {
        console.warn(`[momo-card] plugin "${plugin.id}" render 失敗`, err);
        return null; // 單一 plugin 失敗不影響卡片
      }
      if (!out || !this.editable) return out;
      return html`<span
        class="module ${this.selectedModule === plugin.id ? "is-selected" : ""}"
        data-plugin-id=${plugin.id}
        title=${plugin.name}
        draggable="true"
      >${out}</span>`;
    });
  }

  /** 插槽容器的屬性：data-slot 供宿主辨識；data-label 只在編輯模式提供（空插槽的提示文字） */
  private slotLabel(slot: CardSlot) {
    return this.editable ? `${CARD_SLOT_LABELS[slot]}・拖曳模組到此` : nothing;
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
    const inactive = renderer.inactive?.(card as never, this._now) ?? false;
    const gallery = [card.imageUrl, ...card.images];
    const imageIndex = this._imageIndex < gallery.length ? this._imageIndex : 0;
    const price = formatPrice(card.price).slice(1);
    const showOriginal = card.originalPrice !== undefined && card.originalPrice > card.price;

    return html`
      <article
        part="card"
        class="card card--${layout} card--${card.variant} ${inactive ? "expired" : ""}"
        @click=${() => this.emit("momo-card:click", { cardId: card.id, url: card.url ?? null })}
      >
        <div class="media" part="media">
          <img src=${gallery[imageIndex]} alt=${card.title} loading="lazy" />
          ${card.videoUrl
            ? html`<button class="play" aria-label="播放商品影片" @click=${(e: Event) => this.onPlayVideo(e, card)}>${playIcon}</button>`
            : nothing}
          <div class="media-top" data-slot="media-top" data-label=${this.slotLabel("media-top")}>${renderer.mediaTop?.(card as never, this._now) ?? nothing}${this.renderSlot(card, "media-top")}</div>
          <div class="media-bottom" data-slot="media-bottom" data-label=${this.slotLabel("media-bottom")}>${this.renderSlot(card, "media-bottom")}${renderer.mediaBottom?.(card as never, this._now) ?? nothing}</div>
        </div>
        ${gallery.length > 1
          ? html`<div class="dots" role="tablist" aria-label="商品圖片">
              ${gallery.slice(0, 6).map(
                (_, i) => html`<button
                  role="tab"
                  aria-label="第 ${i + 1} 張圖"
                  aria-selected=${i === imageIndex ? "true" : "false"}
                  @click=${(e: Event) => this.onSelectImage(e, i)}
                ></button>`,
              )}
            </div>`
          : nothing}
        <div class="body">
          ${card.subtitle ? html`<p class="subtitle" part="subtitle">${card.subtitle}</p>` : nothing}
          <h3 class="title" part="title" title=${card.title}>${card.title}</h3>
          <div class="price-row" part="price">
            ${renderer.priceLabel ? html`<span class="price-label">${renderer.priceLabel}</span>` : nothing}
            <span class="price"><small>$</small>${price}${card.priceFrom ? html`<small class="from">起</small>` : nothing}</span>
            ${showOriginal ? html`<s class="original">${formatPrice(card.originalPrice!)}</s>` : nothing}
          </div>
          <div class="price-extra" data-slot="price-extra" data-label=${this.slotLabel("price-extra")}>${this.renderSlot(card, "price-extra")}</div>
          ${card.rating !== undefined && card.rating > 0
            ? html`<div class="rating" aria-label="評分 ${card.rating.toFixed(1)}">
                <span class="stars" style="--_fill:${(card.rating / 5) * 100}%" aria-hidden="true"></span>
                ${card.reviewCount ? html`<span>(${formatCount(card.reviewCount)})</span>` : nothing}
              </div>`
            : nothing}
          <div class="badges" data-slot="badges" data-label=${this.slotLabel("badges")}>${this.renderSlot(card, "badges")}</div>
          ${renderer.body?.(card as never, this._now) ?? nothing}
          <div class="meta">
            <span class="sold">${card.soldCount ? formatSoldCount(card.soldCount) : nothing}</span>
            <span class="actions" part="actions">
              ${state.cartQty > 0 ? html`<span class="cart-qty" aria-live="polite">×${state.cartQty}</span>` : nothing}
              <button
                class="icon-btn"
                aria-label=${state.favorite ? "取消收藏" : "加入收藏"}
                aria-pressed=${state.favorite ? "true" : "false"}
                @click=${(e: Event) => this.onToggleFavorite(e, card, state, synced)}
              >${heartIcon(state.favorite)}</button>
              ${renderer.ctaLabel
                ? html`<button
                    class="cta"
                    aria-label="${renderer.ctaLabel}購：加入購物車"
                    ?disabled=${inactive}
                    @click=${(e: Event) => this.onAddToCart(e, card, state, synced)}
                  >${inactive ? "已結束" : renderer.ctaLabel}</button>`
                : html`<button
                    class="icon-btn icon-btn--cart"
                    aria-label="加入購物車"
                    ?disabled=${inactive}
                    @click=${(e: Event) => this.onAddToCart(e, card, state, synced)}
                  >${cartIcon}</button>`}
            </span>
          </div>
          <div class="footer" data-slot="footer" data-label=${this.slotLabel("footer")}>${this.renderSlot(card, "footer")}</div>
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
