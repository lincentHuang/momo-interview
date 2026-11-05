"use client";

import type { FieldDescriptor } from "@momo/merchant-card";
import type { FieldIssues } from "../lib/draft";
import { FieldControl } from "./field-control";

export interface SchemaFormProps {
  fields: ReadonlyArray<FieldDescriptor>;
  values: Record<string, unknown>;
  issues: FieldIssues;
  /** issue key 前綴，例如 plugin 的 `extensions.coupon.` */
  issuePrefix?: string;
  onChange: (key: string, value: unknown) => void;
}

/** 通用表單：variant 欄位與 plugin 欄位都用它渲染 → 新增 plugin 不需改編輯器 */
export function SchemaForm({ fields, values, issues, issuePrefix = "", onChange }: SchemaFormProps) {
  if (fields.length === 0) return <p className="text-xs text-muted">沒有可調整的欄位</p>;
  return (
    <div className="grid gap-4">
      {fields.map((field) => (
        <FieldControl
          key={field.key}
          field={field}
          value={values[field.key]}
          error={issues[`${issuePrefix}${field.key}`]}
          onChange={(v) => onChange(field.key, v)}
        />
      ))}
    </div>
  );
}
