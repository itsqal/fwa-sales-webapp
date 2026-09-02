import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE,
  cookieOptions,
  isExpired,
  refreshTokens,
} from "@/lib/session";

/**
 * Runs before every dashboard request (Next 16 calls this file `proxy`; it was
 * `middleware` before).
 *
 * Keeps the access token fresh and keeps signed-out browsers off the dashboard.
 *
 * Access tokens live 15 minutes, so an admin who leaves a PO list open over
 * lunch would otherwise come back to a wall of 401s. Refreshing here — before
 * the request reaches a page — means server components can read a usable token
 * straight from the request cookies.
 *
 * This is *not* the authorisation check. Role comes from `GET /admin/me` in each
 * route group's layout, never from the URL and never from a token claim.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLogin = pathname === "/login";

  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  if (!refresh) {
    if (isLogin) return NextResponse.next();
    return redirectToLogin(req);
  }

  let rotated: { accessToken: string; refreshToken: string } | null = null;

  if (isExpired(access)) {
    rotated = await refreshTokens(refresh);
    if (!rotated) {
      const response = isLogin
        ? NextResponse.next()
        : redirectToLogin(req);
      response.cookies.delete(ACCESS_COOKIE);
      response.cookies.delete(REFRESH_COOKIE);
      return response;
    }
    // Update the *request* cookies as well, so the page rendered by this same
    // request sees the new token rather than the one that just expired.
    req.cookies.set(ACCESS_COOKIE, rotated.accessToken);
    req.cookies.set(REFRESH_COOKIE, rotated.refreshToken);
  }

  const response = NextResponse.next({ request: req });

  if (rotated) {
    response.cookies.set(
      ACCESS_COOKIE,
      rotated.accessToken,
      cookieOptions(ACCESS_COOKIE_MAX_AGE),
    );
    response.cookies.set(
      REFRESH_COOKIE,
      rotated.refreshToken,
      cookieOptions(REFRESH_COOKIE_MAX_AGE),
    );
  }

  return response;
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const from = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  if (from !== "/" && !from.startsWith("/api/")) {
    url.searchParams.set("from", from);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals, the auth routes (which run without a
     * session by definition), and static assets.
     */
    "/((?!_next/static|_next/image|api/auth|assets|favicon|.*\.(?:svg|png|ico|webmanifest)$).*)",
  ],
};
