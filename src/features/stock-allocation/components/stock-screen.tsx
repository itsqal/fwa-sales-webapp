"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/domain/page-header";
import { DataTable } from "@/components/domain/data-table";
import { modelImage } from "@/components/domain/device-model-picker";
import { useListState } from "@/hooks/use-list-state";
import { count, dateId, idr } from "@/lib/format";
import type { Allocation, StockLine } from "@/lib/api/types";
import { useDeviceModels } from "@/features/reference/api/hooks";
import { useAllocations, useStockSummary } from "../api/hooks";
import { AllocateStockDialog } from "./allocate-stock-dialog";

/**
 * *Stok Tersedia*.
 *
 * The three columns are defined by the contract, because the mockup's were
 * arithmetically impossible — available 20 + allocated 21 = total 10 (issue #5):
 *
 * * *Jml. Tersedia* — received and not yet allocated
 * * *Jml. Dialokasikan* — allocated and not yet activated
 * * *Total* — the two added, everything this MPX still holds
 *
 * An activated unit has been sold to a customer and leaves all three.
 *
 * The mockup also carried an *Alokasi AE* column of avatars. Stock is reported
 * per model and carries no AE, so that column cannot be filled honestly; the
 * allocation log below the table answers the same question — who received what,
 * and when — from `GET /admin/allocations`.
 */
export function StockScreen() {
  const stock = useStockSummary();
  const models = useDeviceModels();
  const [allocating, setAllocating] = useState(false);

  const log = useListState();
  const allocations = useAllocations({ page: log.page, perPage: log.perPage });

  const stockColumns = useMemo<ColumnDef<StockLine, unknown>[]>(
    () => [
      {
        id: "model",
        header: "Tipe Modem",
        cell: ({ row }) => {
          const price = models.data?.data.find(
            (model) => model.deviceModelId === row.original.deviceModelId,
          )?.listPriceIdr;
          return (
            <span className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted">
                <Image
                  src={modelImage({})}
                  alt=""
                  width={26}
                  height={26}
                  className="size-6.5 object-contain"
                />
              </span>
              <span className="leading-tight">
                <span className="block text-text-primary">
                  {row.original.deviceModelCode ?? "—"}
                </span>
                <span className="block text-xs text-text-secondary">
                  {idr(price)}
                </span>
              </span>
            </span>
          );
        },
      },
      {
        id: "available",
        header: "Jml. Tersedia",
        cell: ({ row }) => count(row.original.available),
      },
      {
        id: "allocated",
        header: "Jml. Dialokasikan",
        cell: ({ row }) => count(row.original.allocated),
      },
      {
        id: "total",
        header: "Total",
        cell: ({ row }) => count(row.original.total),
      },
    ],
    [models.data],
  );

  const allocationColumns = useMemo<ColumnDef<Allocation, unknown>[]>(
    () => [
      {
        id: "allocatedAt",
        header: "Tanggal",
        cell: ({ row }) => dateId(row.original.allocatedAt),
      },
      {
        id: "ae",
        header: "Account Executive",
        cell: ({ row }) => row.original.aeCode ?? "—",
      },
      {
        id: "mode",
        header: "Metode",
        cell: ({ row }) =>
          row.original.mode === "AUTO" ? "Otomatis" : "Manual",
      },
      {
        id: "qty",
        header: "Jml.",
        cell: ({ row }) => count(row.original.qty),
      },
      {
        id: "by",
        header: "Oleh",
        cell: ({ row }) => row.original.allocatedBy ?? "—",
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Stok Tersedia"
        subtitle="Tinjau dan alokasikan stok modem ke AE"
      >
        <Button
          onClick={() => setAllocating(true)}
          className="h-12 shrink-0 rounded-full bg-hifi-cta px-6 text-base hover:bg-hifi-magenta"
        >
          <Plus className="size-4" />
          Alokasi Baru
        </Button>
      </PageHeader>

      <DataTable
        columns={stockColumns}
        data={stock.data?.data ?? []}
        isLoading={stock.isLoading}
        page={1}
        perPage={10}
        onPageChange={() => undefined}
        onPerPageChange={() => undefined}
        emptyMessage="Belum ada stok yang diterima."
        minWidth={720}
        /* `/admin/stock` returns every model in one envelope — there is nothing
         * to page through, and a per-page control that changes nothing is worse
         * than none. */
        paginated={false}
      />

      <section className="mt-8">
        <h2 className="font-display mb-3 text-xl font-semibold text-text-primary">
          Riwayat Alokasi
        </h2>
        <DataTable
          columns={allocationColumns}
          data={allocations.data?.data ?? []}
          meta={allocations.data?.meta}
          isLoading={allocations.isLoading}
          page={log.page}
          perPage={log.perPage}
          onPageChange={log.setPage}
          onPerPageChange={log.setPerPage}
          emptyMessage="Belum ada alokasi."
          minWidth={720}
        />
      </section>

      <AllocateStockDialog open={allocating} onOpenChange={setAllocating} />
    </>
  );
}
