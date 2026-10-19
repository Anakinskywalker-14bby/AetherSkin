import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { captureMessage } = vi.hoisted(() => ({ captureMessage: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureMessage }));

import {
  escapeHtml,
  verificationEmail,
  quizCompleteEmail,
  sendVerificationEmail,
  sendQuizCompleteEmail,
} from "@/lib/email";
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

  it("states the 7-day expiry the privacy page promises", () => {
    expect(verificationEmail("t")).toContain("expires in 7 days");
  });

  it("escapes the user's name instead of rendering it as HTML", () => {
    const html = quizCompleteEmail('<img src=x onerror="alert(1)">', 12);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("shows the waitlist position", () => {
    expect(quizCompleteEmail("Sam", 42)).toContain("#42");
  });

  it("tells the recipient why they got the email (CAN-SPAM / anti-phishing)", () => {
    expect(verificationEmail("t")).toContain("You received this because");
  });
});

describe("send()", () => {
  const OLD = process.env.RESEND_API_KEY;

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (OLD === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = OLD;
  });

  it("reports not_configured rather than faking success when no key is set", async () => {
    delete process.env.RESEND_API_KEY;
    const r = await sendVerificationEmail("a@b.co", "tok");
    expect(r).toEqual({ sent: false, reason: "not_configured" });
  });

  it("reports sent:true on a 200 from the provider", async () => {
    process.env.RESEND_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const r = await sendQuizCompleteEmail("a@b.co", "Sam", 1);
    expect(r).toEqual({ sent: true });
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
