"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { PageMeta } from "@/lib/api/types";
import { TablePagination } from "./table-pagination";

/**
 * The list shell used by every screen.
 *
 * Pagination is always the server's — `page` / `perPage` — because a Device
 * Partner's PO list is twenty pages in the mockup and unbounded in production.
 * Nothing here fetches everything and slices.
 *
 * The mockups show a sort control on several column headers. The list endpoints
 * take no sort parameter, so sorting the visible page alone would order ten rows
 * out of two hundred and read as a lie; rows come back in the server's order.
 */
export function DataTable<T>({
  columns,
  data,
  meta,
  isLoading,
  emptyMessage = "Belum ada data.",
  page,
  perPage,
  onPageChange,
  onPerPageChange,
  minWidth = 900,
  /** For the few endpoints that return everything in one envelope. */
  paginated = true,
}: {
  columns: ColumnDef<T, any>[];
  data: T[];
  meta?: PageMeta;
  isLoading?: boolean;
  emptyMessage?: string;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  minWidth?: number;
  paginated?: boolean;
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: meta?.totalPages ?? -1,
  });

  return (
    <div className="rounded-card border border-border-subtle bg-surface-card">
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-sm"
          style={{ minWidth: `${minWidth}px` }}
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border-subtle">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-5 text-left font-normal text-text-secondary first:pl-6 last:pr-6"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: Math.min(perPage, 10) }).map((_, index) => (
                <tr key={index} className="border-b border-border-subtle">
                  {columns.map((_column, columnIndex) => (
                    <td
                      key={columnIndex}
                      className="px-4 py-5 first:pl-6 last:pr-6"
                    >
                      <Skeleton className="h-4 w-24" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-16 text-center text-text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}

            {!isLoading &&
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn("border-b border-border-subtle last:border-0")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-4 align-middle first:pl-6 last:pr-6"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {paginated && (
        <TablePagination
          page={page}
          perPage={perPage}
          totalPages={meta?.totalPages ?? 1}
          onPageChange={onPageChange}
          onPerPageChange={onPerPageChange}
        />
      )}
    </div>
  );
}
