import { describe, it, expect } from "vitest";
import {
  scrubUrl,
  scrubEvent,
  scrubBreadcrumb,
  isSensitivePath,
  DATA_COLLECTION,
  scrubText,
} from "@/lib/sentry-scrub";

// Loose fixture type: real Sentry events carry far more fields than the
// scrubber touches. (`as never` made scrubEvent's return type `never`.)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEvent = any;

const TOKEN = "Xk9_aZ3-realLookingTokenValue1234567890abcd";

describe("scrubUrl", () => {
  it("redacts the verification token in an absolute URL", () => {
    const out = scrubUrl(`https://aetherskin.app/quiz?token=${TOKEN}`);
    expect(out).toBe("https://aetherskin.app/quiz?token=[redacted]");
    expect(out).not.toContain(TOKEN);
  });

  it("redacts it when it is not the first parameter", () => {
    const out = scrubUrl(`/quiz?utm_source=email&token=${TOKEN}&step=2`);
    expect(out).toBe("/quiz?utm_source=email&token=[redacted]&step=2");
  });

  it("redacts it in a bare query string", () => {
    expect(scrubUrl(`token=${TOKEN}`)).toBe("token=[redacted]");
  });

  it("redacts it in a fragment", () => {
    expect(scrubUrl(`/verify#token=${TOKEN}`)).not.toContain(TOKEN);
  });

  it("is case-insensitive about the parameter name", () => {
    expect(scrubUrl(`/quiz?TOKEN=${TOKEN}`)).not.toContain(TOKEN);
  });

  it("redacts email addresses passed as a parameter", () => {
    expect(scrubUrl("/x?email=jane%40example.com")).toBe("/x?email=[redacted]");
  });

  it("does not touch parameters that merely contain a sensitive word", () => {
    // "mytoken" is not "token" — over-redaction hides useful debug context.
    expect(scrubUrl("/x?mytoken=keep")).toBe("/x?mytoken=keep");
  });

  it("leaves URLs with nothing sensitive unchanged", () => {
    expect(scrubUrl("https://aetherskin.app/about")).toBe("https://aetherskin.app/about");
  });

  it("handles empty and missing input without throwing", () => {
    expect(scrubUrl(undefined)).toBeUndefined();
    expect(scrubUrl(null)).toBeUndefined();
    expect(scrubUrl("")).toBe("");
  });
});

describe("scrubEvent", () => {
  it("scrubs the request URL, query, transaction and breadcrumbs together", () => {
    const event = scrubEvent({
      type: undefined,
      request: {
        url: `https://aetherskin.app/quiz?token=${TOKEN}`,
        query_string: `token=${TOKEN}`,
      },
      transaction: `/quiz?token=${TOKEN}`,
      breadcrumbs: [
        { category: "navigation", data: { from: "/", to: `/quiz?token=${TOKEN}` } },
        { category: "fetch", data: { url: `/api/quiz?token=${TOKEN}` } },
      ],
    } as AnyEvent);

    expect(JSON.stringify(event)).not.toContain(TOKEN);
  });

  it("drops request bodies, which on /api/quiz are health answers", () => {
    const event = scrubEvent({
      type: undefined,
      request: {
        url: "/api/quiz",
        data: { pregnancy_status: "Filter_Out_Retinoids_SalicylicAcid", token: TOKEN },
      },
    } as AnyEvent);
    expect(event.request?.data).toBeUndefined();
    expect(JSON.stringify(event)).not.toContain("pregnancy");
  });

  it("drops cookies", () => {
    const event = scrubEvent({
      type: undefined,
      request: { url: "/", cookies: { session: "abc" } },
    } as AnyEvent);
    expect(event.request?.cookies).toBeUndefined();
  });

  it("scrubs object-shaped query strings", () => {
    const event = scrubEvent({
      type: undefined,
      request: { url: "/quiz", query_string: { token: TOKEN, step: "2" } },
    } as AnyEvent);
    expect(event.request?.query_string).toEqual({ token: "[redacted]", step: "2" });
  });

  it("scrubs URLs held in trace context", () => {
    const event = scrubEvent({
      type: "transaction",
      contexts: { trace: { data: { "http.url": `/quiz?token=${TOKEN}` } } },
    } as AnyEvent);
    expect(JSON.stringify(event)).not.toContain(TOKEN);
  });

  it("passes through events with no request at all", () => {
    const event = { type: undefined, message: "plain" } as never;
    expect(() => scrubEvent(event)).not.toThrow();
  });
});

describe("scrubBreadcrumb", () => {
  it("scrubs URLs inside breadcrumb messages", () => {
    const crumb = scrubBreadcrumb({ message: `GET /quiz?token=${TOKEN} 200` });
    expect(crumb.message).not.toContain(TOKEN);
  });
});

describe("isSensitivePath", () => {
  it("treats the token-carrying pages as sensitive", () => {
    for (const p of ["/quiz", "/verify", "/thank-you", "/quiz/step-2"]) {
      expect(isSensitivePath(p), p).toBe(true);
    }
  });

  it("does not treat the marketing pages as sensitive", () => {
    for (const p of ["/", "/about", "/privacy", "/quizzical"]) {
      expect(isSensitivePath(p), p).toBe(false);
    }
  });
});

describe("DATA_COLLECTION", () => {
  // Sentry 11 defaults every one of these to collect. If someone flips one
  // back on, this fails loudly rather than quietly leaking health data.
  it("collects nothing that could carry PII or health answers", () => {
    expect(DATA_COLLECTION.userInfo).toBe(false);
    expect(DATA_COLLECTION.cookies).toBe(false);
    expect(DATA_COLLECTION.httpHeaders).toBe(false);
    expect(DATA_COLLECTION.httpBodies).toEqual([]);
    expect(DATA_COLLECTION.urlQueryParams).toBe(false);
    expect(DATA_COLLECTION.databaseQueryData).toBe(false);
    expect(DATA_COLLECTION.stackFrameVariables).toBe(false);
  });
});

describe("exception text", () => {
  // The real shape of a Postgres unique-violation as Supabase surfaces it.
  const PG_DUPLICATE =
    'duplicate key value violates unique constraint "waitlist_email_key" ' +
    "Key (email)=(jane.doe+skin@example.com.au) already exists.";

  it("strips the email out of a Postgres duplicate-key error", () => {
    const out = scrubText(PG_DUPLICATE);
    expect(out).not.toContain("jane.doe");
    expect(out).not.toContain("example.com");
    expect(out).toContain("[email]");
    // and keeps what's needed to debug it
    expect(out).toContain("waitlist_email_key");
  });

  it("scrubs exception values on captured events", () => {
    const event = scrubEvent({
      exception: { values: [{ value: PG_DUPLICATE }] },
    } as AnyEvent);
    expect(JSON.stringify(event)).not.toContain("jane.doe");
  });

  it("scrubs tokens that appear in exception text", () => {
    const event = scrubEvent({
      exception: { values: [{ value: `fetch failed: /quiz?token=${TOKEN}` }] },
    } as AnyEvent);
    expect(JSON.stringify(event)).not.toContain(TOKEN);
  });

  it("scrubs event.message", () => {
    const event = scrubEvent({ message: "signup failed for a@b.co" } as AnyEvent);
    expect(event.message).toBe("signup failed for [email]");
  });
});

describe("console breadcrumbs", () => {
  it("drops raw logged arguments and scrubs the message", () => {
    const crumb = scrubBreadcrumb({
      category: "console",
      message: "[join] unhandled: Key (email)=(jane@example.com) already exists",
      data: { arguments: ["[join] unhandled:", { email: "jane@example.com" }], logger: "console" },
    });
    expect(crumb.data?.arguments).toBeUndefined();
    expect(JSON.stringify(crumb)).not.toContain("jane@example.com");
  });

  it("leaves non-console breadcrumb data alone", () => {
    const crumb = scrubBreadcrumb({
      category: "ui.click",
      data: { arguments: ["kept"] },
    });
    expect(crumb.data?.arguments).toEqual(["kept"]);
  });
});
