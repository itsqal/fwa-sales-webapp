"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  CreateShipmentBody,
  Shipment,
  ShipmentMilestoneType,
} from "@/lib/api/types";

export function useCreateShipment(idempotencyKey: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CreateShipmentBody }) =>
      apiRequest<Shipment>(`/admin/device-pos/${id}/shipment`, {
        method: "POST",
        body,
        idempotencyKey,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.devicePos.all });
    },
  });
}

/**
 * There is no courier integration in v1, so the Device Partner advances the
 * tracker by hand. Each milestone is recorded once — repeating one would draw a
 * progress bar that goes backwards.
 */
export function useAddMilestone() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      shipmentId,
      milestone,
      note,
    }: {
      shipmentId: string;
      milestone: ShipmentMilestoneType;
      note?: string;
    }) =>
      apiRequest<Shipment>(`/admin/shipments/${shipmentId}/milestones`, {
        method: "POST",
        body: { milestone, note },
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.devicePos.all });
    },
  });
}
