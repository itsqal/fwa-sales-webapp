import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  API_BASE_URL,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE,
  cookieOptions,
} from "@/lib/session";
import type { AdminAuthTokens } from "@/lib/api/types";

/**
 * Login happens here rather than in the page so the tokens can be written
 * straight into httpOnly cookies without ever existing in the browser's JS heap.
 */
export async function POST(req: NextRequest) {
  const { username, password } = (await req.json()) as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Username dan kata sandi wajib diisi.",
        },
      },
      { status: 422 },
    );
  }

  const upstream = await fetch(`${API_BASE_URL}/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      password,
      deviceLabel: req.headers.get("user-agent")?.slice(0, 120),
    }),
    cache: "no-store",
  });

  const body = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    return NextResponse.json(
      body ?? {
        error: { code: "LOGIN_FAILED", message: "Gagal masuk. Coba lagi." },
      },
      { status: upstream.status },
    );
  }

  const tokens = body as AdminAuthTokens;
  if (!tokens.accessToken || !tokens.refreshToken) {
    return NextResponse.json(
      {
        error: {
          code: "LOGIN_FAILED",
          message: "Layanan tidak mengembalikan sesi yang sah.",
        },
      },
      { status: 502 },
    );
  }

  const response = NextResponse.json({
    profile: tokens.profile,
    mustChangePassword: tokens.mustChangePassword ?? false,
  });
  response.cookies.set(
    ACCESS_COOKIE,
    tokens.accessToken,
    cookieOptions(ACCESS_COOKIE_MAX_AGE),
  );
  response.cookies.set(
    REFRESH_COOKIE,
    tokens.refreshToken,
    cookieOptions(REFRESH_COOKIE_MAX_AGE),
  );
  return response;
}
