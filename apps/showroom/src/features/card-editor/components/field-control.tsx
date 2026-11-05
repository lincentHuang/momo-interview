"use client";

import type { FieldDescriptor } from "@momo/merchant-card";
import { useId } from "react";
import { Input, Label, Select, Slider, Switch } from "@/shared/ui";
import { useNow } from "../hooks/use-now";

export interface FieldControlProps {
  field: FieldDescriptor;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}

/**
 * FieldDescriptor → Radix 控制項。
 * 新增欄位種類時：在 @momo/merchant-card 的 FieldDescriptor 加一個 kind，TS 會在這裡的 switch 報錯提醒補上。
 */
export function FieldControl({ field, value, error, onChange }: FieldControlProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const invalid = Boolean(error);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{field.label}</Label>
        {field.kind === "boolean" && (
          <Switch id={id} checked={Boolean(value)} onCheckedChange={onChange} aria-invalid={invalid} />
        )}
      </div>
      <Control field={field} id={id} value={value} invalid={invalid} errorId={errorId} onChange={onChange} />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Control({
  field,
  id,
  value,
  invalid,
  errorId,
  onChange,
}: { field: FieldDescriptor; id: string; value: unknown; invalid: boolean; errorId: string; onChange: (v: unknown) => void }) {
  const a11y = { "aria-invalid": invalid, "aria-describedby": invalid ? errorId : undefined };

  switch (field.kind) {
    case "text":
      return (
        <Input
          id={id}
          value={typeof value === "string" ? value : ""}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
          {...a11y}
        />
      );
    case "number":
      return (
        <div className="flex items-center gap-2">
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            value={typeof value === "number" && !Number.isNaN(value) ? value : ""}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
            {...a11y}
          />
          {field.unit && <span className="shrink-0 text-xs text-muted">{field.unit}</span>}
        </div>
      );
    case "boolean":
      return null; // 已在 label 列渲染
    case "select":
      return (
        <Select id={id} value={typeof value === "string" ? value : ""} options={field.options} onValueChange={onChange} aria-invalid={invalid} />
      );
    case "countdown":
      return <CountdownControl id={id} value={value} maxMinutes={field.maxMinutes ?? 24 * 60} label={field.label} onChange={onChange} />;
    default: {
      const exhaustive: never = field;
      return exhaustive;
    }
  }
}

function CountdownControl({
  id,
  value,
  maxMinutes,
  label,
  onChange,
}: { id: string; value: unknown; maxMinutes: number; label: string; onChange: (v: unknown) => void }) {
  const now = useNow(1000);
  const endsAt = typeof value === "number" ? value : now;
  const minutes = Math.max(0, Math.round((endsAt - now) / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return (
    <div className="space-y-2">
      <Slider id={id} aria-label={label} value={minutes} min={0} max={maxMinutes} step={5} onValueChange={(min) => onChange(Date.now() + min * 60_000)} />
      <p className="text-xs text-muted">{minutes === 0 ? "已結束（卡片呈現結束狀態）" : `還剩 ${h} 小時 ${m} 分`}</p>
    </div>
  );
}
