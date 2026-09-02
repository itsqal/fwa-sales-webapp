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
import { count } from "@/lib/format";
import type { MsisdnPo } from "@/lib/api/types";
import { useMsisdnPoNumbers } from "../api/hooks";

/** The numbers issued against a request, with their IMEI once paired. */
export function MsisdnListDialog({
  po,
  open,
  onOpenChange,
}: {
  po: MsisdnPo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const numbers = useMsisdnPoNumbers(po?.msisdnPoId, open);
  const rows = numbers.data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full gap-0 overflow-y-auto rounded-card p-8 sm:max-w-lg">
        <DialogTitle className="font-display text-3xl font-semibold text-hifi-magenta">
          Daftar MSISDN
        </DialogTitle>
        <DialogDescription className="sr-only">
          Nomor yang diterbitkan untuk PO ini.
        </DialogDescription>

        {po && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-text-secondary">
              Kode PO: <CopyableCode code={po.poCode} />
            </span>
            <span className="text-text-secondary">
              Jumlah: {count(rows.length || po.qtySupplied)}
            </span>
          </div>
        )}

        <div className="mt-4">
          {numbers.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <MsisdnImeiTable
              rows={rows.map((row) => ({
                brandCode: po?.brand?.displayName,
                msisdn: row.msisdn,
                imei: row.imei,
              }))}
              emptyMessage="Nomor belum diterbitkan untuk PO ini."
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
