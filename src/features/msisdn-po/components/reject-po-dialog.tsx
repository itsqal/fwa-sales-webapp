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
import { Label } from "@/components/ui/label";
import { CopyableCode } from "@/components/domain/copyable-code";
import { useResetWhenClosed } from "@/hooks/use-reset-when-closed";
import { ApiRequestError } from "@/lib/api/client";
import type { MsisdnPo } from "@/lib/api/types";
import { useRejectMsisdnPo } from "../api/hooks";

/**
 * IOH declines a request it will not fulfil.
 *
 * The mockups gave IOH no way to say no, so a request it could not supply sat
 * at *Diajukan* forever with no signal to the Device Partner (issue #4). The
 * reason is mandatory and is surfaced on the DP list so they can resubmit.
 */
export function RejectPoDialog({
  po,
  open,
  onOpenChange,
}: {
  po: MsisdnPo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reject = useRejectMsisdnPo();

  useResetWhenClosed(open, () => {
    setReason("");
    setError(null);
  });

  async function submit() {
    if (!po || !reason.trim()) return;
    setError(null);
    try {
      await reject.mutateAsync({ id: po.msisdnPoId, reason: reason.trim() });
      toast.success(`PO ${po.poCode} ditolak.`);
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "PO tidak dapat ditolak.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full gap-0 rounded-card p-8 sm:max-w-lg">
        <DialogTitle className="font-display text-3xl font-semibold text-hifi-magenta">
          Tolak PO
        </DialogTitle>
        <DialogDescription className="mt-1">
          Alasan penolakan akan ditampilkan kepada Device Partner.
        </DialogDescription>

        {po && (
          <p className="mt-5 text-sm text-text-secondary">
            Kode PO: <CopyableCode code={po.poCode} />
          </p>
        )}

        <div className="mt-4 space-y-2">
          <Label htmlFor="reason">Alasan</Label>
          <textarea
            id="reason"
            rows={4}
            value={reason}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Tuliskan alasan penolakan"
            className="w-full rounded-control border border-border-subtle px-4 py-3 text-sm outline-none placeholder:text-text-muted focus-visible:border-hifi-magenta"
          />
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12 flex-1 rounded-full text-base"
          >
            Batal
          </Button>
          <Button
            onClick={submit}
            disabled={!reason.trim() || reject.isPending}
            className="h-12 flex-1 rounded-full bg-status-ditolak text-base text-white hover:brightness-95"
          >
            {reject.isPending && <Loader2 className="size-4 animate-spin" />}
            Tolak PO
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
