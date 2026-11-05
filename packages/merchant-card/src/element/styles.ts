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
  /* 卡片等高：宿主給高度（grid / flex stretch）時 body 撐滿，互動列以 margin-top:auto 貼底 */
  .card--grid { grid-template-rows: auto 1fr; }
  /*
   * 橫式（list）：對齊 momo 首頁「品牌旗艦」橫向卡——淺灰底大圓角卡、圖片內縮成白底圓角方塊，
   * 右側文字垂直置中，價格與標題之間留出呼吸空間。
   */
  .card--list {
    grid-template-columns: minmax(96px, 44%) 1fr; align-items: center; gap: 14px; padding: 14px;
    background: var(--momo-card-list-surface, #fafafa); border-color: var(--momo-card-list-border, #e3e3e3);
    border-radius: var(--momo-card-list-radius, 10px);
  }

  .media { position: relative; aspect-ratio: 1; background: #f6f6f6; overflow: hidden; }
  .card--list .media { align-self: center; border-radius: 8px; background: #fff; }
  .card--list .body { align-self: stretch; justify-content: center; gap: 4px; padding: 0; }
  .card--list .subtitle { font-size: 14px; line-height: 20px; min-height: 0; }
  .card--list .subtitle:empty { display: none; }
  .card--list .title { font-size: 15px; line-height: 22px; min-height: 0; }
  .card--list .price-row { margin-top: 10px; }
  .card--list .price { font-size: 22px; }
  .card--list .price small { font-size: 14px; }
  .card--list .original { font-size: 14px; }
  .card--list .meta { margin-top: 2px; }
  .card--list .meta:has(.sold:empty):has(.actions:empty) { display: none; }
  /* 多圖輪播：原生 scroll-snap，觸控滑動 / 觸控板橫向捲動 / 箭頭 / 圓點共用同一條捲動軌道 */
  .track {
    display: flex; width: 100%; height: 100%; overflow-x: auto; overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory; scrollbar-width: none;
  }
  .track::-webkit-scrollbar { display: none; }
  .track > img { flex: 0 0 100%; width: 100%; height: 100%; object-fit: cover; display: block; scroll-snap-align: start; scroll-snap-stop: always; }
  .nav {
    all: unset; position: absolute; top: 50%; translate: 0 -50%; display: grid; place-items: center;
    width: 26px; height: 26px; border-radius: 50%; background: rgb(255 255 255 / 0.85); color: #404040;
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.18); cursor: pointer; opacity: 0; transition: opacity 0.15s ease;
  }
  .nav--prev { left: 6px; }
  .nav--next { right: 6px; }
  .media:hover .nav, .nav:focus-visible { opacity: 1; }
  .nav:focus-visible { outline: 2px solid var(--_primary); outline-offset: 2px; }
  @media (hover: none) { .nav { display: none; } }

  /* 播放中蓋住角標 / 橫幅 / 圓點，避免遮住影片控制列 */
  .player { position: absolute; inset: 0; z-index: 2; background: #000; cursor: default; }
  .player iframe, .player video { width: 100%; height: 100%; border: 0; display: block; object-fit: contain; }
  .player-close {
    all: unset; position: absolute; top: 6px; right: 6px; display: grid; place-items: center; width: 24px; height: 24px;
    border-radius: 50%; background: rgb(0 0 0 / 0.55); color: #fff; font-size: 12px; cursor: pointer;
  }
  .player-close:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  .media-top { position: absolute; inset: 0 6px auto 6px; display: flex; gap: 4px; flex-wrap: wrap; align-items: flex-start; }
  .media-top > :not(.rank-flag):not(.media-sticker) { margin-top: 6px; }
  .media-top:has(.media-sticker) { justify-content: flex-end; }
  .media-sticker { position: absolute; top: 0; left: 0; width: 34%; max-width: 72px; height: auto; display: block; }
  /* 圖片底部：輪播圓點疊在檔期橫幅上方，不另佔卡片高度（有無多圖的卡片才能等高） */
  .media-foot { position: absolute; inset: auto 0 0 0; display: grid; pointer-events: none; }
  .media-foot > * { pointer-events: auto; }
  .media-bottom { display: grid; }
  .media-banner { width: 100%; height: auto; display: block; }
  .play {
    all: unset; position: absolute; inset: 50% auto auto 50%; translate: -50% -50%;
    display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
    background: rgb(0 0 0 / 0.45); color: #fff; cursor: pointer;
  }
  .play:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

  .dots { display: flex; justify-content: center; gap: 4px; padding: 0 0 6px; justify-self: center; }
  .dots button { all: unset; width: 5px; height: 5px; border-radius: 50%; background: rgb(0 0 0 / 0.22); box-shadow: 0 0 0 1px rgb(255 255 255 / 0.6); cursor: pointer; }
  .dots button[aria-selected="true"] { background: var(--_primary); width: 12px; border-radius: 3px; }
  .dots button:focus-visible { outline: 2px solid var(--_primary); outline-offset: 2px; }

  .body { display: flex; flex-direction: column; gap: 3px; padding: 6px 8px 10px; min-width: 0; }
  /* 促銷短語即使沒有也保留一行，讓同一列卡片的標題、價格對齊 */
  .subtitle {
    margin: 0; min-height: 18px; color: var(--_promo); font-size: 13px; line-height: 18px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .card--flash-sale .subtitle { font-size: 14px; font-weight: 700; }
  .title {
    margin: 0; font-size: 14px; line-height: 20px; font-weight: 400; color: var(--_text);
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    min-height: 40px;
  }
  .price-extra { display: flex; flex-wrap: wrap; gap: 2px 4px; align-items: center; }
  /*
   * 標籤列固定單行：依 plugin order（重要度）由左到右排，放不下的整顆換到第二行並被裁掉，
   * 所以卡片高度不會因標籤多寡而不同。（編輯模式改以 data-overflow 淡色提示，見下方）
   */
  .badges { display: flex; flex-wrap: wrap; gap: 0 4px; align-items: center; height: 18px; overflow: hidden; }
  .badges > * { flex-shrink: 0; }
  .badges:empty, .price-extra:empty, .media-top:empty, .footer:empty, .actions:empty { display: none; }
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
  .icon-btn:focus-visible { outline: 2px solid var(--_primary); outline-offset: 2px; }
  .icon-btn[aria-pressed="true"] { color: var(--_primary); border-color: var(--_primary); background: var(--_primary-soft); }
  .icon-btn--cart { background: var(--_primary); border-color: var(--_primary); color: #fff; }
  .icon-btn--cart:hover { color: #fff; filter: brightness(1.08); }
  .icon-btn[disabled] { opacity: 0.4; cursor: not-allowed; }

  /* 加入購物車：整條按鈕（與收藏並排時佔滿剩餘寬度，自己換到新的一行） */
  .meta:has(.cart-bar) { flex-wrap: wrap; }
  .actions:has(.cart-bar) { flex: 1 0 100%; }
  .actions > :has(.cart-bar), .cart-bar { flex: 1; }
  .cart-bar {
    all: unset; box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 4px;
    height: 32px; border-radius: 4px; background: var(--_primary); color: #fff; font-size: 14px; font-weight: 700;
    cursor: pointer; text-align: center;
  }
  .cart-bar:hover { filter: brightness(1.08); }

  /*
   * 絕對定位（角落頁籤 / 圖片按鈕）：相對 .card 定位，貼齊卡片邊緣。
   * 互動列保留右側空間，避免收藏按鈕或銷量文字跑到按鈕底下。
   */
  .actions:has(.cart-abs--bottom-right) { min-height: 28px; padding-right: 60px; }
  .actions:has(.cart-img.cart-abs--bottom-right) { padding-right: 76px; }
  /* momo 限搶卡的「搶」：紅色頁籤、左上大圓角、粗斜體 */
  .cart-corner {
    all: unset; box-sizing: border-box; display: grid; place-items: center; min-width: 64px; height: 34px; padding: 0 16px;
    border-radius: 18px 0 0 0; background: #d1322e; color: #fff; font-size: 20px; font-weight: 900; font-style: italic;
    letter-spacing: 0.02em; cursor: pointer;
  }
  .cart-corner.cart-abs--top-right { border-radius: 0 0 0 18px; }
  .cart-corner--icon svg { width: 20px; height: 20px; }
  .cart-corner:hover { filter: brightness(1.08); }
  .cart-corner[disabled] { font-size: 13px; font-style: normal; }
  .cart-img { all: unset; display: block; cursor: pointer; line-height: 0; }
  .cart-img img { display: block; width: auto; max-width: 160px; }
  .cart-img:hover { filter: brightness(1.05); }
  /* 放在按鈕本身的 all: unset 之後，避免 position 被重設 */
  .cart-abs { position: absolute; z-index: 3; }
  .cart-abs--bottom-right { right: 0; bottom: 0; }
  .cart-abs--top-right { right: 0; top: 0; }
  .cart-bar:focus-visible, .cart-corner:focus-visible, .cart-img:focus-visible { outline: 2px solid var(--_primary); outline-offset: 2px; }
  .cart-bar[disabled], .cart-corner[disabled], .cart-img[disabled] { opacity: 0.4; cursor: not-allowed; filter: none; }

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
  :host([editable]) .media-bottom:empty { margin: 0 8px 8px; }
  :host([editable]) .badges { height: auto; overflow: visible; row-gap: 4px; }
  :host([editable]) .badges [data-overflow] { opacity: 0.4; outline: 1px dashed var(--_muted); }
  :host([editable]) .badges[data-hidden]::after {
    content: "＋" attr(data-hidden) " 個空間不足，正式頁面會收起"; flex-basis: 100%; font-size: 10px; color: var(--_muted);
  }
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
