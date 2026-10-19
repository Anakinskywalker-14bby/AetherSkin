# AetherSkin — AI Skin Intelligence

Pre-launch marketing site with a free waitlist and a skin quiz. No payment,
no login, no user-generated content shown to other users.

**Stack:** Next.js 15 (App Router) · React 18 · TypeScript · Tailwind CSS ·
Supabase (Postgres) · Resend · Vercel

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for diagrams and trust
boundaries, and [`docs/adr/`](docs/adr) for the decisions behind them.

## How signup works

Double opt-in, with no session or password anywhere:

1. `POST /api/waitlist/join` — email plus explicit consent. Generates a
   32-byte token, stores **only its SHA-256 hash**, emails the raw token.
2. `POST /api/quiz` — requires that token. The server hashes what it receives
   and looks up the row by hash. **Possession of the token is the
   authorization check.**

A database leak therefore can't be used to verify accounts or reach the quiz.
See [ADR-0001](docs/adr/0001-double-opt-in-token-gating.md).

## Routes

```
/                    landing + waitlist signup
/about /privacy /terms
/quiz                13-question skin quiz (token-gated)
/verify              consumes the email token, redirects to /quiz
/thank-you           confirmation + waitlist position
/api/waitlist/join   POST — free email capture
/api/quiz            POST — quiz submission
```

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

| Variable | Required | If missing |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | build fails |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | signup returns 503 |
| `RESEND_API_KEY` | yes | signup returns 202 "saved, not sent" |
| `NEXT_PUBLIC_SITE_URL` | recommended | canonical URLs fall back to a default |
| `EMAIL_FROM` | yes in production | falls back to the Resend sandbox sender, which only delivers to the Resend account owner, so every real signup gets a 403 and no email |
| `IP_HASH_SALT` | recommended | uses a default salt — set a real one |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | optional | rate limiting falls back to per-instance memory |

Only `NEXT_PUBLIC_*` values are safe to commit. Everything else lives in
Vercel's encrypted environment variables; CI fails the build if a
secret-shaped string is committed.

## Security model

- **No client-side database access.** The browser never talks to Supabase.
  `lib/supabase/admin.ts` imports `server-only`, so a client import is a
  build-time error, not a runtime leak. ([ADR-0002](docs/adr/0002-service-role-only-data-access.md))
- **RLS enabled with no policies** on every table — anon and authenticated
  roles can do nothing. All access goes through route handlers using the
  service role.
- **CSRF** via request-host comparison on every mutating route.
  ([ADR-0003](docs/adr/0003-origin-based-csrf-defence.md))
- **Allow-list validation** — every quiz answer is checked against the
  question definitions, so arbitrary strings never reach the database.
- **Append-only audit log** storing salted SHA-256 hashes of emails and IPs,
  never the raw values.
- Sliding-window rate limiting, body-size caps, CSP, HSTS, and
  `X-Frame-Options: DENY`.

## Verify

```bash
npm run verify     # typecheck → lint → tests with coverage → build
```

75 tests covering quiz validation, CSRF, token hashing, retry backoff and
email templates. Coverage gates at 70% for `lib/**` and runs in GitHub
Actions on every push and PR.

## Deploy

Pushes to `main` deploy automatically via the Vercel git integration.

**Changing the domain** — order matters. Add the domain in Vercel, wait for
the certificate, confirm it serves, verify it in Resend, and only then update
`NEXT_PUBLIC_SITE_URL`. Pointing the canonical URL at a hostname that isn't
serving the current build is a real incident that already happened once; it's
written up in [ADR-0003](docs/adr/0003-origin-based-csrf-defence.md).
