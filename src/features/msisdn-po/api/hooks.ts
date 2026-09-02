"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiDownload, apiRequest } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  Envelope,
  IssuedMsisdn,
  MsisdnPo,
  MsisdnPoDetail,
  Paginated,
  PairingBodyRow,
  PairingResult,
  PairingValidation,
  SupplyResult,
  SupplyValidation,
} from "./types";

export type MsisdnPoListParams = {
  page: number;
  perPage: number;
  status?: string;
  q?: string;
};

export function useMsisdnPos(params: MsisdnPoListParams) {
  return useQuery({
    queryKey: queryKeys.msisdnPos.list(params),
    queryFn: () =>
      apiRequest<Paginated<MsisdnPo>>("/admin/msisdn-pos", { query: params }),
    placeholderData: (previous) => previous,
  });
}

export function useMsisdnPo(
  id: string | undefined,
  options?: Partial<UseQueryOptions<MsisdnPoDetail>>,
) {
  return useQuery({
    queryKey: queryKeys.msisdnPos.detail(id ?? ""),
    queryFn: () => apiRequest<MsisdnPoDetail>(`/admin/msisdn-pos/${id}`),
    enabled: Boolean(id),
    ...options,
  });
}

/** The numbers issued against a request — backs the download and the pairing preview. */
export function useMsisdnPoNumbers(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.msisdnPos.numbers(id ?? ""),
    queryFn: () =>
      apiRequest<Envelope<IssuedMsisdn>>(`/admin/msisdn-pos/${id}/msisdns`),
    enabled: Boolean(id) && enabled,
  });
}

/** Numbers on this PO still awaiting an IMEI. */
export function usePairingWorklist(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.msisdnPos.pairing(id ?? ""),
    queryFn: () =>
      apiRequest<Envelope<IssuedMsisdn>>(`/admin/msisdn-pos/${id}/pairing`),
    enabled: Boolean(id) && enabled,
  });
}

export function downloadMsisdnPoNumbers(id: string, poCode: string) {
  return apiDownload(
    `/admin/msisdn-pos/${id}/msisdns`,
    { format: "csv" },
    `${poCode}-msisdn.csv`,
  );
}

/* ------------------------------------------------------------------ writes */

/**
 * Every mutation invalidates the whole MSISDN PO tree. These records are read
 * from two sides — a DP list and an IOH list showing the same row — and a
 * narrower invalidation would leave one of them stale after a transition.
 */
function useInvalidate() {
  const client = useQueryClient();
  return () =>
    client.invalidateQueries({ queryKey: queryKeys.msisdnPos.all });
}

export function useCreateMsisdnPo(idempotencyKey: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: {
      callPlanId: string;
      brandCode: string;
      qtyRequested: number;
      note?: string;
    }) =>
      apiRequest<MsisdnPo>("/admin/msisdn-pos", {
        method: "POST",
        body,
        idempotencyKey,
      }),
    onSuccess: invalidate,
  });
}

export function useCancelMsisdnPo() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      apiRequest<MsisdnPo>(`/admin/msisdn-pos/${id}/cancel`, {
        method: "POST",
        body: note ? { note } : {},
      }),
    onSuccess: invalidate,
  });
}

export function useProcessMsisdnPo() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      apiRequest<MsisdnPo>(`/admin/msisdn-pos/${id}/process`, {
        method: "POST",
        body: note ? { note } : {},
      }),
    onSuccess: invalidate,
  });
}

export function useRejectMsisdnPo() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiRequest<MsisdnPo>(`/admin/msisdn-pos/${id}/reject`, {
        method: "POST",
        body: { reason },
      }),
    onSuccess: invalidate,
  });
}

/** Dry run. Writes nothing — this is what the operator reviews. */
export function useValidateSupply() {
  return useMutation({
    mutationFn: ({ id, msisdns }: { id: string; msisdns: string[] }) =>
      apiRequest<SupplyValidation>(`/admin/msisdn-pos/${id}/supply:validate`, {
        method: "POST",
        body: { msisdns },
      }),
  });
}

export function useSupplyMsisdns(idempotencyKey: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, msisdns }: { id: string; msisdns: string[] }) =>
      apiRequest<SupplyResult>(`/admin/msisdn-pos/${id}/supply`, {
        method: "POST",
        body: { msisdns },
        idempotencyKey,
      }),
    onSuccess: invalidate,
  });
}

export function useValidatePairing() {
  return useMutation({
    mutationFn: ({ id, pairs }: { id: string; pairs: PairingBodyRow[] }) =>
      apiRequest<PairingValidation>(`/admin/msisdn-pos/${id}/pairing:validate`, {
        method: "POST",
        body: { pairs },
      }),
  });
}

export function usePairBundles(idempotencyKey: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pairs }: { id: string; pairs: PairingBodyRow[] }) =>
      apiRequest<PairingResult>(`/admin/msisdn-pos/${id}/pairing`, {
        method: "POST",
        body: { pairs },
        idempotencyKey,
      }),
    onSuccess: () => {
      // Pairing changes what a device PO can attach, so both trees move.
      void client.invalidateQueries({ queryKey: queryKeys.msisdnPos.all });
      void client.invalidateQueries({ queryKey: queryKeys.devicePos.all });
    },
  });
}
