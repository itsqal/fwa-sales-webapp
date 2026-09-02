"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  Brand,
  CallPlan,
  DeviceModelRef,
  DevicePartnerRef,
  Envelope,
  MpxRef,
} from "@/lib/api/types";

/**
 * Read-only master data the forms are built from. Small fixed sets, returned
 * unpaginated, and stable for the life of a session — so they are cached hard.
 */
const MASTER_DATA = { staleTime: 30 * 60 * 1000, gcTime: 60 * 60 * 1000 };

export function useCallPlans() {
  return useQuery({
    queryKey: queryKeys.reference.callPlans,
    queryFn: () =>
      apiRequest<Envelope<CallPlan>>("/admin/reference/call-plans"),
    ...MASTER_DATA,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.reference.brands,
    queryFn: () => apiRequest<Envelope<Brand>>("/admin/reference/brands"),
    ...MASTER_DATA,
  });
}

export function useDeviceModels(includeInactive = false) {
  return useQuery({
    queryKey: [...queryKeys.reference.deviceModels, includeInactive],
    queryFn: () =>
      apiRequest<Envelope<DeviceModelRef>>("/admin/reference/device-models", {
        query: { includeInactive },
      }),
    ...MASTER_DATA,
  });
}

/** IOH and MPX only. A Device Partner has no reason to enumerate competitors. */
export function useDevicePartners(enabled = true) {
  return useQuery({
    queryKey: queryKeys.reference.devicePartners,
    queryFn: () =>
      apiRequest<Envelope<DevicePartnerRef>>("/admin/reference/device-partners"),
    enabled,
    ...MASTER_DATA,
  });
}

/** IOH and DP only. An MPX already knows which MPX it is. */
export function useMpxList(enabled = true) {
  return useQuery({
    queryKey: queryKeys.reference.mpx,
    queryFn: () => apiRequest<Envelope<MpxRef>>("/admin/reference/mpx"),
    enabled,
    ...MASTER_DATA,
  });
}
