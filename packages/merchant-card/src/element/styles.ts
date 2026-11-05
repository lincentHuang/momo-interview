import { css } from "lit";

/**
 * 設計 tokens 一律以 `--momo-card-*` CSS 變數對外開放：
 * Shadow DOM 隔離了宿主頁面的樣式汙染，但 CSS 變數可以穿透，宿主仍可做主題客製。
 * 需要更細的覆寫時，可用 ::part(card|media|title|price|actions)。
 */
export const cardStyles = css`
  :host {
    --_primary: var(--momo-card-primary, #e4007f);
    --_primary-soft: var(--momo-card-primary-soft, #fde6f2);
    --_text: var(--momo-card-text, #222);
    --_muted: var(--momo-card-muted, #8a8a8a);
    --_surface: var(--momo-card-surface, #fff);
    --_border: var(--momo-card-border, #ececec);
    --_radius: var(--momo-card-radius, 10px);
    --_font: var(--momo-card-font, -apple-system, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif);
    display: block;
    font-family: var(--_font);
    color: var(--_text);
    container-type: inline-size;
  }
  * { box-sizing: border-box; }

  .card {
    position: relative;
    display: grid;
    background: var(--_surface);
    border: 1px solid var(--_border);
    border-radius: var(--_radius);
    overflow: hidden;
    transition: box-shadow 0.2s ease, transform 0.2s ease;
    cursor: pointer;
  }
  .card:hover { box-shadow: 0 6px 20px rgb(0 0 0 / 0.08); transform: translateY(-2px); }
  .card--grid { grid-template-rows: auto 1fr; }
  .card--list { grid-template-columns: minmax(110px, 38%) 1fr; }

  .media { position: relative; aspect-ratio: 1; background: #f6f6f6; }
  .media img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .media-top { position: absolute; inset: 8px 8px auto 8px; display: flex; gap: 4px; flex-wrap: wrap; align-items: flex-start; }
  .media-bottom { position: absolute; inset: auto 0 0 0; display: grid; }

  .body { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px 12px; min-width: 0; }
  .title {
    margin: 0; font-size: 14px; line-height: 1.4; font-weight: 500;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    min-height: 2.8em;
  }
  .badges, .price-extra { display: flex; flex-wrap: wrap; gap: 4px; }
  .badges:empty, .price-extra:empty, .media-top:empty, .footer:empty { display: none; }
  .footer { display: flex; flex-wrap: wrap; gap: 4px; }
  .cashback { font-size: 11px; color: #b26a00; background: #fff8e6; border-radius: 4px; padding: 2px 6px; }

  .price-row { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
  .price { color: var(--_primary); font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
  .price small { font-size: 13px; font-weight: 600; margin-right: 1px; }
  .original { color: var(--_muted); font-size: 12px; text-decoration: line-through; }
  .discount { color: var(--_primary); font-size: 12px; font-weight: 600; }

  .meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; font-size: 12px; color: var(--_muted); }
  .rating { color: #f5a623; }
  .actions { display: flex; gap: 6px; }
  .icon-btn {
    all: unset; display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 999px;
    border: 1px solid var(--_border); color: var(--_muted); cursor: pointer; font-size: 15px; background: var(--_surface);
  }
  .icon-btn:hover { border-color: var(--_primary); color: var(--_primary); }
  .icon-btn:focus-visible { outline: 2px solid var(--_primary); outline-offset: 2px; }
  .icon-btn[aria-pressed="true"] { color: var(--_primary); border-color: var(--_primary); background: var(--_primary-soft); }
  .icon-btn--cart { background: var(--_primary); border-color: var(--_primary); color: #fff; }
  .icon-btn--cart:hover { color: #fff; filter: brightness(1.08); }
  .cart-qty { font-size: 11px; color: var(--_primary); font-weight: 600; }

  .tag { display: inline-flex; align-items: center; height: 20px; padding: 0 6px; font-size: 11px; line-height: 1; border-radius: 4px; white-space: nowrap; font-weight: 600; }
  .tag--delivery { background: #e8f4ff; color: #0a6ad6; }
  .tag--coupon { background: var(--_primary-soft); color: var(--_primary); border: 1px dashed var(--_primary); }
  .tag--gift { background: #fff3e0; color: #d26a00; }
  .tag--outline { border: 1px solid var(--_border); color: var(--_muted); font-weight: 500; }
  .tag--solid { background: var(--_primary); color: #fff; }
  .tag--dark { background: rgb(0 0 0 / 0.65); color: #fff; }
  .tag--live { background: #ff2d55; color: #fff; }
  .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #fff; margin-right: 4px; animation: pulse 1.2s infinite; }
  @keyframes pulse { 50% { opacity: 0.3; } }

  /* flash-sale */
  .flash-banner {
    display: flex; justify-content: space-between; align-items: center; padding: 4px 8px;
    background: linear-gradient(90deg, #ff3d3d, var(--_primary)); color: #fff; font-size: 12px; font-weight: 600;
  }
  .flash-banner time { font-variant-numeric: tabular-nums; letter-spacing: 0.04em; }
  .stock { display: grid; gap: 3px; font-size: 11px; color: var(--_primary); }
  .stock-bar { height: 6px; border-radius: 999px; background: var(--_primary-soft); overflow: hidden; }
  .stock-bar > span { display: block; height: 100%; background: linear-gradient(90deg, #ff7a45, var(--_primary)); }

  /* ranking */
  .rank {
    position: absolute; top: 0; left: 0; min-width: 34px; height: 38px; padding: 4px 6px 8px;
    display: grid; place-items: center; font-weight: 800; color: #fff; font-size: 16px;
    background: var(--_rank-color, #9e9e9e); clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%);
  }
  .rank--1 { --_rank-color: #e8a800; }
  .rank--2 { --_rank-color: #8e9aa6; }
  .rank--3 { --_rank-color: #b8723a; }
  .rank-category { font-size: 11px; color: var(--_muted); }

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
    .price { font-size: 17px; }
    .title { font-size: 13px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .card, .live-dot { transition: none; animation: none; }
  }
`;
