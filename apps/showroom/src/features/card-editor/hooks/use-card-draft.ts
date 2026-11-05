"use client";

import { useState } from "react";
import { useCardActions, useCardRecord } from "@/features/card-store";
import { validateDraft, type FieldIssues } from "../lib/draft";

type Draft = Record<string, unknown>;

/**
 * 編輯中的卡片狀態
 *
 *  - 合法的修改：直接寫入共享 Store → 預覽、其他分頁、sample.html 即時更新
 *  - 不合法的修改：只保留在本地 pending（顯示錯誤），不寫入、不廣播；預覽維持最後一個合法版本
 *  - 其他分頁改了同一張卡：沒有 pending 時自動跟上最新版本
 */
export function useCardDraft(id: string) {
  const record = useCardRecord(id);
  const actions = useCardActions();
  const [pending, setPending] = useState<{ draft: Draft; issues: FieldIssues } | null>(null);

  const draft: Draft | null = pending?.draft ?? (record ? (record.card as unknown as Draft) : null);

  function commit(next: unknown) {
    const result = validateDraft(next);
    if (!result.ok) {
      setPending({ draft: next as Draft, issues: result.issues });
      return;
    }
    actions.upsertCard(result.card);
    setPending(null);
  }

  return {
    /** null = 尚未 hydrate；undefined = 找不到 */
    record,
    draft,
    issues: pending?.issues ?? {},
    hasPendingErrors: pending !== null,
    update: (fn: (d: Draft) => Draft) => draft && commit(fn(draft)),
    replace: commit,
    discardPending: () => setPending(null),
    reset: () => {
      setPending(null);
      actions.resetCard(id);
    },
  };
}
