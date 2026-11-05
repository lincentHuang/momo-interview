"use client";

import { Accordion as RadixAccordion } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export const Accordion = RadixAccordion.Root;

export function AccordionItem({
  value,
  header,
  children,
  className,
}: { value: string; header: ReactNode; children: ReactNode } & Pick<ComponentProps<"div">, "className">) {
  return (
    <RadixAccordion.Item value={value} className={cn("rounded-lg border border-line bg-white", className)}>
      <RadixAccordion.Header className="flex items-center gap-3 px-3 py-2.5">{header}</RadixAccordion.Header>
      <RadixAccordion.Content className="border-t border-line px-3 py-3">{children}</RadixAccordion.Content>
    </RadixAccordion.Item>
  );
}

export const AccordionTrigger = RadixAccordion.Trigger;
