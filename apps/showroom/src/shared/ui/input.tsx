import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/cn";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-md border border-line bg-white px-3 text-sm placeholder:text-muted",
        "focus-visible:outline-2 focus-visible:outline-brand aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}
