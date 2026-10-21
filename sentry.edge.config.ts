import * as Sentry from "@sentry/nextjs";
import { DATA_COLLECTION, scrubBreadcrumb, scrubEvent, scrubLog } from "@/lib/sentry-scrub";

/*
 * No profiling here: @sentry/profiling-node is a native Node add-on and the
 * edge runtime (middleware.ts) can't load it.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  integrations: [Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] })],

  dataCollection: DATA_COLLECTION,

  beforeSend: (event) => scrubEvent(event),
  beforeSendTransaction: (event) => scrubEvent(event),
  beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
  beforeSendLog: (log) => scrubLog(log),
});
