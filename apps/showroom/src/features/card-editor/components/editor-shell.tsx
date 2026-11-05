"use client";

import { VARIANTS } from "@momo/merchant-card";
import { MOMO_TEMPLATE_SECTION_LABELS } from "@momo/merchant-card/momo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { SEED_CARD_IDS, useStoreSnapshot } from "@/features/card-store";
import { PageHeader } from "@/shared/layout/page-header";
import { cn } from "@/shared/lib/cn";
import { Button, ExternalIcon, Tooltip } from "@/shared/ui";
import { CardDraftProvider, useCardDraftContext } from "../context/card-draft-context";
import { buildShareUrl } from "../lib/share-url";
import { ShareImportBanner } from "./share-import-banner";

/** /cards/[id] 共用外框：標題、主要操作、子頁切換（設計 / 檢視器）與全域提示 */
export function EditorShell({ id, children }: { id: string; children: ReactNode }) {
  return (
    <CardDraftProvider id={id}>
      <ShellFrame>{children}</ShellFrame>
    </CardDraftProvider>
  );
}

function ShellFrame({ children }: { children: ReactNode }) {
  const { id, record, hasPendingErrors, discardPending, reset, replace } = useCardDraftContext();
  const snapshot = useStoreSnapshot();
  const [copied, setCopied] = useState(false);

  if (record === null) {
    // Store 尚未在瀏覽器端 hydrate：外框用骨架，但子頁照常渲染（子頁各自有骨架），
    // 讓 Next 的 instant navigation 驗證能看到完整的 segment 樹
    return (
      <div className="mx-auto max-w-[1400px]" aria-busy="true">
        <div className="mb-6 h-14 w-80 animate-pulse rounded-lg bg-white" />
        <SubNav id={id} />
        {children}
      </div>
    );
  }
  if (!record) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-line bg-white p-10 text-center">
        <p className="mb-4 text-muted">找不到商品「{id}」</p>
        <Button asChild variant="primary">
          <Link href="/">回到目錄</Link>
        </Button>
      </div>
    );
  }

  const copyShare = async () => {
    await navigator.clipboard.writeText(buildShareUrl(location.origin, id, record.card));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const momoSectionLabel = MOMO_TEMPLATE_SECTION_LABELS[id];
  const isMomoLinked = Boolean(momoSectionLabel) || id.startsWith("momo-");

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        eyebrow={
          <nav aria-label="麵包屑">
            <Link href="/" className="hover:text-brand">
              商品卡目錄
            </Link>{" "}
            / {VARIANTS[record.card.variant].label}
            {momoSectionLabel && <span className="text-brand"> · momo 首頁「{momoSectionLabel}」樣板</span>}
          </nav>
        }
        title={<span className="line-clamp-1">{record.card.title}</span>}
        actions={
          <>
            {SEED_CARD_IDS.has(id) && (
              <Tooltip content="恢復成種子資料（含模組排版），並同步到所有分頁">
                <Button size="sm" variant="ghost" onClick={reset}>
                  重設
                </Button>
              </Tooltip>
            )}
            {isMomoLinked && (
              <Button size="sm" asChild>
                <Link href="/momo">在 momo 首頁檢視</Link>
              </Button>
            )}
            <Tooltip content="設定編碼在網址中，對方開啟後可選擇套用">
              <Button size="sm" onClick={copyShare}>
                {copied ? "✓ 已複製" : "複製分享連結"}
              </Button>
            </Tooltip>
            <Button size="sm" variant="primary" asChild>
              <a href={`/sample.html#${id}`} target="_blank" rel="noreferrer">
                在 sample.html 開啟 <ExternalIcon className="size-3.5" />
              </a>
            </Button>
          </>
        }
      />

      <div className="mb-4 space-y-3 empty:hidden">
        {/* useSearchParams 屬於請求期資料，獨立 Suspense 讓外框仍可預先渲染 */}
        <Suspense fallback={null}>
          <ShareImportBanner cardId={id} onApply={replace} />
        </Suspense>
        {snapshot?.readonly && (
          <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            偵測到較新版本的資料（可能是其他分頁已更新程式），此分頁暫停寫入，請重新整理。
          </p>
        )}
        {hasPendingErrors && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-danger">
            <span>有欄位未通過驗證，修正前不會寫入與同步（預覽維持最後一個合法版本）。</span>
            <Button size="sm" variant="ghost" onClick={discardPending}>
              放棄修改
            </Button>
          </div>
        )}
      </div>

      <SubNav id={id} />
      {children}
    </div>
  );
}

function SubNav({ id }: { id: string }) {
  const base = `/cards/${encodeURIComponent(id)}`;
  const tabs = [
    { href: base, label: "設計" },
    { href: `${base}/inspect`, label: "檢視器" },
  ];
  return (
    <nav aria-label="編輯器分頁" className="mb-5 flex gap-1 border-b border-line">
      <Suspense fallback={tabs.map((t) => <SubNavLink key={t.href} {...t} active={false} />)}>
        <ActiveSubNav tabs={tabs} />
      </Suspense>
    </nav>
  );
}

function ActiveSubNav({ tabs }: { tabs: Array<{ href: string; label: string }> }) {
  const pathname = decodeURIComponent(usePathname());
  return tabs.map((t) => <SubNavLink key={t.href} {...t} active={pathname === decodeURIComponent(t.href)} />);
}

function SubNavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-mb-px border-b-2 px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand",
        active ? "border-brand font-medium text-brand" : "border-transparent text-muted hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
}
