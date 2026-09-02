"use client";

import Image from "next/image";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/domain/table-pagination";
import { modelImage } from "@/components/domain/device-model-picker";
import { cn } from "@/lib/utils";
import { count, dateShort, idr } from "@/lib/format";
import type { StockLine } from "@/lib/api/types";
import { useStockBundles } from "../api/hooks";

/**
 * Manual mode: the operator names the exact units.
 *
 * The first column is *Tgl. Terima* because that is the order automatic
 * allocation would take them in — someone picking by hand can see which units
 * they are jumping ahead of.
 */
export function ManualBundlePicker({
  line,
  price,
  /** Scoped to this model, so its own count is just the set's size. */
  selected,
  onToggle,
  onToggleMany,
}: {
  line: StockLine;
  price: number | null | undefined;
  selected: Set<string>;
  onToggle: (msisdn: string) => void;
  onToggleMany: (msisdns: string[], checked: boolean) => void;
}) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const query = useStockBundles({
    page,
    perPage,
    deviceModelId: line.deviceModelId,
  });

  const rows = query.data?.data ?? [];
  const pageMsisdns = rows.map((row) => row.msisdn);
  const allOnPageSelected =
    pageMsisdns.length > 0 &&
    pageMsisdns.every((msisdn) => selected.has(msisdn));

  const chosen = pageMsisdns.filter((msisdn) => selected.has(msisdn)).length;

  return (
    <div
      className={cn(
        "rounded-control border p-4",
        chosen > 0
          ? "border-hifi-magenta bg-hifi-tint"
          : "border-border-subtle bg-surface-card",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-card">
          <Image
            src={modelImage({})}
            alt=""
            width={26}
            height={26}
            className="size-6.5 object-contain"
          />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span
            className={cn(
              "block truncate text-sm font-medium",
              chosen > 0 ? "text-hifi-magenta" : "text-text-primary",
            )}
          >
            {line.deviceModelCode}
          </span>
          <span className="block text-xs text-text-secondary">
            {idr(price)}
          </span>
        </span>
        <span className="shrink-0 text-right text-xs">
          <span className="block rounded-full bg-surface-card px-3 py-1 text-hifi-gold">
            Terpilih {count(selected.size)}
          </span>
          <span className="mt-1 block rounded-full bg-surface-muted px-3 py-1 text-text-secondary">
            Stok {count(line.available)}
          </span>
        </span>
      </div>

      <div className="mt-4 rounded-control bg-surface-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="w-10 px-3 py-3">
                <Checkbox
                  aria-label="Pilih semua di halaman ini"
                  checked={allOnPageSelected}
                  onCheckedChange={(value) =>
                    onToggleMany(pageMsisdns, value === true)
                  }
                />
              </th>
              <th className="px-3 py-3 text-left font-normal text-hifi-magenta">
                Tgl. Terima
              </th>
              <th className="px-3 py-3 text-left font-normal text-hifi-magenta">
                Brand
              </th>
              <th className="px-3 py-3 text-left font-normal text-hifi-magenta">
                MSISDN
              </th>
              <th className="px-3 py-3 text-right font-normal text-hifi-magenta">
                IMEI
              </th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading &&
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-b border-border-subtle">
                  <td colSpan={5} className="px-3 py-3">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))}

            {!query.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-text-muted">
                  Tidak ada unit tersedia.
                </td>
              </tr>
            )}

            {!query.isLoading &&
              rows.map((row) => (
                <tr
                  key={row.msisdn}
                  className="border-b border-border-subtle last:border-0"
                >
                  <td className="px-3 py-3">
                    <Checkbox
                      aria-label={`Pilih ${row.msisdn}`}
                      checked={selected.has(row.msisdn)}
                      onCheckedChange={() => onToggle(row.msisdn)}
                    />
                  </td>
                  <td className="px-3 py-3 text-text-secondary">
                    {dateShort(row.receivedAt)}
                  </td>
                  <td className="px-3 py-3 text-text-secondary">
                    {row.brandCode ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-text-secondary">
                    {row.msisdn}
                  </td>
                  <td className="px-3 py-3 text-right text-text-secondary">
                    {row.imei ?? "—"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {(query.data?.meta?.totalPages ?? 1) > 1 && (
          <TablePagination
            page={page}
            perPage={perPage}
            totalPages={query.data?.meta?.totalPages ?? 1}
            onPageChange={setPage}
            onPerPageChange={(value) => {
              setPerPage(value);
              setPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}

