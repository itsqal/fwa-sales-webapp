"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/domain/page-header";
import { DataTable } from "@/components/domain/data-table";
import { SearchFilterBar } from "@/components/domain/search-filter-bar";
import { RowAction } from "@/components/domain/row-action";
import { useListState } from "@/hooks/use-list-state";
import type { AdminAccountExecutive } from "@/lib/api/types";
import { useAccountExecutives } from "../api/hooks";
import { AeSummaryPanel } from "./ae-summary-panel";

/**
 * *Account Executive* — the salesmen drawing stock from this MPX.
 *
 * A list only, per the brief. The allocation modal already needed this data, so
 * showing it on its own screen costs nothing and answers "who can I allocate
 * to, and what are they holding" without opening the allocation flow.
 */
export function AccountExecutivesScreen() {
  const list = useListState();
  const query = useAccountExecutives({
    page: list.page,
    perPage: list.perPage,
    q: list.q || undefined,
  });

  const [viewing, setViewing] = useState<AdminAccountExecutive | null>(null);

  const columns = useMemo<ColumnDef<AdminAccountExecutive, unknown>[]>(
    () => [
      {
        id: "aeCode",
        header: "ID",
        cell: ({ row }) => row.original.aeCode,
      },
      {
        id: "fullName",
        header: "Nama",
        cell: ({ row }) => row.original.fullName,
      },
      {
        id: "brand",
        header: "Brand",
        cell: ({ row }) =>
          row.original.brandScope === "HYBRID"
            ? "Hybrid"
            : (row.original.brandScope ?? "Belum dicatat"),
      },
      {
        id: "branch",
        header: "Branch",
        cell: ({ row }) => row.original.region?.regionName ?? "—",
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => statusLabel(row.original.status),
      },
      {
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => (
          <RowAction
            tone="gold"
            label={`Lihat ${row.original.fullName}`}
            onClick={() => setViewing(row.original)}
          >
            <Eye className="size-4" />
          </RowAction>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Account Executive"
        subtitle="Daftar AE yang mengambil stok dari MPX ini"
      >
        <SearchFilterBar
          placeholder="Cari ID atau nama AE"
          value={list.q}
          onChange={list.setQ}
        />
      </PageHeader>

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        meta={query.data?.meta}
        isLoading={query.isLoading}
        page={list.page}
        perPage={list.perPage}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="Belum ada AE terdaftar pada MPX ini."
        minWidth={720}
      />

      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
      >
        <DialogContent className="max-h-[90vh] w-full gap-0 overflow-y-auto rounded-card p-8 sm:max-w-lg">
          <DialogTitle className="font-display text-3xl font-semibold text-hifi-magenta">
            Tentang AE
          </DialogTitle>
          <DialogDescription className="sr-only">
            Profil dan stok teralokasikan.
          </DialogDescription>
          <div className="mt-6">
            <AeSummaryPanel aeId={viewing?.aeId} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** AE account states, not a PO status — deliberately not in `lib/status.ts`. */
function statusLabel(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Aktif";
    case "SUSPENDED":
      return "Ditangguhkan";
    case "INACTIVE":
      return "Nonaktif";
    default:
      return status;
  }
}
