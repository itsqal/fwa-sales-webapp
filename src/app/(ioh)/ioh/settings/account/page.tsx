import type { Metadata } from "next";
import { NotAvailable } from "@/components/domain/not-available";

export const metadata: Metadata = { title: "Akun" };

export default function Page() {
  return <NotAvailable title="Akun" />;
}
