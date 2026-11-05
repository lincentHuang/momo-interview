import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader } from "@/shared/layout/page-header";
import { Button, ExternalIcon } from "@/shared/ui";

export const metadata: Metadata = { title: "嵌入指南 · Merchant Card Showroom" };

const MODES: Array<{ title: string; when: string; code: string }> = [
  {
    title: "同步模式 · card-id",
    when: "資料來自共享 Store，Showroom 的編輯會即時反映；收藏 / 購物車跨宿主同步。",
    code: `<script src="/vendor/momo-card.iife.js"></script>
<momo-product-card card-id="std-airfryer"></momo-product-card>`,
  },
  {
    title: "靜態模式 · data",
    when: "SSR / CMS 直接輸出 HTML；不連 Store、不同步。",
    code: `<momo-product-card layout="list"
  data='{"id":"p1","variant":"standard","title":"…","imageUrl":"…","price":880}'>
</momo-product-card>`,
  },
  {
    title: "Property 模式 · .card",
    when: "框架宿主（React / Vue）直接傳物件。",
    code: `const el = document.querySelector("momo-product-card");
el.card = { id: "p1", variant: "ranking", rank: 1, rankCategory: "熱銷", … };`,
  },
];

const EVENTS = [
  ["momo-card:click", "點擊卡片"],
  ["momo-card:favorite-change", "收藏狀態改變"],
  ["momo-card:add-to-cart", "加入購物車"],
  ["momo-card:error", "資料未通過驗證（另可查詢 invalid attribute / issues）"],
  ["momo-card:impression", "曝光追蹤模組：可見度達門檻"],
] as const;

const TOKENS = ["--momo-card-primary", "--momo-card-primary-soft", "--momo-card-radius", "--momo-card-font", "--momo-card-border"];

export default function EmbedPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="嵌入指南"
        description="商品卡是框架無關的 Web Component：任何頁面載入一支 script 即可使用，樣式由 Shadow DOM 隔離。"
        actions={
          <Button size="sm" variant="primary" asChild>
            <a href="/sample.html" target="_blank" rel="noreferrer">
              開啟 sample.html <ExternalIcon className="size-3.5" />
            </a>
          </Button>
        }
      />

      <div className="space-y-6">
        <section aria-label="三種資料來源" className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3">
          {MODES.map((m) => (
            <article key={m.title} className="flex flex-col rounded-xl border border-line bg-white p-4">
              <h2 className="text-sm font-semibold">{m.title}</h2>
              <p className="mb-3 mt-1 text-xs text-muted">{m.when}</p>
              <pre className="mt-auto overflow-auto rounded-lg bg-ink p-3 font-mono text-[11px] leading-relaxed text-white">{m.code}</pre>
            </article>
          ))}
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
          <Block title="對外事件" description="bubbles + composed，可穿越 Shadow DOM，宿主在 document 上即可監聽。">
            <ul className="space-y-1.5 text-xs">
              {EVENTS.map(([name, desc]) => (
                <li key={name} className="flex gap-2">
                  <code className="shrink-0 rounded bg-surface-muted px-1 font-mono text-brand">{name}</code>
                  <span className="text-muted">{desc}</span>
                </li>
              ))}
            </ul>
          </Block>
          <Block title="主題客製" description="CSS 變數可穿透 Shadow DOM；更細的覆寫使用 ::part(card | media | title | price | actions)。">
            <pre className="overflow-auto rounded-lg bg-surface-muted p-3 font-mono text-[11px] leading-relaxed">
              {`.theme-blue {\n${TOKENS.map((t) => `  ${t}: …;`).join("\n")}\n}`}
            </pre>
          </Block>
        </div>
      </div>
    </div>
  );
}

function Block({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-xl border border-line bg-white p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mb-3 mt-1 text-xs text-muted">{description}</p>
      {children}
    </section>
  );
}
