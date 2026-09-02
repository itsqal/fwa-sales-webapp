"use client";

import Image from "next/image";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, FileText, Pencil, Truck } from "lucide-react";
import { DataTable } from "@/components/domain/data-table";
import { StatusBadge } from "@/components/domain/status-badge";
import { RowAction } from "@/components/domain/row-action";
import { modelImage } from "@/components/domain/device-model-picker";
import { count, dateId, idr, truncateMiddle } from "@/lib/format";
import { devicePo as gate } from "@/lib/status";
import type { DevicePo, PageMeta } from "@/lib/api/types";

export type DevicePoView = "mpx" | "dp";

/**
 * *Manajemen PO* — the same order seen by the MPX that raised it and the Device
 * Partner that fulfils it.
 *
 * The mockups put a select-all checkbox on the MPX list. Nothing in the contract
 * accepts more than one order at a time, so a bulk column would select rows and
 * then do nothing (issue #17); it is left out until a bulk action exists.
 */
export function DevicePoTable({
  view,
  rows,
  meta,
  isLoading,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
  onOpenDetail,
  onAttachBundles,
  onShip,
  onTrack,
}: {
  view: DevicePoView;
  rows: DevicePo[];
  meta?: PageMeta;
  isLoading: boolean;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onOpenDetail: (po: DevicePo) => void;
  onAttachBundles?: (po: DevicePo) => void;
  onShip?: (po: DevicePo) => void;
  onTrack?: (po: DevicePo) => void;
}) {
  const columns = useMemo<ColumnDef<DevicePo, unknown>[]>(() => {
    const list: ColumnDef<DevicePo, unknown>[] = [
      {
        id: "submittedAt",
        header: "Tanggal PO",
        cell: ({ row }) => dateId(row.original.submittedAt),
      },
    ];

    if (view === "dp") {
      list.push({
        id: "poCode",
        header: "Kode PO",
        cell: ({ row }) => (
          <span title={row.original.poCode}>
            {truncateMiddle(row.original.poCode, 20)}
          </span>
        ),
      });
    }

    list.push({
      id: "model",
      header: "Tipe Modem",
      cell: ({ row }) => (
        <span className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted">
            <Image
              src={modelImage({})}
              alt=""
              width={28}
              height={28}
              className="size-7 object-contain"
            />
          </span>
          <span className="leading-tight">
            <span className="block text-text-primary">
              {row.original.deviceModelCode ?? "—"}
            </span>
            <span className="block text-xs text-text-secondary">
              {idr(row.original.unitPriceIdr)}
            </span>
          </span>
        </span>
      ),
    });

    list.push({
      id: "brand",
      header: "Brand",
      cell: ({ row }) => row.original.brand?.displayName ?? "—",
    });

    list.push(
      view === "dp"
        ? {
            id: "mpx",
            header: "MPX",
            cell: ({ row }) => (
              <span title={row.original.mpx?.code}>
                {row.original.mpx?.name ?? "—"}
              </span>
            ),
          }
        : {
            id: "recipient",
            header: "Penerima",
            cell: ({ row }) => row.original.picName ?? "—",
          },
    );

    list.push(
      {
        id: "qty",
        header: "Jml.",
        cell: ({ row }) => count(row.original.qty),
      },
      {
        id: "total",
        header: "Total",
        cell: ({ row }) => idr(row.original.totalIdr),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    );

    if (view === "mpx") {
      list.push({
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <RowAction
              label={`Detail PO ${row.original.poCode}`}
              onClick={() => onOpenDetail(row.original)}
            >
              <FileText className="size-4" />
            </RowAction>
            <RowAction
              tone="gold"
              label={`Lacak pengiriman ${row.original.poCode}`}
              disabled={!gate.hasShipment(row.original.status)}
              onClick={() => onTrack?.(row.original)}
            >
              <Eye className="size-4" />
            </RowAction>
          </div>
        ),
      });
    } else {
      list.push(
        {
          id: "pairing",
          header: "Pairing",
          cell: ({ row }) => (
            <div className="flex items-center gap-2">
              <RowAction
                label={`Detail PO ${row.original.poCode}`}
                onClick={() => onOpenDetail(row.original)}
              >
                <FileText className="size-4" />
              </RowAction>
              <RowAction
                tone="gold"
                label={`Pasang bundle ke ${row.original.poCode}`}
                disabled={!gate.canAttachBundles(row.original.status)}
                onClick={() => onAttachBundles?.(row.original)}
              >
                <Pencil className="size-4" />
              </RowAction>
            </div>
          ),
        },
        {
          id: "delivery",
          header: "Delivery",
          cell: ({ row }) => {
            const po = row.original;
            if (gate.canShip(po.status)) {
              return (
                <RowAction
                  label={`Kirim ${po.poCode}`}
                  disabled={po.qtyAttached < po.qty}
                  onClick={() => onShip?.(po)}
                >
                  <Truck className="size-4" />
                </RowAction>
              );
            }
            return (
              <RowAction
                tone="gold"
                label={`Lacak pengiriman ${po.poCode}`}
                disabled={!gate.hasShipment(po.status)}
                onClick={() => onTrack?.(po)}
              >
                <Eye className="size-4" />
              </RowAction>
            );
          },
        },
      );
    }

    return list;
  }, [view, onOpenDetail, onAttachBundles, onShip, onTrack]);

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
      emptyMessage="Belum ada PO."
      minWidth={1000}
    />
  );
}
