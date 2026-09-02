"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/domain/page-header";
import { DataTable } from "@/components/domain/data-table";
import { RowAction } from "@/components/domain/row-action";
import { useListState } from "@/hooks/use-list-state";
import type { DeliveryAddress } from "@/lib/api/types";
import { useAddresses } from "../api/hooks";
import { CreateAddressDialog } from "./create-address-dialog";
import { AddressDetailDialog } from "./address-detail-dialog";

/** *Alamat* — the MPX delivery book a device PO ships to. */
export function AddressesScreen() {
  const list = useListState();
  const query = useAddresses({ page: list.page, perPage: list.perPage });

  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<DeliveryAddress | null>(null);

  const columns = useMemo<ColumnDef<DeliveryAddress, unknown>[]>(
    () => [
      {
        id: "label",
        header: "Label",
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            {row.original.label}
            {row.original.isDefault && (
              <span className="rounded-full bg-hifi-tint px-2 py-0.5 text-xs text-hifi-magenta">
                Utama
              </span>
            )}
          </span>
        ),
      },
      {
        id: "recipient",
        header: "Penerima",
        cell: ({ row }) => row.original.recipientName,
      },
      {
        id: "phone",
        header: "Kontak Penerima",
        cell: ({ row }) => row.original.recipientPhone,
      },
      {
        id: "city",
        header: "Kota/Kab.",
        cell: ({ row }) => row.original.city,
      },
      {
        id: "province",
        header: "Provinsi",
        cell: ({ row }) => row.original.province,
      },
      {
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => (
          <RowAction
            tone="gold"
            label={`Lihat alamat ${row.original.label}`}
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
      <PageHeader title="Alamat" subtitle="Daftar alamat penerima pengiriman">
        <Button
          onClick={() => setCreating(true)}
          className="h-12 shrink-0 rounded-full bg-hifi-cta px-6 text-base hover:bg-hifi-magenta"
        >
          <Plus className="size-4" />
          Tambah baru
        </Button>
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
        emptyMessage="Belum ada alamat tersimpan."
        minWidth={720}
      />

      <CreateAddressDialog open={creating} onOpenChange={setCreating} />

      <AddressDetailDialog
        address={viewing ?? undefined}
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
      />
    </>
  );
}
