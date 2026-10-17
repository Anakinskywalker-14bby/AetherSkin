import { describe, it, expect } from "vitest";
import { assertSameOrigin } from "@/lib/security";
import { SITE_URL } from "@/lib/site";

const SELF = new URL(SITE_URL).origin;
const LIVE_HOST = "lumin-site-git-main-luminskin.vercel.app";

function req(headers: Record<string, string>) {
  return new Request("https://example.test/api/waitlist/join", {
    method: "POST",
    headers,
  });
}

describe("assertSameOrigin (CSRF defence)", () => {
  it("accepts a request from the canonical site origin", () => {
    expect(assertSameOrigin(req({ origin: SELF })).ok).toBe(true);
  });

  it("accepts a request served from any Vercel alias", () => {
    // Regression: signups on the branch alias were rejected with
    // "invalid request origin" because only SITE_URL was allow-listed.
    const r = assertSameOrigin(
      req({ origin: `https://${LIVE_HOST}`, host: LIVE_HOST, "x-forwarded-host": LIVE_HOST })
    );
    expect(r.ok).toBe(true);
  });

  it("accepts a future custom domain with no config change", () => {
    const r = assertSameOrigin(
      req({ origin: "https://aetherskinskin.app", "x-forwarded-host": "aetherskinskin.app" })
    );
    expect(r.ok).toBe(true);
  });

  it("is case-insensitive about the host", () => {
    const r = assertSameOrigin(
      req({ origin: `https://${LIVE_HOST.toUpperCase()}`, "x-forwarded-host": LIVE_HOST })
    );
    expect(r.ok).toBe(true);
  });

  it("rejects a cross-site Origin", () => {
    const r = assertSameOrigin(req({ origin: "https://evil.example", host: LIVE_HOST }));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("origin_mismatch");
  });

  it("rejects an origin that merely contains ours as a prefix", () => {
    const r = assertSameOrigin(
      req({ origin: `https://${LIVE_HOST}.evil.example`, host: LIVE_HOST })
    );
    expect(r.ok).toBe(false);
  });

  it("does not let a forged Host header launder a cross-site Origin", () => {
    // Host is attacker-influenced in theory, but it must still MATCH the
    // Origin for the request to pass — forging it to evil.example means the
    // request is no longer addressed to us and Vercel would not route it.
    const r = assertSameOrigin(
      req({ origin: "https://evil.example", host: "innocent.example" })
    );
    expect(r.ok).toBe(false);
  });

  it("falls back to Referer when Origin is stripped", () => {
    expect(assertSameOrigin(req({ referer: `${SELF}/` })).ok).toBe(true);
  });

  it("rejects a cross-site Referer", () => {
    const r = assertSameOrigin(req({ referer: "https://evil.example/page", host: LIVE_HOST }));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("referer_mismatch");
  });

  it("rejects an unparseable Referer rather than failing open", () => {
    const r = assertSameOrigin(req({ referer: "not-a-url" }));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("referer_unparseable");
  });

  it("rejects a request with neither header (fails closed)", () => {
    const r = assertSameOrigin(req({}));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("missing_origin");
  });

  it("prefers Origin over Referer when both are present", () => {
    // A forged Referer must not rescue a bad Origin.
    const r = assertSameOrigin(
      req({ origin: "https://evil.example", referer: `${SELF}/`, host: LIVE_HOST })
    );
    expect(r.ok).toBe(false);
  });
});
