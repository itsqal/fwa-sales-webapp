"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { ApiRequestError } from "@/lib/api/client";
import type { DeliveryAddress } from "@/lib/api/types";
import { useCreateAddress } from "../api/hooks";

/**
 * *Tambah baru* on the device PO form, and the MPX address book's own action.
 *
 * `mpxId` is deliberately absent: the address belongs to whichever MPX is
 * calling, taken from the token. Latitude and longitude go together or not at
 * all — the API rejects one without the other.
 */
const schema = z
  .object({
    label: z.string().min(1, "Wajib diisi").max(60),
    recipientName: z.string().min(1, "Wajib diisi").max(150),
    recipientPhone: z
      .string()
      .regex(/^(62|0)[0-9]{8,13}$/, "Nomor tidak sah (62… atau 08…)"),
    line1: z.string().min(1, "Wajib diisi"),
    kelurahan: z.string().max(120).optional(),
    kecamatan: z.string().max(120).optional(),
    city: z.string().min(1, "Wajib diisi").max(120),
    province: z.string().min(1, "Wajib diisi").max(120),
    postalCode: z.string().max(10).optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    gmapsUrl: z.string().optional(),
    isDefault: z.boolean(),
  })
  .refine(
    (values) => Boolean(values.latitude) === Boolean(values.longitude),
    {
      message: "Latitude dan longitude harus diisi bersamaan",
      path: ["latitude"],
    },
  );

type Values = z.infer<typeof schema>;

export function CreateAddressDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (address: DeliveryAddress) => void;
}) {
  const [idempotencyKey, resetKey] = useIdempotencyKey();
  const create = useCreateAddress(idempotencyKey);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: "",
      recipientName: "",
      recipientPhone: "",
      line1: "",
      city: "",
      province: "",
      isDefault: false,
    },
  });

  useEffect(() => {
    if (!open) form.reset();
  }, [open, form]);

  async function onSubmit(values: Values) {
    try {
      const address = await create.mutateAsync({
        label: values.label,
        recipientName: values.recipientName,
        recipientPhone: values.recipientPhone,
        line1: values.line1,
        kelurahan: values.kelurahan || undefined,
        kecamatan: values.kecamatan || undefined,
        city: values.city,
        province: values.province,
        postalCode: values.postalCode || undefined,
        latitude: values.latitude ? Number(values.latitude) : undefined,
        longitude: values.longitude ? Number(values.longitude) : undefined,
        gmapsUrl: values.gmapsUrl || undefined,
        isDefault: values.isDefault,
      });
      toast.success(`Alamat "${address.label}" ditambahkan.`);
      resetKey();
      onCreated?.(address);
      onOpenChange(false);
    } catch (cause) {
      form.setError("root", {
        message:
          cause instanceof ApiRequestError
            ? cause.message
            : "Alamat tidak dapat disimpan.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full gap-0 overflow-y-auto rounded-card p-8 sm:max-w-xl">
        <DialogTitle className="font-display text-3xl font-semibold text-hifi-magenta">
          Tambah Alamat
        </DialogTitle>
        <DialogDescription className="mt-1">
          Alamat penerima untuk pengiriman dari Device Partner.
        </DialogDescription>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-6 grid grid-cols-2 gap-4"
        >
          <Field label="Label" error={form.formState.errors.label?.message} full>
            <Input placeholder="mis. Gudang Utama" {...form.register("label")} />
          </Field>

          <Field
            label="Penerima"
            error={form.formState.errors.recipientName?.message}
          >
            <Input placeholder="Nama penerima" {...form.register("recipientName")} />
          </Field>

          <Field
            label="Kontak Penerima"
            error={form.formState.errors.recipientPhone?.message}
          >
            <Input placeholder="08…" {...form.register("recipientPhone")} />
          </Field>

          <Field
            label="Alamat Lengkap"
            error={form.formState.errors.line1?.message}
            full
          >
            <Input placeholder="Nama jalan, nomor" {...form.register("line1")} />
          </Field>

          <Field label="Kelurahan">
            <Input {...form.register("kelurahan")} />
          </Field>
          <Field label="Kecamatan">
            <Input {...form.register("kecamatan")} />
          </Field>
          <Field label="Kota/Kab." error={form.formState.errors.city?.message}>
            <Input {...form.register("city")} />
          </Field>
          <Field
            label="Provinsi"
            error={form.formState.errors.province?.message}
          >
            <Input {...form.register("province")} />
          </Field>
          <Field label="Kode Pos">
            <Input {...form.register("postalCode")} />
          </Field>
          <Field label="Tautan Google Maps">
            <Input placeholder="https://…" {...form.register("gmapsUrl")} />
          </Field>
          <Field
            label="Latitude"
            error={form.formState.errors.latitude?.message}
          >
            <Input placeholder="-0.0263" {...form.register("latitude")} />
          </Field>
          <Field label="Longitude">
            <Input placeholder="109.3425" {...form.register("longitude")} />
          </Field>

          <label className="col-span-2 flex cursor-pointer items-center gap-3 text-sm">
            <Checkbox
              checked={form.watch("isDefault")}
              onCheckedChange={(value) =>
                form.setValue("isDefault", value === true)
              }
            />
            Jadikan alamat utama
          </label>

          {form.formState.errors.root && (
            <p role="alert" className="col-span-2 text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}

          <div className="col-span-2 mt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 flex-1 rounded-full text-base"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={create.isPending}
              className="h-12 flex-1 rounded-full bg-hifi-magenta text-base hover:bg-hifi-cta"
            >
              {create.isPending && <Loader2 className="size-4 animate-spin" />}
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  full,
  children,
}: {
  label: string;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "col-span-2 space-y-1.5" : "space-y-1.5"}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
