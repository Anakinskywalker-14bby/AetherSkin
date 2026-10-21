import * as Sentry from "@sentry/nextjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { DATA_COLLECTION, scrubBreadcrumb, scrubEvent, scrubLog } from "@/lib/sentry-scrub";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  /*
   * Profiling runs only inside traces that were already sampled above, so in
   * production it covers the same 10% of requests. @sentry/profiling-node
   * must stay on exactly the same version as @sentry/nextjs (both pinned).
   */
  profileSessionSampleRate: 1.0,
  profileLifecycle: "trace",

  integrations: [
    nodeProfilingIntegration(),
    // Forward console output as Sentry logs. Every log passes scrubLog first.
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],

  /*
   * Everything the SDK would collect by default is switched off here - see
   * DATA_COLLECTION for the reasoning. That includes stackFrameVariables,
   * the v11 home of what was includeLocalVariables: in /api/waitlist/join
   * and /api/quiz the locals are the user's email, the raw verification
   * token and the parsed quiz body (pregnancy status, prescriptions, acne
   * severity). Stack traces and line numbers are enough to debug.
   */
  dataCollection: DATA_COLLECTION,
  includeLocalVariables: false,

  beforeSend: (event) => scrubEvent(event),
  beforeSendTransaction: (event) => scrubEvent(event),
  beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
  beforeSendLog: (log) => scrubLog(log),
});
