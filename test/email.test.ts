import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { captureMessage, count } = vi.hoisted(() => ({ captureMessage: vi.fn(), count: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureMessage, metrics: { count } }));

import {
  escapeHtml,
  verificationEmail,
  quizCompleteEmail,
  sendVerificationEmail,
  sendQuizCompleteEmail,
  addResendContact,
  founderNoteEmail,
  sendFounderNoteEmail,
  sendRoutineEmail,
} from "@/lib/email";
import { FOUNDER_NOTE } from "@/lib/founder-note";
import { getSiteUrl } from "@/lib/utils";

describe("escapeHtml", () => {
  it("neutralises tags, quotes and ampersands", () => {
    expect(escapeHtml('<a href="x">&\'')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });

  it("leaves ordinary names untouched", () => {
    expect(escapeHtml("Khaleed O'Brien".replace("'", "'"))).toContain("Khaleed");
  });
});

describe("email templates", () => {
  it("embeds the verification token in the link", () => {
    const html = verificationEmail("abc123");
    expect(html).toContain("/verify?token=abc123");
  });

  it("URL-encodes tokens so a crafted value cannot break out of the href", () => {
    const html = verificationEmail('x"><script>');
    expect(html).not.toContain("<script>");
  });

  it("states the 24-hour, single-use link the privacy page promises", () => {
    expect(verificationEmail("t")).toContain("works once and expires in 24 hours");
  });

  it("contains no user-supplied text (the v2 quiz collects no name)", () => {
    expect(quizCompleteEmail(12)).toContain("You're in.");
  });

  it("shows the waitlist position as digits only", () => {
    expect(quizCompleteEmail(42)).toContain("#42");
    // Defensive: a non-integer can't smuggle markup or decimals into the HTML.
    expect(quizCompleteEmail(7.9)).toContain("#7");
    expect(quizCompleteEmail(NaN)).toContain("#0");
  });

  it("tells the recipient why they got the email (CAN-SPAM / anti-phishing)", () => {
    expect(verificationEmail("t")).toContain("You received this because");
  });
});

describe("send()", () => {
  const OLD = process.env.RESEND_API_KEY;
  const OLD_SEGMENT = process.env.RESEND_SEGMENT_ID;

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (OLD === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = OLD;
    if (OLD_SEGMENT === undefined) delete process.env.RESEND_SEGMENT_ID;
    else process.env.RESEND_SEGMENT_ID = OLD_SEGMENT;
  });

  it("reports not_configured rather than faking success when no key is set", async () => {
    delete process.env.RESEND_API_KEY;
    const r = await sendVerificationEmail("a@b.co", "tok");
    expect(r).toEqual({ sent: false, reason: "not_configured" });
  });

  it("reports sent:true on a 200 from the provider", async () => {
    process.env.RESEND_API_KEY = "test-key";
    count.mockClear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const r = await sendQuizCompleteEmail("a@b.co", 1);
    expect(r).toEqual({ sent: true });
    // The delivery metric carries outcome and sender kind only, never the address.
    expect(count).toHaveBeenCalledWith("email.delivery", 1, {
      attributes: { result: "sent", sender: "sandbox" },
    });
  });

  it("adds a new signup to Resend contacts and the configured segment", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_SEGMENT_ID = "segment-1";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await expect(addResendContact("a@b.co")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/contacts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "a@b.co",
          unsubscribed: false,
          segments: [{ id: "segment-1" }],
        }),
      })
    );
  });

  it("queues the personal routine 12 hours after the quiz", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const before = Date.now();
    await sendRoutineEmail("a@b.co", "Your routine", "<p>hi</p>");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const delay = new Date(body.scheduled_at).getTime() - before;
    expect(delay).toBeGreaterThanOrEqual(12 * 3600 * 1000 - 5000);
    expect(delay).toBeLessThanOrEqual(12 * 3600 * 1000 + 5000);
    expect(body.subject).toBe("Your routine");
  });

  it("reports when contact sync is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    captureMessage.mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(addResendContact("a@b.co")).resolves.toBe(false);
    expect(captureMessage).toHaveBeenCalledWith(
      "resend_contact_failed",
      expect.objectContaining({
        tags: { email_status: "not_configured", resend_error: "missing_api_key" },
      })
    );
  });

  it("founder's note: same words as the site, queued two minutes ahead, no quiz link", async () => {
    const html = founderNoteEmail();
    for (const para of FOUNDER_NOTE.paragraphs) {
      for (const seg of para) expect(html).toContain(escapeHtml(seg.t));
    }
    expect(html).toContain("Khaleed");
    expect(html).not.toContain("/verify?token=");
    expect(html).toContain("unsubscribe");

    process.env.RESEND_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const before = Date.now();
    await sendFounderNoteEmail("a@b.co");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const delay = Date.parse(body.scheduled_at) - before;
    expect(delay).toBeGreaterThanOrEqual(119_000);
    expect(delay).toBeLessThan(125_000);
    // Emails that should arrive straight away carry no schedule.
    await sendVerificationEmail("a@b.co", "tok");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).scheduled_at).toBeUndefined();
  });

  it("never leaks the API key into the request URL", async () => {
    process.env.RESEND_API_KEY = "super-secret";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await sendVerificationEmail("a@b.co", "tok");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain("super-secret");
    expect(init.headers.Authorization).toBe("Bearer super-secret");
  });

  it("degrades to provider_error on a non-2xx response", async () => {
    process.env.RESEND_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => "rate limited" })
    );
    const r = await sendVerificationEmail("a@b.co", "tok");
    expect(r).toEqual({ sent: false, reason: "provider_error" });
  });

  it("reports a sandbox-sender rejection to Sentry without the recipient", async () => {
    process.env.RESEND_API_KEY = "test-key";
    captureMessage.mockClear();
    const recipient = "jane.doe+skin@example.com.au";
    // The real shape Resend returns when the sandbox sender targets anyone but the account owner.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          statusCode: 403,
          name: "validation_error",
          message: `You can only send testing emails to your own email address. Tried ${recipient}`,
        }),
      })
    );
    const r = await sendVerificationEmail(recipient, "tok");
    expect(r).toEqual({ sent: false, reason: "provider_error" });
    expect(captureMessage).toHaveBeenCalledTimes(1);
    const [msg, ctx] = captureMessage.mock.calls[0];
    expect(msg).toBe("email_delivery_failed");
    expect(ctx.tags).toEqual({
      email_status: "403",
      resend_error: "validation_error",
      sender: "sandbox",
    });
    const everything = JSON.stringify([
      captureMessage.mock.calls,
      vi.mocked(console.error).mock.calls,
      vi.mocked(console.warn).mock.calls,
    ]);
    expect(everything).not.toContain(recipient);
    expect(everything).not.toContain("only send testing emails");
  });

  it("never logs the recipient when the key is missing", async () => {
    delete process.env.RESEND_API_KEY;
    await sendVerificationEmail("jane@example.com", "tok");
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("jane@example.com");
  });

  it("degrades to provider_error when the network throws, never propagating", async () => {
    process.env.RESEND_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNRESET")));
    await expect(sendVerificationEmail("a@b.co", "tok")).resolves.toEqual({
      sent: false,
      reason: "provider_error",
    });
  });
});

describe("getSiteUrl", () => {
  const OLD_SITE = process.env.NEXT_PUBLIC_SITE_URL;
  const OLD_VERCEL = process.env.VERCEL_URL;

  afterEach(() => {
    if (OLD_SITE === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = OLD_SITE;
    if (OLD_VERCEL === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = OLD_VERCEL;
  });

  it("prefers the explicit site URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://aetherskin.example";
    expect(getSiteUrl()).toBe("https://aetherskin.example");
  });

  it("falls back to the Vercel deployment URL over https", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = "preview.vercel.app";
    expect(getSiteUrl()).toBe("https://preview.vercel.app");
  });

  it("falls back to localhost when nothing is configured", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});
