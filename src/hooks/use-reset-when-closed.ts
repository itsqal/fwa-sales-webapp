"use client";

import { useState } from "react";

/**
 * Clears a dialog's form state when it closes.
 *
 * Every modal in this app needs it: a Device Partner who opens *Buat PO*,
 * types a quantity, closes it and opens it again must not find the old
 * quantity — these forms end in an attestation, and a stale field is a person
 * signing for something they did not check.
 *
 * This adjusts state during render rather than in an effect. React's own
 * guidance for "reset state when a prop changes" is exactly this shape: the
 * component re-runs immediately with the reset values, so the browser never
 * paints the stale ones, and there is no second commit.
 */
export function useResetWhenClosed(open: boolean, reset: () => void): void {
  const [wasOpen, setWasOpen] = useState(open);

  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) reset();
  }
}
