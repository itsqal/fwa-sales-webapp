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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandToggle } from "@/components/domain/brand-toggle";
import { ConfirmationCheckbox } from "@/components/domain/confirmation-checkbox";
import { useSession } from "@/components/shell/session-context";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { useBrands, useCallPlans } from "@/features/reference/api/hooks";
import { useCreateMsisdnPo } from "../api/hooks";
import { ApiRequestError } from "@/lib/api/client";

/** *Buat PO* — the Device Partner asks IOH for a batch of numbers. */
export function CreateMsisdnPoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const me = useSession();
  const callPlans = useCallPlans();
  const brands = useBrands();
  const [idempotencyKey, resetKey] = useIdempotencyKey();
  const create = useCreateMsisdnPo(idempotencyKey);

  const [callPlanId, setCallPlanId] = useState<string | undefined>();
  const [qty, setQty] = useState("");
  const [chosenBrand, setChosenBrand] = useState<string | undefined>();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The mockup's brand toggle always shows a selection, so it falls back to the
  // first brand until the operator picks one. Derived rather than stored: there
  // is no moment where the form holds a brand the reference data does not.
  const brandCode = chosenBrand ?? brands.data?.data[0]?.code;

  function reset() {
    setCallPlanId(undefined);
    setQty("");
    setChosenBrand(undefined);
    setConfirmed(false);
    setError(null);
    resetKey();
  }

  const quantity = Number(qty);
  const canSubmit =
    Boolean(callPlanId) &&
    Boolean(brandCode) &&
    Number.isInteger(quantity) &&
    quantity > 0 &&
    confirmed &&
    !create.isPending;

  async function submit() {
    if (!callPlanId || !brandCode) return;
    setError(null);
    try {
      const po = await create.mutateAsync({
        callPlanId,
        brandCode,
        qtyRequested: quantity,
      });
      toast.success(`PO ${po.poCode} diajukan.`);
      reset();
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "PO tidak dapat dibuat.",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-full gap-0 rounded-card p-8 sm:max-w-lg">
        <DialogTitle className="font-display text-3xl font-semibold text-hifi-magenta">
          Buat PO
        </DialogTitle>
        <DialogDescription className="sr-only">
          Ajukan permintaan MSISDN ke IOH.
        </DialogDescription>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label>Call Plan</Label>
            <Select value={callPlanId ?? ""} onValueChange={(value) => setCallPlanId(value ?? undefined)}>
              <SelectTrigger className="h-12 w-full rounded-control px-4">
                <SelectValue placeholder="Pilih kategori call plan">
                  {(value: string) =>
                    callPlans.data?.data.find((p) => p.callPlanId === value)
                      ?.name ?? "Pilih kategori call plan"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {callPlans.data?.data.map((plan) => (
                  <SelectItem key={plan.callPlanId} value={plan.callPlanId}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qty">Jumlah MSISDN</Label>
            <div className="flex overflow-hidden rounded-control border border-border-subtle">
              <input
                id="qty"
                value={qty}
                inputMode="numeric"
                placeholder="Isi jumlah MSISDN"
                onChange={(event) =>
                  setQty(event.target.value.replace(/[^0-9]/g, ""))
                }
                className="h-12 min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-text-muted"
              />
              <span className="flex w-20 shrink-0 items-center justify-center bg-surface-muted text-sm text-text-secondary">
                nomor
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Brand</Label>
            <BrandToggle
              brands={brands.data?.data ?? []}
              value={brandCode}
              onChange={setChosenBrand}
              variant="outlet"
            />
          </div>

          <ConfirmationCheckbox
            fullName={me.fullName}
            statement="mengonfirmasi bahwa pesanan PO ini sudah sesuai dan siap ditindaklanjuti"
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
            disabled={!canSubmit}
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
