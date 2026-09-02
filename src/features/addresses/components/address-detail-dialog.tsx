"use client";

import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyableCode } from "@/components/domain/copyable-code";
import { useAddress } from "../api/hooks";
import type { DeliveryAddress } from "@/lib/api/types";

/**
 * *Alamat Lengkap*. Every field on the schema is rendered here, which is why
 * they all exist on the schema.
 *
 * The mockup embeds a live Google map. Doing that needs a Maps JavaScript key
 * and a billing account nobody has provisioned, so the panel links out instead
 * — the address book already stores `gmapsUrl` for exactly this.
 */
export function AddressDetailDialog({
  addressId,
  address,
  poCode,
  note,
  open,
  onOpenChange,
}: {
  addressId?: string;
  /** Passed directly when the caller already has it (the device PO detail). */
  address?: DeliveryAddress;
  poCode?: string;
  note?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fetched = useAddress(addressId, open && !address);
  const data = address ?? fetched.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full gap-0 overflow-y-auto rounded-card p-8 sm:max-w-lg">
        <DialogTitle className="font-display text-3xl font-semibold text-hifi-magenta">
          Alamat Lengkap
        </DialogTitle>
        <DialogDescription className="sr-only">
          Rincian alamat penerima.
        </DialogDescription>

        {poCode && (
          <div className="mt-5">
            <p className="text-sm text-text-secondary">Kode PO</p>
            <p className="mt-1 text-sm text-text-primary">
              <CopyableCode code={poCode} />
            </p>
          </div>
        )}

        {!data ? (
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Penerima">{data.recipientName}</Field>
              <Field label="Kontak Penerima">{data.recipientPhone}</Field>
              <Field label="Catatan">{note?.trim() ? note : "–"}</Field>
            </div>

            {data.gmapsUrl && (
              <a
                href={data.gmapsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-control border border-border-subtle px-4 py-2.5 text-sm text-status-diproses transition-colors hover:bg-surface-muted"
              >
                Open in Maps
                <ExternalLink className="size-4" />
              </a>
            )}

            <Field label="Alamat Penerima">
              {[
                data.line1,
                data.kelurahan,
                data.kecamatan ? `Kec. ${data.kecamatan}` : undefined,
                data.city,
                `${data.province}${data.postalCode ? ` ${data.postalCode}` : ""}`,
              ]
                .filter(Boolean)
                .join("; ")}
            </Field>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Kelurahan">{data.kelurahan ?? "–"}</Field>
              <Field label="Kecamatan">{data.kecamatan ?? "–"}</Field>
              <Field label="Kota/Kab.">{data.city}</Field>
              <Field label="Provinsi">{data.province}</Field>
              <Field label="Kode Pos">{data.postalCode ?? "–"}</Field>
              <Field label="Tautan Google Maps">
                {data.gmapsUrl ? (
                  <a
                    href={data.gmapsUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="break-all text-hifi-magenta hover:underline"
                  >
                    {data.gmapsUrl}
                  </a>
                ) : (
                  "–"
                )}
              </Field>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
      <p className="text-sm font-medium text-text-primary">{label}</p>
      <p className="mt-1 text-sm text-text-secondary">{children}</p>
    </div>
  );
}
