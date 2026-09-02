import { redirect } from "next/navigation";
import { getMe, homePathFor } from "@/lib/api/server";

/**
 * There is no shared landing page — reporting is out of scope for v1 and an
 * empty dashboard is worse than no dashboard. Each role goes straight to the
 * list it actually works from.
 */
export default async function RootPage() {
  const me = await getMe();
  if (!me) redirect("/login");
  redirect(homePathFor(me.role));
}
