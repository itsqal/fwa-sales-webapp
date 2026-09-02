"use client";

import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { modelImage } from "@/components/domain/device-model-picker";
import { count } from "@/lib/format";
import { useAccountExecutive } from "../api/hooks";

/**
 * *Tentang AE* — who the stock is going to and what they are already holding.
 *
 * `Brand` renders `brandScope`, which is a capability of the person (`IM3`,
 * `3ID` or `HYBRID` — either), deliberately not a value in the brand reference
 * table: a physical SIM is one brand or the other. It is present and null when
 * not recorded, and the panel always shows the row, so "not recorded" stays
 * distinguishable from "not returned".
 */
export function AeSummaryPanel({ aeId }: { aeId: string | undefined }) {
  const query = useAccountExecutive(aeId);

  if (!aeId) {
    return (
      <div className="rounded-control bg-surface-muted px-5 py-6">
        <p className="text-sm text-text-primary">Tentang AE</p>
        <p className="mt-2 text-sm text-text-muted italic">
          Silakan pilih AE dahulu
        </p>
      </div>
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <div className="space-y-3 rounded-control bg-surface-muted px-5 py-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const ae = query.data;

  return (
    <div className="rounded-control bg-surface-muted p-5">
      <div className="flex items-center gap-3">
        <Avatar className="size-12">
          <AvatarImage src="/assets/avatars/avatar-placeholder-80.png" alt="" />
          <AvatarFallback>{initials(ae.fullName)}</AvatarFallback>
        </Avatar>
        <p className="font-display text-2xl font-semibold text-text-primary">
          {ae.fullName}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4 text-sm">
        <Field label="ID">{ae.aeCode}</Field>
        <Field label="Brand">{brandScopeLabel(ae.brandScope)}</Field>
        <Field label="Branch">{ae.region?.regionName ?? "—"}</Field>
      </div>

      <p className="mt-5 text-sm text-text-primary">Stok teralokasikan</p>
      <div className="mt-2 rounded-control bg-surface-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="px-4 py-3 text-left font-normal text-text-secondary">
                Tipe Modem
              </th>
              <th className="px-4 py-3 text-right font-normal text-text-secondary">
                Jumlah
              </th>
            </tr>
          </thead>
          <tbody>
            {(ae.allocatedStock ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="px-4 py-6 text-center text-text-muted"
                >
                  Belum ada stok teralokasikan.
                </td>
              </tr>
            )}
            {(ae.allocatedStock ?? []).map((line) => (
              <tr
                key={line.deviceModelCode}
                className="border-b border-border-subtle last:border-0"
              >
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted">
                      <Image
                        src={modelImage({})}
                        alt=""
                        width={22}
                        height={22}
                        className="size-5.5 object-contain"
                      />
                    </span>
                    <span className="text-text-primary">
                      {line.deviceModelCode}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-text-secondary">
                  {count(line.count)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm text-text-secondary">
        Total: {count(ae.allocatedTotal)} unit
      </p>
    </div>
  );
}

function brandScopeLabel(scope: string | null | undefined): string {
  if (!scope) return "Belum dicatat";
  return scope === "HYBRID" ? "Hybrid" : scope;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-text-secondary">{label}</p>
      <p className="mt-1 text-text-primary">{children}</p>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
