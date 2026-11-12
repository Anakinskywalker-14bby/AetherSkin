import "server-only";

import crypto from "node:crypto";
import * as Sentry from "@sentry/nextjs";
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
  | "quiz_claim_released"
  | "rate_limited";

let warnedNoSalt = false;

/**
 * The salt for PII hashes. Deployed builds (production and previews, which
 * share the database) refuse to hash without a real IP_HASH_SALT: a default
 * salt is public in this repo, so anyone holding a DB dump could reverse the
 * hashes by trying every IPv4 address or a list of emails (vbsec scan
 * 2026-11-09, low). Storing no hash is safer than storing a reversible one.
 * Local dev and tests fall back to a fixed salt so they work without config.
 */
function piiSalt(): string | null {
  const salt = process.env.IP_HASH_SALT;
  if (salt) return salt;
  if (process.env.NODE_ENV !== "production") return "aetherskin-dev-salt";
  if (!warnedNoSalt) {
    warnedNoSalt = true;
    Sentry.captureMessage("IP_HASH_SALT is not set; PII hashes are not being stored", "warning");
  }
  return null;
}

/** Salted SHA-256 of an email or IP, or null when no real salt is configured. */
export function hashPii(value: string): string | null {
  const salt = piiSalt();
  if (!salt) return null;
  return crypto.createHash("sha256").update(value + salt).digest("hex");
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
    // Never blocks the request path, but a failure here means the abuse
    // trail went dark -- that must still be observable (PYA audit
    // 2026-11-12, low). No PII in this report: `event` is an enum and `err`
    // is a DB/driver error, never the email/IP that was being hashed.
    console.error("[audit] write failed:", err);
    Sentry.captureException(err, { tags: { feature: "audit", event } });
  }
}
