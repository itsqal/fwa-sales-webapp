"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/domain/page-header";
import { SearchFilterBar } from "@/components/domain/search-filter-bar";
import { useListState } from "@/hooks/use-list-state";
import { MSISDN_PO_STATUSES } from "@/lib/status";
import type { MsisdnPo } from "@/lib/api/types";
import { PairingWizard } from "@/features/hard-bundle/components/pairing-wizard";
import { useMsisdnPos } from "../api/hooks";
import { MsisdnPoTable } from "./msisdn-po-table";
import { CreateMsisdnPoDialog } from "./create-msisdn-po-dialog";
import { MsisdnListDialog } from "./msisdn-list-dialog";

/** *Manajemen PO MSISDN* — the Device Partner's side of the request. */
export function DpMsisdnPoScreen() {
  const list = useListState();
  const query = useMsisdnPos({
    page: list.page,
    perPage: list.perPage,
    status: list.status,
    q: list.q || undefined,
  });

  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<MsisdnPo | null>(null);
  const [pairing, setPairing] = useState<MsisdnPo | null>(null);

  return (
    <>
      <PageHeader
        title="Manajemen PO MSISDN"
        subtitle="Buat, tinjau, dan konfirmasi Purchase Order MSISDN"
      >
        <SearchFilterBar
          placeholder="Cari Nomor PO"
          value={list.q}
          onChange={list.setQ}
          statuses={MSISDN_PO_STATUSES}
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

      <MsisdnPoTable
        view="dp"
        rows={query.data?.data ?? []}
        meta={query.data?.meta}
        isLoading={query.isLoading}
        page={list.page}
        perPage={list.perPage}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        onViewNumbers={setViewing}
        onPair={setPairing}
      />

      <CreateMsisdnPoDialog open={creating} onOpenChange={setCreating} />

      <MsisdnListDialog
        po={viewing}
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
      />

      <PairingWizard
        po={pairing}
        open={pairing !== null}
        onOpenChange={(open) => !open && setPairing(null)}
      />
    </>
  );
}
