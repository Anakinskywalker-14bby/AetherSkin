# AetherSkin — AI Skin Intelligence

Production brand website: Next.js 14 (App Router) · Tailwind · TypeScript · Supabase · Stripe · Vercel. Design language: **Clinical Radiance System** (soft teal `#016464`, warm peach `#fbd9c1`, white→icy-mint cards, pill geometry, ambient teal shadows).

## What's already live

The database side was deployed to Supabase project `hazjyonpqungkgchqgro` while this repo was generated — no manual SQL needed:

- `profiles` and `waitlist` tables with profile metrics (glow_score, streak_days, scans_completed), waitlist positions, and Stripe payment columns
- Strict RLS: owner-only reads/writes on profiles; owner-only reads on waitlist; **all waitlist mutations flow through server routes** (service role) — anon/authenticated roles have no write path
- `on_auth_user_created` trigger auto-provisioning profiles; `set_updated_at` triggers; both functions revoked from the public RPC surface (security advisor: **0 findings**)
- Edge Function **`waitlist-confirm`** (v1, ACTIVE) — async confirmation email + timestamp stamping, guarded by a shared `x-task-secret` header

The `supabase/` folder mirrors everything deployed, so the repo stays the source of truth.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in the secrets below
npm run dev
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are prefilled in `.env.example` with this project's real values. You must add:

- `SUPABASE_SERVICE_ROLE_KEY` — Supabase Dashboard → Settings → API (server-only; never expose)
- `STRIPE_SECRET_KEY` — Stripe Dashboard → Developers → API keys
- `STRIPE_WEBHOOK_SECRET` — created when you register the webhook (below)
- `EDGE_TASK_SECRET` — any long random string; set the same value in Supabase: `supabase secrets set EDGE_TASK_SECRET=<value> RESEND_API_KEY=<optional>`
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — optional but recommended; without them rate limiting falls back to a per-instance in-memory window

## Stripe wiring

1. In the Stripe Dashboard create a webhook endpoint pointing at `https://<your-domain>/api/webhooks/stripe`, subscribed to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `checkout.session.expired`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
2. Local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

Payment flow: configurator → `POST /api/checkout` (rate-limited, validates + sanitizes payload, upserts a `pending` waitlist row, creates a $1.00 Checkout Session with `waitlist_id` metadata) → Stripe hosted checkout → webhook verifies the signature and promotes the row to `active_waitlist` → fire-and-forget delegation to the `waitlist-confirm` Edge Function for email + stamping → `/success` shows the user's position.

## Deploy to Vercel

```bash
vercel --prod
```

Set all `.env.example` variables in Vercel → Project → Settings → Environment Variables (`NEXT_PUBLIC_SITE_URL` = your production URL). Serverless notes: the webhook handler answers fast and pushes slow work to the Supabase Edge Function, so Hobby-tier 10s limits are never in play; distributed rate limiting via Upstash is strongly recommended once traffic is real.

## Security model

- Secrets live only in server contexts. `lib/stripe.ts` and `lib/supabase/admin.ts` import `server-only`, making any client-side import a **build-time error**. Nothing sensitive carries a `NEXT_PUBLIC_` prefix.
- RLS is the last line of defense: even with app-code bugs, users can only ever read their own rows.
- `/api/account/profile` enforces a fresh-session challenge — access tokens older than 5 minutes get `401 REAUTH_REQUIRED` and the client must re-validate through Supabase Auth before critical changes.
- Global middleware blocks scripted user agents and off-spec methods before compute is spent; every write route additionally passes a sliding-window rate limiter.
- Webhook signatures are verified against the raw body; promotions are idempotent, so Stripe retries are safe.

## Project map

```
app/
  page.tsx                 landing (Hero → Brand World → Science → Configurator)
  success/page.tsx         post-checkout confirmation with live queue position
  api/checkout/            $1.00 Stripe Checkout Session factory
  api/webhooks/stripe/     signature-verified promotion pipeline
  api/waitlist/            RLS-scoped read of own entry
  api/account/profile/     critical updates behind fresh-session challenge
components/
  Logo.tsx                 "Cosmic Capsule" inline SVG mark
  BrandWorld.tsx           gamified drifting benefit bubbles + parallax field
  Configurator.tsx         5-step diagnostic, peach progress, live preview card
lib/                       supabase clients (browser/server/admin), stripe, rate-limit
supabase/                  migrations + edge function (mirrors what's deployed)
```
