"use client";

import type { ApiError } from "./types";

/**
 * The browser's only route to the supply-chain API: everything is addressed
 * relative to `/api/upstream`, which attaches the bearer token server-side.
 */
const UPSTREAM_PREFIX = "/api/upstream";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: { field?: string; issue?: string }[];

  constructor(
    status: number,
    code: string,
    message: string,
    details?: { field?: string; issue?: string }[],
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Sent as `Idempotency-Key`. Generate it when the form mounts, not on submit. */
  idempotencyKey?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

export function buildUrl(
  path: string,
  query?: RequestOptions["query"],
): string {
  const url = `${UPSTREAM_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, idempotencyKey, query, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const payload = text ? safeParse(text) : null;

  if (!res.ok) {
    // A session that cannot be repaired ends at the login screen. The proxy has
    // already cleared the cookies by this point.
    if (res.status === 401 && typeof window !== "undefined") {
      // A full document load, not a router push: the session is gone, and every
      // cached query in memory belongs to a principal that no longer exists.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/login?from=${encodeURIComponent(
        window.location.pathname,
      )}`;
    }
    const err = (payload as ApiError | null)?.error;
    throw new ApiRequestError(
      res.status,
      err?.code ?? "UNKNOWN",
      err?.message ?? "Terjadi kesalahan. Coba lagi.",
      err?.details,
    );
  }

  return payload as T;
}

/** For the CSV download on a supplied MSISDN PO. */
export async function apiDownload(
  path: string,
  query: RequestOptions["query"],
  filename: string,
): Promise<void> {
  const res = await fetch(buildUrl(path, query), {
    headers: { Accept: "text/csv" },
  });
  if (!res.ok) {
    throw new ApiRequestError(
      res.status,
      "DOWNLOAD_FAILED",
      "Gagal mengunduh berkas.",
    );
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
