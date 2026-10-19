import * as Sentry from "@sentry/nextjs";
import { DATA_COLLECTION, scrubBreadcrumb, scrubEvent } from "@/lib/sentry-scrub";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  /*
   * Everything the SDK would collect by default is switched off here — see
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
});
