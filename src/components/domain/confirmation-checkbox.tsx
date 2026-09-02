"use client";

import { Checkbox } from "@/components/ui/checkbox";

/**
 * The attestation, not a formality.
 *
 * *"Saya, Atha Marcella, mengonfirmasi bahwa…"* names a person, the name is
 * rendered from the signed-in profile and never hardcoded, and it is what the
 * server records in the status history's *oleh* column. Submit stays disabled
 * until it is ticked.
 */
export function ConfirmationCheckbox({
  fullName,
  statement,
  checked,
  onCheckedChange,
  id = "attestation",
}: {
  fullName: string;
  /** The clause after the name, e.g. "mengonfirmasi bahwa pesanan PO ini…". */
  statement: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-text-primary"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5 size-5 rounded-[6px]"
      />
      <span>
        Saya, {fullName}, {statement}
      </span>
    </label>
  );
}
