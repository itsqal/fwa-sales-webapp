import { AppShell } from "@/components/shell/app-shell";
import { requireRole } from "@/lib/api/server";

/**
 * Route groups are organisation, not authorisation. The guard is here, against
 * the session — a DP_ADMIN who types `/mpx/stock` is refused before any MPX
 * screen renders.
 */
export default async function DpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireRole("DP_ADMIN");
  return <AppShell me={me}>{children}</AppShell>;
}
