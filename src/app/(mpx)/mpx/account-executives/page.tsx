import type { Metadata } from "next";
import { AccountExecutivesScreen } from "@/features/stock-allocation";

export const metadata: Metadata = { title: "Account Executive" };

export default function Page() {
  return <AccountExecutivesScreen />;
}
