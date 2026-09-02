import { Construction } from "lucide-react";
import { PageHeader } from "./page-header";

/**
 * The menus that have no screen yet — Beranda, Alamat for IOH, Akun, Umum.
 *
 * They are rendered in the sidebar on purpose: users were told to expect them
 * during core-feature development. They land here rather than 404, so a missing
 * screen reads as "not yet" instead of "you took a wrong turn".
 */
export function NotAvailable({
  title,
  reason,
}: {
  title: string;
  reason?: string;
}) {
  return (
    <>
      <PageHeader title={title} />
      <div className="flex flex-col items-center gap-3 rounded-card border border-border-subtle bg-surface-card px-6 py-20 text-center">
        <Construction className="size-8 text-text-muted" />
        <p className="text-lg font-medium text-text-primary">Belum tersedia</p>
        <p className="max-w-sm text-sm text-text-secondary">
          {reason ?? "Halaman ini belum dibuat pada versi ini."}
        </p>
      </div>
    </>
  );
}
