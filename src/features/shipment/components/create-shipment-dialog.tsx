"use client";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmationCheckbox } from "@/components/domain/confirmation-checkbox";
import { CopyableCode } from "@/components/domain/copyable-code";
import { useSession } from "@/components/shell/session-context";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { useResetWhenClosed } from "@/hooks/use-reset-when-closed";
import { ApiRequestError } from "@/lib/api/client";
import { count } from "@/lib/format";
import type { DevicePo } from "@/lib/api/types";
import { useCreateShipment } from "../api/hooks";

/**
 * *Buat Pengiriman* — the screen the UI review found missing entirely.
 *
 * The MPX *Riwayat* panel already displayed `J&T Express | JD0463672772` and
 * nothing in the mockups produced it (issue #1). Submitting moves the order to
 * `DIKIRIM` and writes that line into the status history.
 *
 * A small form, not a wizard: courier, resi, an estimate, and the attestation.
 * The courier is free text — there is no courier reference table in v1.
 */
export function CreateShipmentDialog({
  po,
  open,
  onOpenChange,
}: {
  po: DevicePo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const me = useSession();
  const [idempotencyKey, resetKey] = useIdempotencyKey();
  const create = useCreateShipment(idempotencyKey);

  const [courierName, setCourierName] = useState("");
  const [awb, setAwb] = useState("");
  const [estimated, setEstimated] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useResetWhenClosed(open, () => {
    setCourierName("");
    setAwb("");
    setEstimated("");
    setNote("");
    setConfirmed(false);
    setError(null);
  });

  const shortOrder = po ? po.qtyAttached < po.qty : false;

  async function submit() {
    if (!po) return;
    setError(null);
    try {
      await create.mutateAsync({
        id: po.devicePoId,
        body: {
          courierName: courierName.trim(),
          awb: awb.trim(),
          estimatedDeliveryDate: estimated || undefined,
          note: note.trim() || undefined,
        },
      });
      toast.success(`PO ${po.poCode} dikirim.`);
      resetKey();
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "Pengiriman tidak dapat disimpan.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full gap-0 rounded-card p-8 sm:max-w-lg">
        <DialogTitle className="font-display text-3xl font-semibold text-hifi-magenta">
          Buat Pengiriman
        </DialogTitle>
        <DialogDescription className="mt-1">
          Catat kurir dan nomor resi sebagai bukti pengiriman.
        </DialogDescription>

        {po && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-text-secondary">
            <span>
              Kode PO: <CopyableCode code={po.poCode} truncate={28} />
            </span>
            <span>
              Jumlah: {count(po.qtyAttached)} / {count(po.qty)} unit
            </span>
          </div>
        )}

        {shortOrder && (
          <p className="mt-4 rounded-control bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Semua unit harus terpasang sebelum PO dikirim. Penerimaan bersifat
            seluruhnya, sehingga PO yang kurang tidak akan pernah dapat
            dikonfirmasi.
          </p>
        )}

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="courier">Kurir</Label>
            <Input
              id="courier"
              value={courierName}
              maxLength={60}
              placeholder="mis. J&T Express"
              onChange={(event) => setCourierName(event.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="awb">Nomor Resi (AWB)</Label>
            <Input
              id="awb"
              value={awb}
              maxLength={60}
              placeholder="mis. JD0463672772"
              onChange={(event) => setAwb(event.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="estimated">Estimasi Tiba</Label>
            <Input
              id="estimated"
              type="date"
              value={estimated}
              onChange={(event) => setEstimated(event.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ship-note">Catatan</Label>
            <textarea
              id="ship-note"
              rows={2}
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Tuliskan catatan, jika ada"
              className="w-full rounded-control border border-border-subtle px-4 py-3 text-sm outline-none placeholder:text-text-muted focus-visible:border-hifi-magenta"
            />
          </div>

          <ConfirmationCheckbox
            fullName={me.fullName}
            statement="mengonfirmasi bahwa seluruh unit pada PO ini sudah dikemas dan diserahkan kepada kurir"
            checked={confirmed}
            onCheckedChange={setConfirmed}
          />

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            onClick={submit}
            disabled={
              !courierName.trim() ||
              !awb.trim() ||
              !confirmed ||
              shortOrder ||
              create.isPending
            }
            className="h-12 w-full rounded-full bg-hifi-magenta text-base hover:bg-hifi-cta"
          >
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            Kirim
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
