import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, API_BASE_URL } from "@/lib/session";
import type { AdminProfile, AdminRole } from "./types";

/**
 * Server-side reads.
 *
 * Server components use this for one thing only — the signed-in profile, which
 * is what every role guard and the whole sidebar are built from. Screen data is
 * fetched by TanStack Query through the proxy, so there is exactly one place
 * that decides what a role may see and it is not scattered across pages.
 *
 * The middleware has already refreshed an expiring token by the time a page
 * renders, so a 401 here means the session is genuinely finished.
 */
async function serverFetch<T>(path: string): Promise<T | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as T;
}

/** Deduplicated per request: the layout and the page both ask for it. */
export const getMe = cache(async (): Promise<AdminProfile | null> => {
  return serverFetch<AdminProfile>("/admin/me");
});

/**
 * The role guard. Route groups (`/dp`, `/ioh`, `/mpx`) are organisation, not
 * authorisation — a DP_ADMIN who types `/mpx/stock` is refused here, in the
 * layout, before any MPX screen renders.
 */
export async function requireRole(role: AdminRole): Promise<AdminProfile> {
  const me = await getMe();
  if (!me) redirect("/login");
  if (me.role !== role) redirect("/403");
  return me;
}

export async function requireSession(): Promise<AdminProfile> {
  const me = await getMe();
  if (!me) redirect("/login");
  return me;
}

/** Where each role lands after login. There is no shared home screen. */
export function homePathFor(role: AdminRole): string {
  switch (role) {
    case "DP_ADMIN":
      return "/dp/msisdn-po";
    case "IOH_ADMIN":
      return "/ioh/purchase-order";
    case "MPX_ADMIN":
      return "/mpx/purchase-order";
  }
}
