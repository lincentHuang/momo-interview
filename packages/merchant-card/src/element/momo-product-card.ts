import { LitElement, html, nothing, svg, type PropertyValues, type TemplateResult } from "lit";
import { formatCount, formatPrice, formatSoldCount } from "../core/pricing";
import { pluginRegistry, type ResolvedPlugin } from "../plugins/registry";
import type { CardRuntime, CardSlot } from "../plugins/types";
import { CARD_SLOT_LABELS, parseCard, type Card, type CardLayout } from "../schema/card.schema";
import { getSharedStore } from "../store/shared-store";
import type { CardRecord, CardRuntimeState } from "../store/types";
import { cardStyles } from "./styles";
import { rendererFor } from "./variants";

const playIcon = html`<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">${svg`<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>`}</svg>`;
const chevron = (dir: "prev" | "next") =>
  html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svg`<path d=${dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}/>`}</svg>`;

/**
 * 影片網址 → 卡片內可直接播放的形式。
 * momo vodUrl 實測為 YouTube 連結；直接的影音檔用 <video>；其他（直播間頁面等）無法內嵌，交給宿主處理。
 */
type VideoSource = { kind: "youtube"; src: string } | { kind: "file"; src: string } | { kind: "external" };
export function videoSource(url: string): VideoSource {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&mute=1&playsinline=1&rel=0` };
  if (/\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/i.test(url)) return { kind: "file", src: url };
  return { kind: "external" };
}

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
    _playingId: { state: true },
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
  /** 正在卡片內播放影片的卡片 id（換成別張卡片時自動停止） */
  declare private _playingId: string | null;

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
    this._playingId = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribers.push(pluginRegistry.subscribe(() => this._pluginsVersion++));
    this.bindStore();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => this.markBadgeOverflow());
      ro.observe(this);
      this.unsubscribers.push(() => ro.disconnect());
    }
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
    this.markBadgeOverflow();
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

  private get track(): HTMLElement | null {
    return this.renderRoot.querySelector(".track");
  }

  /** 切到第 index 張圖：捲動軌道，由 scroll 事件回寫 _imageIndex（滑動 / 點圓點 / 箭頭共用同一條路徑） */
  private goToImage(e: Event, index: number, count: number) {
    e.stopPropagation();
    const track = this.track;
    const next = (index + count) % count;
    if (!track?.clientWidth || typeof track.scrollTo !== "function") return void (this._imageIndex = next);
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  }

  private onTrackScroll(e: Event) {
    const track = e.currentTarget as HTMLElement;
    if (!track.clientWidth) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    if (index !== this._imageIndex) this._imageIndex = index;
  }

  private onPlayVideo(e: Event, card: Card) {
    e.stopPropagation();
    // 能內嵌的影片直接在卡片內播放；無法內嵌的（例如直播間頁面）只發事件，交由宿主開啟
    if (card.videoUrl && videoSource(card.videoUrl).kind !== "external") this._playingId = card.id;
    this.emit("momo-card:play-video", { cardId: card.id, videoUrl: card.videoUrl });
  }

  private onCloseVideo(e: Event) {
    e.stopPropagation();
    this._playingId = null;
  }

  /**
   * 標籤列只佔一行：依 plugin order（重要度）排列，放不下的整顆收起，不換行、不截半顆字。
   * 正式模式由 CSS（單行高度 + overflow hidden）隱藏；這裡額外標記 data-overflow，
   * 讓編輯模式能把「正式頁面會被收起」的模組以淡色顯示，避免拖進去卻看不到。
   */
  private markBadgeOverflow() {
    const row = this.renderRoot?.querySelector<HTMLElement>(".badges");
    if (!row) return;
    const items = [...row.children] as HTMLElement[];
    const top = items[0]?.offsetTop ?? 0;
    let hidden = 0;
    for (const el of items) {
      const over = el.offsetTop > top;
      el.toggleAttribute("data-overflow", over);
      if (over) hidden++;
    }
    if (hidden) row.dataset.hidden = String(hidden);
    else delete row.dataset.hidden;
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

  private renderSlot(card: Card, slot: CardSlot, runtime?: CardRuntime): Array<TemplateResult | null> {
    return pluginRegistry.resolve(card, slot).map(({ plugin, config }: ResolvedPlugin) => {
      let out: TemplateResult | null = null;
      try {
        out = plugin.render?.({ card, config, runtime }) ?? null;
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

  /** 商品圖：多張時為可滑動（scroll-snap）的輪播；播放中則換成內嵌影片 */
  private renderMedia(card: Card, gallery: string[], imageIndex: number) {
    if (card.videoUrl && this._playingId === card.id) {
      const video = videoSource(card.videoUrl);
      return html`<div class="player" @click=${(e: Event) => e.stopPropagation()}>
        ${video.kind === "youtube"
          ? html`<iframe src=${video.src} title="${card.title} 商品影片" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
          : video.kind === "file"
            ? html`<video src=${video.src} controls autoplay muted playsinline></video>`
            : nothing}
        <button class="player-close" aria-label="關閉影片" @click=${this.onCloseVideo}>✕</button>
      </div>`;
    }
    const multi = gallery.length > 1;
    return html`
      <div class="track" @scroll=${multi ? this.onTrackScroll : nothing} aria-roledescription=${multi ? "輪播" : nothing}>
        ${gallery.map(
          (src, i) => html`<img src=${src} alt=${i === 0 ? card.title : `${card.title}（第 ${i + 1} 張）`} loading="lazy" draggable="false" />`,
        )}
      </div>
      ${multi
        ? html`<button class="nav nav--prev" aria-label="上一張圖" @click=${(e: Event) => this.goToImage(e, imageIndex - 1, gallery.length)}>${chevron("prev")}</button>
            <button class="nav nav--next" aria-label="下一張圖" @click=${(e: Event) => this.goToImage(e, imageIndex + 1, gallery.length)}>${chevron("next")}</button>`
        : nothing}
      ${card.videoUrl
        ? html`<button class="play" aria-label="播放商品影片" @click=${(e: Event) => this.onPlayVideo(e, card)}>${playIcon}</button>`
        : nothing}
    `;
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
    const imageIndex = Math.min(this._imageIndex, gallery.length - 1);
    const price = formatPrice(card.price).slice(1);
    const showOriginal = card.originalPrice !== undefined && card.originalPrice > card.price;
    const runtime: CardRuntime = {
      state,
      inactive,
      imageIndex,
      ctaLabel: renderer.ctaLabel,
      toggleFavorite: () => {
        const favorite = !state.favorite;
        this.updateState(card, synced, { favorite });
        this.emit("momo-card:favorite-change", { cardId: card.id, favorite });
      },
      addToCart: () => {
        const cartQty = state.cartQty + 1;
        this.updateState(card, synced, { cartQty });
        this.emit("momo-card:add-to-cart", { cardId: card.id, price: card.price, cartQty });
      },
    };

    return html`
      <article
        part="card"
        class="card card--${layout} card--${card.variant} ${inactive ? "expired" : ""}"
        @click=${() => this.emit("momo-card:click", { cardId: card.id, url: card.url ?? null })}
      >
        <div class="media" part="media">
          ${this.renderMedia(card, gallery, imageIndex)}
          <div class="media-top" data-slot="media-top" data-label=${this.slotLabel("media-top")}>${renderer.mediaTop?.(card as never, this._now) ?? nothing}${this.renderSlot(card, "media-top", runtime)}</div>
          <div class="media-foot">
            ${gallery.length > 1 && this._playingId !== card.id
              ? html`<div class="dots" role="tablist" aria-label="商品圖片">
                  ${gallery.map(
                    (_, i) => html`<button
                      role="tab"
                      aria-label="第 ${i + 1} 張圖"
                      aria-selected=${i === imageIndex ? "true" : "false"}
                      @click=${(e: Event) => this.goToImage(e, i, gallery.length)}
                    ></button>`,
                  )}
                </div>`
              : nothing}
            <div class="media-bottom" data-slot="media-bottom" data-label=${this.slotLabel("media-bottom")}>${this.renderSlot(card, "media-bottom", runtime)}${renderer.mediaBottom?.(card as never, this._now) ?? nothing}</div>
          </div>
        </div>
        <div class="body">
          <p class="subtitle" part="subtitle">${card.subtitle ?? nothing}</p>
          <h3 class="title" part="title" title=${card.title}>${card.title}</h3>
          <div class="price-row" part="price">
            ${renderer.priceLabel ? html`<span class="price-label">${renderer.priceLabel}</span>` : nothing}
            <span class="price"><small>$</small>${price}${card.priceFrom ? html`<small class="from">起</small>` : nothing}</span>
            ${showOriginal ? html`<s class="original">${formatPrice(card.originalPrice!)}</s>` : nothing}
          </div>
          <div class="price-extra" data-slot="price-extra" data-label=${this.slotLabel("price-extra")}>${this.renderSlot(card, "price-extra", runtime)}</div>
          ${card.rating !== undefined && card.rating > 0
            ? html`<div class="rating" aria-label="評分 ${card.rating.toFixed(1)}">
                <span class="stars" style="--_fill:${(card.rating / 5) * 100}%" aria-hidden="true"></span>
                ${card.reviewCount ? html`<span>(${formatCount(card.reviewCount)})</span>` : nothing}
              </div>`
            : nothing}
          <div class="badges" data-slot="badges" data-label=${this.slotLabel("badges")}>${this.renderSlot(card, "badges", runtime)}</div>
          ${renderer.body?.(card as never, this._now) ?? nothing}
          <div class="meta">
            <span class="sold">${card.soldCount ? formatSoldCount(card.soldCount) : nothing}</span>
            <span class="actions" part="actions" data-slot="actions" data-label=${this.slotLabel("actions")}>${this.renderSlot(card, "actions", runtime)}</span>
          </div>
          <div class="footer" data-slot="footer" data-label=${this.slotLabel("footer")}>${this.renderSlot(card, "footer", runtime)}</div>
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
