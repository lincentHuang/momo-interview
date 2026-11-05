import type { Metadata } from "next";
import { VariantAnalysis } from "@/features/card-catalog";
import { PageHeader } from "@/shared/layout/page-header";

export const metadata: Metadata = { title: "類型分析 · Merchant Card Showroom" };

export default function AnalysisPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="商品卡類型分析"
        description="分析 momo 搜尋、分類、直播與排行榜頁面後，歸納出「業務型態（variant）」與「行銷附加資訊（plugin）」兩個正交維度。"
      />
      <VariantAnalysis />
    </div>
  );
}
