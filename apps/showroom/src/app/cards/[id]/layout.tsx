import { createFixtures } from "@momo/merchant-card";
import { Suspense } from "react";
import { EditorShell } from "@/features/card-editor";

/** 種子卡片在 build 時預先產生靜態殼（設計與檢視器兩個子頁共用）；卡片內容來自瀏覽器端 Store */
export function generateStaticParams() {
  return createFixtures(0).map((card) => ({ id: card.id }));
}

/**
 * Cache Components：params 屬於 URL 資料，必須在 Suspense 內才 await，
 * 讓 App Shell（sidebar）可立即呈現，導覽不被阻塞。
 */
export default function CardLayout({ children, params }: LayoutProps<"/cards/[id]">) {
  return (
    <Suspense fallback={<div className="h-[600px] animate-pulse rounded-xl bg-white" />}>
      <EditorRoute params={params}>{children}</EditorRoute>
    </Suspense>
  );
}

async function EditorRoute({ params, children }: Pick<LayoutProps<"/cards/[id]">, "params" | "children">) {
  const { id } = await params;
  return <EditorShell id={decodeURIComponent(id)}>{children}</EditorShell>;
}
