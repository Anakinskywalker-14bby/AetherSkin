import { describe, it, expect, vi, beforeEach } from "vitest";

/*
 * Quiz links: 24-hour expiry, single use, reminder link accepted, and the
 * hourly reminder job (one email per signup, never twice). Supabase, Resend,
 * Sentry and the rate limiter are mocked; nothing leaves the test.
 */
const sendReminder = vi.fn(async (_to: string, _token: string, _hoursLeft: number) => ({ sent: true }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), metrics: { count: vi.fn() } }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: async () => ({ success: true, reset: Date.now() }),
  getClientIp: () => "203.0.113.7",
}));
vi.mock("@/lib/audit", () => ({ audit: async () => {} }));
vi.mock("@/lib/email", async () => {
  const crypto = await import("node:crypto");
  const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");
  return {
    hashToken,
    generateToken: () => ({ token: "fresh-token", hash: hashToken("fresh-token") }),
    safeEqual: (a: string, b: string) => a === b,
    sendQuizReminderEmail: sendReminder,
  };
});

// A tiny fake of the query builder: records filters, returns canned rows.
type Row = Record<string, unknown>;
let lookupRow: Row | null = null;
let dueRows: Row[] = [];
let claimWins = true;
const calls: string[] = [];
function builder(kind: "select" | "update") {
  const b: Record<string, unknown> = {};
  const chain = (name: string) => (...args: unknown[]) => {
    calls.push(`${kind}.${name}:${JSON.stringify(args)}`);
    return b;
  };
  for (const m of ["eq", "is", "not", "lte", "gt", "order", "or"]) b[m] = chain(m);
  b.limit = (...args: unknown[]) => {
    calls.push(`${kind}.limit:${JSON.stringify(args)}`);
    return Object.assign(Promise.resolve({ data: dueRows, error: null }), { maybeSingle: async () => ({ data: lookupRow }) });
  };
  b.select = async () => ({ data: claimWins ? [{ id: "w1" }] : [] });
  return b;
}
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => builder("select"),
      update: (v: unknown) => {
        calls.push(`update:${JSON.stringify(v)}`);
        return builder("update");
      },
    }),
  }),
}));

const { isLinkExpired, resolveQuizLink, LINK_TTL_MS, SUBMIT_GRACE_MS } = await import("@/lib/quiz-link");
const { createAdminClient } = await import("@/lib/supabase/admin");
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
const { POST: remind } = await import("@/app/api/cron/quiz-reminders/route");

const HOUR = 3_600_000;
const ago = (h: number) => new Date(Date.now() - h * HOUR).toISOString();

beforeEach(() => {
  lookupRow = null;
  dueRows = [];
  claimWins = true;
  calls.length = 0;
  sendReminder.mockClear();
  delete process.env.CRON_SECRET;
});

describe("isLinkExpired", () => {
  it("is valid inside 24 hours and expired after", () => {
    const now = Date.now();
    expect(isLinkExpired(new Date(now - 23 * HOUR).toISOString(), now)).toBe(false);
    expect(isLinkExpired(new Date(now - 25 * HOUR).toISOString(), now)).toBe(true);
  });
  it("allows the submit grace just past 24 hours", () => {
    const now = Date.now();
    const sent = new Date(now - LINK_TTL_MS - 10 * 60_000).toISOString();
    expect(isLinkExpired(sent, now)).toBe(true);
    expect(isLinkExpired(sent, now, SUBMIT_GRACE_MS)).toBe(false);
  });
  it("treats a missing or bad send time as expired", () => {
    expect(isLinkExpired(null)).toBe(true);
    expect(isLinkExpired("not a date")).toBe(true);
  });
});

describe("resolveQuizLink", () => {
  const admin = () => createAdminClient() as never;
  it("accepts either the original or the reminder link", async () => {
    lookupRow = { id: "w1", email: "a@b.co", position: 3, quiz_completed_at: null, verification_sent_at: ago(2) };
    const r = await resolveQuizLink(admin(), "some-token");
    expect(r.state).toBe("valid");
    expect(calls.some((c) => c.startsWith("select.or:") && c.includes("reminder_token_hash.eq."))).toBe(true);
  });
  it("expires after 24 hours", async () => {
    lookupRow = { id: "w1", email: "a@b.co", position: 3, quiz_completed_at: null, verification_sent_at: ago(25) };
    expect((await resolveQuizLink(admin(), "t")).state).toBe("expired");
  });
  it("is single use: a completed quiz makes the link invalid", async () => {
    lookupRow = { id: "w1", email: "a@b.co", position: 3, quiz_completed_at: ago(1), verification_sent_at: ago(2) };
    expect((await resolveQuizLink(admin(), "t")).state).toBe("invalid");
  });
  it("unknown token is invalid", async () => {
    expect((await resolveQuizLink(admin(), "t")).state).toBe("invalid");
  });
});

const cron = (auth?: string) =>
  remind(new Request("https://example.test/api/cron/quiz-reminders", { method: "POST", headers: auth ? { authorization: auth } : {} }));

describe("hourly reminder job", () => {
  it("emails each due signup once, with a fresh link", async () => {
    dueRows = [{ id: "w1", email: "a@b.co", verification_sent_at: ago(13) }];
    const res = await cron();
    expect(await res.json()).toMatchObject({ ok: true, due: 1, sent: 1 });
    expect(sendReminder).toHaveBeenCalledTimes(1);
    expect(sendReminder.mock.calls[0][1]).toBe("fresh-token");
    // Only rows 12h+ old, not finished, not already reminded.
    expect(calls).toEqual(expect.arrayContaining([
      expect.stringMatching(/^select\.is:\["quiz_completed_at",null\]/),
      expect.stringMatching(/^select\.is:\["reminder_sent_at",null\]/),
      expect.stringMatching(/^update\.is:\["reminder_sent_at",null\]/),
    ]));
  });
  it("does not email when another run already claimed the row", async () => {
    dueRows = [{ id: "w1", email: "a@b.co", verification_sent_at: ago(13) }];
    claimWins = false;
    const body = await (await cron()).json();
    expect(body.sent).toBe(0);
    expect(sendReminder).not.toHaveBeenCalled();
  });
  it("requires the bearer secret when CRON_SECRET is set", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect((await cron()).status).toBe(401);
    expect((await cron("Bearer wrong")).status).toBe(401);
    expect((await cron("Bearer s3cret")).status).toBe(200);
  });
});
