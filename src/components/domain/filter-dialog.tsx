"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { PoKind } from "@/lib/status";
import { StatusBadge } from "./status-badge";

/**
 * The *Filter* window behind the funnel on every PO list.
 *
 * It offers **Status only, and one status at a time**. The design draws
 * multi-select checkboxes and a Brand section, but the list endpoints accept a
 * single `status` and no brand at all. Filtering the rows already on screen
 * would narrow ten rows out of two hundred and still claim twenty pages, so the
 * dialog offers exactly what the API can answer. Picking a status unticks the
 * others; *Semua* means no filter.
 *
 * Choices are a draft until *Terapkan*. The draft lives inside the dialog body,
 * which unmounts on close, so every open starts from the filter actually in
 * force rather than from whatever was half-picked last time.
 */
export function FilterDialog({
  open,
  onOpenChange,
  statuses,
  statusKind,
  value,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: readonly string[];
  statusKind?: PoKind;
  /** The status currently in force; `undefined` is *Semua*. */
  value: string | undefined;
  onApply: (status: string | undefined) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full gap-0 overflow-y-auto rounded-card p-8 sm:max-w-xl">
        <DialogTitle className="font-display text-3xl font-semibold text-hifi-magenta">
          Filter
        </DialogTitle>
        <DialogDescription className="sr-only">
          Saring daftar berdasarkan status.
        </DialogDescription>

        <FilterBody
          statuses={statuses}
          statusKind={statusKind}
          initial={value}
          onApply={(status) => {
            onApply(status);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function FilterBody({
  statuses,
  statusKind,
  initial,
  onApply,
}: {
  statuses: readonly string[];
  statusKind?: PoKind;
  initial: string | undefined;
  onApply: (status: string | undefined) => void;
}) {
  const [draft, setDraft] = useState<string | undefined>(initial);

  return (
    <>
      <section className="mt-6 rounded-card bg-surface-muted p-5">
        <h3 className="text-sm font-semibold text-text-primary">Status</h3>

        <div className="mt-4 rounded-card bg-surface-card p-4">
          <ul className="space-y-3">
            <FilterRow
              id="filter-status-all"
              checked={draft === undefined}
              onToggle={() => setDraft(undefined)}
            >
              <span className="text-sm text-text-primary">Semua</span>
            </FilterRow>

            {statuses.map((status) => (
              <FilterRow
                key={status}
                id={`filter-status-${status}`}
                checked={draft === status}
                // Ticking the status already chosen falls back to Semua, so the
                // list can always be emptied from inside the section.
                onToggle={() =>
                  setDraft((current) =>
                    current === status ? undefined : status,
                  )
                }
              >
                {statusKind ? (
                  <StatusBadge status={status} kind={statusKind} />
                ) : (
                  <span className="text-sm text-text-primary">{status}</span>
                )}
              </FilterRow>
            ))}
          </ul>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setDraft(undefined)}
              className="text-sm font-medium text-hifi-magenta hover:underline"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button
          onClick={() => onApply(draft)}
          className="h-12 rounded-full bg-hifi-magenta text-base hover:bg-hifi-cta"
        >
          Terapkan
        </Button>
        {/* Clears every filter and applies straight away — the section's own
          * Reset only clears the draft. */}
        <Button
          variant="outline"
          onClick={() => onApply(undefined)}
          className="h-12 rounded-full border-hifi-magenta text-base text-hifi-magenta hover:bg-hifi-tint hover:text-hifi-magenta"
        >
          Reset
        </Button>
      </div>
    </>
  );
}

function FilterRow({
  id,
  checked,
  onToggle,
  children,
}: {
  id: string;
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <label htmlFor={id} className="flex cursor-pointer items-center gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={onToggle}
          className="size-5 rounded-[6px] border-hifi-magenta"
        />
        {children}
      </label>
    </li>
  );
}
