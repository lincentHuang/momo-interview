"use client";

import { Select as RadixSelect } from "radix-ui";
import { cn } from "@/shared/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  id?: string;
  value: string;
  options: ReadonlyArray<SelectOption>;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
}

export function Select({ id, value, options, onValueChange, placeholder, className, ...aria }: SelectProps) {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange}>
      <RadixSelect.Trigger
        id={id}
        aria-invalid={aria["aria-invalid"]}
        className={cn(
          "inline-flex h-9 w-full items-center justify-between rounded-md border border-line bg-white px-3 text-sm",
          "data-[placeholder]:text-muted focus-visible:outline-2 focus-visible:outline-brand aria-invalid:border-danger",
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon className="text-muted">▾</RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-line bg-white shadow-lg"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((o) => (
              <RadixSelect.Item
                key={o.value}
                value={o.value}
                className="relative flex h-8 cursor-pointer select-none items-center rounded px-7 text-sm outline-none data-[highlighted]:bg-brand-soft data-[highlighted]:text-brand"
              >
                <RadixSelect.ItemIndicator className="absolute left-2">✓</RadixSelect.ItemIndicator>
                <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
