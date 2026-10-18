"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "aetherskin-cookie-choice";

/**
 * Cookie notice. AetherSkin sets no advertising or analytics cookies today, so
 * this is a transparency notice with a real choice recorded locally —
 * not a dark-pattern consent wall.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      /* storage blocked; stay quiet rather than nag every load */
    }
  }, []);

  function choose(value: "accepted" | "essential") {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

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
        <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
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
            style={{ background: "var(--surface)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.8px", color: "var(--ink)" }}
          >
            ESSENTIAL ONLY
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="on-accent neo-shadow-sm neo-border px-5 py-3 whitespace-nowrap"
            style={{ background: "var(--yellow)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.8px", color: "var(--ink)" }}
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
}
