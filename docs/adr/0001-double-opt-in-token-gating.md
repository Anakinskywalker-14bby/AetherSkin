# ADR 0001 — Gate the quiz behind a hashed double opt-in token

- **Status:** Accepted
- **Date:** 2026-09-05
- **Supersedes:** the $1 Stripe deposit flow

## Context

The waitlist originally charged a refundable $1 deposit through Stripe. The
deposit acted as a soft bot filter and a commitment signal, but it also:

- put a card field in front of a pre-launch product with nothing to sell yet,
- brought PCI scope and a payment dependency into a marketing site, and
- suppressed signups, which is the only metric that matters right now.

We removed payment entirely. That left an open question: with no card to
verify, what stops someone submitting the 13-question quiz a thousand times
with junk emails, and what proves an email address is real?

## Decision

Signup is a two-step double opt-in:

1. `POST /api/waitlist/join` accepts an email plus explicit consent. It
   generates a 32-byte random token, stores **only** its SHA-256 hash on the
   `waitlist` row, and emails the raw token as a link.
2. `POST /api/quiz` requires that raw token. The server hashes what it
   receives and looks up the row by hash. **Possession of the token is the
   authorization check** — there is no session, no login, no password.

## Consequences

**Good**

- A database leak does not let an attacker verify accounts or reach the quiz,
  because the stored hash is not the credential.
- No password reset flow, no session store, no auth provider to secure — the
  smallest attack surface that still proves email ownership.
- Bounced or fake addresses never reach the quiz table, so quiz data is
  attached to reachable humans.

**Bad / accepted trade-offs**

- The user cannot retake the quiz from a new device without the original
  email link. Acceptable: the quiz is once-per-person by design.
- Token is in a URL, so it can land in browser history or a shared screenshot.
  Mitigated by a 24-hour expiry, single use and single-purpose scope (it grants quiz
  submission only, nothing else).
- Email deliverability becomes a hard dependency. `/api/waitlist/join` returns
  HTTP 202 with `saved: true` when delivery fails, so the user sees the truth
  instead of a fake success screen.

## Alternatives considered

- **Magic-link session (Supabase Auth).** Rejected: full auth machinery for a
  pre-launch page with no logged-in surface to protect.
- **CAPTCHA instead of email verification.** Rejected: it proves humanity, not
  email ownership, and we need a reachable address to launch to.
- **Keep the $1 deposit.** Rejected: see Context.
