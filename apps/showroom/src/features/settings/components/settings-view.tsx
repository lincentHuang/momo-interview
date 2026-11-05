"use client";

import { useState, type ReactNode } from "react";
import { useCardActions, useStoreInfo, useStoreSnapshot } from "@/features/card-store";
import { PageHeader } from "@/shared/layout/page-header";
import { usePreference } from "@/shared/lib/use-preference";
import { Button, Switch } from "@/shared/ui";

/** 設定與同步：把「低頻但重要」的操作與診斷資訊集中在這裡，不干擾目錄與編輯器 */
export function SettingsView() {
  const snapshot = useStoreSnapshot();
  const info = useStoreInfo();
  const actions = useCardActions();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [collapsed, setCollapsed] = usePreference<"0" | "1">("sidebar-collapsed", "0");

  const records = snapshot ? Object.values(snapshot.records) : [];
  const favorites = records.filter((r) => r.state.favorite).length;
  const cartItems = records.reduce((n, r) => n + r.state.cartQty, 0);

  const resetAll = () => {
    actions.resetAll();
    setConfirming(false);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="設定與同步" description="資料管理、跨分頁同步狀態與介面偏好。" />

      <Panel title="同步狀態" description="卡片設定與互動狀態透過 BroadcastChannel + localStorage 在所有同源分頁（含 sample.html）間同步。">
        {snapshot?.readonly && (
          <p role="alert" className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            偵測到較新版本的資料，此分頁暫停寫入，請重新整理。
          </p>
        )}
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          <Meta label="狀態" value={!snapshot ? "載入中…" : snapshot.readonly ? "唯讀（偵測到新版本資料）" : "正常同步中"} />
          <Meta label="Schema 版本" value={info ? `v${info.schemaVersion}` : "—"} />
          <Meta label="卡片數" value={snapshot ? `${records.length} 張` : "—"} />
          <Meta label="收藏 / 購物車" value={snapshot ? `${favorites} 張 / ${cartItems} 件` : "—"} />
          <Meta label="localStorage key" value={info?.storageKey ?? "—"} mono />
          <Meta label="BroadcastChannel" value={info ? (info.broadcastChannel ? info.channelName : "不支援（改用 storage event）") : "—"} mono />
          <Meta label="本分頁 origin" value={info?.origin.slice(0, 8) ?? "—"} mono />
        </dl>
      </Panel>

      <Panel title="資料管理" description="把所有卡片恢復成種子資料（包含版位排版、收藏與購物車），並同步到所有分頁。">
        <div className="flex flex-wrap items-center gap-2">
          {confirming ? (
            <>
              <Button size="sm" variant="primary" onClick={resetAll} disabled={snapshot?.readonly}>
                確定重設全部卡片
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                取消
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setConfirming(true)} disabled={!snapshot || snapshot.readonly}>
              全部重設
            </Button>
          )}
          {done && (
            <span role="status" className="text-xs text-emerald-700">
              ✓ 已重設並同步
            </span>
          )}
        </div>
      </Panel>

      <Panel title="介面偏好" description="只存在這個瀏覽器，不會同步到其他宿主。">
        <label className="flex items-center justify-between gap-4 text-sm">
          收合側欄（只顯示圖示）
          <Switch checked={collapsed === "1"} onCheckedChange={(on) => setCollapsed(on ? "1" : "0")} aria-label="收合側欄" />
        </label>
      </Panel>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-xl border border-line bg-white p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mb-4 mt-1 text-xs text-muted">{description}</p>
      {children}
    </section>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md bg-surface-muted px-3 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className={mono ? "truncate font-mono text-ink" : "text-ink"}>{value}</dd>
    </div>
  );
}
