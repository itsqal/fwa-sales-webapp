"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  CreateAddressBody,
  DeliveryAddress,
  Paginated,
} from "@/lib/api/types";

export type AddressListParams = { page: number; perPage: number };

/** Default first, then alphabetical — the PO form preselects the default. */
export function useAddresses(params: AddressListParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.addresses.list(params),
    queryFn: () =>
      apiRequest<Paginated<DeliveryAddress>>("/admin/addresses", {
        query: params,
      }),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useAddress(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.addresses.detail(id ?? ""),
    queryFn: () => apiRequest<DeliveryAddress>(`/admin/addresses/${id}`),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateAddress(idempotencyKey: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAddressBody) =>
      apiRequest<DeliveryAddress>("/admin/addresses", {
        method: "POST",
        body,
        idempotencyKey,
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: queryKeys.addresses.all }),
  });
}
