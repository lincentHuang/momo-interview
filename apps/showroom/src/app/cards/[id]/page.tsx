import { createFixtures } from "@momo/merchant-card";
import { Suspense } from "react";
import { CardEditorView } from "@/features/card-editor";

/** 種子卡片在 build 時預先產生靜態殼；卡片內容來自瀏覽器端 Store */
export function generateStaticParams() {
  return createFixtures(0).map((card) => ({ id: card.id }));
}

/**
 * Cache Components：params 屬於 URL 資料，必須在 Suspense 內才 await，
 * 讓頁面殼（header / skeleton）可立即呈現，導覽不被阻塞。
 */
export default function CardEditorPage({ params }: PageProps<"/cards/[id]">) {
  return (
    <Suspense fallback={<div className="h-[600px] animate-pulse rounded-xl bg-white" />}>
      <EditorRoute params={params} />
    </Suspense>
  );
}

async function EditorRoute({ params }: Pick<PageProps<"/cards/[id]">, "params">) {
  const { id } = await params;
  return <CardEditorView id={decodeURIComponent(id)} />;
}
