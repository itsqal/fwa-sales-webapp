import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, API_BASE_URL, REFRESH_COOKIE } from "@/lib/session";

/**
 * Revokes this browser's refresh token upstream, then clears the cookies. The
 * upstream call is best-effort: if it fails the local session must still end.
 */
export async function POST(req: NextRequest) {
  const access = req.cookies.get(ACCESS_COOKIE)?.value;

  if (access) {
    await fetch(`${API_BASE_URL}/admin/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access}` },
      cache: "no-store",
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}
