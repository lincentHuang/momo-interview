import type { Metadata } from "next";
import { ModuleLibraryView } from "@/features/module-library";

export const metadata: Metadata = { title: "模組庫 · Merchant Card Showroom" };

export default function ModulesPage() {
  return <ModuleLibraryView />;
}
