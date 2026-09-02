"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Download, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/domain/page-header";
import { StatusBadge } from "@/components/domain/status-badge";
import { CopyableCode } from "@/components/domain/copyable-code";
import { PoHistoryPanel } from "@/components/domain/po-history-panel";
import { MsisdnImeiTable } from "@/components/domain/msisdn-imei-table";
import { useSession } from "@/components/shell/session-context";
import { ApiRequestError } from "@/lib/api/client";
import { count, dateLongId, timeId } from "@/lib/format";
import { msisdnPo as gate } from "@/lib/status";
import { PairingWizard } from "@/features/hard-bundle/components/pairing-wizard";
import {
  downloadMsisdnPoNumbers,
  useCancelMsisdnPo,
  useMsisdnPo,
  useMsisdnPoNumbers,
} from "../api/hooks";
import { SupplyWizard } from "./supply-wizard";
import { RejectPoDialog } from "./reject-po-dialog";

/**
 * One request, in full — the summary, the numbers issued against it, and the
 * status history. The row actions live on the list; the ones that need room to
 * explain themselves (cancel, reject) live here.
 */
export function MsisdnPoDetail({ id }: { id: string }) {
  const me = useSession();
  const detail = useMsisdnPo(id);
  const po = detail.data;
  const numbers = useMsisdnPoNumbers(id, Boolean(po && gate.hasNumbers(po.status)));
  const cancel = useCancelMsisdnPo();

  const [pairing, setPairing] = useState(false);
  const [supplying, setSupplying] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const backHref = me.role === "DP_ADMIN" ? "/dp/msisdn-po" : "/ioh/purchase-order";

  if (detail.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="rounded-card border border-border-subtle bg-surface-card px-6 py-16 text-center">
        <p className="text-text-primary">PO ini tidak ditemukan.</p>
        <Link
          href={backHref}
          className="mt-3 inline-block text-sm text-hifi-magenta hover:underline"
        >
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  async function doCancel() {
    if (!po) return;
    try {
      await cancel.mutateAsync({ id: po.msisdnPoId });
      toast.success(`PO ${po.poCode} dibatalkan.`);
    } catch (cause) {
      toast.error(
        cause instanceof ApiRequestError
          ? cause.message
          : "PO tidak dapat dibatalkan.",
      );
    }
  }

  return (
    <>
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-hifi-magenta"
      >
        <ArrowLeft className="size-4" />
        Kembali
      </Link>

      <PageHeader title="Detail PO MSISDN">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {me.role === "DP_ADMIN" && (
            <>
              <Button
                variant="outline"
                disabled={!gate.hasNumbers(po.status)}
                onClick={() => {
                  void downloadMsisdnPoNumbers(po.msisdnPoId, po.poCode).catch(
                    () => toast.error("Gagal mengunduh daftar MSISDN."),
                  );
                }}
                className="h-11 rounded-full px-5"
              >
                <Download className="size-4" />
                Unduh MSISDN
              </Button>
              <Button
                disabled={!gate.canPair(po.status)}
                onClick={() => setPairing(true)}
                className="h-11 rounded-full bg-hifi-magenta px-5 hover:bg-hifi-cta"
              >
                <Pencil className="size-4" />
                Pairing
              </Button>
              <Button
                variant="outline"
                disabled={!gate.canCancel(po.status) || cancel.isPending}
                onClick={doCancel}
                className="h-11 rounded-full px-5 text-destructive"
              >
                {cancel.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <X className="size-4" />
                )}
                Batalkan PO
              </Button>
            </>
          )}

          {me.role === "IOH_ADMIN" && (
            <>
              <Button
                disabled={!gate.canSupply(po.status)}
                onClick={() => setSupplying(true)}
                className="h-11 rounded-full bg-hifi-magenta px-5 hover:bg-hifi-cta"
              >
                <Pencil className="size-4" />
                Sediakan MSISDN
              </Button>
              <Button
                variant="outline"
                disabled={!gate.canReject(po.status)}
                onClick={() => setRejecting(true)}
                className="h-11 rounded-full px-5 text-destructive"
              >
                <X className="size-4" />
                Tolak PO
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <section className="space-y-5 rounded-card border border-border-subtle bg-surface-card p-6">
          <div>
            <p className="text-sm text-text-secondary">Kode PO</p>
            <p className="mt-1 text-text-primary">
              <CopyableCode code={po.poCode} />
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="PO Dibuat">
              {timeId(po.submittedAt)}
              <br />
              {dateLongId(po.submittedAt)}
            </Field>
            <Field label="Pembaruan Terakhir">
              {timeId(po.completedAt ?? po.processedAt ?? po.submittedAt)}
              <br />
              {dateLongId(po.completedAt ?? po.processedAt ?? po.submittedAt)}
            </Field>
          </div>

          <div>
            <p className="text-sm text-text-secondary">Status</p>
            <div className="mt-1.5">
              <StatusBadge status={po.status} />
            </div>
          </div>

          <hr className="border-border-subtle" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Device Partner">{po.devicePartner?.name ?? "—"}</Field>
            <Field label="Call Plan">{po.callPlan?.name ?? "—"}</Field>
            <Field label="Brand">{po.brand?.displayName ?? "—"}</Field>
            <Field label="Jml. Diminta">{count(po.qtyRequested)}</Field>
            <Field label="Jml. Disediakan">{count(po.qtySupplied)}</Field>
          </div>

          {po.note && <Field label="Catatan">{po.note}</Field>}

          {po.rejectedReason && (
            <div className="rounded-control bg-destructive/10 px-4 py-3">
              <p className="text-sm font-medium text-destructive">
                Alasan penolakan
              </p>
              <p className="mt-1 text-sm text-text-primary">
                {po.rejectedReason}
              </p>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section>
            <h2 className="font-display mb-3 text-xl font-semibold text-text-primary">
              Riwayat
            </h2>
            <PoHistoryPanel entries={po.statusHistory ?? []} />
          </section>

          {gate.hasNumbers(po.status) && (
            <section>
              <h2 className="font-display mb-3 text-xl font-semibold text-text-primary">
                Daftar MSISDN
              </h2>
              <div className="rounded-card border border-border-subtle bg-surface-card px-2 py-2">
                {numbers.isLoading ? (
                  <div className="space-y-3 p-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-6 w-full" />
                    ))}
                  </div>
                ) : (
                  <MsisdnImeiTable
                    rows={(numbers.data?.data ?? []).map((row) => ({
                      brandCode: po.brand?.displayName,
                      msisdn: row.msisdn,
                      imei: row.imei,
                    }))}
                  />
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      <PairingWizard po={po} open={pairing} onOpenChange={setPairing} />
      <SupplyWizard po={po} open={supplying} onOpenChange={setSupplying} />
      <RejectPoDialog po={po} open={rejecting} onOpenChange={setRejecting} />
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="mt-1 text-sm text-text-primary">{children}</p>
    </div>
  );
}
