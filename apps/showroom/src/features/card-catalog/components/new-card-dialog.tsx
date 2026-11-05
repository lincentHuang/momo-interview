"use client";

import { CARD_VARIANTS, VARIANTS, type CardVariant } from "@momo/merchant-card";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { useCardActions, useCardRecords } from "@/features/card-store";
import { cn } from "@/shared/lib/cn";
import { Button, Dialog, DialogClose, Input, Label } from "@/shared/ui";
import { createBlankCard, newCardId } from "../lib/new-card";

/**
 * 新增卡片：只問「類型、名稱、售價」三件事，建立後直接進設計頁補其餘內容與模組。
 * 寫入走與編輯器相同的 upsertCard（schema 驗證 + 跨分頁同步），新卡片會立即出現在其他分頁。
 */
export function NewCardDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const records = useCardRecords();
  const actions = useCardActions();
  const formId = useId();
  const [variant, setVariant] = useState<CardVariant>("standard");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("990");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const name = title.trim();
    const amount = Number(price);
    if (!name) return setError("請輸入商品名稱");
    if (!Number.isInteger(amount) || amount < 0) return setError("售價需為 0 以上的整數");

    const id = newCardId(variant, new Set(records?.map((r) => r.card.id)));
    const result = actions.upsertCard(createBlankCard({ id, variant, title: name, price: amount }));
    if (!result.ok) return setError(result.issues.map((i) => i.message).join("、"));

    onOpenChange(false);
    setTitle("");
    setError(null);
    router.push(`/cards/${id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="新增商品卡" description="選擇類型並填寫名稱與售價，建立後進入設計頁編輯內容與模組。">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">卡片類型</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {CARD_VARIANTS.map((v) => (
              <label
                key={v}
                className={cn(
                  "flex cursor-pointer gap-2.5 rounded-lg border p-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                  variant === v ? "border-brand bg-brand-soft" : "border-line hover:border-brand/50",
                )}
              >
                <input type="radio" name={`${formId}-variant`} value={v} checked={variant === v} onChange={() => setVariant(v)} className="mt-0.5 accent-brand" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{VARIANTS[v].label}</span>
                  <span className="line-clamp-2 text-[11px] text-muted">{VARIANTS[v].foundIn}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-title`}>商品名稱</Label>
            <Input
              id={`${formId}-title`}
              value={title}
              maxLength={150}
              placeholder="例：【品牌】商品名稱 規格"
              autoFocus
              aria-invalid={error === "請輸入商品名稱" || undefined}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-price`}>售價（元）</Label>
            <Input id={`${formId}-price`} type="number" inputMode="numeric" min={0} step={10} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              取消
            </Button>
          </DialogClose>
          <Button type="submit" variant="primary" disabled={!records}>
            建立並開始編輯
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
