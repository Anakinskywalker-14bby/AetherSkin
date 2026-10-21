import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * Guard against the hook gap that shipped once already: Sentry 11 streams
 * spans by default, so beforeSendTransaction never runs and only
 * beforeSendSpan sees performance data. Every Sentry config must wire every
 * scrubber. Reading the source is crude, but these files run inside Next's
 * instrumentation hooks and can't be imported in a unit test.
 */
const CONFIGS = ["instrumentation-client.ts", "sentry.server.config.ts", "sentry.edge.config.ts"];

const REQUIRED = [
  "dataCollection: DATA_COLLECTION",
  "beforeSend: (event) => scrubEvent(event)",
  "beforeSendSpan: (span) => scrubSpan(span)",
  "beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb)",
  "beforeSendLog: (log) => scrubLog(log)",
];

describe.each(CONFIGS)("%s", (file) => {
  const src = readFileSync(join(process.cwd(), file), "utf8");

  it.each(REQUIRED)("wires %s", (line) => {
    expect(src).toContain(line);
  });

  it("does not opt back into the static trace lifecycle unannounced", () => {
    // If someone switches to traceLifecycle "static", beforeSendSpan needs
    // withStaticSpan() and beforeSendTransaction comes back into play.
    expect(src).not.toMatch(/traceLifecycle/);
  });
});
