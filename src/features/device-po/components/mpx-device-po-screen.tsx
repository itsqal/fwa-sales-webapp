"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/domain/page-header";
import { SearchFilterBar } from "@/components/domain/search-filter-bar";
import { useListState } from "@/hooks/use-list-state";
import { DEVICE_PO_STATUSES } from "@/lib/status";
import type { DevicePo } from "@/lib/api/types";
import { AddressDetailDialog } from "@/features/addresses/components/address-detail-dialog";
import { DeliveryProgressDialog } from "@/features/shipment/components/delivery-progress-dialog";
import { ConfirmReceiptDialog } from "@/features/goods-receipt/components/confirm-receipt-dialog";
import { useDevicePo, useDevicePos } from "../api/hooks";
import { DevicePoTable } from "./device-po-table";
import { CreateDevicePoDialog } from "./create-device-po-dialog";
import { DevicePoDetailDialog } from "./device-po-detail-dialog";
import { BundleListDialog } from "./bundle-list-dialog";

/** *Manajemen PO* — the MPX orders devices and confirms what arrives. */
export function MpxDevicePoScreen() {
  const list = useListState();
  const query = useDevicePos({
    page: list.page,
    perPage: list.perPage,
    status: list.status,
    q: list.q || undefined,
  });

  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<DevicePo | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [bundlesOpen, setBundlesOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);

  // The receipt dialog needs the delivery address, which only the detail
  // response carries.
  const detail = useDevicePo(
    selected?.devicePoId,
    receiptOpen || addressOpen,
  );

  function openDetail(po: DevicePo) {
    setSelected(po);
    setDetailOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Manajemen PO"
        subtitle="Buat, tinjau, dan konfirmasi Purchase Order modem HiFi Air"
      >
        {/* The mockup's placeholder promises a search across type, partner and
          * recipient. The endpoint matches the PO code only (issue #20). */}
        <SearchFilterBar
          placeholder="Cari Kode PO"
          value={list.q}
          onChange={list.setQ}
          statuses={DEVICE_PO_STATUSES}
          status={list.status}
          onStatusChange={list.setStatus}
        />
        <Button
          onClick={() => setCreating(true)}
          className="h-12 shrink-0 rounded-full bg-hifi-cta px-6 text-base hover:bg-hifi-magenta"
        >
          <Plus className="size-4" />
          Buat PO
        </Button>
      </PageHeader>

      <DevicePoTable
        view="mpx"
        rows={query.data?.data ?? []}
        meta={query.data?.meta}
        isLoading={query.isLoading}
        page={list.page}
        perPage={list.perPage}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        onOpenDetail={openDetail}
        onTrack={(po) => {
          setSelected(po);
          setTrackOpen(true);
        }}
      />

      <CreateDevicePoDialog open={creating} onOpenChange={setCreating} />

      <DevicePoDetailDialog
        po={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onShowAddress={() => setAddressOpen(true)}
        onShowBundles={() => setBundlesOpen(true)}
        onConfirmReceipt={() => {
          setDetailOpen(false);
          setReceiptOpen(true);
        }}
      />

      <BundleListDialog
        po={selected}
        open={bundlesOpen}
        onOpenChange={setBundlesOpen}
      />

      <AddressDetailDialog
        address={detail.data?.address}
        poCode={selected?.poCode}
        note={selected?.note}
        open={addressOpen}
        onOpenChange={setAddressOpen}
      />

      <ConfirmReceiptDialog
        po={detail.data ?? null}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        onShowBundles={() => setBundlesOpen(true)}
        onShowAddress={() => setAddressOpen(true)}
      />

      <DeliveryProgressDialog
        po={selected}
        open={trackOpen}
        onOpenChange={setTrackOpen}
      />
    </>
  );
}
