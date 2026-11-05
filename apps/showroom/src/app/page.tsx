import { Suspense } from "react";
import { CatalogView } from "@/features/card-catalog";

export default function CatalogPage() {
  return (
    // CatalogView 讀取 searchParams（篩選條件），在 Cache Components 下需包在 Suspense 內
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white" />}>
      <CatalogView />
    </Suspense>
  );
}
