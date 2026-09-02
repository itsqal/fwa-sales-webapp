"use client";

import { useState } from "react";
import { PageHeader } from "@/components/domain/page-header";
import { SearchFilterBar } from "@/components/domain/search-filter-bar";
import { useListState } from "@/hooks/use-list-state";
import { MSISDN_PO_STATUSES } from "@/lib/status";
import type { MsisdnPo } from "@/lib/api/types";
import { useMsisdnPos } from "../api/hooks";
import { MsisdnPoTable } from "./msisdn-po-table";
import { SupplyWizard } from "./supply-wizard";
import { RejectPoDialog } from "./reject-po-dialog";

/** *Provide List MSISDN* — IOH sees every partner's request and supplies it. */
export function IohMsisdnPoScreen() {
  const list = useListState();
  const query = useMsisdnPos({
    page: list.page,
    perPage: list.perPage,
    status: list.status,
    q: list.q || undefined,
  });

  const [supplying, setSupplying] = useState<MsisdnPo | null>(null);
  const [rejecting, setRejecting] = useState<MsisdnPo | null>(null);

  return (
    <>
      <PageHeader
        title="Provide List MSISDN"
        subtitle="Input dan tinjau MSISDN"
      >
        {/* The mockup promises a search across the PO code and the Device
          * Partner. The endpoint matches the PO code only, so that is what the
          * placeholder says (issue #20). */}
        <SearchFilterBar
          placeholder="Cari Nomor PO"
          value={list.q}
          onChange={list.setQ}
          statuses={MSISDN_PO_STATUSES}
          status={list.status}
          onStatusChange={list.setStatus}
        />
      </PageHeader>

      <MsisdnPoTable
        view="ioh"
        rows={query.data?.data ?? []}
        meta={query.data?.meta}
        isLoading={query.isLoading}
        page={list.page}
        perPage={list.perPage}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        onSupply={setSupplying}
        onReject={setRejecting}
      />

      <SupplyWizard
        po={supplying}
        open={supplying !== null}
        onOpenChange={(open) => !open && setSupplying(null)}
      />

      <RejectPoDialog
        po={rejecting}
        open={rejecting !== null}
        onOpenChange={(open) => !open && setRejecting(null)}
      />
    </>
  );
}
