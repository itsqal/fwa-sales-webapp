"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AdminAccountExecutive,
  AdminAccountExecutiveDetail,
  Allocation,
  AllocationDetail,
  CreateAllocationBody,
  Envelope,
  Paginated,
  StockBundle,
  StockLine,
} from "@/lib/api/types";

/** *Stok Tersedia*, by device model. */
export function useStockSummary() {
  return useQuery({
    queryKey: queryKeys.stock.summary,
    queryFn: () => apiRequest<Envelope<StockLine>>("/admin/stock"),
  });
}

/**
 * Individual allocatable units, oldest received first — the same order
 * automatic allocation takes them in, so the top of this list is what
 * *Otomatis* would have chosen.
 */
export function useStockBundles(
  params: { page: number; perPage: number; deviceModelId?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.stock.bundles(params),
    queryFn: () =>
      apiRequest<Paginated<StockBundle>>("/admin/stock/bundles", {
        query: params,
      }),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export type AeListParams = { page: number; perPage: number; q?: string };

export function useAccountExecutives(params: AeListParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.accountExecutives.list(params),
    queryFn: () =>
      apiRequest<Paginated<AdminAccountExecutive>>("/admin/account-executives", {
        query: params,
      }),
    enabled,
    placeholderData: (previous) => previous,
  });
}

/** *Tentang AE* — ID, Brand, Branch, and what they are currently holding. */
export function useAccountExecutive(aeId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.accountExecutives.detail(aeId ?? ""),
    queryFn: () =>
      apiRequest<AdminAccountExecutiveDetail>(
        `/admin/account-executives/${aeId}`,
      ),
    enabled: Boolean(aeId) && enabled,
  });
}

export function useAllocations(params: { page: number; perPage: number }) {
  return useQuery({
    queryKey: queryKeys.allocations.list(params),
    queryFn: () =>
      apiRequest<Paginated<Allocation>>("/admin/allocations", {
        query: params,
      }),
    placeholderData: (previous) => previous,
  });
}

/**
 * The end of the chain, and the only writer of `fwa_inventory.allocated_ae_id`.
 * After this call the units are visible to that salesman's barcode scanner;
 * before it, nothing in the supply chain is.
 */
export function useAllocateStock(idempotencyKey: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAllocationBody) =>
      apiRequest<AllocationDetail>("/admin/allocations", {
        method: "POST",
        body,
        idempotencyKey,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.stock.all });
      void client.invalidateQueries({ queryKey: queryKeys.allocations.all });
      void client.invalidateQueries({
        queryKey: queryKeys.accountExecutives.all,
      });
    },
  });
}
