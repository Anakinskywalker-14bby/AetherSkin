/**
 * One-off: send the personal routine to members who finished the quiz before
 * the 12-hour routine email existed, and release routines that were held.
 *
 *   dry run (default)  prints counts, and the waitlist position of every held
 *                      routine with reason codes. Sends nothing.
 *   --send             emails every routine that is safe to send automatically.
 *   --release 12,15    emails the held routines at those waitlist positions
 *                      (only after you have looked at their answers).
 *
 * Run from the repo root with the env loaded (needs SUPABASE_SERVICE_ROLE_KEY,
 * NEXT_PUBLIC_SUPABASE_URL and, to send, RESEND_API_KEY; set EMAIL_FROM to the
 * verified-domain sender):
 *
 *   node --env-file=.env.local node_modules/vite-node/vite-node.mjs -c vitest.config.ts scripts/send-routines.ts [flags]
 *
 * Health data stays off the screen: output has positions and reason codes only.
 * Each member is emailed at most once (tracked in audit_log as
 * routine_backfill_sent, or routine_queued by the quiz route), so re-running is safe. Resend allows 2 requests per
 * second, so sends are paced.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { sendRoutineEmail } from "@/lib/email";
import { buildRoutine, type RoutineInput } from "@/lib/routine/build";
import { renderRoutineEmail } from "@/lib/routine/email";
import { holdReasons } from "@/lib/routine/review";

type Row = RoutineInput & { waitlist_id: string };

async function main() {
  const args = process.argv.slice(2);
  const send = args.includes("--send");
  const releaseIdx = args.indexOf("--release");
  const release = new Set(
    releaseIdx >= 0 ? (args[releaseIdx + 1] ?? "").split(",").map((n) => Number(n.trim())).filter(Number.isInteger) : []
  );
  const db = createAdminClient();

  const { data: members, error: mErr } = await db
    .from("waitlist")
    .select("id, email, position")
    .not("quiz_completed_at", "is", null);
  if (mErr) throw new Error(`waitlist read failed: ${mErr.message}`);

  const { data: sentRows, error: sErr } = await db
    .from("audit_log")
    .select("waitlist_id")
    .in("event", ["routine_backfill_sent", "routine_queued"]);
  if (sErr) throw new Error(`audit read failed: ${sErr.message}`);
  const alreadySent = new Set((sentRows ?? []).map((r) => r.waitlist_id as string));

  const { data: answers, error: aErr } = await db.from("quiz_responses_v3").select("*");
  if (aErr) throw new Error(`answers read failed: ${aErr.message}`);
  const byMember = new Map<string, Row>((answers ?? []).map((a) => [a.waitlist_id as string, a as Row]));

  let ready = 0, held = 0, skipped = 0, sentCount = 0, failed = 0;
  const heldList: string[] = [];

  for (const m of members ?? []) {
    const answersRow = byMember.get(m.id);
    if (!answersRow || alreadySent.has(m.id)) {
      skipped++;
      continue;
    }
    const routine = buildRoutine(answersRow);
    const reasons = holdReasons(routine);
    const isHeld = reasons.length > 0;
    if (isHeld) {
      held++;
      heldList.push(`#${m.position}: ${reasons.join(", ")}`);
    } else ready++;

    const shouldSend = isHeld ? release.has(m.position) : send;
    if (!shouldSend) continue;

    const rendered = renderRoutineEmail(routine);
    const result = await sendRoutineEmail(m.email, rendered.subject, rendered.html, 0);
    if (result.sent) {
      sentCount++;
      await audit("routine_backfill_sent", { waitlistId: m.id, email: m.email, detail: { released: isHeld } });
    } else failed++;
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`members with answers: ${(members ?? []).length - skipped}, already sent or no answers: ${skipped}`);
  console.log(`safe to send: ${ready}, held for review: ${held}`);
  if (heldList.length) console.log("held:\n  " + heldList.join("\n  "));
  console.log(send || release.size ? `sent: ${sentCount}, failed: ${failed}` : "dry run: nothing sent (use --send)");
}

main().catch((err) => {
  console.error("send-routines failed:", err instanceof Error ? err.message : "unknown");
  process.exit(1);
});
