import { NextResponse, type NextRequest } from "next/server";

/**
 * Global middleware — first line of defense.
 *
 * 1. Lightweight bot heuristics on write endpoints (empty UA, known
 *    scripted agents) → 403 before any compute is spent.
 * 2. Method guarding for API surfaces.
 *
 * Heavy sliding-window rate limiting runs inside each API route via
 * lib/rate-limit.ts (Upstash), because middleware runs on the Edge
 * runtime where we keep dependencies minimal.
 */

const PROTECTED_API = ["/api/waitlist", "/api/quiz"];

const BLOCKED_UA_PATTERNS = [/curl\//i, /python-requests/i, /scrapy/i, /^$/];

export function middleware(req: NextRequest) {
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
  matcher: ["/api/waitlist/:path*", "/api/quiz/:path*"],
};
