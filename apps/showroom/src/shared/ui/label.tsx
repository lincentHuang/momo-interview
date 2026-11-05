"use client";

import { Label as RadixLabel } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/cn";

export function Label({ className, ...props }: ComponentProps<typeof RadixLabel.Root>) {
  return <RadixLabel.Root className={cn("text-xs font-medium text-muted", className)} {...props} />;
}
