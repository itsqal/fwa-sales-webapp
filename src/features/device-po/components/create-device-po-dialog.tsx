"use client";

import { useMemo, useState } from "react";
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
import { DeviceModelPicker } from "@/components/domain/device-model-picker";
import { ConfirmationCheckbox } from "@/components/domain/confirmation-checkbox";
import { useSession } from "@/components/shell/session-context";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { ApiRequestError } from "@/lib/api/client";
import { idr } from "@/lib/format";
import { useBrands, useDeviceModels } from "@/features/reference/api/hooks";
import { useAddresses } from "@/features/addresses/api/hooks";
import { CreateAddressDialog } from "@/features/addresses/components/create-address-dialog";
import { useCreateDevicePo } from "../api/hooks";

/**
 * *Buat PO* — the MPX orders devices from a Device Partner.
 *
 * The Device Partner is not a field on this form: each model in the catalogue
 * already names the partner that supplies it, so choosing *ADVAN V1 PRO* is
 * choosing ADVAN. Asking for both would let an operator order a Rabit from HKM.
 */
export function CreateDevicePoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const me = useSession();
  const models = useDeviceModels();
  const brands = useBrands();
  const addresses = useAddresses({ page: 1, perPage: 100 }, open);

  const [idempotencyKey, resetKey] = useIdempotencyKey();
  const create = useCreateDevicePo(idempotencyKey);

  const [deviceModelId, setDeviceModelId] = useState<string | undefined>();
  const [qty, setQty] = useState("");
  const [chosenBrand, setChosenBrand] = useState<string | undefined>();
  const [chosenAddress, setChosenAddress] = useState<string | undefined>();
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const model = useMemo(
    () => models.data?.data.find((m) => m.deviceModelId === deviceModelId),
    [models.data, deviceModelId],
  );

  // Both selections fall back to a sensible default until the operator picks
  // one, derived rather than stored so the form never holds an id that the
  // reference data has not returned.
  const brandCode = chosenBrand ?? brands.data?.data[0]?.code;
  const addressId =
    chosenAddress ??
    (addresses.data?.data.find((address) => address.isDefault) ??
      addresses.data?.data[0])?.addressId;

  function reset() {
    setDeviceModelId(undefined);
    setQty("");
    setChosenBrand(undefined);
    setChosenAddress(undefined);
    setNote("");
    setConfirmed(false);
    setError(null);
    resetKey();
  }

  const quantity = Number(qty);
  const canSubmit =
    Boolean(model) &&
    Boolean(brandCode) &&
    Boolean(addressId) &&
    Number.isInteger(quantity) &&
    quantity > 0 &&
    confirmed &&
    !create.isPending;

  async function submit() {
    if (!model || !brandCode || !addressId) return;
    if (!model.devicePartner) {
      setError("Tipe modem ini belum terhubung ke Device Partner mana pun.");
      return;
    }
    setError(null);
    try {
      const po = await create.mutateAsync({
        devicePartnerId: model.devicePartner.devicePartnerId,
        deviceModelId: model.deviceModelId,
        brandCode,
        qty: quantity,
        addressId,
        note: note.trim() || undefined,
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

  const total =
    model?.listPriceIdr && quantity > 0 ? model.listPriceIdr * quantity : null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) reset();
          onOpenChange(next);
        }}
      >
        <DialogContent className="max-h-[90vh] w-full gap-0 overflow-y-auto rounded-card p-8 sm:max-w-xl">
          <DialogTitle className="font-display text-3xl font-semibold text-hifi-magenta">
            Buat PO
          </DialogTitle>
          <DialogDescription className="sr-only">
            Pesan modem HiFi Air ke Device Partner.
          </DialogDescription>

          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label>Tipe Modem</Label>
              <DeviceModelPicker
                models={models.data?.data ?? []}
                value={deviceModelId}
                onChange={setDeviceModelId}
              />
              {model?.devicePartner && (
                <p className="text-xs text-text-secondary">
                  Dipasok oleh {model.devicePartner.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="qty">Jumlah Pemesanan</Label>
              <div className="flex overflow-hidden rounded-control border border-border-subtle">
                <input
                  id="qty"
                  value={qty}
                  inputMode="numeric"
                  placeholder="Isi jumlah pemesanan"
                  onChange={(event) =>
                    setQty(event.target.value.replace(/[^0-9]/g, ""))
                  }
                  className="h-12 min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-text-muted"
                />
                <span className="flex w-20 shrink-0 items-center justify-center bg-surface-muted text-sm text-text-secondary">
                  unit
                </span>
              </div>
              {total !== null && (
                <p className="text-sm text-text-secondary">
                  Total: <span className="text-text-primary">{idr(total)}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Brand</Label>
              <BrandToggle
                brands={brands.data?.data ?? []}
                value={brandCode}
                onChange={setChosenBrand}
                variant="display"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Alamat Penerima</Label>
                <button
                  type="button"
                  onClick={() => setAddingAddress(true)}
                  className="text-sm text-hifi-magenta underline underline-offset-2"
                >
                  Tambah baru
                </button>
              </div>
              <Select
                value={addressId ?? ""}
                onValueChange={(value) => setChosenAddress(value ?? undefined)}
              >
                <SelectTrigger className="h-12 w-full rounded-control px-4">
                  <SelectValue placeholder="Pilih dari daftar tersimpan">
                    {(value: string) =>
                      addresses.data?.data.find((a) => a.addressId === value)
                        ?.label ?? "Pilih dari daftar tersimpan"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {addresses.data?.data.map((address) => (
                    <SelectItem key={address.addressId} value={address.addressId}>
                      {address.label} — {address.recipientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Catatan</Label>
              <textarea
                id="note"
                rows={3}
                value={note}
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Tuliskan catatan, jika ada"
                className="w-full rounded-control border border-border-subtle px-4 py-3 text-sm outline-none placeholder:text-text-muted focus-visible:border-hifi-magenta"
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

      <CreateAddressDialog
        open={addingAddress}
        onOpenChange={setAddingAddress}
        onCreated={(address) => setChosenAddress(address.addressId)}
      />
    </>
  );
}
