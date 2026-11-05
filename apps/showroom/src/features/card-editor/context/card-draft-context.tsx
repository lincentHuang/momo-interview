"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useCardDraft } from "../hooks/use-card-draft";

type CardDraftValue = ReturnType<typeof useCardDraft> & { id: string };

const CardDraftContext = createContext<CardDraftValue | null>(null);

/**
 * 編輯器的草稿狀態由 /cards/[id] layout 提供：
 * 「設計」與「檢視器」兩個子頁共用同一份 pending 草稿，切換分頁不會遺失未通過驗證的修改。
 */
export function CardDraftProvider({ id, children }: { id: string; children: ReactNode }) {
  const draft = useCardDraft(id);
  return <CardDraftContext.Provider value={{ ...draft, id }}>{children}</CardDraftContext.Provider>;
}

export function useCardDraftContext(): CardDraftValue {
  const value = useContext(CardDraftContext);
  if (!value) throw new Error("useCardDraftContext 必須在 CardDraftProvider 內使用");
  return value;
}
