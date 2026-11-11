import { describe, it, expect, vi, beforeEach } from "vitest";

/*
 * Regression test for the 2026-11-01 security audit (low): the waitlist join
 * response must not reveal whether an address has already completed the
 * quiz. New, pending and completed emails get the same status and body.
 * Everything with side effects is mocked; nothing leaves the test.
 */
let existingRow: Record<string, unknown> | null = null;

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), metrics: { count: vi.fn() } }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: async () => ({ success: true, reset: Date.now() }),
  getClientIp: () => "203.0.113.7",
}));
vi.mock("@/lib/security", () => ({ assertSameOrigin: () => ({ ok: true }) }));
vi.mock("@/lib/audit", () => ({ audit: async () => {}, hashPii: () => "h" }));
// The route queues the founder's note with after(); there is no request scope in a unit test.
vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  after: () => {},
}));
vi.mock("@/lib/email", () => ({
  generateToken: () => ({ token: "t", hash: "h" }),
  hashToken: () => "h",
  sendVerificationEmail: async () => ({ sent: true }),
  sendQuizCompleteEmail: async () => ({ sent: true }),
  sendFounderNoteEmail: async () => ({ sent: true }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: existingRow }) }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
      insert: async () => ({ error: null }),
    }),
  }),
}));

process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
const { POST } = await import("@/app/api/waitlist/join/route");

const join = () =>
  POST(
    new Request("https://example.test/api/waitlist/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "someone@example.com", consent: true }),
    })
  );

async function answer(row: Record<string, unknown> | null) {
  existingRow = row;
  const res = await join();
  return { status: res.status, body: await res.json() };
}

describe("waitlist join does not reveal signup state", () => {
  beforeEach(() => {
    existingRow = null;
  });

  it("new, pending and completed emails get identical responses", async () => {
    const fresh = await answer(null);
    const pending = await answer({ id: "1", verified_at: null, quiz_completed_at: null });
    const completed = await answer({ id: "1", verified_at: "2026-10-01", quiz_completed_at: "2026-10-02" });
    expect(fresh.status).toBe(200);
    expect(pending).toEqual(fresh);
    expect(completed).toEqual(fresh);
    expect(completed.body).not.toHaveProperty("alreadyComplete");
  });
});
