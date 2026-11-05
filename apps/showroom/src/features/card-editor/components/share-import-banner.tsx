"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui";
import { validateDraft } from "../lib/draft";
import { decodeShare, SHARE_PARAM } from "../lib/share-url";

/**
 * 從分享連結開啟時，不默默覆蓋使用者本地的設定，而是先詢問。
 * 連結內容是不可信輸入 → 先驗證；id 不符或格式錯誤則拒絕。
 */
export function ShareImportBanner({ cardId, onApply }: { cardId: string; onApply: (card: unknown) => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const encoded = params.get(SHARE_PARAM);
  if (!encoded) return null;

  const dismiss = () => router.replace(pathname, { scroll: false });
  const decoded = decodeShare(encoded);
  const result = validateDraft(decoded);
  const idMatches = result.ok && result.card.id === cardId;

  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand/30 bg-brand-soft px-4 py-3 text-sm">
      {idMatches ? (
        <>
          <span>這個連結帶有一份分享的卡片設定，要套用並同步到所有分頁嗎？</span>
          <span className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={dismiss}>
              忽略
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                onApply(decoded);
                dismiss();
              }}
            >
              套用設定
            </Button>
          </span>
        </>
      ) : (
        <>
          <span className="text-danger">分享連結的設定無效或與此商品不符，已忽略。</span>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            關閉
          </Button>
        </>
      )}
    </div>
  );
}
