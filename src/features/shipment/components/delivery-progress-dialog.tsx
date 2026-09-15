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
import { TRACKER_STEPS, type TrackerStep } from "@/lib/status";
import type { DevicePo, Shipment } from "@/lib/api/types";
import { useShipment } from "@/features/device-po/api/hooks";
import { useAddMilestone } from "../api/hooks";

/**
 * *Delivery Progress* — Preparing → Shipped → In Transit → Delivered. Read-only
 * for the MPX.
 *
 * The Device Partner gets a button to advance it, because there is no courier
 * webhook in v1 and somebody has to record that the box moved. How the four steps
 * map onto the API's milestones lives in `TRACKER_STEPS`.
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

  const progress = shipment.data ? trackProgress(shipment.data, po) : null;

  async function advance(step: TrackerStep) {
    if (!shipment.data || !step.recordAs) return;
    try {
      await addMilestone.mutateAsync({
        shipmentId: shipment.data.shipmentId,
        milestone: step.recordAs,
      });
      toast.success(`Status pengiriman: ${step.label}.`);
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
        ) : !shipment.data || !progress ? (
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
                  style={{ width: `${progressWidth(progress.furthest)}%` }}
                />
              </div>

              <ol className="mt-6 grid grid-cols-4 gap-4">
                {progress.steps.map(({ step, reached, occurredAt }) => (
                  <li
                    key={step.key}
                    className="flex flex-col items-center gap-2 text-center"
                  >
                    <span
                      className={cn(
                        "flex size-11 items-center justify-center rounded-full border-2 border-hifi-magenta",
                        reached
                          ? "bg-hifi-magenta text-white"
                          : "bg-surface-card text-hifi-magenta",
                      )}
                    >
                      <PackIcon src={step.icon} />
                    </span>
                    <span className="text-sm font-medium text-text-primary">
                      {step.label}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {occurredAt ? dateDayMonth(occurredAt) : "—"}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {me.role === "DP_ADMIN" && progress.next && (
              <Button
                onClick={() => progress.next && advance(progress.next)}
                disabled={addMilestone.isPending}
                className="mt-8 h-12 w-full rounded-full bg-hifi-magenta text-base hover:bg-hifi-cta"
              >
                {addMilestone.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Tandai {progress.next.label}
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Where a shipment stands on the four steps.
 *
 * The API rejects a repeated milestone but not an out-of-order one, so a
 * shipment can carry `DELIVERED` without `IN_TRANSIT`. Progress is therefore the
 * furthest step reached, not a count — a delivered box has plainly been in
 * transit, even if nobody recorded the moment, so every earlier step lights up
 * and the one with no recorded time shows a dash instead of a date.
 */
function trackProgress(shipment: Shipment, po: DevicePo | null) {
  const recorded = new Map(
    shipment.milestones.map((entry) => [entry.milestone, entry.occurredAt]),
  );

  const found = TRACKER_STEPS.map((step) => {
    // Preparing exists as soon as a shipment does; it dates from acceptance,
    // which is when the Device Partner started packing.
    if (step.milestones.length === 0) {
      return { step, recorded: true, occurredAt: po?.acceptedAt };
    }
    const hit = step.milestones.find((milestone) => recorded.has(milestone));
    return {
      step,
      recorded: hit !== undefined,
      occurredAt: hit ? recorded.get(hit) : undefined,
    };
  });

  const furthest = found.reduce(
    (last, entry, index) => (entry.recorded ? index : last),
    -1,
  );

  return {
    furthest,
    steps: found.map((entry, index) => ({
      step: entry.step,
      reached: index <= furthest,
      occurredAt: entry.occurredAt,
    })),
    // Only offer a step beyond the furthest one reached: marking In Transit on a
    // box already delivered would draw progress that goes backwards.
    next: TRACKER_STEPS.slice(furthest + 1).find((step) => step.recordAs),
  };
}

/** The bar stops at the centre of the furthest step reached. */
function progressWidth(furthest: number): number {
  if (furthest < 0) return 0;
  return Math.min(100, ((furthest + 0.5) / TRACKER_STEPS.length) * 100);
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
