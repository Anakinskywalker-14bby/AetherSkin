"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";

/*
 * The localStorage slot that remembers the visitor's choice. Named for what
 * it is: a bare `KEY` constant holding a string literal pattern-matches as a
 * hardcoded secret to static analysis (Snyk Code flagged it), and "key" is
 * genuinely ambiguous next to the real API keys this app handles.
 */
const CONSENT_SLOT = "aetherskin-cookie-choice";

const noopSubscribe = () => () => undefined;

function needsChoice(): boolean {
  try {
    return !localStorage.getItem(CONSENT_SLOT);
  } catch {
    return false; // storage blocked; stay quiet rather than nag every load
  }
}

/**
 * Cookie notice. AetherSkin sets no advertising or analytics cookies today, so
 * this is a transparency notice with a real choice recorded locally —
 * not a dark-pattern consent wall.
 */
export function CookieBanner() {
  // Read localStorage as an external store: nothing on the server, the real
  // answer once hydrated. No setState-in-effect round trip.
  const unanswered = useSyncExternalStore(noopSubscribe, needsChoice, () => false);
  const [dismissed, setDismissed] = useState(false);

  function choose(value: "accepted" | "essential") {
    try {
      localStorage.setItem(CONSENT_SLOT, value);
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  if (!unanswered || dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed bottom-0 left-0 right-0 z-[60] p-3 md:p-5"
    >
      <div
        className="neo-shadow neo-border mx-auto flex max-w-3xl flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
        style={{ background: "var(--surface)" }}
      >
        <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
          AetherSkin uses no advertising or tracking cookies. We store one local
          preference so this notice doesn&apos;t reappear.{" "}
          <Link href="/privacy" style={{ color: "var(--ink)", fontWeight: 700, textDecoration: "underline" }}>
            Privacy Policy
          </Link>
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            type="button"
            onClick={() => choose("essential")}
            className="neo-border px-5 py-3 whitespace-nowrap"
            style={{ background: "var(--surface)", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.8px", color: "var(--ink)" }}
          >
            ESSENTIAL ONLY
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="on-accent neo-shadow-sm neo-border px-5 py-3 whitespace-nowrap"
            style={{ background: "var(--yellow)", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.8px", color: "var(--ink)" }}
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
}
