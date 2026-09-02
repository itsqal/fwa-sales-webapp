"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { TablePagination } from "./table-pagination";

export interface MsisdnImeiRow {
  brandCode?: string;
  msisdn: string;
  imei?: string | null;
}

/**
 * The Brand / MSISDN / IMEI table. Five screens render it: the supply review,
 * the pairing staged list and review, the bundle attachment, and the MPX
 * *Detail IMEI & MSISDN* modal.
 *
 * These rows always arrive as one array — a PO's numbers, a validated batch —
 * so paging is local here. That is not a violation of the server-pagination
 * rule: the rule is about lists that grow without bound, and this is one PO's
 * fixed quantity that the operator is about to attest to.
 */
export function MsisdnImeiTable({
  rows,
  showImei = true,
  variant = "paginated",
  pageSize = 10,
  emptyMessage = "Belum ada nomor.",
  className,
}: {
  rows: MsisdnImeiRow[];
  showImei?: boolean;
  /** `scroll` is the staged list in step 1; `paginated` is the review in step 2. */
  variant?: "paginated" | "scroll";
  pageSize?: number;
  emptyMessage?: string;
  className?: string;
}) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(pageSize);

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  // Staging a batch shrinks the row count under the operator's feet; clamping
  // here rather than correcting after the fact means no render ever shows an
  // empty page that exists only for a frame.
  const currentPage = Math.min(page, totalPages);

  const visible = useMemo(() => {
    if (variant === "scroll") return rows;
    const start = (currentPage - 1) * perPage;
    return rows.slice(start, start + perPage);
  }, [rows, variant, currentPage, perPage]);

  const table = (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-border-subtle">
          <th className="px-4 py-3 text-left font-normal text-hifi-magenta">
            Brand
          </th>
          <th
            className={cn(
              "px-4 py-3 font-normal text-hifi-magenta",
              showImei ? "text-center" : "text-right",
            )}
          >
            MSISDN
          </th>
          {showImei && (
            <th className="px-4 py-3 text-right font-normal text-hifi-magenta">
              IMEI
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {visible.length === 0 && (
          <tr>
            <td
              colSpan={showImei ? 3 : 2}
              className="px-4 py-10 text-center text-text-muted"
            >
              {emptyMessage}
            </td>
          </tr>
        )}
        {visible.map((row) => (
          <tr
            key={`${row.msisdn}-${row.imei ?? ""}`}
            className="border-b border-border-subtle last:border-0"
          >
            <td className="px-4 py-3 text-text-secondary">
              {row.brandCode ?? "—"}
            </td>
            <td
              className={cn(
                "px-4 py-3 text-text-secondary",
                showImei ? "text-center" : "text-right",
              )}
            >
              {row.msisdn}
            </td>
            {showImei && (
              <td className="px-4 py-3 text-right text-text-secondary">
                {row.imei ?? "—"}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (variant === "scroll") {
    return (
      <div
        className={cn(
          "scroll-slim max-h-52 overflow-y-auto rounded-control border border-border-subtle",
          className,
        )}
      >
        {table}
      </div>
    );
  }

  return (
    <div className={className}>
      {table}
      {rows.length > perPage && (
        <TablePagination
          page={currentPage}
          perPage={perPage}
          totalPages={totalPages}
          onPageChange={setPage}
          onPerPageChange={(value) => {
            setPerPage(value);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
