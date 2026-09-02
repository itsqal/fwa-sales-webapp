import type { Metadata } from "next";
import { NotAvailable } from "@/components/domain/not-available";

export const metadata: Metadata = { title: "Beranda" };

/** Reporting and analytics are out of scope for v1; Beranda is a stub. */
export default function Page() {
  return (
    <NotAvailable
      title="Beranda"
      reason="Ringkasan dan laporan belum termasuk dalam versi ini."
    />
  );
}
