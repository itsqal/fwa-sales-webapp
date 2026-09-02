import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Halaman tidak ditemukan" };

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-6xl font-semibold text-hifi-magenta">404</p>
      <h1 className="text-xl font-medium">Halaman ini tidak ada</h1>
      <p className="max-w-md text-sm text-text-secondary">
        Tautan mungkin sudah berubah, atau PO yang Anda cari telah dihapus.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-hifi-magenta px-6 py-2.5 text-sm text-white transition-colors hover:bg-hifi-cta"
      >
        Kembali ke dasbor
      </Link>
    </main>
  );
}
