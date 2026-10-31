import "server-only";

import { hashToken } from "@/lib/email";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Quiz link lifetime.
 *
 * A confirmation link opens the quiz for 24 hours after it is emailed. If the
 * quiz isn't done after 12 hours, one reminder email goes out with its own
 * link, valid until the same 24-hour mark. Finishing the quiz uses the link
 * up (both hashes are cleared). Asking to join again issues a fresh link and
 * a fresh 24 hours.
 */
export const LINK_TTL_HOURS = 24;
export const REMINDER_AFTER_HOURS = 12;
const HOUR = 60 * 60 * 1000;
export const LINK_TTL_MS = LINK_TTL_HOURS * HOUR;
export const REMINDER_AFTER_MS = REMINDER_AFTER_HOURS * HOUR;
/** Someone who opened the quiz at 23h59 can still submit a few minutes later. */
export const SUBMIT_GRACE_MS = 30 * 60 * 1000;

/** True once the link's lifetime (plus any grace) has passed. */
export function isLinkExpired(sentAt: string | null, now = Date.now(), graceMs = 0): boolean {
  if (!sentAt) return true;
  const sent = Date.parse(sentAt);
  if (!Number.isFinite(sent)) return true;
  return now > sent + LINK_TTL_MS + graceMs;
}

export type LinkEntry = {
  id: string;
  email: string;
  position: number;
  quiz_completed_at: string | null;
  verification_sent_at: string | null;
};

export type LinkState =
  | { state: "valid"; entry: LinkEntry }
  | { state: "expired" }
  | { state: "invalid" };

/**
 * Look a raw token up by its hash. It may be the original link or the
 * reminder link. Hashes are hex, so they are safe inside the filter string.
 */
export async function resolveQuizLink(
  admin: AdminClient,
  token: string,
  graceMs = 0,
  now = Date.now()
): Promise<LinkState> {
  const hash = hashToken(token);
  if (!/^[0-9a-f]{64}$/.test(hash)) return { state: "invalid" };
  const { data } = await admin
    .from("waitlist")
    .select("id,email,position,quiz_completed_at,verification_sent_at")
    .or(`verification_token_hash.eq.${hash},reminder_token_hash.eq.${hash}`)
    .limit(1)
    .maybeSingle();
  const entry = data as LinkEntry | null;
  if (!entry || entry.quiz_completed_at) return { state: "invalid" };
  if (isLinkExpired(entry.verification_sent_at, now, graceMs)) return { state: "expired" };
  return { state: "valid", entry };
}
