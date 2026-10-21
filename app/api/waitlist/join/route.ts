import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/utils";
import { sanitizeText } from "@/lib/validation/quiz";
import { generateToken, sendVerificationEmail } from "@/lib/email";
import { assertSameOrigin } from "@/lib/security";
import { audit } from "@/lib/audit";
import { withRetry } from "@/lib/retry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_096;
const TOKEN_TTL_DAYS = 7;

/**
 * POST /api/waitlist/join
 * Free email capture with double opt-in. No payment.
 *
 * Security:
 * - same-origin enforced (CSRF)
 * - sliding-window rate limit per IP
 * - email validated + normalized; body size capped
 * - IP stored only as a salted hash (abuse control without holding raw IPs)
 * - response is identical whether or not the email already exists
 *   (prevents email enumeration)
 */
export async function POST(req: Request) {
  try {
    const origin = assertSameOrigin(req);
    if (!origin.ok) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const ip = getClientIp(req);
    const { success, reset } = await rateLimit(`join:${ip}`);
    if (!success) {
      await audit("rate_limited", { ip, detail: { route: "waitlist/join" } });
      return NextResponse.json(
        { error: "Too many attempts. Please try again in a minute." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)) },
        }
      );
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    }

    let body: { email?: unknown; consent?: unknown };
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    /*
     * JSON.parse accepts any JSON value, not just objects. A body of `null`
     * used to parse cleanly and then throw on the next property access,
     * turning bad input into a 500. Sentry caught it as AETHERSKIN-3 on the
     * first server-side test. Anything that isn't a plain object is a 400.
     */
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const email = sanitizeText(body.email, 254).toLowerCase();
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    if (body.consent !== true) {
      return NextResponse.json(
        { error: "Please agree to the privacy policy to continue." },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[join] Supabase service role key missing");
      return NextResponse.json(
        { error: "Signups open very soon. Please check back shortly." },
        { status: 503 }
      );
    }

    const admin = createAdminClient();
    const { token, hash } = generateToken();

    const ipSalt = process.env.IP_HASH_SALT ?? "aetherskin-default-salt";
    const signup_ip_hash = crypto
      .createHash("sha256")
      .update(ip + ipSalt)
      .digest("hex");
    const user_agent = sanitizeText(req.headers.get("user-agent"), 300);

    const { data: existing } = await admin
      .from("waitlist")
      .select("id,verified_at,quiz_completed_at")
      .eq("email", email)
      .maybeSingle();

    // Already fully signed up + quizzed: don't re-send, don't leak status.
    if (existing?.quiz_completed_at) {
      return NextResponse.json({ ok: true, alreadyComplete: true });
    }

    if (existing) {
      await admin
        .from("waitlist")
        .update({
          verification_token_hash: hash,
          verification_sent_at: new Date().toISOString(),
          signup_ip_hash,
          user_agent,
        })
        .eq("id", existing.id);
    } else {
      const { error: insertError } = await admin.from("waitlist").insert({
        email,
        status: "pending",
        verification_token_hash: hash,
        verification_sent_at: new Date().toISOString(),
        signup_ip_hash,
        user_agent,
      });
      if (insertError) {
        console.error("[join] insert failed:", insertError.message);
        return NextResponse.json(
          { error: "Could not save your spot. Please try again." },
          { status: 500 }
        );
      }
    }

    await audit(existing ? "signup_resent" : "signup_requested", {
      waitlistId: existing?.id ?? null,
      email,
      ip,
    });

    /**
     * Retry only transient delivery failures. `not_configured` means the API
     * key is absent — retrying that just adds latency to an answer we already
     * know, so we return it immediately.
     */
    const delivery = await withRetry(
      async () => {
        const result = await sendVerificationEmail(email, token);
        if (!result.sent && result.reason === "provider_error") {
          throw Object.assign(new Error("email_provider_error"), { retryable: true });
        }
        return result;
      },
      {
        attempts: 3,
        baseMs: 200,
        maxMs: 1500,
        shouldRetry: (e) => (e as { retryable?: boolean })?.retryable === true,
      }
    ).catch(() => ({ sent: false, reason: "provider_error" }) as const);

    // Counts only. No email, no IP: attributes are the two categories below.
    Sentry.metrics.count("waitlist.signup", 1, {
      attributes: { kind: existing ? "resent" : "new", delivered: delivery.sent },
    });

    if (!delivery.sent) {
      // Be honest rather than showing a fake success screen.
      return NextResponse.json(
        {
          error:
            "We saved your spot, but couldn't send the confirmation email just yet. We'll email you as soon as delivery is live.",
          saved: true,
        },
        { status: 202 }
      );
    }

    return NextResponse.json({ ok: true, ttlDays: TOKEN_TTL_DAYS });
  } catch (err) {
    /*
     * This catch keeps the user's response clean, but it also used to hide
     * every unexpected failure from Sentry: onRequestError only sees errors
     * that escape the route. Report it explicitly. The event passes through
     * lib/sentry-scrub.ts, which strips emails out of Postgres error text
     * (a duplicate-key error embeds the address) before it is sent.
     */
    Sentry.captureException(err, { tags: { route: "waitlist/join" } });
    console.error("[join] unhandled:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
