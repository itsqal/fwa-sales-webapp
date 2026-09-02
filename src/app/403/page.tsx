import Link from "next/link";
import type { Metadata } from "next";
import { getMe, homePathFor } from "@/lib/api/server";

export const metadata: Metadata = { title: "Akses ditolak" };

export default async function ForbiddenPage() {
  const me = await getMe();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-6xl font-semibold text-hifi-magenta">403</p>
      <h1 className="text-xl font-medium">Halaman ini bukan untuk peran Anda</h1>
      <p className="max-w-md text-sm text-text-secondary">
        Setiap perusahaan hanya melihat catatannya sendiri. Jika Anda merasa ini
        keliru, hubungi IOH HQ.
      </p>
      {me && (
        <Link
          href={homePathFor(me.role)}
          className="mt-2 rounded-full bg-hifi-magenta px-6 py-2.5 text-sm text-white transition-colors hover:bg-hifi-cta"
        >
          Kembali ke dasbor
        </Link>
      )}
    </main>
  );
}
