"use client";

import type { CardRecord } from "@momo/merchant-card";
import type { FieldIssues } from "../lib/draft";

export function JsonInspector({ draft, record, issues }: { draft: unknown; record: CardRecord; issues: FieldIssues }) {
  const issueList = Object.entries(issues);
  return (
    <div className="space-y-3">
      <div className={issueList.length ? "rounded-md bg-red-50 p-3 text-xs text-danger" : "rounded-md bg-emerald-50 p-3 text-xs text-emerald-700"}>
        {issueList.length ? (
          <>
            <p className="font-medium">Schema 驗證失敗（未寫入、未廣播）</p>
            <ul className="mt-1 list-inside list-disc">
              {issueList.map(([path, msg]) => (
                <li key={path}>
                  <code>{path}</code>：{msg}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>✓ 通過 Schema 驗證，已同步到所有宿主</p>
        )}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-xs">
        <Meta label="rev" value={record.rev} />
        <Meta label="最後寫入" value={new Date(record.updatedAt).toLocaleTimeString("zh-TW")} />
        <Meta label="寫入來源" value={record.origin.slice(0, 8)} />
      </dl>
      <pre className="max-h-[420px] overflow-auto rounded-md bg-ink p-3 font-mono text-[11px] leading-relaxed text-white">
        {JSON.stringify({ card: draft, state: record.state }, (k, v) => (k === "imageUrl" ? `${String(v).slice(0, 40)}…` : v), 2)}
      </pre>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-surface-muted p-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono text-ink">{value}</dd>
    </div>
  );
}
