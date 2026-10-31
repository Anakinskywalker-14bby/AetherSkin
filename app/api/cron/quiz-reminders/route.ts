import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateToken, safeEqual, sendQuizReminderEmail } from "@/lib/email";
import { LINK_TTL_MS, REMINDER_AFTER_MS } from "@/lib/quiz-link";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Don't bother reminding when less than an hour of the link is left. */
const MIN_HOURS_LEFT_MS = 60 * 60 * 1000;
const BATCH = 50;

/**
 * POST /api/cron/quiz-reminders
 *
 * Called hourly by a pg_cron job in Supabase (see
 * supabase/migrations/*_quiz_reminder_schedule.sql). Emails one reminder to
 * everyone whose quiz link was sent 12+ hours ago, hasn't finished the quiz,
 * hasn't had a reminder, and still has at least an hour before the 24-hour
 * cut-off.
 *
 * Safe to call by anyone: it only ever acts on rows that are already due, and
 * each row is claimed with a conditional update so it is reminded once, even
 * if two calls overlap. If CRON_SECRET is set, the caller must also send
 * "Authorization: Bearer <CRON_SECRET>".
 */
export async function POST(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const given = req.headers.get("authorization") ?? "";
      if (!safeEqual(given, `Bearer ${secret}`)) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
    }

    const { success } = await rateLimit(`cron:${getClientIp(req)}`);
    if (!success) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }

    const admin = createAdminClient();
    const now = Date.now();
    const sentBefore = new Date(now - REMINDER_AFTER_MS).toISOString();
    const sentAfter = new Date(now - LINK_TTL_MS + MIN_HOURS_LEFT_MS).toISOString();

    const { data: due, error } = await admin
      .from("waitlist")
      .select("id,email,verification_sent_at")
      .is("quiz_completed_at", null)
      .is("reminder_sent_at", null)
      .not("verification_token_hash", "is", null)
      .lte("verification_sent_at", sentBefore)
      .gt("verification_sent_at", sentAfter)
      .order("verification_sent_at", { ascending: true })
      .limit(BATCH);
    if (error) throw new Error(`reminder query failed: ${error.code ?? "unknown"}`);

    let sent = 0;
    let failed = 0;
    for (const row of due ?? []) {
      const { token, hash } = generateToken();
      // Claim the row: only one caller wins, so nobody gets two reminders.
      const { data: claimed } = await admin
        .from("waitlist")
        .update({ reminder_sent_at: new Date().toISOString(), reminder_token_hash: hash })
        .eq("id", row.id)
        .is("reminder_sent_at", null)
        .is("quiz_completed_at", null)
        .select("id");
      if (!claimed || claimed.length === 0) continue;

      const hoursLeft = (Date.parse(row.verification_sent_at as string) + LINK_TTL_MS - Date.now()) / 3_600_000;
      const result = await sendQuizReminderEmail(row.email, token, hoursLeft);
      if (result.sent) {
        sent++;
        await audit("quiz_reminder_sent", { waitlistId: row.id, email: row.email });
      } else {
        failed++;
      }
    }

    if (sent) Sentry.metrics.count("quiz.reminder", sent, { attributes: { result: "sent" } });
    if (failed) Sentry.metrics.count("quiz.reminder", failed, { attributes: { result: "failed" } });
    return NextResponse.json({ ok: true, due: due?.length ?? 0, sent, failed });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: "cron/quiz-reminders" } });
    console.error("[cron/quiz-reminders] failed:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Reminder run failed." }, { status: 500 });
  }
}
