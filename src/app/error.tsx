"use client";

import { useEffect } from "react";

/**
 * The last line of defence. It never shows the underlying message: these
 * screens are read by three external companies and a stack trace can name a
 * counterparty's record.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-4xl font-semibold text-hifi-magenta">
        Terjadi kesalahan
      </p>
      <p className="max-w-md text-sm text-text-secondary">
        Halaman ini gagal dimuat. Coba lagi; jika terus berulang, hubungi IOH HQ
        dengan menyebutkan kode berikut.
      </p>
      {error.digest && (
        <code className="rounded-control bg-surface-muted px-3 py-1.5 text-xs text-text-secondary">
          {error.digest}
        </code>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-full bg-hifi-magenta px-6 py-2.5 text-sm text-white transition-colors hover:bg-hifi-cta"
      >
        Coba lagi
      </button>
    </main>
  );
}
