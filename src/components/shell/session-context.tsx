"use client";

import { createContext, useContext } from "react";
import type { AdminProfile } from "@/lib/api/types";

const SessionContext = createContext<AdminProfile | null>(null);

/**
 * The signed-in profile, resolved once on the server and handed to the client
 * tree. Every attestation checkbox renders `fullName` from here rather than
 * hardcoding a name, and the row actions a screen offers depend on `role`.
 */
export function SessionProvider({
  me,
  children,
}: {
  me: AdminProfile;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={me}>{children}</SessionContext.Provider>
  );
}

/**
 * The profile if there is one, `null` otherwise. For shared components — the
 * status badge, the filter — that render inside the dashboard but must not
 * throw if someone ever uses them outside it.
 */
export function useOptionalSession(): AdminProfile | null {
  return useContext(SessionContext);
}

export function useSession(): AdminProfile {
  const me = useContext(SessionContext);
  if (!me) {
    throw new Error("useSession must be used inside the dashboard shell.");
  }
  return me;
}
