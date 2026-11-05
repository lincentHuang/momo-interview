import type { Metadata } from "next";
import { Suspense } from "react";
import { MomoHomeView } from "@/features/momo-home";

export const metadata: Metadata = { title: "momo 首頁情境 · Merchant Card Showroom" };

export default function MomoHomePage() {
  return (
    // MomoHomeView 讀取 searchParams（資料來源），在 Cache Components 下需包在 Suspense 內
    <Suspense fallback={<div className="mx-auto h-96 max-w-7xl animate-pulse rounded-xl bg-white" />}>
      <MomoHomeView />
    </Suspense>
  );
}
