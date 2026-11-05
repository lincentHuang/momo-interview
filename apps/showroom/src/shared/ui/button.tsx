import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/cn";

const variants = {
  primary: "bg-brand text-white hover:bg-brand-strong",
  secondary: "bg-white text-ink border border-line hover:border-brand hover:text-brand",
  ghost: "text-muted hover:bg-surface-muted hover:text-ink",
} as const;

const sizes = { sm: "h-8 px-3 text-xs", md: "h-9 px-4 text-sm" } as const;

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** 以 Radix Slot 將樣式套到子元素（例如 next/link） */
  asChild?: boolean;
}

export function Button({ variant = "secondary", size = "md", asChild, className, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
