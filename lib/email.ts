import "server-only";

import crypto from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { SITE_URL } from "@/lib/site";
import { FOUNDER_NOTE } from "@/lib/founder-note";

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

/*
 * Resend's sandbox sender (onboarding@resend.dev) only delivers to the email
 * address that owns the Resend account. Every other recipient gets a 403, so
 * running production on the fallback means real signups never receive their
 * verification link. Set EMAIL_FROM to an address on the verified domain.
 */
const SANDBOX_FROM = "AetherSkin <onboarding@resend.dev>";
const FROM = process.env.EMAIL_FROM || SANDBOX_FROM;
const SENDER_KIND = FROM.includes("@resend.dev") ? "sandbox" : "custom_domain";

export type SendResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "provider_error" };

/**
 * Report a delivery failure to Sentry. Vercel Hobby keeps runtime logs for
 * one hour, so console output alone loses the evidence. Only the HTTP status,
 * Resend's error name and the sender kind are sent: never the recipient, and
 * never Resend's message text, which can quote the recipient address.
 */
function reportDeliveryFailure(status: number | "network", errorName: string) {
  Sentry.metrics.count("email.delivery", 1, {
    attributes: { result: "failed", sender: SENDER_KIND },
  });
  Sentry.captureMessage("email_delivery_failed", {
    level: "error",
    tags: { email_status: String(status), resend_error: errorName, sender: SENDER_KIND },
  });
}

/** Resend error bodies look like { statusCode, name, message }. Keep only `name`. */
async function readErrorName(res: Response): Promise<string> {
  try {
    const body: { name?: unknown } = await res.json();
    return typeof body?.name === "string" ? body.name : "unknown";
  } catch {
    return "unparseable";
  }
}

/**
 * `delaySeconds` asks Resend to hold the message and deliver it later
 * (its `scheduled_at` field), so a follow-up needs no cron job of our own.
 */
async function send(to: string, subject: string, html: string, delaySeconds = 0): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set. Skipping delivery.");
    return { sent: false, reason: "not_configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject,
        html,
        ...(delaySeconds > 0 ? { scheduled_at: new Date(Date.now() + delaySeconds * 1000).toISOString() } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const errorName = await readErrorName(res);
      console.error("[email] provider responded", res.status, errorName, "sender:", SENDER_KIND);
      reportDeliveryFailure(res.status, errorName);
      return { sent: false, reason: "provider_error" };
    }
    Sentry.metrics.count("email.delivery", 1, {
      attributes: { result: "sent", sender: SENDER_KIND },
    });
    return { sent: true };
  } catch (err) {
    const errorName = err instanceof Error ? err.name : "unknown";
    console.error("[email] send failed:", errorName);
    reportDeliveryFailure("network", errorName);
    return { sent: false, reason: "provider_error" };
  }
}

/**
 * Add an address to the Resend contacts list (and to RESEND_SEGMENT_ID when
 * set) so broadcasts can reach everyone who signs up. An address that already
 * exists is fine (409/422 are treated as done). Never throws, and like the
 * sends above it reports only status and error name, never the address.
 */
export async function addResendContact(email: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const segmentId = process.env.RESEND_SEGMENT_ID;
  try {
    const res = await fetch("https://api.resend.com/contacts", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        unsubscribed: false,
        ...(segmentId ? { segments: [{ id: segmentId }] } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok || res.status === 409) return true;
    const errorName = await readErrorName(res);
    // An existing contact answers with a validation-style error; not a failure.
    if (res.status === 422 && /exist|already|duplicate/i.test(errorName)) return true;
    Sentry.captureMessage("resend_contact_failed", {
      level: "warning",
      tags: { email_status: String(res.status), resend_error: errorName },
    });
    return false;
  } catch (err) {
    Sentry.captureMessage("resend_contact_failed", {
      level: "warning",
      tags: { email_status: "network", resend_error: err instanceof Error ? err.name : "unknown" },
    });
    return false;
  }
}

/**
 * Brand tokens shared by every email. They mirror the site and quiz theme
 * (lilac room, plum ink, peach/coral accents, large rounded cards, pill
 * controls) because email clients cannot read our CSS variables.
 */
export const BRAND = {
  lilac: "#EEEAF7",
  cream: "#F7F5FC",
  ink: "#3B2F5C",
  muted: "#66598A",
  peach: "#F4B8A2",
  coral: "#E8907D",
  blush: "#F6D9E0",
  mist: "#DCD5F0",
  violet: "#7A5BB0",
  sans: "'DM Sans','Inter Tight',Helvetica,Arial,sans-serif",
  serif: "'Playfair Display',Georgia,'Times New Roman',serif",
} as const;

/** The owner-supplied lockup, served from our own domain (PNG: email clients drop SVG). */
const LOGO_URL = `${SITE_URL}/brand/lockup-aetherskin.png`;

const LOGO = (margin: string) =>
  `<a href="${SITE_URL}" style="text-decoration:none"><img src="${LOGO_URL}" width="170" height="40" alt="AetherSkin" style="display:block;border:0;height:40px;width:170px;margin:${margin}" /></a>`;

const FOOTER = `
    <p style="font-size:12px;color:${BRAND.muted};margin:32px 0 0;line-height:1.6">
      You received this because you asked to join the AetherSkin beta waitlist.
      If that wasn't you, ignore this email and nothing will happen.
    </p>`;

/**
 * Plain card with the logo on top. Pass `hero` (trusted, static markup) for the
 * landing-page style header band: sunset gradient, logo, badge and headline.
 */
export const SHELL = (inner: string, hero?: string) => `
<div style="background:${BRAND.lilac};padding:40px 16px;font-family:${BRAND.sans}">
  <div style="max-width:560px;margin:0 auto;background:${BRAND.cream};border-radius:26px;box-shadow:0 18px 50px rgba(59,47,92,.14)">
    ${
      hero
        ? `<div style="background:${BRAND.peach};background-image:linear-gradient(160deg,${BRAND.mist} 0%,${BRAND.blush} 48%,${BRAND.peach} 100%);border-radius:26px 26px 0 0;padding:30px 32px 38px">
      ${LOGO("0 0 30px")}
      ${hero}
    </div>
    <div style="padding:32px 32px 36px">${inner}${FOOTER}</div>`
        : `<div style="padding:36px 32px">${LOGO("0 0 26px")}${inner}${FOOTER}</div>`
    }
  </div>
</div>`;

/** Landing-hero headline: light sans lines, then the italic serif accent. */
const SIGNUP_HERO = `
      <h1 style="margin:34px 0 0;font-size:34px;font-weight:300;line-height:1.1;letter-spacing:-.02em;color:${BRAND.ink}">
        Stop guessing,<br />start knowing<br />
        <em style="font-family:${BRAND.serif};font-size:54px;font-weight:400;line-height:1.05;letter-spacing:-.01em;color:#4A1D3A">Your Skin</em>
      </h1>`;

/** Double opt-in: the ONLY way to reach the quiz is via this link. */
export function verificationEmail(token: string) {
  const url = `${SITE_URL}/verify?token=${encodeURIComponent(token)}`;
  return SHELL(`
    <p style="font-family:${BRAND.serif};font-size:26px;font-style:italic;color:${BRAND.ink};margin:0 0 14px;line-height:1.2">
      Thank you for joining.
    </p>
    <p style="font-size:15px;color:${BRAND.ink};line-height:1.6;margin:0 0 22px">
      You're one tap from your spot. Confirm your email and we'll take you
      straight to a 3-minute skin quiz.
    </p>
    <a href="${url}"
       style="display:inline-block;background:${BRAND.coral};background-image:linear-gradient(135deg,${BRAND.peach} 0%,${BRAND.coral} 100%);border-radius:999px;padding:18px 38px;font-size:15px;font-weight:700;color:${BRAND.ink};text-decoration:none;box-shadow:0 8px 22px rgba(232,144,125,.5)">
      Confirm &amp; start the quiz &nbsp;&#8599;
    </a>
    <p style="font-size:16px;font-weight:800;color:${BRAND.ink};margin:28px 0 0;text-align:center">
      This link works once and expires in 24 hours.
    </p>
    <p style="font-size:12px;color:${BRAND.muted};margin:8px 0 0;line-height:1.6;text-align:center">
      Or paste this link into your browser:<br />
      <span style="color:${BRAND.ink};word-break:break-all">${url}</span>
    </p>`, SIGNUP_HERO);
}

/**
 * The quiz no longer asks for a name (v2 has no free text), so the greeting
 * is generic. The position is an integer from our own database; it is still
 * coerced so nothing but digits can reach the HTML.
 */
export function quizCompleteEmail(position: number) {
  const place = Number.isFinite(position) ? Math.trunc(position) : 0;
  return SHELL(`
    <p style="font-family:${BRAND.serif};font-size:26px;font-style:italic;color:${BRAND.ink};margin:0 0 14px;line-height:1.2">
      You're in.
    </p>
    <p style="font-size:16px;color:${BRAND.ink};line-height:1.6;margin:0 0 22px">
      You've successfully joined the AetherSkin waitlist. Your skin profile is
      saved and your spot is locked. We'll email you the moment your first scan
      is ready.
    </p>
    <div style="background:${BRAND.peach};background-image:linear-gradient(135deg,${BRAND.blush} 0%,${BRAND.peach} 100%);border-radius:22px;padding:22px;text-align:center">
      <p style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:${BRAND.ink};margin:0 0 6px;text-transform:uppercase">Your place on the waitlist</p>
      <p style="font-family:${BRAND.serif};font-size:54px;font-weight:400;font-style:italic;color:#4A1D3A;margin:0;line-height:1">#${place}</p>
    </div>`, WAITLIST_HERO);
}

/** Header for the "you've joined" email: same band as the signup email. */
const WAITLIST_HERO = `
      <h1 style="margin:34px 0 0;font-size:34px;font-weight:300;line-height:1.1;letter-spacing:-.02em;color:${BRAND.ink}">
        Welcome to<br />the <em style="font-family:${BRAND.serif};font-size:54px;font-weight:400;line-height:1.05;letter-spacing:-.01em;color:#4A1D3A">waitlist</em>
      </h1>`;

/**
 * The founder's note, word for word as on the site (lib/founder-note.ts).
 * Sent once, two minutes after a new signup. It carries no quiz link: the
 * single-use token lives only in the verification email.
 */
export function founderNoteEmail() {
  const n = FOUNDER_NOTE;
  const paragraphs = n.paragraphs
    .map(
      (segments) =>
        `<p style="font-size:16px;color:#4a3f6b;line-height:1.65;margin:0 0 14px">${segments
          .map((s) => (s.b ? `<strong style="color:${BRAND.ink}">${escapeHtml(s.t)}</strong>` : escapeHtml(s.t)))
          .join("")}</p>`
    )
    .join("");
  return SHELL(`
    <p style="display:inline-block;margin:0 0 14px;background:${BRAND.peach};border-radius:999px;padding:7px 14px;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${BRAND.ink}">${escapeHtml(n.kicker)}</p>
    <h1 style="margin:0 0 20px;font-size:32px;font-weight:300;line-height:1.1;letter-spacing:-.02em;color:${BRAND.ink}">
      ${escapeHtml(n.titleLead)} <em style="font-family:${BRAND.serif};font-weight:400;font-size:36px">${escapeHtml(n.titleBrand)}</em>
    </h1>
    ${paragraphs}
    <p style="margin:22px 0 0;font-family:${BRAND.serif};font-style:italic;font-size:32px;line-height:1.1;color:${BRAND.ink}">${escapeHtml(n.name)}</p>
    <p style="margin:2px 0 0;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${BRAND.violet}">${escapeHtml(n.role)}</p>
    <p style="margin:26px 0 0;background:${BRAND.blush};border-radius:18px;padding:14px 18px;font-size:14px;line-height:1.55;color:${BRAND.ink}">
      <strong>Haven't done your quiz yet?</strong> Your link is in our other email, "Confirm your AetherSkin spot". It works once and lasts 24 hours.
    </p>
    <p style="font-size:12px;color:${BRAND.muted};margin:18px 0 0;line-height:1.6">
      Don't want emails from us? Reply to this email with "unsubscribe" and we'll take you off the list.
    </p>`);
}

/**
 * The same note for a Resend broadcast: the reply-to-unsubscribe line becomes
 * Resend's one-click unsubscribe link (filled in per contact at send time).
 */
export function founderNoteBroadcastEmail() {
  return founderNoteEmail().replace(
    /Don't want emails from us\?[^<]*/,
    `Don't want emails from us? <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:${BRAND.violet}">Unsubscribe here</a>.`
  );
}

/** How long after signup the founder's note goes out. */
export const FOUNDER_NOTE_DELAY_SECONDS = 120;

export async function sendFounderNoteEmail(to: string) {
  return send(to, "Why I'm building AetherSkin", founderNoteEmail(), FOUNDER_NOTE_DELAY_SECONDS);
}

export async function sendVerificationEmail(to: string, token: string) {
  return send(to, "Confirm your AetherSkin spot (+ 3-minute skin quiz)", verificationEmail(token));
}

export async function sendQuizCompleteEmail(to: string, position: number) {
  const place = Number.isFinite(position) ? Math.trunc(position) : 0;
  return send(to, `You're on the AetherSkin waitlist: you're #${place}`, quizCompleteEmail(position));
}
