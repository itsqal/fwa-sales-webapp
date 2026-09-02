import { AppShell } from "@/components/shell/app-shell";
import { requireRole } from "@/lib/api/server";

export default async function IohLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireRole("IOH_ADMIN");
  return <AppShell me={me}>{children}</AppShell>;
}
