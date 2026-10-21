import * as Sentry from "@sentry/nextjs";
import {
  DATA_COLLECTION,
  isSensitivePath,
  scrubBreadcrumb,
  scrubEvent,
  scrubLog,
  scrubSpan,
} from "@/lib/sentry-scrub";

/*
 * Replay is left out entirely on pages that carry the auth token or health
 * answers (/quiz, /verify, /thank-you). Masking alone is not enough: the
 * token sits in the address bar, and Replay records the URL.
 *
 * Checked at init because the realistic route to /quiz is a full page load
 * from the email link (/verify redirects server-side), not a client-side
 * navigation from somewhere Replay was already recording.
 */
const onSensitivePage =
  typeof window !== "undefined" && isSensitivePath(window.location.pathname);

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 100% in dev, 10% in production.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Locked down — see DATA_COLLECTION. Our privacy policy promises IPs are
  // only ever stored as salted hashes; Sentry 11 collects user info, cookies
  // and headers by default, which would break that promise.
  dataCollection: DATA_COLLECTION,

  replaysSessionSampleRate: onSensitivePage ? 0 : 0.1,
  replaysOnErrorSampleRate: onSensitivePage ? 0 : 1.0,

  /*
   * Browser profiling: only inside already-sampled traces, and only in
   * Chromium browsers (the JS Self-Profiling API needs the Document-Policy:
   * js-profiling header set in next.config.mjs). Profiles hold function
   * names and timings, not page content, so they run on every page.
   */
  profileSessionSampleRate: 1.0,
  profileLifecycle: "trace",

  integrations: [
    Sentry.browserProfilingIntegration(),
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ...(onSensitivePage
      ? []
      : [
          Sentry.replayIntegration({
            // These are Sentry's defaults, stated explicitly so they can't be
            // switched off by someone who didn't know they were load-bearing.
            maskAllText: true,
            maskAllInputs: true,
            blockAllMedia: true,
          }),
        ]),
  ],

  beforeSend: (event) => scrubEvent(event),
  // Spans stream by default in Sentry 11, which skips beforeSendTransaction;
  // beforeSendSpan is the hook that actually sees performance data.
  beforeSendSpan: (span) => scrubSpan(span),
  beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
  beforeSendLog: (log) => scrubLog(log),
});

// Hook into App Router navigation transitions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
