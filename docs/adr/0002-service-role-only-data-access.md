# ADR 0002 — All database access goes through server routes with the service role

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

Supabase's normal pattern is a browser client using the anon key, with Row
Level Security deciding what each authenticated user may read. That model
assumes there *is* an authenticated user. AetherSkin has no login: a visitor is
anonymous right up to the moment they submit the quiz, identified only by a
token from an email.

With no `auth.uid()` to write policies against, an anon-key browser client
would need either permissive policies (anyone can read the waitlist) or
policies that cannot express our actual rule ("you may write this row if you
hold the token whose hash it stores").

## Decision

- The browser never talks to Supabase. There is no client-side Supabase
  import anywhere in the bundle.
- `waitlist`, `quiz_responses` and `audit_log` have **RLS enabled with no
  policies**, so the anon and authenticated roles can do nothing at all.
- Only `lib/supabase/admin.ts`, imported exclusively by route handlers, uses
  `SUPABASE_SERVICE_ROLE_KEY`. It is marked `server-only`, which turns any
  client import into a build failure rather than a runtime leak.
- Authorization lives in the route handlers: same-origin check, rate limit,
  allow-list validation, then a token-hash lookup.

## Consequences

**Good**

- The service-role key never reaches the browser, and the build breaks loudly
  if someone tries.
- "RLS on, zero policies" is a default-deny posture: a future table added
  without policies is closed, not open.
- Every write passes through one audited code path, so validation and rate
  limiting cannot be bypassed by talking to the database directly.

**Bad / accepted trade-offs**

- No realtime subscriptions or direct client queries. Not needed today.
- Route handlers hold real authorization logic, so they must be reviewed with
  that weight. Mitigated by unit tests over the validation and CSRF layers.
- The service role bypasses RLS by definition, so a bug in a route handler is
  not caught by a second line of defence at the database. Accepted for now;
  revisit if a logged-in surface is ever added.

## Alternatives considered

- **Anon key + RLS keyed on a token column.** Rejected: it requires exposing
  the token to a client query, and RLS cannot rate-limit or validate.
- **Supabase Edge Functions.** Rejected: a second runtime and deploy target
  for logic that sits naturally beside the pages that call it.
