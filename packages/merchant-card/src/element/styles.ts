import { css } from "lit";

/**
 * 設計 tokens 一律以 `--momo-card-*` CSS 變數對外開放：
 * Shadow DOM 隔離了宿主頁面的樣式汙染，但 CSS 變數可以穿透，宿主仍可做主題客製。
 * 需要更細的覆寫時，可用 ::part(card|media|title|price|actions)。
 */
export const cardStyles = css`
  :host {
    /* 預設值取自 momo 首頁實測（2026-11）：價格 #DB2777、促銷短語 #DD2222、標題 #404040、劃線價 #B3B3B3、行銷標籤 #FF4C76 */
    --_primary: var(--momo-card-primary, #e4007f);
    --_primary-soft: var(--momo-card-primary-soft, #fde6f2);
    /* 宿主只覆寫主色（--momo-card-primary）時，價格跟著主色走，維持既有主題化行為 */
    --_price: var(--momo-card-price, var(--momo-card-primary, #db2777));
    --_promo: var(--momo-card-promo, #dd2222);
    --_tag: var(--momo-card-tag, #ff4c76);
    --_text: var(--momo-card-text, #404040);
    --_muted: var(--momo-card-muted, #b3b3b3);
    --_meta: var(--momo-card-meta, #454545);
    --_surface: var(--momo-card-surface, #fff);
    --_border: var(--momo-card-border, #efefef);
    --_radius: var(--momo-card-radius, 4px);
    --_font: var(--momo-card-font, "Microsoft JhengHei", -apple-system, "PingFang TC", "Noto Sans TC", sans-serif);
    display: block;
    font-family: var(--_font);
    color: var(--_text);
    container-type: inline-size;
  }
  * { box-sizing: border-box; }

  .card {
    position: relative;
    display: grid;
    height: 100%;
    background: var(--_surface);
    border: 1px solid var(--_border);
    border-radius: var(--_radius);
    overflow: hidden;
    transition: box-shadow 0.2s ease;
    cursor: pointer;
  }
  .card:hover { box-shadow: 0 4px 16px rgb(0 0 0 / 0.1); }
  .card--grid { grid-template-rows: auto auto 1fr; }
  .card--list { grid-template-columns: minmax(96px, 38%) 1fr; grid-template-rows: 1fr auto; }
  .card--list .media { grid-row: 1; }
  .card--list .dots { grid-column: 1; grid-row: 2; }
  .card--list .body { grid-column: 2; grid-row: 1 / span 2; }

  .media { position: relative; aspect-ratio: 1; background: #f6f6f6; }
  .media > img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .media-top { position: absolute; inset: 0 6px auto 6px; display: flex; gap: 4px; flex-wrap: wrap; align-items: flex-start; }
  .media-top > :not(.rank-flag) { margin-top: 6px; }
  .media-top:has(.media-sticker) { justify-content: space-between; }
  .media-sticker { position: absolute; top: 0; right: 0; width: 34%; max-width: 72px; height: auto; display: block; }
  .media-bottom { position: absolute; inset: auto 0 0 0; display: grid; }
  .media-banner { width: 100%; height: auto; display: block; }
  .play {
    all: unset; position: absolute; inset: 50% auto auto 50%; translate: -50% -50%;
    display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
    background: rgb(0 0 0 / 0.45); color: #fff; cursor: pointer;
  }
  .play:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

  .dots { display: flex; justify-content: center; gap: 4px; padding: 6px 0 0; }
  .dots button { all: unset; width: 5px; height: 5px; border-radius: 50%; background: #d9d9d9; cursor: pointer; }
  .dots button[aria-selected="true"] { background: var(--_primary); width: 12px; border-radius: 3px; }
  .dots button:focus-visible { outline: 2px solid var(--_primary); outline-offset: 2px; }

  .body { display: flex; flex-direction: column; gap: 3px; padding: 6px 8px 10px; min-width: 0; }
  .subtitle {
    margin: 0; color: var(--_promo); font-size: 13px; line-height: 18px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .card--flash-sale .subtitle { font-size: 14px; font-weight: 700; }
  .title {
    margin: 0; font-size: 14px; line-height: 20px; font-weight: 400; color: var(--_text);
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    min-height: 40px;
  }
  .badges, .price-extra { display: flex; flex-wrap: wrap; gap: 2px 4px; align-items: center; }
  .badges:empty, .price-extra:empty, .media-top:empty, .footer:empty { display: none; }
  .footer { display: flex; flex-wrap: wrap; gap: 4px; }
  .cashback { font-size: 11px; color: #b26a00; background: #fff8e6; border-radius: 2px; padding: 2px 6px; }

  .price-row { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
  .price-label { color: var(--_promo); font-size: 11px; }
  .price { color: var(--_price); font-size: 19px; font-weight: 700; line-height: 1.2; letter-spacing: -0.01em; }
  .price small { font-size: 12px; font-weight: 700; margin-right: 1px; }
  .price small.from { margin: 0 0 0 1px; font-weight: 400; }
  .original { color: var(--_muted); font-size: 13px; text-decoration: line-through; }

  .rating { display: flex; align-items: center; gap: 3px; font-size: 11px; color: var(--_meta); }
  .stars {
    --_star: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2.5l2.9 6.2 6.6.7-5 4.5 1.4 6.6L12 17.2l-5.9 3.3 1.4-6.6-5-4.5 6.6-.7z'/%3E%3C/svg%3E");
    width: 60px; height: 12px;
    background: linear-gradient(90deg, #f8b400 var(--_fill), #e0e0e0 var(--_fill));
    -webkit-mask: var(--_star) 0 0 / 12px 12px repeat-x; mask: var(--_star) 0 0 / 12px 12px repeat-x;
  }

  .meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; padding-top: 4px; font-size: 11px; color: var(--_meta); }
  .sold { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .icon-btn {
    all: unset; display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 999px;
    border: 1px solid var(--_border); color: #8a8a8a; cursor: pointer; background: var(--_surface);
  }
  .icon-btn:hover { border-color: var(--_primary); color: var(--_primary); }
  .icon-btn:focus-visible, .cta:focus-visible { outline: 2px solid var(--_primary); outline-offset: 2px; }
  .icon-btn[aria-pressed="true"] { color: var(--_primary); border-color: var(--_primary); background: var(--_primary-soft); }
  .icon-btn--cart { background: var(--_primary); border-color: var(--_primary); color: #fff; }
  .icon-btn--cart:hover { color: #fff; filter: brightness(1.08); }
  .icon-btn[disabled], .cta[disabled] { opacity: 0.4; cursor: not-allowed; }
  .cart-qty { font-size: 11px; color: var(--_primary); font-weight: 600; }
  .cta {
    all: unset; cursor: pointer; min-width: 44px; height: 28px; padding: 0 12px; border-radius: 14px 0 0 14px;
    margin-right: -8px; text-align: center; line-height: 28px; font-size: 15px; font-weight: 700; color: #fff;
    background: linear-gradient(90deg, #ff3b3b, #d70a1e);
  }

  .tag { display: inline-flex; align-items: center; gap: 2px; height: 18px; padding: 0 3px; font-size: 11px; line-height: 18px; border-radius: 2px; white-space: nowrap; }
  .tag-img { display: block; height: 18px; width: auto; }
  .tag--promo { background: var(--_tag); color: #fff; }
  .tag--fast { padding: 0 4px 0 0; color: #d70a1e; border: 1px solid #d70a1e; font-weight: 700; }
  .tag--fast b { display: inline-grid; place-items: center; height: 100%; padding: 0 3px; background: #d70a1e; color: #fff; font-size: 11px; }
  .tag--store { background: #5e6999; color: #fff; }
  .tag--preorder { background: #ff960a; color: #fff; }
  .tag--outline { border: 1px solid var(--_tag); color: var(--_tag); }
  .tag--solid { background: var(--_primary); color: #fff; }
  .tag--dark { background: rgb(0 0 0 / 0.65); color: #fff; }
  .tag--live { background: #ff2d55; color: #fff; }
  .tag--delivery { background: #e8f4ff; color: #0a6ad6; }
  .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #fff; margin-right: 4px; animation: pulse 1.2s infinite; }
  @keyframes pulse { 50% { opacity: 0.3; } }

  /* flash-sale：倒數色取自 momo 限搶區塊 headerInfo.countDownBgColor */
  .flash-banner {
    display: flex; justify-content: space-between; align-items: center; padding: 3px 8px;
    background: #d62872; color: #fff; font-size: 12px; font-weight: 700;
  }
  .flash-banner time { font-variant-numeric: tabular-nums; letter-spacing: 0.02em; }
  /* momo 檔期橫幅圖已佔用圖片底部時，倒數改由宿主區塊標題呈現（與官網一致），避免兩條橫幅疊在一起 */
  .media-bottom:has(.media-banner) .flash-banner { display: none; }
  .stock { display: grid; gap: 3px; justify-items: start; }
  .stock-left { font-size: 12px; color: var(--_meta); background: #fdf2f2; border-radius: 2px; padding: 1px 6px; }
  .stock-bar { width: 100%; height: 4px; border-radius: 999px; background: #fde2e2; overflow: hidden; }
  .stock-bar > span { display: block; height: 100%; background: #dd2222; }

  /* ranking：TOP 盾形旗標 */
  .rank-flag {
    position: relative; display: grid; justify-items: center; align-content: start; width: 30px; height: 38px;
    color: #fff; font-weight: 700; line-height: 1;
  }
  .rank-flag svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .rank-flag small { position: relative; font-size: 8px; margin-top: 3px; }
  .rank-flag b { position: relative; font-size: 15px; margin-top: 2px; }
  .rank-flag:not(:has(small)) b { margin-top: 9px; }
  .rank-category { font-size: 11px; color: var(--_meta); }

  .expired { filter: grayscale(0.8); }

  /*
   * editable：WYSIWYG 編輯模式。插槽顯示為放置區、模組可拖曳 / 選取。
   * 只影響呈現，不改變資料；宿主透過 composedPath() 讀取 data-slot / data-plugin-id 做拖放判斷。
   */
  :host([editable]) .card { cursor: default; overflow: visible; }
  :host([editable]) .card:hover { transform: none; box-shadow: none; }
  :host([editable]) .media { overflow: visible; }
  :host([editable]) [data-slot] {
    outline: 1px dashed var(--momo-card-edit-outline, #c9c9d2); outline-offset: 2px; border-radius: 4px;
  }
  :host([editable]) [data-slot]:empty {
    display: flex; align-items: center; justify-content: center; min-height: 22px;
  }
  :host([editable]) [data-slot]:empty::after {
    content: attr(data-label); font-size: 10px; color: var(--_muted); letter-spacing: 0.02em; pointer-events: none;
  }
  :host([editable]) .media-top:empty, :host([editable]) .media-bottom:empty { background: rgb(255 255 255 / 0.75); }
  :host([editable]) .media-bottom:empty { inset: auto 8px 8px 8px; }
  .module { display: inline-flex; border-radius: 4px; cursor: grab; outline: 1px solid transparent; outline-offset: 1px; }
  .module:hover { outline-color: var(--_primary); }
  .module.is-selected { outline: 2px solid var(--_primary); }
  .module.is-dragging { opacity: 0.35; }

  .card--error, .card--empty { cursor: default; padding: 16px; font-size: 13px; color: var(--_muted); border-style: dashed; min-height: 120px; place-content: center; text-align: center; }
  .card--error { color: #c62828; border-color: #f2b8b5; background: #fff8f7; }
  .card--error ul { margin: 6px 0 0; padding: 0; list-style: none; font-size: 12px; }

  @container (max-width: 180px) {
    .price { font-size: 16px; }
    .title { font-size: 13px; }
    .subtitle { font-size: 12px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .card, .live-dot { transition: none; animation: none; }
  }
`;
