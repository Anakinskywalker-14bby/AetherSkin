import { describe, it, expect, vi, beforeEach } from "vitest";

/*
 * Regression test for AETHERSKIN-3: a JSON body that parses but isn't an
 * object (null, an array, a bare string or number) must be rejected with a
 * 400, never crash the route into a 500. Everything with side effects is
 * mocked so this runs offline and never touches Supabase, Resend or Sentry.
 */

// vi.mock is hoisted above imports, so the spy must be hoisted with it.
const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("database must not be reached for malformed bodies");
  },
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: async () => ({ success: true, reset: Date.now() }),
  getClientIp: () => "203.0.113.7",
}));
vi.mock("@/lib/security", () => ({ assertSameOrigin: () => ({ ok: true }) }));
vi.mock("@/lib/audit", () => ({ audit: async () => {} }));
vi.mock("@/lib/email", () => ({
  generateToken: () => ({ token: "t", hash: "h" }),
  hashToken: () => "h",
  sendVerificationEmail: async () => {},
  sendQuizCompleteEmail: async () => {},
}));

const { POST: joinPOST } = await import("@/app/api/waitlist/join/route");
const { POST: quizPOST } = await import("@/app/api/quiz/route");

function post(path: string, raw: string) {
  return new Request(`https://example.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw,
  });
}

const NON_OBJECT_BODIES = ["null", "[]", '["a@b.co"]', '"a@b.co"', "42", "true"];

describe.each([
  ["/api/waitlist/join", joinPOST],
  ["/api/quiz", quizPOST],
] as const)("%s rejects non-object JSON", (path, handler) => {
  beforeEach(() => captureException.mockClear());

  it.each(NON_OBJECT_BODIES)("body %s -> 400, nothing sent to Sentry", async (raw) => {
    const res = await handler(post(path, raw));
    expect(res.status).toBe(400);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("unparseable JSON -> 400", async () => {
    const res = await handler(post(path, "{not json"));
    expect(res.status).toBe(400);
  });
});
