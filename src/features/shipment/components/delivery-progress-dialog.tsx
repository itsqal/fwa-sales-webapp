"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PackIcon } from "@/components/shell/icon";
import { CopyableCode } from "@/components/domain/copyable-code";
import { useSession } from "@/components/shell/session-context";
import { cn } from "@/lib/utils";
import { ApiRequestError } from "@/lib/api/client";
import { count, dateDayMonth, dateId } from "@/lib/format";
import {
  SHIPMENT_MILESTONES,
  milestoneIcon,
  milestoneLabel,
  type ShipmentMilestone,
} from "@/lib/status";
import type { DevicePo } from "@/lib/api/types";
import { useShipment } from "@/features/device-po/api/hooks";
import { useAddMilestone } from "../api/hooks";

/**
 * *Delivery Progress* — the four-milestone tracker, read-only for the MPX.
 *
 * The Device Partner gets a button to advance it, because there is no courier
 * webhook in v1 and somebody has to record that the box moved. Milestones come
 * back in tracker order, so nothing here sorts them.
 */
export function DeliveryProgressDialog({
  po,
  open,
  onOpenChange,
}: {
  po: DevicePo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const me = useSession();
  const shipment = useShipment(po?.devicePoId, open);
  const addMilestone = useAddMilestone();

  const reached = new Set(
    (shipment.data?.milestones ?? []).map((entry) => entry.milestone),
  );
  const nextMilestone = SHIPMENT_MILESTONES.find(
    (milestone) => !reached.has(milestone),
  );

  async function advance(milestone: ShipmentMilestone) {
    if (!shipment.data) return;
    try {
      await addMilestone.mutateAsync({
        shipmentId: shipment.data.shipmentId,
        milestone,
      });
      toast.success(`Status pengiriman: ${milestoneLabel(milestone)}.`);
    } catch (cause) {
      toast.error(
        cause instanceof ApiRequestError
          ? cause.message
          : "Status tidak dapat disimpan.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full gap-0 rounded-card p-8 sm:max-w-3xl">
        <DialogTitle className="font-display text-3xl font-semibold text-hifi-magenta">
          Delivery Progress
        </DialogTitle>
        <DialogDescription className="sr-only">
          Status pengiriman PO ini.
        </DialogDescription>

        {shipment.isLoading ? (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !shipment.data ? (
          <p className="mt-6 text-sm text-text-secondary">
            Pengiriman untuk PO ini belum dibuat.
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Kode PO">
                {po && <CopyableCode code={po.poCode} truncate={34} />}
              </Field>
              <Field label="MPX">{po?.mpx?.name ?? "—"}</Field>
              <Field label="Kurir">{shipment.data.courierName}</Field>
              <Field label="Nomor Resi">
                <CopyableCode code={shipment.data.awb} />
              </Field>
              <Field label="Estimated delivery">
                {shipment.data.estimatedDeliveryDate
                  ? dateId(shipment.data.estimatedDeliveryDate)
                  : "—"}
              </Field>
              <Field label="Jumlah">{count(po?.qty)}</Field>
            </div>

            <div className="mt-8">
              <div className="h-1 w-full rounded-full bg-border-subtle">
                <div
                  className="h-1 rounded-full bg-hifi-magenta transition-[width]"
                  style={{
                    width: `${progressWidth(reached.size)}%`,
                  }}
                />
              </div>

              <ol className="mt-6 grid grid-cols-4 gap-4">
                {SHIPMENT_MILESTONES.map((milestone) => {
                  const entry = shipment.data?.milestones?.find(
                    (item) => item.milestone === milestone,
                  );
                  const done = Boolean(entry);
                  return (
                    <li
                      key={milestone}
                      className="flex flex-col items-center gap-2 text-center"
                    >
                      <span
                        className={cn(
                          "flex size-11 items-center justify-center rounded-full border-2 border-hifi-magenta",
                          done
                            ? "bg-hifi-magenta text-white"
                            : "bg-surface-card text-hifi-magenta",
                        )}
                      >
                        <PackIcon src={milestoneIcon(milestone)} />
                      </span>
                      <span className="text-sm font-medium text-text-primary">
                        {milestoneLabel(milestone)}
                      </span>
                      <span className="text-sm text-text-secondary">
                        {entry ? dateDayMonth(entry.occurredAt) : "—"}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {me.role === "DP_ADMIN" && nextMilestone && (
              <Button
                onClick={() => advance(nextMilestone)}
                disabled={addMilestone.isPending}
                className="mt-8 h-12 w-full rounded-full bg-hifi-magenta text-base hover:bg-hifi-cta"
              >
                {addMilestone.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Tandai {milestoneLabel(nextMilestone)}
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function progressWidth(reachedCount: number): number {
  if (reachedCount <= 0) return 0;
  const steps = SHIPMENT_MILESTONES.length;
  // The bar reaches the centre of the last completed milestone, matching the
  // mockup where two of four steps leave it just past halfway.
  return Math.min(100, ((reachedCount - 0.5) / steps) * 100);
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
