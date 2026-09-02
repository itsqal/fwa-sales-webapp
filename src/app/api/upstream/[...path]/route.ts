import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  API_BASE_URL,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE,
  cookieOptions,
  refreshTokens,
} from "@/lib/session";

/**
 * The one door between the browser and the supply-chain API.
 *
 * Not to be confused with `src/proxy.ts`, which is Next's request interceptor.
 *
 * Everything the client fetches goes through here so that (a) the access token
 * stays in an httpOnly cookie, and (b) a 401 mid-session is repaired by a single
 * refresh-and-retry rather than dumping the user back at the login screen with a
 * half-filled form. The upstream serves no CORS headers, so this is also the only
 * way a browser can reach it at all.
 */

type Ctx = { params: Promise<{ path: string[] }> };

const PASSTHROUGH_REQUEST_HEADERS = ["content-type", "idempotency-key"];

async function handle(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params;
  const search = req.nextUrl.search;
  const target = `${API_BASE_URL}/${path.join("/")}${search}`;

  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  if (!access && !refresh) {
    return NextResponse.json(
      { error: { code: "NO_SESSION", message: "Sesi Anda telah berakhir." } },
      { status: 401 },
    );
  }

  // Read the body once — a retry after refresh needs to send it again.
  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.arrayBuffer();

  const headers = new Headers();
  for (const name of PASSTHROUGH_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  const accept = req.headers.get("accept");
  if (accept) headers.set("accept", accept);

  let token = access;
  let rotated: { accessToken: string; refreshToken: string } | null = null;

  let upstream = await call(target, req.method, headers, body, token);

  if (upstream.status === 401 && refresh) {
    rotated = await refreshTokens(refresh);
    if (rotated) {
      token = rotated.accessToken;
      upstream = await call(target, req.method, headers, body, token);
    }
  }

  const payload = await upstream.arrayBuffer();
  const response = new NextResponse(payload, {
    status: upstream.status,
    headers: copyResponseHeaders(upstream.headers),
  });

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

  // The refresh token is single-use and was just revoked upstream: without a
  // replacement this session is unrecoverable, so clear it and let the client
  // fall through to the login screen.
  if (upstream.status === 401 && !rotated) {
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
  }

  return response;
}

function call(
  target: string,
  method: string,
  headers: Headers,
  body: ArrayBuffer | undefined,
  token: string | undefined,
): Promise<Response> {
  const outgoing = new Headers(headers);
  if (token) outgoing.set("authorization", `Bearer ${token}`);
  return fetch(target, {
    method,
    headers: outgoing,
    body: body ? Buffer.from(body) : undefined,
    cache: "no-store",
  });
}

function copyResponseHeaders(source: Headers): Headers {
  const out = new Headers();
  const contentType = source.get("content-type");
  if (contentType) out.set("content-type", contentType);
  const disposition = source.get("content-disposition");
  if (disposition) out.set("content-disposition", disposition);
  out.set("cache-control", "no-store");
  return out;
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
