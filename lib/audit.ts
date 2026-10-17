import "server-only";

import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Append-only audit trail.
 *
 * Records WHAT happened without storing raw PII: emails and IPs are stored
 * as salted SHA-256 hashes, so the log is useful for abuse investigation
 * and incident forensics but is not itself a PII spill if exposed.
 *
 * Never throws: an audit failure must not break a user's signup.
 */
export type AuditEvent =
  | "signup_requested"
  | "signup_resent"
  | "verification_opened"
  | "quiz_submitted"
  | "quiz_rejected"
  | "rate_limited";

const SALT = process.env.IP_HASH_SALT ?? "aetherskin-default-salt";

export function hashPii(value: string): string {
  return crypto.createHash("sha256").update(value + SALT).digest("hex");
}

export async function audit(
  event: AuditEvent,
  opts: {
    waitlistId?: string | null;
    email?: string | null;
    ip?: string | null;
    detail?: Record<string, unknown>;
  } = {}
): Promise<void> {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      event,
      waitlist_id: opts.waitlistId ?? null,
      email_hash: opts.email ? hashPii(opts.email.toLowerCase()) : null,
      ip_hash: opts.ip ? hashPii(opts.ip) : null,
      detail: (opts.detail ?? {}) as never,
    });
  } catch (err) {
    // Deliberately swallowed: logging must never break the request path.
    console.error("[audit] write failed:", err);
  }
}
