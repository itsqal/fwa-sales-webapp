"use client";

import { useCallback, useState } from "react";

/**
 * One key per form instance, generated when the form mounts rather than when it
 * submits — so a double-click and a retry after a dropped response share a key
 * and the server returns the original result instead of writing twice.
 *
 * `reset` mints a new one after a successful write, so reopening the same modal
 * starts a genuinely new operation.
 */
export function useIdempotencyKey(): [string, () => void] {
  const [key, setKey] = useState(() => crypto.randomUUID());
  const reset = useCallback(() => setKey(crypto.randomUUID()), []);
  return [key, reset];
}
