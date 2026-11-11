import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/*
 * Regression tests for the vbsec scan of 2026-11-09:
 * - join: one confirmation email per address per cooldown, whatever IP asks,
 *   and a re-join inside the cooldown leaves the pending link untouched;
 * - quiz: the link is claimed before answers are written, and handed back if
 *   the write fails.
 * Everything with side effects is mocked; nothing leaves the test.
 */
const { sendVerificationEmail, calls, state } = vi.hoisted(() => ({
  sendVerificationEmail: vi.fn(async () => ({ sent: true })),
  calls: [] as string[],
  state: {
    existing: null as Record<string, unknown> | null,
    upsertError: null as { message: string } | null,
  },
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn(), metrics: { count: vi.fn() } }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: async () => ({ success: true, reset: Date.now() }),
  getClientIp: () => "203.0.113.7",
}));
vi.mock("@/lib/security", () => ({ assertSameOrigin: () => ({ ok: true }) }));
vi.mock("@/lib/audit", () => ({ audit: async () => {}, hashPii: () => "h" }));
vi.mock("@/lib/email", () => ({
  generateToken: () => ({ token: "t", hash: "h" }),
  hashToken: () => "h",
  sendVerificationEmail,
  sendQuizCompleteEmail: async () => ({ sent: true }),
  sendFounderNoteEmail: async () => ({ sent: true }),
}));
vi.mock("@/lib/quiz-link", () => ({
  LINK_TTL_HOURS: 24,
  SUBMIT_GRACE_MS: 0,
  resolveQuizLink: async () => ({
    state: "valid",
    entry: { id: "w1", email: "a@example.com", position: 7, quiz_completed_at: null, verification_sent_at: null },
  }),
}));
vi.mock("@/lib/validation/quiz", async (orig) => ({
  ...(await orig<typeof import("@/lib/validation/quiz")>()),
  validateQuiz: () => ({ ok: true, data: { skin_type: "oily" } }),
}));
vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  after: () => {},
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.existing }) }) }),
      insert: async () => {
        calls.push(`insert:${table}`);
        return { error: null };
      },
      upsert: async () => {
        calls.push(`upsert:${table}`);
        return { error: state.upsertError };
      },
      update: (values: Record<string, unknown>) => {
        const kind = values.quiz_completed_at === null ? "release" : "update";
        calls.push(`${kind}:${table}`);
        const result = { error: null, data: [{ id: "w1" }] };
        return {
          eq: () => Object.assign(Promise.resolve(result), {
            is: () => ({ select: async () => result }),
          }),
        };
      },
    }),
  }),
}));

process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
const { POST: joinPOST } = await import("@/app/api/waitlist/join/route");
const { POST: quizPOST } = await import("@/app/api/quiz/route");

const post = (path: string, body: unknown) =>
  new Request(`https://example.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  calls.length = 0;
  sendVerificationEmail.mockClear();
  state.existing = null;
  state.upsertError = null;
});

describe("join resend cooldown", () => {
  const join = () => joinPOST(post("/api/waitlist/join", { email: "a@example.com", consent: true }));

  it("does not re-send or replace the link inside the cooldown", async () => {
    state.existing = { id: "w1", quiz_completed_at: null, verification_sent_at: new Date().toISOString() };
    const res = await join();
    expect(await res.json()).toEqual({ ok: true, ttlHours: 24 });
    expect(sendVerificationEmail).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it("re-sends once the cooldown has passed", async () => {
    state.existing = {
      id: "w1",
      quiz_completed_at: null,
      verification_sent_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    };
    const res = await join();
    expect(await res.json()).toEqual({ ok: true, ttlHours: 24 });
    expect(sendVerificationEmail).toHaveBeenCalledOnce();
    expect(calls).toEqual(["update:waitlist"]);
  });
});

describe("quiz claim order", () => {
  const submit = () => quizPOST(post("/api/quiz", { token: "tok" }));

  it("claims the link before writing answers", async () => {
    const res = await submit();
    expect(res.status).toBe(200);
    expect(calls).toEqual(["update:waitlist", "upsert:quiz_responses_v3"]);
  });

  it("hands the link back when the answers can't be saved", async () => {
    state.upsertError = { message: "boom" };
    const res = await submit();
    expect(res.status).toBe(500);
    expect(calls).toEqual(["update:waitlist", "upsert:quiz_responses_v3", "release:waitlist"]);
  });
});

describe("hashPii salt", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
    vi.resetModules();
  });

  it("stores no hash in a deployed build without IP_HASH_SALT", async () => {
    vi.doUnmock("@/lib/audit");
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.IP_HASH_SALT;
    const { hashPii } = await import("@/lib/audit");
    expect(hashPii("203.0.113.7")).toBeNull();
    const Sentry = await import("@sentry/nextjs");
    expect(Sentry.captureMessage).toHaveBeenCalledOnce();
    vi.unstubAllEnvs();
  });

  it("hashes with the configured salt", async () => {
    vi.doUnmock("@/lib/audit");
    process.env.IP_HASH_SALT = "s3cret";
    const { hashPii } = await import("@/lib/audit");
    expect(hashPii("203.0.113.7")).toMatch(/^[0-9a-f]{64}$/);
  });
});
