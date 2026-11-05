"use client";

import { VARIANTS } from "@momo/merchant-card";
import Link from "next/link";
import { useState } from "react";
import { useStoreSnapshot } from "@/features/card-store";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger, Tooltip } from "@/shared/ui";
import { useCardDraft } from "../hooks/use-card-draft";
import { buildShareUrl } from "../lib/share-url";
import { ContentPanel } from "./content-panel";
import { JsonInspector } from "./json-inspector";
import { PluginPanel } from "./plugin-panel";
import { PreviewPanel } from "./preview-panel";
import { ShareImportBanner } from "./share-import-banner";

export function CardEditorView({ id }: { id: string }) {
  const snapshot = useStoreSnapshot();
  const { record, draft, issues, hasPendingErrors, update, replace, discardPending, reset } = useCardDraft(id);
  const [copied, setCopied] = useState(false);

  if (record === null) {
    return <div className="h-[600px] animate-pulse rounded-xl bg-white" aria-busy="true" />;
  }
  if (!record || !draft) {
    return (
        <div className="rounded-xl border border-line bg-white p-10 text-center">
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

  const pluginIssueCount = Object.keys(issues).filter((k) => k.startsWith("extensions.")).length;
  const contentIssueCount = Object.keys(issues).length - pluginIssueCount;

  return (
    <div className="space-y-4">
      <ShareImportBanner cardId={id} onApply={replace} />

      {snapshot?.readonly && (
        <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          偵測到較新版本的資料（可能是其他分頁已更新程式），此分頁暫停寫入，請重新整理。
        </p>
      )}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <nav className="text-xs text-muted">
            <Link href="/" className="hover:text-brand">
              商品卡目錄
            </Link>{" "}
            / {VARIANTS[record.card.variant].label}
          </nav>
          <h1 className="mt-1 line-clamp-1 text-lg font-semibold">{record.card.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tooltip content="恢復成種子資料，並同步到所有分頁">
            <Button size="sm" variant="ghost" onClick={reset}>
              重設
            </Button>
          </Tooltip>
          <Tooltip content="設定編碼在網址中，對方開啟後可選擇套用">
            <Button size="sm" onClick={copyShare}>
              {copied ? "✓ 已複製" : "複製分享連結"}
            </Button>
          </Tooltip>
          <Button size="sm" variant="primary" asChild>
            <a href={`/sample.html#${id}`} target="_blank" rel="noreferrer">
              在 sample.html 開啟 ↗
            </a>
          </Button>
        </div>
      </header>

      {hasPendingErrors && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-danger">
          <span>有欄位未通過驗證，修正前不會寫入與同步（預覽維持最後一個合法版本）。</span>
          <Button size="sm" variant="ghost" onClick={discardPending}>
            放棄修改
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <section aria-label="卡片設定" className="rounded-xl border border-line bg-white p-4">
          <Tabs defaultValue="content">
            <TabsList>
              <TabsTrigger value="content">內容{contentIssueCount > 0 && <Badge n={contentIssueCount} />}</TabsTrigger>
              <TabsTrigger value="plugins">行銷插件{pluginIssueCount > 0 && <Badge n={pluginIssueCount} />}</TabsTrigger>
              <TabsTrigger value="json">JSON / 同步</TabsTrigger>
            </TabsList>
            <TabsContent value="content">
              <ContentPanel draft={draft} issues={issues} onUpdate={update} />
            </TabsContent>
            <TabsContent value="plugins">
              <PluginPanel draft={draft} issues={issues} onUpdate={update} />
            </TabsContent>
            <TabsContent value="json">
              <JsonInspector draft={draft} record={record} issues={issues} />
            </TabsContent>
          </Tabs>
        </section>

        <section aria-label="即時預覽" className="space-y-2">
          <PreviewPanel record={record} />
        </section>
      </div>
    </div>
  );
}

function Badge({ n }: { n: number }) {
  return <span className="ml-1.5 rounded-full bg-danger px-1.5 text-[10px] text-white">{n}</span>;
}
