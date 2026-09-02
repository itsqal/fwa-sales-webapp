import type { Metadata } from "next";
import { StockScreen } from "@/features/stock-allocation";

export const metadata: Metadata = { title: "Stok Tersedia" };

export default function Page() {
  return <StockScreen />;
}
