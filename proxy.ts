import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (Next 16's name for middleware) — first line of defense.
 *
 * 1. Lightweight bot heuristics on write endpoints (empty UA, known
 *    scripted agents) → 403 before any compute is spent.
 * 2. Method guarding for API surfaces.
 *
 * Next 16 runs proxy on the Node.js runtime, not Edge. Nothing here depended
 * on Edge: it reads the URL, method and user-agent and returns a response.
 * Its errors now go through sentry.server.config.ts like every other route.
 *
 * Heavy sliding-window rate limiting runs inside each API route via
 * lib/rate-limit.ts (Upstash), so this stays dependency-free.
 */

const PROTECTED_API = ["/api/checkout", "/api/waitlist", "/api/account"];

const BLOCKED_UA_PATTERNS = [/curl\//i, /python-requests/i, /scrapy/i, /^$/];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PROTECTED_API.some((p) => pathname.startsWith(p))) {
    const ua = req.headers.get("user-agent") ?? "";
    if (BLOCKED_UA_PATTERNS.some((re) => re.test(ua))) {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Only allow the methods each surface actually uses.
    if (!["GET", "POST", "PATCH", "OPTIONS"].includes(req.method)) {
      return new NextResponse(null, { status: 405 });
    }
  }

  return NextResponse.next();
}

export const config = {
  // Never intercept the Stripe webhook — signature verification needs
  // the raw, untouched request.
  matcher: ["/api/checkout/:path*", "/api/waitlist/:path*", "/api/account/:path*"],
};
