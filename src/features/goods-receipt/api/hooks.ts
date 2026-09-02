"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { GoodsReceipt } from "@/lib/api/types";

/**
 * *Konfirmasi Penerimaan* — one final, all-or-nothing confirmation.
 *
 * If the box is short this returns `422 RECEIPT_INCOMPLETE`, nothing is written,
 * and the order stays at `PERIKSA`. Confirmed 2026-09-01: reshipping happens
 * outside this system and the MPX confirms only once the full list is physically
 * present, which is why there is no partial-receipt state — the alternative was
 * an MPX admin personally attesting to units they never received.
 */
export function useConfirmReceipt(idempotencyKey: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      note,
    }: {
      id: string;
      note?: string;
    }) =>
      apiRequest<GoodsReceipt>(`/admin/device-pos/${id}/receipt`, {
        method: "POST",
        body: { confirmed: true, note },
        idempotencyKey,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.devicePos.all });
      // Confirmed units become allocatable stock in the same transaction.
      void client.invalidateQueries({ queryKey: queryKeys.stock.all });
    },
  });
}
