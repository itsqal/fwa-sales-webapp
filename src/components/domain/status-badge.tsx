import { cn } from "@/lib/utils";
import { statusLabel, statusVariant } from "@/lib/status";

/**
 * The only way a status reaches the screen. Colour never carries the meaning on
 * its own — the label is always rendered with it.
 */
export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        statusVariant(status),
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
