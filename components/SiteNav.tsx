"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/about", label: "ABOUT" },
  { href: "/#solution", label: "HOW IT WORKS" },
  { href: "/#beta", label: "JOIN FREE" },
];

/** Round "?" link to the FAQ page; the FAQ isn't a text link in the nav. */
function FaqIcon() {
  return (
    <Link
      href="/faq"
      aria-label="FAQ"
      className="neo-border grid h-11 w-11 place-items-center rounded-full"
      style={{ background: "var(--surface)", color: "var(--ink)" }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6" />
        <circle cx="12" cy="16.6" r=".5" fill="currentColor" />
      </svg>
    </Link>
  );
}

/** Site nav with a real mobile menu. Logo is a link to home. */
export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    h();
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Lock body scroll while the drawer is open; Esc closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.body.style.overflow = open ? "hidden" : "";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 md:px-16 h-[72px] transition-all duration-300"
        style={{
          background: "color-mix(in srgb, var(--surface) 88%, transparent)",
          backdropFilter: "saturate(140%) blur(10px)",
          WebkitBackdropFilter: "saturate(140%) blur(10px)",
          borderBottom: "1px solid color-mix(in srgb, var(--ink) 12%, transparent)",
          boxShadow: scrolled ? "0 10px 30px -18px rgba(90, 24, 50, 0.45)" : "none",
        }}
      >
        {/* Brand lockup. Two files rather than a recolourable inline SVG
            because the mark is multi-colour (Berry frame, Coral sun, Butter
            glow) — a single currentColor version would lose the sunrise. */}
        <Link href="/" aria-label="AetherSkin home" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, fixed size */}
          <img
            src="/brand/lockup-aetherskin.png"
            alt="AetherSkin"
            width={144}
            height={34}
            className="block h-[34px] w-auto"
          />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.7px", color: "var(--ink)" }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-5">
          <FaqIcon />
          <Link
            href="/#beta"
            className="on-accent neo-shadow-sm neo-border px-7 py-2.5"
            style={{ background: "var(--yellow)", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.7px", color: "var(--ink)" }}
          >
            SIGN UP FREE
          </Link>
        </div>

        {/* Mobile: FAQ shortcut plus the menu. */}
        <div className="flex items-center gap-2 md:hidden">
          <FaqIcon />

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="neo-border p-3"
          style={{ background: open ? "var(--yellow)" : "var(--surface)" }}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
            {open ? (
              <>
                <path d="M2 2l16 10M18 2L2 12" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
              </>
            ) : (
              <>
                <path d="M0 1.25h20M0 7h20M0 12.75h20" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 top-[72px] bottom-0 z-40 md:hidden flex flex-col gap-4 p-5"
          style={{ background: "var(--surface)", borderTop: "3px solid var(--ink)" }}
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="neo-shadow-sm neo-border px-6 py-5"
              style={{ background: "var(--surface)", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: "0.8px", color: "var(--ink)" }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/#beta"
            onClick={() => setOpen(false)}
            className="on-accent neo-shadow neo-border px-6 py-5 text-center mt-2"
            style={{ background: "var(--yellow)", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: "0.9px", color: "var(--ink)" }}
          >
            SIGN UP FREE
          </Link>
        </div>
      )}
    </>
  );
}
