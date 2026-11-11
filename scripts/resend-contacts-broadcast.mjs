#!/usr/bin/env node
/**
 * One-off: put every address AetherSkin has emailed into Resend contacts,
 * then (optionally) broadcast the founder's note to them.
 *
 *   $env:RESEND_API_KEY="re_..."      # full-access key, this shell only
 *   $env:EMAIL_FROM="AetherSkin <hello@aetherskin.app>"
 *   node scripts/resend-contacts-broadcast.mjs            # dry run: counts only
 *   node scripts/resend-contacts-broadcast.mjs --apply    # create contacts + draft broadcast
 *   node scripts/resend-contacts-broadcast.mjs --apply --send   # ...and send it now
 *
 * The broadcast HTML comes from previews/emails/founder-note-broadcast.raw.html:
 *   $env:EMAIL_PREVIEW_DIR="previews\emails"; npx vitest run test/email-preview.test.ts
 * Addresses are never printed. Safe to re-run: existing contacts are kept.
 */
import { readFileSync } from "node:fs";

const KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM;
const apply = process.argv.includes("--apply");
const send = process.argv.includes("--send");
if (!KEY) throw new Error("Set RESEND_API_KEY in this shell first.");
if (apply && !FROM) throw new Error("Set EMAIL_FROM (an address on your verified domain).");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(path, init = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`https://api.resend.com${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    if (res.status === 429) { await sleep(1500 * (attempt + 1)); continue; }
    const body = await res.json().catch(() => ({}));
    await sleep(600); // default limit is 2 requests per second
    return { status: res.status, body };
  }
  throw new Error(`Rate limited on ${path}`);
}

// 1. Everyone we have emailed.
const emails = new Set();
let after;
for (;;) {
  const { status, body } = await api(`/emails?limit=100${after ? `&after=${after}` : ""}`);
  if (status !== 200) throw new Error(`Listing sent emails failed (${status}).`);
  for (const m of body.data ?? []) {
    for (const to of m.to ?? []) {
      const addr = String(to).trim().toLowerCase();
      if (addr && !addr.endsWith("@resend.dev")) emails.add(addr);
    }
    after = m.id;
  }
  if (!body.has_more) break;
}
console.log(`Unique addresses emailed so far: ${emails.size}`);
if (!apply) { console.log("Dry run. Re-run with --apply to create the contacts."); process.exit(0); }

// 2. Segment to hold them (reuse RESEND_SEGMENT_ID if you already have one).
let segmentId = process.env.RESEND_SEGMENT_ID;
if (!segmentId) {
  const seg = await api("/segments", { method: "POST", body: JSON.stringify({ name: "AetherSkin waitlist" }) });
  if (seg.status >= 300) throw new Error(`Creating segment failed (${seg.status}).`);
  segmentId = seg.body.id;
}
console.log("Segment id (set this as RESEND_SEGMENT_ID in Vercel):", segmentId);

// 3. Contacts.
let added = 0, existing = 0, failed = 0;
for (const email of emails) {
  const r = await api("/contacts", {
    method: "POST",
    body: JSON.stringify({ email, unsubscribed: false, segments: [{ id: segmentId }] }),
  });
  if (r.status < 300) added++;
  else if (r.status === 409 || r.status === 422) {
    // Already a contact: make sure it is in the segment.
    const s = await api(`/contacts/${encodeURIComponent(email)}/segments/${segmentId}`, { method: "POST" });
    s.status < 300 ? existing++ : failed++;
  } else failed++;
}
console.log(`Contacts added: ${added}, already there: ${existing}, failed: ${failed}`);

// 4. Broadcast.
const html = readFileSync("previews/emails/founder-note-broadcast.raw.html", "utf8");
if (!html.includes("RESEND_UNSUBSCRIBE_URL")) throw new Error("Broadcast HTML is missing the unsubscribe link.");
const bc = await api("/broadcasts", {
  method: "POST",
  body: JSON.stringify({
    name: "Founder note",
    from: FROM,
    subject: "Why I'm building AetherSkin",
    html,
    segment_id: segmentId,
  }),
});
if (bc.status >= 300) throw new Error(`Creating broadcast failed (${bc.status}).`);
console.log("Broadcast draft id:", bc.body.id);
if (send) {
  const s = await api(`/broadcasts/${bc.body.id}/send`, { method: "POST", body: JSON.stringify({}) });
  console.log(s.status < 300 ? "Broadcast sent." : `Send failed (${s.status}).`);
} else {
  console.log("Draft only. Review it at resend.com/broadcasts, or re-run with --send.");
}
