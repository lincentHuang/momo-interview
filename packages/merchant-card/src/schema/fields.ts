/**
 * FieldDescriptor：與 UI 框架無關的「欄位描述」。
 *
 * 商品卡 variant 與 plugin 都用它宣告「可調整的欄位」，
 * Showroom 編輯器只需實作一個通用的 SchemaForm，就能自動為新 variant / 新 plugin 產生控制項。
 * → 新增 plugin 時不需要修改編輯器程式碼。
 */
export type FieldDescriptor =
  | { kind: "text"; key: string; label: string; maxLength?: number; placeholder?: string }
  | { kind: "number"; key: string; label: string; min?: number; max?: number; step?: number; unit?: string }
  | { kind: "boolean"; key: string; label: string }
  | { kind: "select"; key: string; label: string; options: ReadonlyArray<{ value: string; label: string }> }
  /** 以「距離現在 N 分鐘」編輯的絕對時間（epoch ms），跨分頁同步時語意一致 */
  | { kind: "countdown"; key: string; label: string; maxMinutes?: number };

export type FieldKind = FieldDescriptor["kind"];
