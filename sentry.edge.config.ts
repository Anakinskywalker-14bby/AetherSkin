import * as Sentry from "@sentry/nextjs";
import { DATA_COLLECTION, scrubBreadcrumb, scrubEvent, scrubLog, scrubSpan } from "@/lib/sentry-scrub";

/*
 * Edge runtime. Nothing runs on Edge any more: Next 16 moved middleware to
 * proxy.ts (Node.js) and deprecated Edge, and app/opengraph-image.tsx moved
 * to Node.js with it. Kept so a future route that sets `runtime = "edge"`
 * still gets the same privacy settings rather than none.
 *
 * No profiling here: @sentry/profiling-node is a native Node add-on and the
 * edge runtime can't load it.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  integrations: [Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] })],

  dataCollection: DATA_COLLECTION,

  beforeSend: (event) => scrubEvent(event),
  // Spans stream by default in Sentry 11, which skips beforeSendTransaction;
  // beforeSendSpan is the hook that actually sees performance data.
  beforeSendSpan: (span) => scrubSpan(span),
  beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
  beforeSendLog: (log) => scrubLog(log),
});
