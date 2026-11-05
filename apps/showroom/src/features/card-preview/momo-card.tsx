"use client";

import type { Card, CardLayout } from "@momo/merchant-card";
import type { MomoProductCard } from "@momo/merchant-card/element";
import { useEffect, useRef, useState, type CSSProperties } from "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "momo-product-card": React.DetailedHTMLProps<React.HTMLAttributes<MomoProductCard>, MomoProductCard> & {
        "card-id"?: string;
        layout?: CardLayout;
        data?: string;
        editable?: boolean;
        "selected-module"?: string;
      };
    }
  }
}

/** 只在瀏覽器端載入一次（customElements 不存在於 Server） */
let elementPromise: Promise<unknown> | null = null;
function ensureElement() {
  elementPromise ??= import("@momo/merchant-card/element");
  return elementPromise;
}

export interface MomoCardEvents {
  onCardClick?: (detail: { cardId: string; url: string | null }) => void;
  onFavoriteChange?: (detail: { cardId: string; favorite: boolean }) => void;
  onAddToCart?: (detail: { cardId: string; cartQty: number }) => void;
  onImpression?: (detail: { cardId: string }) => void;
}

export interface MomoCardProps extends MomoCardEvents {
  /** 從共享 Store 讀取並跨分頁同步（Showroom 目錄 / 編輯器） */
  cardId?: string;
  /** 直接給卡片資料（例如 momo API 轉出的卡片）；不進 Store，收藏 / 購物車為卡片內部狀態 */
  card?: Card;
  layout?: CardLayout;
  /** WYSIWYG 編輯模式：顯示插槽放置區、模組可拖曳 */
  editable?: boolean;
  /** 編輯模式下高亮的模組 id */
  selectedModule?: string | null;
  className?: string;
  style?: CSSProperties;
}

/**
 * React 包裝：Showroom 使用的是與 sample.html 完全相同的 Web Component，
 * 確保「在 Showroom 看到的」= 「宿主頁面嵌入後看到的」。
 */
export function MomoCard({ cardId, card, layout, editable, selectedModule, className, style, ...events }: MomoCardProps) {
  const ref = useRef<MomoProductCard>(null);
  const [ready, setReady] = useState(false);
  const handlers = useRef(events);

  useEffect(() => {
    handlers.current = events;
  });

  useEffect(() => {
    let alive = true;
    ensureElement().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const map: Array<[string, keyof MomoCardEvents]> = [
      ["momo-card:click", "onCardClick"],
      ["momo-card:favorite-change", "onFavoriteChange"],
      ["momo-card:add-to-cart", "onAddToCart"],
      ["momo-card:impression", "onImpression"],
    ];
    const listeners = map.map(([type, key]) => {
      const fn = (e: Event) => (handlers.current[key] as ((d: unknown) => void) | undefined)?.((e as CustomEvent).detail);
      el.addEventListener(type, fn);
      return () => el.removeEventListener(type, fn);
    });
    return () => listeners.forEach((off) => off());
  }, [ready]);

  // 物件只能用 property 傳遞（attribute 只接受字串）
  useEffect(() => {
    if (ready && ref.current && card) ref.current.card = card;
  }, [ready, card]);

  return (
    <div className={className} style={style}>
      {ready ? (
        <momo-product-card
          ref={ref}
          card-id={cardId}
          layout={layout}
          editable={editable || undefined}
          selected-module={selectedModule ?? undefined}
        />
      ) : (
        <CardSkeleton layout={layout} />
      )}
    </div>
  );
}

export function CardSkeleton({ layout = "grid" }: { layout?: CardLayout }) {
  return (
    <div
      aria-hidden
      className={
        layout === "list"
          ? "grid h-40 animate-pulse grid-cols-[38%_1fr] gap-3 rounded-[10px] border border-line bg-white p-2"
          : "aspect-[3/5] animate-pulse rounded-[10px] border border-line bg-white"
      }
    />
  );
}
