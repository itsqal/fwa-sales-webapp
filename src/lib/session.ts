import "server-only";
import { decodeJwt } from "jose";

/**
 * The dashboard session.
 *
 * Both tokens live in httpOnly cookies and never reach JavaScript. Every browser
 * call goes through the gateway route in `app/api/upstream`, which attaches the
 * bearer server-side. The upstream service sends no CORS headers, so a direct
 * call from the page would be blocked anyway, and this way a stolen XSS payload
 * cannot read a token that would let it act as a Device Partner.
 */

export const ACCESS_COOKIE = "fwa_at";
export const REFRESH_COOKIE = "fwa_rt";

/** Refresh this many seconds before the access token actually expires. */
const REFRESH_SKEW_SECONDS = 60;

export const API_BASE_URL =
  process.env.API_BASE_URL ?? "http://localhost:8000/v1";

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
}

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Access tokens live 15 minutes; the cookie outlives the token so we can spot
 * an expired one and refresh rather than treating the user as signed out. */
export const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function isExpired(token: string | undefined): boolean {
  if (!token) return true;
  try {
    const { exp } = decodeJwt(token);
    if (typeof exp !== "number") return true;
    return exp - REFRESH_SKEW_SECONDS <= Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}

/**
 * Exchange a refresh token for a new pair. The upstream rotates on every call
 * and revokes the presented token whether or not it was a replay, so the result
 * must be written back to the cookies of whatever response triggered this.
 */
export async function refreshTokens(
  refreshToken: string,
): Promise<RefreshedTokens | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as RefreshedTokens;
    if (!body.accessToken || !body.refreshToken) return null;
    return { accessToken: body.accessToken, refreshToken: body.refreshToken };
  } catch {
    return null;
  }
}
