import type * as SentryNext from "@sentry/nextjs";
import type { Breadcrumb } from "@sentry/nextjs";

/*
 * DataCollection is defined in @sentry/core but not re-exported from
 * @sentry/nextjs. Importing @sentry/core directly would depend on a package
 * that isn't in package.json, so the type is derived from init()'s own
 * options instead — it always matches whatever SDK version is installed.
 */
type SentryInitOptions = NonNullable<Parameters<typeof SentryNext.init>[0]>;
type DataCollection = NonNullable<SentryInitOptions["dataCollection"]>;

/**
 * Keeps credentials and health data out of Sentry.
 *
 * The quiz is reached at /quiz?token=…, and per ADR-0001 possession of that
 * token IS the authorization. Sentry records page URLs on error events,
 * breadcrumbs, performance transactions and replays, so without this every
 * quiz visit would hand a working credential to a third party.
 *
 * Shared by the client, server and edge configs so the three can't drift.
 */

/**
 * What the SDK may collect at all — the first line of defence, with the
 * scrubbers below as the second.
 *
 * Sentry 11's defaults are permissive: every field here defaults to "collect".
 * Left unset, the SDK would capture HTTP request and response bodies (on
 * /api/quiz those are health answers), all headers and cookies, query params,
 * local variable values in stack frames, and — via its Supabase integration —
 * the payloads of database writes, i.e. the INSERT into quiz_responses with
 * pregnancy status and prescription treatments in it.
 *
 * Everything is switched off explicitly. Name-based allow/deny lists are not
 * used for stack variables because the SDK's own docs warn that minifiers
 * rename locals, so a deny list written against source names silently stops
 * matching in production.
 */
export const DATA_COLLECTION: DataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  stackFrameVariables: false,
  queues: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
};

/**
 * Structural event shape. Typed by the fields we touch rather than importing
 * the SDK's event classes, because @sentry/nextjs 11 does not re-export
 * TransactionEvent — and a scrubber should not break on a type rename.
 */
interface ScrubbableEvent {
  request?: {
    url?: string;
    query_string?: unknown;
    data?: unknown;
    cookies?: unknown;
    headers?: unknown;
  };
  transaction?: string;
  message?: string;
  exception?: { values?: Array<{ value?: string }> };
  breadcrumbs?: Breadcrumb[];
  contexts?: { trace?: { data?: Record<string, unknown> } };
}

/*
 * Free-text redaction for exception messages.
 *
 * Postgres (and so Supabase) puts row values into error messages. A duplicate
 * signup raises: duplicate key value violates unique constraint
 * "waitlist_email_key" — Key (email)=(jane@example.com) already exists.
 * Capturing that exception unscrubbed would leak the address, and URL
 * scrubbing never touches message text.
 */
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/*
 * Postgres also quotes values that aren't emails. A check-constraint failure
 * on quiz_responses reports "Failing row contains (…)" with every column of
 * the row, health answers included; unique and foreign-key errors report
 * "Key (col)=(value)". Column names are kept so the error stays debuggable;
 * the values are not.
 */
// To end of line, not to the closing paren: a value can itself contain ")".
const PG_FAILING_ROW_RE = /Failing row contains .*$/gm;
const PG_KEY_VALUE_RE = /(Key \([^)]*\))=\([^)]*\)/g;

export function scrubText(input: string): string {
  return (scrubUrl(input) ?? input)
    .replace(PG_FAILING_ROW_RE, "Failing row contains ([redacted])")
    .replace(PG_KEY_VALUE_RE, "$1=([redacted])")
    .replace(EMAIL_RE, "[email]");
}

/** Structural log shape: the fields of the SDK's Log type that we touch. */
interface ScrubbableLog {
  message: unknown;
  attributes?: Record<string, unknown>;
}

/**
 * beforeSendLog. Logs are a separate pipeline from events, so beforeSend never
 * sees them, and consoleLoggingIntegration forwards whatever the app passed
 * to console.error, including caught Supabase errors.
 *
 * The message is scrubbed like exception text. The raw console arguments,
 * which the SDK also attaches as sentry.message.parameter.N attributes, are
 * dropped: the scrubbed message already contains them, and a parameter is
 * the one place an unscrubbed copy would survive.
 */
export function scrubLog<T extends ScrubbableLog>(log: T): T {
  (log as ScrubbableLog).message = scrubText(String(log.message));
  if (log.attributes) {
    for (const [key, value] of Object.entries(log.attributes)) {
      if (key.startsWith("sentry.message.parameter")) {
        delete log.attributes[key];
      } else if (typeof value === "string") {
        log.attributes[key] = scrubText(value);
      }
    }
  }
  return log;
}

/** Structural streamed-span shape: the fields of StreamedSpanJSON we touch. */
interface ScrubbableSpan {
  name: string;
  attributes?: Record<string, unknown>;
}

function scrubAttributeValue(value: unknown): unknown {
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) return value.map(scrubAttributeValue);
  // Attributes can also arrive as { value, unit } objects.
  if (value && typeof value === "object" && "value" in value) {
    const v = value as { value: unknown };
    return { ...v, value: scrubAttributeValue(v.value) };
  }
  return value;
}

/**
 * beforeSendSpan. Sentry 11 streams spans by default (traceLifecycle
 * "stream"), and in that mode beforeSendTransaction is never called, so the
 * transaction scrubbing in scrubEvent does not run for performance data.
 * This is the hook that does.
 *
 * A pageload of /quiz?token=… or /verify?token=… produces spans whose name
 * and attributes (url.full, http.query, referrer and so on) can carry the
 * token. The name and every string attribute go through scrubText.
 */
export function scrubSpan<T extends ScrubbableSpan>(span: T): T {
  span.name = scrubText(span.name);
  if (span.attributes) {
    for (const [key, value] of Object.entries(span.attributes)) {
      span.attributes[key] = scrubAttributeValue(value);
    }
  }
  return span;
}

/** Query parameters whose values must never leave the app. */
export const SENSITIVE_PARAMS = ["token", "code", "access_token", "refresh_token", "email"] as const;

const REDACTED = "[redacted]";

/** Paths that carry the token or health answers; Replay never records them. */
export const SENSITIVE_PATHS = ["/quiz", "/verify", "/thank-you"] as const;

export function isSensitivePath(pathname: string): boolean {
  return SENSITIVE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Redact sensitive query params in a URL or query string. Works on absolute
 * URLs, relative URLs and bare "a=1&b=2" strings, and never throws — a
 * scrubber that crashes would drop the very error it was meant to report.
 */
export function scrubUrl(input: string | undefined | null): string | undefined {
  if (input == null) return undefined;
  if (!input) return input;
  return input.replace(
    new RegExp(`([?&#]|^)(${SENSITIVE_PARAMS.join("|")})=([^&#\\s]*)`, "gi"),
    (_m, sep: string, key: string) => `${sep}${key}=${REDACTED}`
  );
}

function scrubQuery(q: unknown): unknown {
  if (typeof q === "string") return scrubUrl(q);
  if (Array.isArray(q)) {
    return q.map((pair) =>
      Array.isArray(pair) && typeof pair[0] === "string" &&
      (SENSITIVE_PARAMS as readonly string[]).includes(pair[0].toLowerCase())
        ? [pair[0], REDACTED]
        : pair
    );
  }
  if (q && typeof q === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(q)) {
      out[k] = (SENSITIVE_PARAMS as readonly string[]).includes(k.toLowerCase()) ? REDACTED : v;
    }
    return out;
  }
  return q;
}

export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb {
  if (crumb.data) {
    for (const key of ["url", "from", "to"] as const) {
      const v = crumb.data[key];
      if (typeof v === "string") crumb.data[key] = scrubUrl(v);
    }
  }
  if (typeof crumb.message === "string") crumb.message = scrubText(crumb.message);
  /*
   * Console breadcrumbs keep the raw logged values in data.arguments. The API
   * routes log caught errors with console.error, and a Postgres error message
   * can carry the user's email, so the arguments are dropped — the scrubbed
   * message above already says what happened.
   */
  if (crumb.category === "console" && crumb.data && "arguments" in crumb.data) {
    delete crumb.data.arguments;
  }
  return crumb;
}

/** Applies to both error and transaction events. */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) {
    if (event.request.url) event.request.url = scrubUrl(event.request.url);
    if (event.request.query_string !== undefined) {
      event.request.query_string = scrubQuery(event.request.query_string);
    }
    // Request bodies on /api/quiz are health answers; never ship them.
    // DATA_COLLECTION already disables body capture — this is the backstop
    // in case a future SDK version or integration ignores that setting.
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.headers;
  }
  if (typeof event.transaction === "string") {
    event.transaction = scrubUrl(event.transaction) ?? event.transaction;
  }
  if (typeof event.message === "string") {
    event.message = scrubText(event.message);
  }
  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (typeof ex.value === "string") ex.value = scrubText(ex.value);
    }
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
  }
  // Trace context carries the URL too.
  const trace = event.contexts?.trace?.data as Record<string, unknown> | undefined;
  if (trace) {
    for (const key of ["url", "http.url", "http.query"]) {
      if (typeof trace[key] === "string") trace[key] = scrubUrl(trace[key] as string);
    }
  }
  return event;
}
