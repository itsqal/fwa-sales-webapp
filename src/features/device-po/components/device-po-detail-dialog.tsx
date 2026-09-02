"use client";

import Image from "next/image";
import { useState } from "react";
import { Loader2, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/domain/status-badge";
import { CopyableCode } from "@/components/domain/copyable-code";
import { PoHistoryPanel } from "@/components/domain/po-history-panel";
import { modelImage } from "@/components/domain/device-model-picker";
import { useSession } from "@/components/shell/session-context";
import { ApiRequestError } from "@/lib/api/client";
import { count, dateLongId, idr, timeId } from "@/lib/format";
import { devicePo as gate } from "@/lib/status";
import type { DevicePo } from "@/lib/api/types";
import { useDevicePo, useDevicePoTransition } from "../api/hooks";
import { RejectDevicePoDialog } from "./reject-device-po-dialog";

/**
 * *Detail PO* with the *Riwayat* panel beside it — the two-column modal the MPX
 * mockup shows, and the same view the Device Partner needs to accept or decline.
 */
export function DevicePoDetailDialog({
  po,
  open,
  onOpenChange,
  onShowAddress,
  onShowBundles,
  onConfirmReceipt,
}: {
  po: DevicePo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowAddress: () => void;
  onShowBundles: () => void;
  onConfirmReceipt?: () => void;
}) {
  const me = useSession();
  const detail = useDevicePo(po?.devicePoId, open);
  const data = detail.data;

  const accept = useDevicePoTransition("accept");
  const cancel = useDevicePoTransition("cancel");
  const inspect = useDevicePoTransition("inspect");
  const [rejecting, setRejecting] = useState(false);

  async function run(
    mutation: ReturnType<typeof useDevicePoTransition>,
    message: string,
  ) {
    if (!data) return;
    try {
      await mutation.mutateAsync({ id: data.devicePoId });
      toast.success(message);
    } catch (cause) {
      toast.error(
        cause instanceof ApiRequestError
          ? cause.message
          : "Status tidak dapat diubah.",
      );
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] w-full gap-0 overflow-hidden rounded-card p-0 sm:max-w-4xl">
          <DialogTitle className="sr-only">Detail PO</DialogTitle>
          <DialogDescription className="sr-only">
            Rincian dan riwayat purchase order.
          </DialogDescription>

          <div className="grid max-h-[92vh] grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,26rem)_1fr]">
            <section className="p-8">
              <h2 className="font-display text-3xl font-semibold text-hifi-magenta">
                Detail PO
              </h2>

              {!data ? (
                <div className="mt-6 space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="mt-6 flex items-center gap-4 rounded-full bg-surface-muted px-4 py-3">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-card">
                      <Image
                        src={modelImage({})}
                        alt=""
                        width={28}
                        height={28}
                        className="size-7 object-contain"
                      />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-sm text-text-primary">
                        {data.deviceModelCode}
                      </span>
                      <span className="block text-xs text-text-secondary">
                        {idr(data.unitPriceIdr)} × {count(data.qty)} unit
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-medium text-text-primary">
                      {idr(data.totalIdr)}
                    </span>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <p className="text-sm text-text-secondary">Kode PO</p>
                      <p className="mt-1 text-sm text-text-primary">
                        <CopyableCode code={data.poCode} />
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="PO Dibuat">
                        {timeId(data.submittedAt)}
                        <br />
                        {dateLongId(data.submittedAt)}
                      </Field>
                      <Field label="Pembaruan Terakhir">
                        {timeId(lastUpdate(data))}
                        <br />
                        {dateLongId(lastUpdate(data))}
                      </Field>
                    </div>

                    <div>
                      <p className="text-sm text-text-secondary">Status</p>
                      <div className="mt-1.5">
                        <StatusBadge status={data.status} />
                      </div>
                    </div>

                    <hr className="border-border-subtle" />

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="PIC">{data.picName ?? "—"}</Field>
                      <Field label="Kontak PIC">{data.picPhone ?? "—"}</Field>
                      <Field label="Nama MPX">
                        {data.mpx?.legalName ?? data.mpx?.name ?? "—"}
                      </Field>
                      <Field label="Device Partner">
                        {data.devicePartner?.name ?? "—"}
                      </Field>
                      <Field label="Circle">{data.mpx?.circle ?? "—"}</Field>
                      <Field label="Region">
                        {data.mpx?.regionCode ?? "—"}
                      </Field>
                      <Field label="Unit Terpasang">
                        {count(data.qtyAttached)} / {count(data.qty)}
                      </Field>
                    </div>

                    {data.rejectedReason && (
                      <div className="rounded-control bg-destructive/10 px-4 py-3">
                        <p className="text-sm font-medium text-destructive">
                          Alasan penolakan
                        </p>
                        <p className="mt-1 text-sm text-text-primary">
                          {data.rejectedReason}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="print-hidden mt-7 flex flex-wrap gap-3">
                    <Button
                      onClick={() => window.print()}
                      className="h-11 rounded-full bg-hifi-magenta px-6 hover:bg-hifi-cta"
                    >
                      <Printer className="size-4" />
                      Cetak
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void share(data.poCode)}
                      className="h-11 rounded-full border-hifi-magenta px-6 text-hifi-magenta"
                    >
                      <Share2 className="size-4" />
                      Bagikan
                    </Button>
                  </div>

                  <div className="print-hidden mt-4 flex flex-wrap gap-3">
                    {me.role === "DP_ADMIN" && (
                      <>
                        <Button
                          disabled={
                            !gate.canAccept(data.status) || accept.isPending
                          }
                          onClick={() =>
                            run(accept, `PO ${data.poCode} diterima.`)
                          }
                          className="h-11 rounded-full bg-status-diproses px-6 text-white hover:brightness-95"
                        >
                          {accept.isPending && (
                            <Loader2 className="size-4 animate-spin" />
                          )}
                          Terima PO
                        </Button>
                        <Button
                          variant="outline"
                          disabled={!gate.canReject(data.status)}
                          onClick={() => setRejecting(true)}
                          className="h-11 rounded-full px-6 text-destructive"
                        >
                          Tolak PO
                        </Button>
                      </>
                    )}

                    {me.role === "MPX_ADMIN" && (
                      <>
                        <Button
                          variant="outline"
                          onClick={onShowBundles}
                          disabled={!gate.hasBundles(data.status)}
                          className="h-11 rounded-full px-6"
                        >
                          Detail IMEI &amp; MSISDN
                        </Button>
                        <Button
                          disabled={
                            !gate.canInspect(data.status) || inspect.isPending
                          }
                          onClick={() =>
                            run(inspect, `PO ${data.poCode} sedang diperiksa.`)
                          }
                          className="h-11 rounded-full bg-status-periksa px-6 text-white hover:brightness-95"
                        >
                          {inspect.isPending && (
                            <Loader2 className="size-4 animate-spin" />
                          )}
                          Buka &amp; Periksa
                        </Button>
                        <Button
                          disabled={!gate.canConfirmReceipt(data.status)}
                          onClick={onConfirmReceipt}
                          className="h-11 rounded-full bg-hifi-magenta px-6 hover:bg-hifi-cta"
                        >
                          Konfirmasi Penerimaan
                        </Button>
                        <Button
                          variant="outline"
                          disabled={
                            !gate.canCancel(data.status) || cancel.isPending
                          }
                          onClick={() =>
                            run(cancel, `PO ${data.poCode} dibatalkan.`)
                          }
                          className="h-11 rounded-full px-6 text-destructive"
                        >
                          Batalkan PO
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
            </section>

            <section className="bg-surface-page p-8">
              <h2 className="font-display text-2xl font-semibold text-text-primary">
                Riwayat
              </h2>

              {data?.address && (
                <div className="mt-5 rounded-card border border-border-subtle bg-surface-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">
                      Alamat Penerima
                    </p>
                    <button
                      type="button"
                      onClick={onShowAddress}
                      className="shrink-0 text-sm text-hifi-magenta underline underline-offset-2"
                    >
                      Lihat lengkap
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">
                    {[
                      data.address.line1,
                      data.address.kelurahan,
                      data.address.kecamatan
                        ? `Kec. ${data.address.kecamatan}`
                        : undefined,
                      data.address.city,
                      `${data.address.province}${data.address.postalCode ? ` ${data.address.postalCode}` : ""}`,
                    ]
                      .filter(Boolean)
                      .join("; ")}
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-text-primary">Penerima</p>
                      <p className="mt-1 text-text-secondary">
                        {data.address.recipientName}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">
                        Kontak Penerima
                      </p>
                      <p className="mt-1 text-text-secondary">
                        {data.address.recipientPhone}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">Catatan</p>
                      <p className="mt-1 text-text-secondary">
                        {data.note?.trim() ? data.note : "–"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5">
                <PoHistoryPanel entries={data?.statusHistory ?? []} />
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <RejectDevicePoDialog
        po={data ?? null}
        open={rejecting}
        onOpenChange={setRejecting}
      />
    </>
  );
}

function lastUpdate(po: DevicePo): string | undefined {
  return po.completedAt ?? po.acceptedAt ?? po.submittedAt;
}

async function share(poCode: string) {
  const url = window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title: poCode, url });
      return;
    } catch {
      // The user dismissed the share sheet; fall through to the clipboard.
    }
  }
  try {
    await navigator.clipboard.writeText(`${poCode} — ${url}`);
    toast.success("Tautan PO disalin.");
  } catch {
    toast.error("Tautan tidak dapat disalin.");
  }
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
