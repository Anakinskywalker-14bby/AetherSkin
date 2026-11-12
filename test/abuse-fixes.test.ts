import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/*
 * Regression tests for the vbsec scan of 2026-11-09:
 * - join: one confirmation email per address per cooldown, whatever IP asks,
 *   and a re-join inside the cooldown leaves the pending link untouched;
 * - quiz: the link is claimed before answers are written, and handed back if
 *   the write fails.
 * Everything with side effects is mocked; nothing leaves the test.
 */
const {
  sendVerificationEmail,
  sendQuizCompleteEmail,
  sendFounderNoteEmail,
  addResendContact,
  calls,
  state,
  afterTasks,
} = vi.hoisted(() => ({
  state: {
    existing: null as Record<string, unknown> | null,
    upsertError: null as { message: string } | null,
    verificationDelivery: "sent" as "sent" | "not_configured",
  },
  sendVerificationEmail: vi.fn(async () =>
    state.verificationDelivery === "sent"
      ? ({ sent: true } as const)
      : ({ sent: false, reason: "not_configured" } as const)
  ),
  sendQuizCompleteEmail: vi.fn(async () => ({ sent: true })),
  sendFounderNoteEmail: vi.fn(async () => ({ sent: true })),
  addResendContact: vi.fn(async () => true),
  calls: [] as string[],
  afterTasks: [] as Promise<unknown>[],
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
  sendQuizCompleteEmail,
  sendFounderNoteEmail,
  addResendContact,
  sendRoutineEmail: async () => ({ sent: true }),
  notifyOwnerRoutineHeld: async () => ({ sent: true }),
  escapeHtml: (s: string) => s,
  BRAND: {},
  SHELL: (s: string) => s,
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
// The join route now queues its email send via after() (vbsec/PYA audit
// 2026-11-11: fixes the timing side-channel). Actually run the callback so
// tests can still observe sendVerificationEmail, and track its promise so
// the test can await it before asserting.
vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  after: (fn: () => unknown) => {
    afterTasks.push(Promise.resolve(fn()));
  },
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
        const claimedResult = { error: null, data: [{ id: "w1" }] };
        const emptyResult = { error: null, data: [] as { id: string }[] };
        return {
          eq: () => Object.assign(Promise.resolve(claimedResult), {
            is: () => ({ select: async () => claimedResult }),
            // Simulates the atomic cooldown claim: only "wins" (returns a
            // row) if the mocked verification_sent_at is older than the
            // cutoff embedded in the .or() filter string, or unset.
            or: (filter: string) => ({
              select: async () => {
                const cutoffMatch = /verification_sent_at\.lt\.([^,]+)/.exec(filter);
                const cutoff = cutoffMatch ? Date.parse(cutoffMatch[1]) : NaN;
                const sentAtRaw = (state.existing?.verification_sent_at as string | null) ?? null;
                const sentAt = sentAtRaw ? Date.parse(sentAtRaw) : null;
                const claimed = sentAt === null || (!Number.isNaN(cutoff) && sentAt < cutoff);
                return claimed ? claimedResult : emptyResult;
              },
            }),
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
  afterTasks.length = 0;
  sendVerificationEmail.mockClear();
  sendQuizCompleteEmail.mockClear();
  sendFounderNoteEmail.mockClear();
  addResendContact.mockClear();
  state.existing = null;
  state.upsertError = null;
  state.verificationDelivery = "sent";
});

describe("join resend cooldown", () => {
  const join = async () => {
    const res = await joinPOST(post("/api/waitlist/join", { email: "a@example.com", consent: true }));
    // The route queues its email send via after(); wait for it so
    // assertions on sendVerificationEmail are not racing the response.
    await Promise.all(afterTasks);
    return res;
  };

  it("does not re-send or replace the link inside the cooldown", async () => {
    state.existing = { id: "w1", quiz_completed_at: null, verification_sent_at: new Date().toISOString() };
    const res = await join();
    expect(await res.json()).toEqual({ ok: true, ttlHours: 24, alreadySignedUp: true });
    expect(sendVerificationEmail).not.toHaveBeenCalled();
    expect(addResendContact).toHaveBeenCalledWith("a@example.com");
    expect(sendFounderNoteEmail).not.toHaveBeenCalled();
    // The atomic claim is still attempted (this is what closes the old
    // TOCTOU race) but its WHERE clause matches zero rows while inside the
    // cooldown, so no email is ever queued.
    expect(calls).toEqual(["update:waitlist"]);
  });

  it("retries contact sync for an address that already completed the quiz", async () => {
    state.existing = {
      id: "w1",
      quiz_completed_at: new Date().toISOString(),
      verification_sent_at: new Date().toISOString(),
    };
    const res = await join();
    expect(await res.json()).toEqual({ ok: true, ttlHours: 24, alreadySignedUp: true });
    expect(addResendContact).toHaveBeenCalledWith("a@example.com");
    expect(sendVerificationEmail).not.toHaveBeenCalled();
    expect(sendFounderNoteEmail).not.toHaveBeenCalled();
  });

  it("re-sends once the cooldown has passed", async () => {
    state.existing = {
      id: "w1",
      quiz_completed_at: null,
      verification_sent_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    };
    const res = await join();
    expect(await res.json()).toEqual({ ok: true, ttlHours: 24, alreadySignedUp: true });
    expect(sendVerificationEmail).toHaveBeenCalledOnce();
    expect(calls).toEqual(["update:waitlist"]);
  });

  it("syncs new contacts and queues the founder note", async () => {
    await join();
    expect(addResendContact).toHaveBeenCalledWith("a@example.com");
    expect(sendFounderNoteEmail).toHaveBeenCalledWith("a@example.com");
    expect(sendVerificationEmail.mock.invocationCallOrder[0]).toBeLessThan(
      sendFounderNoteEmail.mock.invocationCallOrder[0]
    );
  });

  it("syncs new contacts but does not schedule the founder note if the quiz-link email was not sent", async () => {
    state.verificationDelivery = "not_configured";
    await join();
    expect(addResendContact).toHaveBeenCalledWith("a@example.com");
    expect(sendFounderNoteEmail).not.toHaveBeenCalled();
  });
});

describe("quiz claim order", () => {
  const submit = async () => {
    const res = await quizPOST(post("/api/quiz", { token: "tok" }));
    await Promise.all(afterTasks);
    return res;
  };

  it("claims the link before writing answers", async () => {
    const res = await submit();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(sendQuizCompleteEmail).toHaveBeenCalledWith("a@example.com", 7);
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
