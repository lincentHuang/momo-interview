"use client";

import { BASE_FIELDS, CARD_VARIANTS, switchVariant, VARIANTS, type Card, type CardVariant } from "@momo/merchant-card";
import { Label, Select } from "@/shared/ui";
import { setField, type FieldIssues } from "../lib/draft";
import { SchemaForm } from "./schema-form";

type Draft = Record<string, unknown>;

const VARIANT_OPTIONS = CARD_VARIANTS.map((v) => ({ value: v, label: VARIANTS[v].label }));

export function ContentPanel({
  draft,
  issues,
  onUpdate,
}: {
  draft: Draft;
  issues: FieldIssues;
  onUpdate: (fn: (d: Draft) => Draft) => void;
}) {
  const variant = draft.variant as CardVariant;
  const definition = VARIANTS[variant];
  const onField = (key: string, value: unknown) => onUpdate((d) => setField(d, key, value));

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="variant">卡片類型</Label>
        <Select
          id="variant"
          value={variant}
          options={VARIANT_OPTIONS}
          onValueChange={(next) => onUpdate((d) => switchVariant(d as unknown as Card, next as CardVariant) as unknown as Draft)}
        />
        <p className="text-xs text-muted">出現於：{definition.foundIn}</p>
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-semibold">基本資訊</legend>
        <SchemaForm fields={BASE_FIELDS} values={draft} issues={issues} onChange={onField} />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-semibold">{definition.label}專屬</legend>
        <SchemaForm fields={definition.fields} values={draft} issues={issues} onChange={onField} />
      </fieldset>
    </div>
  );
}
