"use client";

import { ToggleGroup as RadixToggleGroup } from "radix-ui";
import { cn } from "@/shared/lib/cn";

export interface ToggleGroupProps<T extends string> {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onValueChange: (value: T) => void;
  "aria-label": string;
  className?: string;
}

/** 單選 segmented control；Radix 允許取消選取，這裡強制至少選一個 */
export function ToggleGroup<T extends string>({ value, options, onValueChange, className, ...aria }: ToggleGroupProps<T>) {
  return (
    <RadixToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      aria-label={aria["aria-label"]}
      className={cn("inline-flex rounded-md border border-line bg-white p-0.5", className)}
    >
      {options.map((o) => (
        <RadixToggleGroup.Item
          key={o.value}
          value={o.value}
          className="h-7 rounded px-3 text-xs text-muted transition-colors hover:text-ink data-[state=on]:bg-brand data-[state=on]:text-white focus-visible:outline-2 focus-visible:outline-brand"
        >
          {o.label}
        </RadixToggleGroup.Item>
      ))}
    </RadixToggleGroup.Root>
  );
}
