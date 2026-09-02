"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Label } from "@/components/ui/label";

/**
 * `+` appends to the staged list. Used for typing MSISDNs one at a time on the
 * IOH supply wizard and IMEIs on the DP pairing wizard.
 *
 * Validation is the caller's: it knows whether this is a number or an IMEI, and
 * whether the value is already staged.
 */
export function ManualEntryPanel({
  label,
  placeholder,
  onAdd,
  disabled,
  inputMode = "numeric",
}: {
  label: string;
  placeholder: string;
  /** Returns an error message, or null when the value was accepted. */
  onAdd: (value: string) => string | null;
  disabled?: boolean;
  inputMode?: "numeric" | "text";
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    const message = onAdd(trimmed);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setValue("");
  }

  return (
    <div>
      <Label className="text-text-primary">{label}</Label>
      <div className="mt-2 flex overflow-hidden rounded-control border border-border-subtle">
        <input
          value={value}
          disabled={disabled}
          inputMode={inputMode}
          placeholder={placeholder}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          className="h-12 min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-text-muted disabled:opacity-50"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled}
          aria-label={`Tambah ${label}`}
          className="flex w-14 shrink-0 items-center justify-center bg-surface-muted text-text-secondary transition-colors hover:bg-border-subtle disabled:opacity-50"
        >
          <Plus className="size-5" />
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
