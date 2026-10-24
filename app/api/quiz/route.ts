import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validateQuiz, sanitizeText, QUIZ_VERSION } from "@/lib/validation/quiz";
import { hashToken, sendQuizCompleteEmail } from "@/lib/email";
import { assertSameOrigin } from "@/lib/security";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16_384;

/**
 * POST /api/quiz
 * Accepts a quiz submission. The caller must present the verification token
 * from the email link, so only people who actually opened the email can
 * submit. Every field is allow-list validated server-side.
 */
export async function POST(req: Request) {
  try {
    const origin = assertSameOrigin(req);
    if (!origin.ok) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const ip = getClientIp(req);
    const { success } = await rateLimit(`quiz:${ip}`);
    if (!success) {
      await audit("rate_limited", { ip, detail: { route: "quiz" } });
      return NextResponse.json(
        { error: "Too many attempts. Please wait a moment." },
        { status: 429 }
      );
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    }

    let body: Record<string, unknown>;
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

    const token = sanitizeText(body.token, 128);
    if (!token) {
      return NextResponse.json(
        { error: "Missing verification link. Please use the link in your email." },
        { status: 401 }
      );
    }

    const validation = validateQuiz(body);
    if (!validation.ok) {
      // Records the rejection reason, not the rejected payload.
      await audit("quiz_rejected", { ip, detail: { reason: validation.error } });
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Service unavailable. Please try again shortly." },
        { status: 503 }
      );
    }

    const admin = createAdminClient();

    // The token hash is the authorization check.
    const { data: entry } = await admin
      .from("waitlist")
      .select("id,email,position,quiz_completed_at")
      .eq("verification_token_hash", hashToken(token))
      .maybeSingle();

    if (!entry) {
      return NextResponse.json(
        { error: "This link is invalid or has expired. Please sign up again." },
        { status: 401 }
      );
    }

    /*
     * quiz_responses_v3 holds only the waitlist id and the seventeen coded
     * answers: no email and no name, so the training dataset carries no
     * direct identifiers. Earlier versions' tables are left untouched.
     */
    const { error: upsertError } = await admin.from("quiz_responses_v3").upsert(
      {
        waitlist_id: entry.id,
        quiz_version: QUIZ_VERSION,
        ...validation.data,
      },
      { onConflict: "waitlist_id" }
    );

    if (upsertError) {
      console.error("[quiz] upsert failed:", upsertError.message);
      return NextResponse.json(
        { error: "Could not save your answers. Please try again." },
        { status: 500 }
      );
    }

    await admin
      .from("waitlist")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
        quiz_completed_at: new Date().toISOString(),
      })
      .eq("id", entry.id);

    await audit("quiz_submitted", {
      waitlistId: entry.id,
      email: entry.email,
      ip,
      detail: { position: entry.position },
    });

    // Best-effort confirmation; never blocks the response.
    void sendQuizCompleteEmail(entry.email, entry.position).catch(() => undefined);

    Sentry.metrics.count("quiz.completed", 1);
    return NextResponse.json({ ok: true, position: entry.position });
  } catch (err) {
    /*
     * This catch keeps the user's response clean, but it also used to hide
     * every unexpected failure from Sentry: onRequestError only sees errors
     * that escape the route. Report it explicitly. The event passes through
     * lib/sentry-scrub.ts, which strips emails out of Postgres error text
     * (a duplicate-key error embeds the address) before it is sent.
     */
    Sentry.captureException(err, { tags: { route: "quiz" } });
    console.error("[quiz] unhandled:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
