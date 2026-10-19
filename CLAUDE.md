# AetherSkin — rules for AI coding assistants

Read this before writing, refactoring, or approving any code in this repo.

## Deployment gate (non-negotiable)

**Pushing to `main` deploys to production** — Vercel auto-deploys every push.
So "ready to deploy" and "ready to push to main" are the same thing.

Before any code is approved for deployment:

1. **Sentry must be properly initialised and errors handled.**
   - Client: `instrumentation-client.ts`. Server: `sentry.server.config.ts`.
     Edge: `sentry.edge.config.ts`. All three use `DATA_COLLECTION` and the
     scrubbers from `lib/sentry-scrub.ts` — never initialise Sentry without them.
   - New API routes must let unexpected errors reach Sentry (don't swallow them
     in a catch that only returns a 500 without capturing).
2. **Run Snyk locally** whenever dependencies are added or critical logic
   changes — tell the human to run it, or run it yourself:
   ```
   snyk test        # dependency vulnerabilities
   snyk code test   # static analysis of our own code
   ```
3. **Do not mark anything "ready to deploy"** until both scans are clean, or every
   remaining finding is either fixed or explicitly accepted by the human with a
   written reason in `.snyk`.

To test without touching production, push to a branch — Vercel builds an
isolated preview URL, and the Sentry DSNs are configured for previews.

## Privacy rules that Sentry must never break

- The quiz URL carries the auth token (`/quiz?token=…`). Possession of that
  token IS the authorization (ADR-0001). It must never reach Sentry.
- Quiz answers are health information: pregnancy status, prescription
  treatments, acne severity. They must never reach Sentry.
- So: `DATA_COLLECTION` keeps request bodies, headers, cookies, query params,
  database write payloads and stack-frame variables switched OFF. Sentry 11
  defaults all of these to ON. `test/sentry-scrub.test.ts` fails if any are
  turned back on — if that test fails, the fix is never to loosen the test.
- Session Replay never runs on `/quiz`, `/verify` or `/thank-you`.

## Other ground rules

- See `docs/ARCHITECTURE.md` and `docs/adr/` before changing auth, CSRF, or
  data access.
- `npm run verify` = typecheck → lint → tests with coverage → build.
- This dev machine runs low on RAM; if a local `next build` crashes with an
  out-of-memory or native error, close other apps and retry before concluding
  the code is broken. Vercel's build is authoritative.
