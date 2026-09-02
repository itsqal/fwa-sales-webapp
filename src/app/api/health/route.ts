import { NextResponse } from "next/server";

/**
 * Liveness probe for the container health check, nginx, and any uptime monitor.
 *
 * It answers for the dashboard process only and deliberately does not call the
 * API: a health check that fails when its upstream is down turns one outage
 * into two, and Docker would restart a perfectly healthy container in a loop
 * while the real problem sat elsewhere. Use the API's own `/health` for the API.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { status: "ok", service: "fwa-dashboard" },
    { headers: { "cache-control": "no-store" } },
  );
}
