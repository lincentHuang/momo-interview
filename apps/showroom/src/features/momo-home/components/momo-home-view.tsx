"use client";

import { formatRemaining, remaining, type Card } from "@momo/merchant-card";
import type { MomoHomepage, MomoSection } from "@momo/merchant-card/momo";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CardSkeleton, MomoCard } from "@/features/card-preview";
import { useCardActions } from "@/features/card-store";
import { PageHeader } from "@/shared/layout/page-header";
import { cn } from "@/shared/lib/cn";
import { Button, ToggleGroup } from "@/shared/ui";

type Source = "snapshot" | "live";
type HomeResponse = MomoHomepage & { source: Source };
type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; data: HomeResponse };

const SOURCE_OPTIONS = [
  { value: "snapshot" as const, label: "錄製快照" },
  { value: "live" as const, label: "momo 即時" },
];

/** 每秒更新的現在時間（限時搶購區塊標題倒數） */
function useNow(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [enabled]);
  return now;
}

function openProduct({ url }: { url: string | null }) {
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * momo 首頁情境：用 momo 首頁 API 的真實資料（快照或即時）渲染與官網相同的商品區塊，
 * 證明 adapter 轉出的 Card 可直接餵給 <momo-product-card>，並可一鍵匯入目錄繼續編輯。
 */
export function MomoHomeView() {
  const router = useRouter();
  const pathname = usePathname();
  const source: Source = useSearchParams().get("source") === "live" ? "live" : "snapshot";
  // 結果以來源為 key：切換來源時舊結果自動視為「載入中」，不需在 effect 內同步 setState
  const [result, setResult] = useState<{ source: Source; state: LoadState } | null>(null);
  const state: LoadState = result?.source === source ? result.state : { status: "loading" };

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/momo/home?source=${source}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        setResult({ source, state: { status: "ok", data: body as HomeResponse } });
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) setResult({ source, state: { status: "error", message: err.message } });
      });
    return () => controller.abort();
  }, [source]);

  const setSource = (next: Source) => router.replace(next === "live" ? `${pathname}?source=live` : pathname, { scroll: false });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="momo 首頁情境"
        description={
          <>
            以 momo 首頁 API 的真實資料渲染各種商品卡區塊（限時搶購、精選好物榜、橫式輪播、你可能會喜歡）。 資料經 adapter 轉換並通過
            CardSchema 驗證後，直接交給同一個 Web Component。
          </>
        }
        actions={
          <>
            <ToggleGroup aria-label="資料來源" value={source} options={SOURCE_OPTIONS} onValueChange={setSource} />
            <Button asChild size="sm" variant="ghost">
              <Link href="/analysis#data-format">資料格式分析</Link>
            </Button>
          </>
        }
      />

      {state.status === "loading" && <LoadingSections />}
      {state.status === "error" && (
        <div role="alert" className="rounded-lg border border-danger/30 bg-red-50 p-4 text-sm">
          <p className="font-medium text-danger">{state.message}</p>
          <p className="mt-1 text-muted">
            momo 前台 API 非公開 API，伺服器來源請求可能被其防護機制拒絕。可先切回「錄製快照」檢視相同格式的真實資料。
          </p>
          <Button className="mt-3" size="sm" onClick={() => setSource("snapshot")}>
            改用錄製快照
          </Button>
        </div>
      )}
      {state.status === "ok" && <Homepage data={state.data} />}
    </div>
  );
}

function Homepage({ data }: { data: HomeResponse }) {
  const rejected = data.sections.reduce((n, s) => n + s.rejected.length, 0);
  return (
    <div className="space-y-5">
      <dl className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-line bg-white px-4 py-2.5 text-xs text-muted">
        <Stat label="資料來源">{data.source === "live" ? "momo 即時（5 分鐘快取）" : "2026-11-05 錄製快照（時間已平移）"}</Stat>
        <Stat label="取得時間">{new Date(data.fetchedAt).toLocaleString("zh-TW")}</Stat>
        <Stat label="商品卡">{data.sections.reduce((n, s) => n + s.cards.length, 0)} 張</Stat>
        <Stat label="略過商品">{rejected} 筆</Stat>
        {data.skipped.map((s) => (
          <Stat key={s.blockTypeId} label={`未渲染：${s.name}`}>
            {s.reason}
          </Stat>
        ))}
      </dl>
      {data.errors.length > 0 && (
        <ul role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          {data.errors.map((e) => (
            <li key={e.section}>
              「{e.section}」載入失敗：{e.message}（其他區塊不受影響）
            </li>
          ))}
        </ul>
      )}
      {data.sections.map((section) => {
        switch (section.kind) {
          case "flash-sale":
            return <FlashSaleSection key={section.id} section={section} />;
          case "ranking":
            return <RankingSection key={section.id} section={section} source={data.source} />;
          case "carousel":
            return <CarouselSection key={section.id} section={section} />;
          case "waterfall":
            return <WaterfallSection key={section.id} section={section} />;
        }
      })}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-1.5">
      <dt>{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

/** 區塊外框：標題列（momo 風格）+ 匯入目錄 */
function SectionFrame({
  section,
  cards,
  extra,
  tone = "white",
  children,
}: {
  section: MomoSection;
  cards: Card[];
  extra?: ReactNode;
  tone?: "white" | "pink";
  children: ReactNode;
}) {
  const { upsertCard } = useCardActions();
  const [imported, setImported] = useState<number | null>(null);
  const importAll = () => {
    const ok = cards.filter((c) => upsertCard(c).ok).length;
    setImported(ok);
  };
  return (
    <section aria-labelledby={`${section.id}-title`} className="overflow-hidden rounded-lg border border-line bg-white">
      <header className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3", tone === "pink" && "bg-[#fbe4ec]")}>
        <h2 id={`${section.id}-title`} className="text-lg font-bold tracking-tight text-[#404040]">
          {section.title}
        </h2>
        <span className="text-xs text-muted">
          {cards.length} 張卡{section.rejected.length > 0 && ` · 略過 ${section.rejected.length} 筆`}
        </span>
        <div className="ml-auto flex items-center gap-3">
          {extra}
          {imported !== null ? (
            <Link href="/" className="text-xs text-brand underline-offset-2 hover:underline">
              已匯入 {imported} 張，前往目錄編輯 →
            </Link>
          ) : (
            <Button size="sm" onClick={importAll} disabled={cards.length === 0}>
              匯入目錄
            </Button>
          )}
        </div>
      </header>
      {section.rejected.length > 0 && (
        <details className="border-t border-line px-4 py-2 text-xs text-muted">
          <summary className="cursor-pointer">略過的商品（資料未通過驗證）</summary>
          <ul className="mt-1 space-y-0.5">
            {section.rejected.map((r) => (
              <li key={r.goodsCode}>
                <code>{r.goodsCode}</code>：{r.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="border-t border-line bg-canvas/60 p-3">{children}</div>
    </section>
  );
}

function FlashSaleSection({ section }: { section: MomoSection }) {
  const now = useNow(section.endsAt !== undefined);
  const r = section.endsAt !== undefined ? remaining(section.endsAt, now) : null;
  const [hh, mm, ss] = r ? formatRemaining(r).split(":") : [];
  return (
    <SectionFrame
      section={section}
      cards={section.cards}
      tone="pink"
      extra={
        r && (
          <span className="flex items-center gap-1 text-sm text-[#404040]" aria-label={`倒數 ${hh} 小時 ${mm} 分 ${ss} 秒`}>
            {r.expired ? (
              "本檔已結束"
            ) : (
              <>
                倒數
                {[hh, mm, ss].map((v, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-[#d62872]">:</span>}
                    <span className="grid h-6 min-w-6 place-items-center rounded bg-[#d62872] px-1 font-mono text-xs font-bold text-white tabular-nums">
                      {v}
                    </span>
                  </span>
                ))}
              </>
            )}
          </span>
        )
      }
    >
      <CardGrid cards={section.cards.slice(0, 10)} />
    </SectionFrame>
  );
}

function RankingSection({ section, source }: { section: MomoSection; source: Source }) {
  const [keyword, setKeyword] = useState(section.activeKeyword);
  const [cards, setCards] = useState(section.cards);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keywords = section.keywords ?? [];

  const choose = async (value: string) => {
    if (value === keyword) return;
    setKeyword(value);
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ source, keyword: value, mdiv: section.mdiv, keywords: JSON.stringify(keywords) });
    try {
      const res = await fetch(`/api/momo/featured?${qs}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setCards(body.cards);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionFrame section={section} cards={cards}>
      {keywords.length > 0 && (
        <div role="tablist" aria-label="精選關鍵字" className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {keywords.map((k) => (
            <button
              key={k.value}
              role="tab"
              aria-selected={k.value === keyword}
              onClick={() => choose(k.value)}
              className={cn(
                "h-9 shrink-0 rounded border px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand",
                k.value === keyword ? "border-[#f9c9d7] bg-[#fde6ee] font-medium text-[#404040]" : "border-line bg-white text-[#404040] hover:border-brand",
              )}
            >
              {k.value}
            </button>
          ))}
        </div>
      )}
      {source === "snapshot" && keywords.length > 1 && (
        <p className="mb-2 text-xs text-muted">快照只錄製了第一個關鍵字的商品；切換分頁會回傳同一份錄製資料。改用「momo 即時」可看到各分頁的真實商品。</p>
      )}
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}
      <div className={cn(loading && "opacity-50 transition-opacity")}>
        <CardRow cards={cards} width="w-[184px]" />
      </div>
    </SectionFrame>
  );
}

function CarouselSection({ section }: { section: MomoSection }) {
  return (
    <SectionFrame section={section} cards={section.cards}>
      <CardRow cards={section.cards} width="w-[340px]" layout="list" />
    </SectionFrame>
  );
}

function WaterfallSection({ section }: { section: MomoSection }) {
  return (
    <SectionFrame section={section} cards={section.cards}>
      <CardGrid cards={section.cards} />
      {section.page && section.page.max > section.page.current && (
        <p className="mt-3 text-center text-xs text-muted">
          第 {section.page.current} / {section.page.max} 頁（momo 以捲動載入後續分頁，API：getRecommendGoods curPage）
        </p>
      )}
    </SectionFrame>
  );
}

function CardGrid({ cards }: { cards: Card[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {cards.map((card) => (
        <li key={card.id}>
          <MomoCard card={card} onCardClick={openProduct} className="h-full" />
        </li>
      ))}
    </ul>
  );
}

function CardRow({ cards, width, layout }: { cards: Card[]; width: string; layout?: "list" }) {
  return (
    <ul className="flex snap-x gap-2.5 overflow-x-auto pb-2">
      {cards.map((card) => (
        <li key={card.id} className={cn("shrink-0 snap-start", width)}>
          <MomoCard card={card} layout={layout} onCardClick={openProduct} className="h-full" />
        </li>
      ))}
    </ul>
  );
}

function LoadingSections() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="載入中">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-lg border border-line bg-white p-4">
          <div className="mb-3 h-6 w-40 animate-pulse rounded bg-surface-muted" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, j) => (
              <CardSkeleton key={j} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

