import type { Metadata } from "next";
import { AppHeader } from "@/shared/layout/app-header";
import { TooltipProvider } from "@/shared/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Merchant Card Showroom",
  description: "momo 商品卡展示、調整與跨宿主嵌入示範",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant-TW" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <TooltipProvider>
          <AppHeader />
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        </TooltipProvider>
      </body>
    </html>
  );
}
