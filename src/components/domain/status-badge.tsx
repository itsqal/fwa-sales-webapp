"use client";

import { cn } from "@/lib/utils";
import { statusLabel, statusVariant, type PoKind } from "@/lib/status";
import { useOptionalSession } from "@/components/shell/session-context";

/**
 * The only way a status reaches the screen. Colour never carries the meaning on
 * its own — the label is always rendered with it.
 *
 * The label depends on who is looking and at which kind of order (see
 * `CONTEXT_LABELS` in `lib/status.ts`). `kind` is required so that no call site
 * can silently fall back to the generic word; the role is read here rather than
 * threaded through every table, detail view and Riwayat row.
 */
export function StatusBadge({
  status,
  kind,
  className,
}: {
  status: string;
  kind: PoKind;
  className?: string;
}) {
  const role = useOptionalSession()?.role;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        statusVariant(status),
        className,
      )}
    >
      {statusLabel(status, { kind, role })}
    </span>
  );
}
