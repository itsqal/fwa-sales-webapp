import type { Metadata } from "next";
import { NotAvailable } from "@/components/domain/not-available";

export const metadata: Metadata = { title: "Umum" };

export default function Page() {
  return <NotAvailable title="Umum" />;
}
