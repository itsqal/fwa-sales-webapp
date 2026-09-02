"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AttachBundlesResult,
  AttachBundlesValidation,
  Bundle,
  DevicePo,
  DevicePoDetail,
  Envelope,
  GoodsReceipt,
  Paginated,
  Shipment,
} from "@/lib/api/types";

export type DevicePoListParams = {
  page: number;
  perPage: number;
  status?: string;
  q?: string;
};

export function useDevicePos(params: DevicePoListParams) {
  return useQuery({
    queryKey: queryKeys.devicePos.list(params),
    queryFn: () =>
      apiRequest<Paginated<DevicePo>>("/admin/device-pos", { query: params }),
    placeholderData: (previous) => previous,
  });
}

export function useDevicePo(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.devicePos.detail(id ?? ""),
    queryFn: () => apiRequest<DevicePoDetail>(`/admin/device-pos/${id}`),
    enabled: Boolean(id) && enabled,
  });
}

/** Backs *Detail IMEI & MSISDN*. */
export function useDevicePoBundles(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.devicePos.bundles(id ?? ""),
    queryFn: () =>
      apiRequest<Envelope<Bundle>>(`/admin/device-pos/${id}/bundles`),
    enabled: Boolean(id) && enabled,
  });
}

/** Backs the four-step Delivery Progress tracker. */
export function useShipment(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.devicePos.shipment(id ?? ""),
    queryFn: () => apiRequest<Shipment>(`/admin/device-pos/${id}/shipment`),
    enabled: Boolean(id) && enabled,
    retry: false,
  });
}

export function useReceipt(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.devicePos.receipt(id ?? ""),
    queryFn: () => apiRequest<GoodsReceipt>(`/admin/device-pos/${id}/receipt`),
    enabled: Boolean(id) && enabled,
    retry: false,
  });
}

/* ------------------------------------------------------------------ writes */

/**
 * A device PO is read from two sides and its transitions move inventory, so a
 * write invalidates the order tree and the stock tree together. Anything less
 * leaves the MPX stock screen showing units that have already been allocated.
 */
function useInvalidate() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: queryKeys.devicePos.all });
    void client.invalidateQueries({ queryKey: queryKeys.stock.all });
  };
}

export function useCreateDevicePo(idempotencyKey: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: {
      devicePartnerId: string;
      deviceModelId: string;
      brandCode: string;
      qty: number;
      addressId: string;
      picName?: string;
      picPhone?: string;
      note?: string;
    }) =>
      apiRequest<DevicePo>("/admin/device-pos", {
        method: "POST",
        body,
        idempotencyKey,
      }),
    onSuccess: invalidate,
  });
}

/** `accept` / `cancel` — the transitions that carry only an optional note. */
export function useDevicePoTransition(action: "accept" | "cancel" | "inspect") {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      apiRequest<DevicePo>(`/admin/device-pos/${id}/${action}`, {
        method: "POST",
        body: note ? { note } : {},
      }),
    onSuccess: invalidate,
  });
}

export function useRejectDevicePo() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiRequest<DevicePo>(`/admin/device-pos/${id}/reject`, {
        method: "POST",
        body: { reason },
      }),
    onSuccess: invalidate,
  });
}

export function useValidateBundles() {
  return useMutation({
    mutationFn: ({ id, msisdns }: { id: string; msisdns: string[] }) =>
      apiRequest<AttachBundlesValidation>(
        `/admin/device-pos/${id}/bundles:validate`,
        { method: "POST", body: { msisdns } },
      ),
  });
}

export function useAttachBundles(idempotencyKey: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, msisdns }: { id: string; msisdns: string[] }) =>
      apiRequest<AttachBundlesResult>(`/admin/device-pos/${id}/bundles`, {
        method: "POST",
        body: { msisdns },
        idempotencyKey,
      }),
    onSuccess: invalidate,
  });
}
