import { describe, it, expect, vi } from "vitest";

/*
 * Quiz links: 24-hour expiry and single use. Supabase and Sentry are mocked;
 * nothing leaves the test.
 */
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), metrics: { count: vi.fn() } }));
vi.mock("@/lib/email", async () => {
  const crypto = await import("node:crypto");
  return { hashToken: (t: string) => crypto.createHash("sha256").update(t).digest("hex") };
});

// A tiny fake of the query builder: records filters, returns a canned row.
let lookupRow: Record<string, unknown> | null = null;
const calls: string[] = [];
const builder: Record<string, unknown> = {};
builder.select = () => builder;
builder.eq = (...args: unknown[]) => {
  calls.push(`eq:${JSON.stringify(args)}`);
  return builder;
};
builder.limit = () => builder;
builder.maybeSingle = async () => ({ data: lookupRow });
const admin = { from: () => builder } as never;

const { isLinkExpired, resolveQuizLink, LINK_TTL_MS, SUBMIT_GRACE_MS } = await import("@/lib/quiz-link");

const HOUR = 3_600_000;
const ago = (h: number) => new Date(Date.now() - h * HOUR).toISOString();

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
  it("accepts a fresh link and looks it up by hash", async () => {
    calls.length = 0;
    lookupRow = { id: "w1", email: "a@b.co", position: 3, quiz_completed_at: null, verification_sent_at: ago(2) };
    expect((await resolveQuizLink(admin, "some-token")).state).toBe("valid");
    expect(calls[0]).toMatch(/^eq:\["verification_token_hash","[0-9a-f]{64}"\]$/);
  });
  it("expires after 24 hours", async () => {
    lookupRow = { id: "w1", email: "a@b.co", position: 3, quiz_completed_at: null, verification_sent_at: ago(25) };
    expect((await resolveQuizLink(admin, "t")).state).toBe("expired");
  });
  it("is single use: a completed quiz makes the link invalid", async () => {
    lookupRow = { id: "w1", email: "a@b.co", position: 3, quiz_completed_at: ago(1), verification_sent_at: ago(2) };
    expect((await resolveQuizLink(admin, "t")).state).toBe("invalid");
  });
  it("unknown token is invalid", async () => {
    lookupRow = null;
    expect((await resolveQuizLink(admin, "t")).state).toBe("invalid");
  });
});
