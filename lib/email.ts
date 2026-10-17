import "server-only";

import crypto from "node:crypto";
import { SITE_URL } from "@/lib/site";

/**
 * Email delivery + verification-token helpers.
 *
 * Tokens: a 32-byte random value is sent to the user; only its SHA-256 hash
 * is stored. A leaked database therefore can't be used to verify accounts.
 *
 * Delivery: Resend. If RESEND_API_KEY is absent the send is skipped and the
 * caller is told delivery is unavailable (rather than silently succeeding).
 */

export function generateToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Escape a value before interpolating it into email HTML.
 *
 * Quiz input is sanitized (control chars stripped, length capped) but not
 * HTML-escaped, because the web UI relies on React's contextual escaping.
 * Emails are hand-built HTML strings with no such protection, so a name like
 * `<a href="http://evil">click</a>` would render as a live link inside a
 * message that appears to come from AetherSkin. Escape at the boundary.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Constant-time compare for opaque strings. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

const FROM = process.env.EMAIL_FROM ?? "AetherSkin <onboarding@resend.dev>";

export type SendResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "provider_error" };

async function send(to: string, subject: string, html: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set. Skipping delivery to", to);
    return { sent: false, reason: "not_configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("[email] provider responded", res.status, await res.text());
      return { sent: false, reason: "provider_error" };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { sent: false, reason: "provider_error" };
  }
}

const SHELL = (inner: string) => `
<div style="background:#f9f9f7;padding:40px 20px;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#f9f9f7;border:3px solid #1a1c1b;box-shadow:8px 8px 0 #1a1c1b;padding:36px">
    <p style="font-size:26px;font-weight:900;font-style:italic;color:#1a1c1b;margin:0 0 24px">AetherSkin</p>
    ${inner}
    <p style="font-size:12px;color:#484739;margin:32px 0 0;line-height:1.6">
      You received this because you asked to join the AetherSkin beta waitlist.
      If that wasn't you, ignore this email and nothing will happen.
    </p>
  </div>
</div>`;

/** Double opt-in: the ONLY way to reach the quiz is via this link. */
export function verificationEmail(token: string) {
  const url = `${SITE_URL}/verify?token=${encodeURIComponent(token)}`;
  return SHELL(`
    <h1 style="font-size:28px;font-weight:800;color:#1a1c1b;margin:0 0 16px;line-height:1.2">
      Thank you for joining AetherSkin.
    </h1>
    <p style="font-size:16px;color:#484739;line-height:1.7;margin:0 0 12px">
      You're one tap from your spot. Confirm your email and we'll take you
      straight to a 2-minute skin quiz. Your answers are what let AetherSkin match
      you with products that actually fit your skin.
    </p>
    <p style="font-size:16px;color:#484739;line-height:1.7;margin:0 0 28px">
      No payment, ever. Just answers.
    </p>
    <a href="${url}"
       style="display:inline-block;background:#e8e883;border:3px solid #1a1c1b;box-shadow:4px 4px 0 #1a1c1b;padding:16px 32px;font-size:16px;font-weight:700;letter-spacing:1px;color:#1a1c1b;text-decoration:none;text-transform:uppercase">
      Confirm &amp; start the quiz
    </a>
    <p style="font-size:13px;color:#484739;margin:24px 0 0;line-height:1.6">
      Or paste this link into your browser:<br />
      <span style="color:#1a1c1b;word-break:break-all">${url}</span>
    </p>
    <p style="font-size:13px;color:#484739;margin:16px 0 0">
      This link expires in 7 days.
    </p>`);
}

export function quizCompleteEmail(name: string, position: number) {
  return SHELL(`
    <h1 style="font-size:28px;font-weight:800;color:#1a1c1b;margin:0 0 16px;line-height:1.2">
      You're in, ${escapeHtml(name)}.
    </h1>
    <p style="font-size:16px;color:#484739;line-height:1.7;margin:0 0 20px">
      Your skin profile is saved and your spot is locked. We'll email you the
      moment your first scan is ready.
    </p>
    <div style="background:#beeaf8;border:3px solid #1a1c1b;padding:20px;text-align:center">
      <p style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#1a1c1b;margin:0 0 4px;text-transform:uppercase">Your place in line</p>
      <p style="font-size:44px;font-weight:900;color:#1a1c1b;margin:0;line-height:1">#${position}</p>
    </div>`);
}

export async function sendVerificationEmail(to: string, token: string) {
  return send(to, "Confirm your AetherSkin spot (+ 2-minute skin quiz)", verificationEmail(token));
}

export async function sendQuizCompleteEmail(to: string, name: string, position: number) {
  return send(to, "You're in. Here's your place in line.", quizCompleteEmail(name, position));
}
