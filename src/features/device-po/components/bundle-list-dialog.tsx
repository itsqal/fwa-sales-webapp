"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyableCode } from "@/components/domain/copyable-code";
import { MsisdnImeiTable } from "@/components/domain/msisdn-imei-table";
import type { DevicePo } from "@/lib/api/types";
import { useDevicePoBundles } from "../api/hooks";

/** *Detail Penerimaan PO* — the units attached to an order. */
export function BundleListDialog({
  po,
  open,
  onOpenChange,
}: {
  po: DevicePo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const bundles = useDevicePoBundles(po?.devicePoId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full gap-0 overflow-y-auto rounded-card p-8 sm:max-w-lg">
        <DialogTitle className="font-display text-3xl font-semibold text-hifi-magenta">
          Detail Penerimaan PO
        </DialogTitle>
        <DialogDescription className="sr-only">
          Daftar MSISDN dan IMEI pada PO ini.
        </DialogDescription>

        {po && (
          <>
            <div className="mt-5">
              <p className="text-sm text-text-secondary">Kode PO</p>
              <p className="mt-1 text-sm text-text-primary">
                <CopyableCode code={po.poCode} />
              </p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium text-text-primary">Penerima</p>
                <p className="mt-1 text-text-secondary">{po.picName ?? "–"}</p>
              </div>
              <div>
                <p className="font-medium text-text-primary">Kontak Penerima</p>
                <p className="mt-1 text-text-secondary">{po.picPhone ?? "–"}</p>
              </div>
              <div>
                <p className="font-medium text-text-primary">Catatan</p>
                <p className="mt-1 text-text-secondary">
                  {po.note?.trim() ? po.note : "–"}
                </p>
              </div>
            </div>
          </>
        )}

        <div className="mt-5 rounded-control border border-border-subtle">
          {bundles.isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <MsisdnImeiTable
              rows={(bundles.data?.data ?? []).map((bundle) => ({
                brandCode: bundle.brandCode,
                msisdn: bundle.msisdn,
                imei: bundle.imei,
              }))}
              emptyMessage="Belum ada unit yang dipasang pada PO ini."
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
