"use client";

import { Dialog as RadixDialog } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { CloseIcon } from "./icons";

/** 置中對話框（Radix Dialog：focus trap、Esc 關閉、關閉後焦點回到觸發元素） */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <RadixDialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
            "rounded-xl bg-white p-5 shadow-xl outline-none data-[state=open]:animate-[fade-in_150ms_ease-out]",
            className,
          )}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <RadixDialog.Title className="text-base font-semibold">{title}</RadixDialog.Title>
              {description && <RadixDialog.Description className="mt-1 text-sm text-muted">{description}</RadixDialog.Description>}
            </div>
            <RadixDialog.Close
              aria-label="關閉"
              className="grid size-8 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
            >
              <CloseIcon className="size-4" />
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export const DialogClose = RadixDialog.Close;
