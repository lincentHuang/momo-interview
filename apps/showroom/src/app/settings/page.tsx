import type { Metadata } from "next";
import { SettingsView } from "@/features/settings";

export const metadata: Metadata = { title: "設定與同步 · Merchant Card Showroom" };

export default function SettingsPage() {
  return <SettingsView />;
}
