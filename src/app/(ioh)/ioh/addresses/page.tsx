import type { Metadata } from "next";
import { NotAvailable } from "@/components/domain/not-available";

export const metadata: Metadata = { title: "Alamat" };

/**
 * The IOH sidebar carries an *Alamat* entry, but `/admin/addresses` is the MPX
 * delivery book and is scoped to the calling MPX — IOH has nothing to read
 * there. Rendered as a placeholder rather than a screen that 403s.
 */
export default function Page() {
  return (
    <NotAvailable
      title="Alamat"
      reason="Buku alamat pengiriman dikelola oleh masing-masing MPX."
    />
  );
}
