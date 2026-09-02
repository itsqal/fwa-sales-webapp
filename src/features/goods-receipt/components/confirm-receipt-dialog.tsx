"use client";

import Image from "next/image";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmationCheckbox } from "@/components/domain/confirmation-checkbox";
import { CopyableCode } from "@/components/domain/copyable-code";
import { modelImage } from "@/components/domain/device-model-picker";
import { useSession } from "@/components/shell/session-context";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { useResetWhenClosed } from "@/hooks/use-reset-when-closed";
import { ApiRequestError } from "@/lib/api/client";
import { count, dateLongId, idr, timeId } from "@/lib/format";
import type { DevicePoDetail } from "@/lib/api/types";
import { useConfirmReceipt } from "../api/hooks";

/**
 * *Konfirmasi Penerimaan*. The attestation says *seluruh unit* and means it:
 * the server refuses a short delivery, so the operator is never asked to
 * confirm units that are not in front of them.
 */
export function ConfirmReceiptDialog({
  po,
  open,
  onOpenChange,
  onShowBundles,
  onShowAddress,
}: {
  po: DevicePoDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowBundles: () => void;
  onShowAddress: () => void;
}) {
  const me = useSession();
  const [idempotencyKey, resetKey] = useIdempotencyKey();
  const confirm = useConfirmReceipt(idempotencyKey);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useResetWhenClosed(open, () => {
    setConfirmed(false);
    setError(null);
  });

  async function submit() {
    if (!po) return;
    setError(null);
    try {
      const receipt = await confirm.mutateAsync({ id: po.devicePoId });
      toast.success(`${count(receipt.qtyReceived)} unit diterima.`);
      resetKey();
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "Penerimaan tidak dapat disimpan.",
      );
    }
  }

  const address = po?.address;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full gap-0 overflow-y-auto rounded-card p-8 sm:max-w-lg">
        <DialogTitle className="font-display text-3xl font-semibold text-hifi-magenta">
          Konfirmasi Penerimaan
        </DialogTitle>
        <DialogDescription className="sr-only">
          Konfirmasi penerimaan seluruh unit pada PO ini.
        </DialogDescription>

        {po && (
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
                  {po.deviceModelCode}
                </span>
                <span className="block text-xs text-text-secondary">
                  {idr(po.unitPriceIdr)} × {count(po.qty)} unit
                </span>
              </span>
              <span className="shrink-0 text-sm font-medium text-text-primary">
                {idr(po.totalIdr)}
              </span>
            </div>

            <div className="mt-5">
              <p className="text-sm text-text-secondary">Kode PO</p>
              <p className="mt-1 text-sm text-text-primary">
                <CopyableCode code={po.poCode} />
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  PO Dibuat
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {timeId(po.submittedAt)}
                  <br />
                  {dateLongId(po.submittedAt)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Pembaruan Terakhir
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {timeId(po.acceptedAt ?? po.submittedAt)}
                  <br />
                  {dateLongId(po.acceptedAt ?? po.submittedAt)}
                </p>
              </div>
            </div>

            {address && (
              <div className="mt-5 rounded-control border border-border-subtle p-4">
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
                    address.line1,
                    address.kelurahan,
                    address.kecamatan ? `Kec. ${address.kecamatan}` : undefined,
                    address.city,
                    `${address.province}${address.postalCode ? ` ${address.postalCode}` : ""}`,
                  ]
                    .filter(Boolean)
                    .join("; ")}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-text-primary">Penerima</p>
                    <p className="mt-1 text-text-secondary">
                      {address.recipientName}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">
                      Kontak Penerima
                    </p>
                    <p className="mt-1 text-text-secondary">
                      {address.recipientPhone}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Catatan</p>
                    <p className="mt-1 text-text-secondary">
                      {po.note?.trim() ? po.note : "–"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5">
              <ConfirmationCheckbox
                fullName={me.fullName}
                statement="mengonfirmasi penerimaan seluruh unit pada PO ini dan akan bertanggungjawab untuk proses selanjutnya"
                checked={confirmed}
                onCheckedChange={setConfirmed}
              />
            </div>

            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="mt-6 space-y-3">
              <Button
                variant="outline"
                onClick={onShowBundles}
                className="h-12 w-full rounded-full border-hifi-magenta text-base text-hifi-magenta"
              >
                Detail IMEI &amp; MSISDN
              </Button>
              <Button
                onClick={submit}
                disabled={!confirmed || confirm.isPending}
                className="h-12 w-full rounded-full bg-hifi-magenta text-base hover:bg-hifi-cta"
              >
                {confirm.isPending && <Loader2 className="size-4 animate-spin" />}
                Kirim
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
