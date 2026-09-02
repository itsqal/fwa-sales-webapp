"use client";

import { useState } from "react";
import { PageHeader } from "@/components/domain/page-header";
import { SearchFilterBar } from "@/components/domain/search-filter-bar";
import { useListState } from "@/hooks/use-list-state";
import { DEVICE_PO_STATUSES } from "@/lib/status";
import type { DevicePo } from "@/lib/api/types";
import { AddressDetailDialog } from "@/features/addresses/components/address-detail-dialog";
import { CreateShipmentDialog } from "@/features/shipment/components/create-shipment-dialog";
import { DeliveryProgressDialog } from "@/features/shipment/components/delivery-progress-dialog";
import { useDevicePo, useDevicePos } from "../api/hooks";
import { DevicePoTable } from "./device-po-table";
import { DevicePoDetailDialog } from "./device-po-detail-dialog";
import { DevicePoPairingWizard } from "./device-po-pairing-wizard";
import { BundleListDialog } from "./bundle-list-dialog";

/**
 * *Manajemen PO* — the Device Partner's side: accept the order, attach bundles
 * to it, hand it to a courier.
 *
 * `initialStatus` lets the *Pengiriman* entry in the sidebar land on the same
 * screen pre-filtered to what is waiting to be dispatched, rather than
 * duplicating the whole list somewhere else.
 */
export function DpDevicePoScreen({
  title = "Manajemen PO",
  subtitle = "Pairing and delivery Purchase Order MPX",
  initialStatus,
}: {
  title?: string;
  subtitle?: string;
  initialStatus?: string;
}) {
  const list = useListState(10, initialStatus);
  const query = useDevicePos({
    page: list.page,
    perPage: list.perPage,
    status: list.status,
    q: list.q || undefined,
  });

  const [selected, setSelected] = useState<DevicePo | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pairingOpen, setPairingOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [bundlesOpen, setBundlesOpen] = useState(false);

  const detail = useDevicePo(selected?.devicePoId, addressOpen);

  return (
    <>
      <PageHeader title={title} subtitle={subtitle}>
        <SearchFilterBar
          placeholder="Cari Kode PO"
          value={list.q}
          onChange={list.setQ}
          statuses={DEVICE_PO_STATUSES}
          status={list.status}
          onStatusChange={list.setStatus}
        />
      </PageHeader>

      <DevicePoTable
        view="dp"
        rows={query.data?.data ?? []}
        meta={query.data?.meta}
        isLoading={query.isLoading}
        page={list.page}
        perPage={list.perPage}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        onOpenDetail={(po) => {
          setSelected(po);
          setDetailOpen(true);
        }}
        onAttachBundles={(po) => {
          setSelected(po);
          setPairingOpen(true);
        }}
        onShip={(po) => {
          setSelected(po);
          setShipOpen(true);
        }}
        onTrack={(po) => {
          setSelected(po);
          setTrackOpen(true);
        }}
      />

      <DevicePoDetailDialog
        po={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onShowAddress={() => setAddressOpen(true)}
        onShowBundles={() => setBundlesOpen(true)}
      />

      <DevicePoPairingWizard
        po={selected}
        open={pairingOpen}
        onOpenChange={setPairingOpen}
      />

      <CreateShipmentDialog
        po={selected}
        open={shipOpen}
        onOpenChange={setShipOpen}
      />

      <DeliveryProgressDialog
        po={selected}
        open={trackOpen}
        onOpenChange={setTrackOpen}
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
    </>
  );
}
