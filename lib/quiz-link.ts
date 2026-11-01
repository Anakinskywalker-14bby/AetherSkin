import "server-only";

import { hashToken } from "@/lib/email";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Quiz link lifetime.
 *
 * A confirmation link opens the quiz for 24 hours after it is emailed.
 * Finishing the quiz uses the link up (the hash is cleared). Asking to join
 * again issues a fresh link and a fresh 24 hours.
 */
export const LINK_TTL_HOURS = 24;
const HOUR = 60 * 60 * 1000;
export const LINK_TTL_MS = LINK_TTL_HOURS * HOUR;
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
 * Look a raw token up by its hash.
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
    .eq("verification_token_hash", hash)
    .limit(1)
    .maybeSingle();
  const entry = data as LinkEntry | null;
  if (!entry || entry.quiz_completed_at) return { state: "invalid" };
  if (isLinkExpired(entry.verification_sent_at, now, graceMs)) return { state: "expired" };
  return { state: "valid", entry };
}
