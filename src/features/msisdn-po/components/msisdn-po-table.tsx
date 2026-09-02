"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Eye, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/domain/data-table";
import { StatusBadge } from "@/components/domain/status-badge";
import { RowAction } from "@/components/domain/row-action";
import { count, dateId, truncateMiddle } from "@/lib/format";
import { msisdnPo as gate } from "@/lib/status";
import type { MsisdnPo, PageMeta } from "@/lib/api/types";
import { downloadMsisdnPoNumbers } from "../api/hooks";

export type MsisdnPoView = "dp" | "ioh";

/**
 * One table, two roles. The Device Partner sees its own requests and acts on the
 * numbers it has been given; IOH sees every partner's and acts on the request
 * itself. Same records, same status machine, so the same component.
 */
export function MsisdnPoTable({
  view,
  rows,
  meta,
  isLoading,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
  onViewNumbers,
  onPair,
  onSupply,
  onReject,
}: {
  view: MsisdnPoView;
  rows: MsisdnPo[];
  meta?: PageMeta;
  isLoading: boolean;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onViewNumbers?: (po: MsisdnPo) => void;
  onPair?: (po: MsisdnPo) => void;
  onSupply?: (po: MsisdnPo) => void;
  onReject?: (po: MsisdnPo) => void;
}) {
  const columns = useMemo<ColumnDef<MsisdnPo, unknown>[]>(() => {
    const shared: ColumnDef<MsisdnPo, unknown>[] = [
      {
        id: "submittedAt",
        header: "Tanggal PO",
        cell: ({ row }) => dateId(row.original.submittedAt),
      },
      {
        id: "poCode",
        header: view === "dp" ? "Kode PO" : "Nomor PO",
        cell: ({ row }) => (
          <Link
            href={`${basePath(view)}/${row.original.msisdnPoId}`}
            title={row.original.poCode}
            className="text-text-primary transition-colors hover:text-hifi-magenta"
          >
            {truncateMiddle(row.original.poCode, 22)}
          </Link>
        ),
      },
    ];

    if (view === "ioh") {
      shared.push({
        id: "devicePartner",
        header: "Device Partner",
        cell: ({ row }) => row.original.devicePartner?.name ?? "—",
      });
    }

    shared.push(
      {
        id: "callPlan",
        header: "Call Plan",
        cell: ({ row }) => row.original.callPlan?.name ?? "—",
      },
      {
        id: "brand",
        header: "Brand",
        cell: ({ row }) => row.original.brand?.displayName ?? "—",
      },
      {
        id: "qty",
        header: "Jml.",
        cell: ({ row }) => count(row.original.qtyRequested),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    );

    if (view === "dp") {
      shared.push(
        {
          id: "msisdn",
          header: "MSISDN",
          cell: ({ row }) => {
            const po = row.original;
            const ready = gate.hasNumbers(po.status);
            return (
              <div className="flex items-center gap-2">
                <RowAction
                  label={`Unduh MSISDN ${po.poCode}`}
                  disabled={!ready}
                  onClick={() => {
                    void downloadMsisdnPoNumbers(po.msisdnPoId, po.poCode).catch(
                      () => toast.error("Gagal mengunduh daftar MSISDN."),
                    );
                  }}
                >
                  <Download className="size-4" />
                </RowAction>
                <RowAction
                  tone="gold"
                  label={`Lihat MSISDN ${po.poCode}`}
                  disabled={!ready}
                  onClick={() => onViewNumbers?.(po)}
                >
                  <Eye className="size-4" />
                </RowAction>
              </div>
            );
          },
        },
        {
          id: "pairing",
          header: "Pairing",
          cell: ({ row }) => {
            const po = row.original;
            return (
              <RowAction
                tone="gold"
                label={`Pairing ${po.poCode}`}
                disabled={!gate.canPair(po.status)}
                onClick={() => onPair?.(po)}
              >
                <Pencil className="size-4" />
              </RowAction>
            );
          },
        },
      );
    } else {
      shared.push({
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => {
          const po = row.original;
          return (
            <div className="flex items-center gap-2">
              <RowAction
                tone="gold"
                label={`Sediakan MSISDN untuk ${po.poCode}`}
                disabled={!gate.canSupply(po.status)}
                onClick={() => onSupply?.(po)}
              >
                <Pencil className="size-4" />
              </RowAction>
              <RowAction
                label={`Tolak ${po.poCode}`}
                disabled={!gate.canReject(po.status)}
                onClick={() => onReject?.(po)}
                className="bg-status-ditolak hover:brightness-95"
              >
                <X className="size-4" />
              </RowAction>
            </div>
          );
        },
      });
    }

    return shared;
  }, [view, onViewNumbers, onPair, onSupply, onReject]);

  return (
    <DataTable
      columns={columns}
      data={rows}
      meta={meta}
      isLoading={isLoading}
      page={page}
      perPage={perPage}
      onPageChange={onPageChange}
      onPerPageChange={onPerPageChange}
      emptyMessage="Belum ada PO MSISDN."
    />
  );
}

function basePath(view: MsisdnPoView): string {
  return view === "dp" ? "/dp/msisdn-po" : "/ioh/purchase-order";
}
