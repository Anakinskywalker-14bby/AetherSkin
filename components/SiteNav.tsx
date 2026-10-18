"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle, ThemeToggleCompact } from "@/components/ThemeToggle";

const LINKS = [
  { href: "/about", label: "ABOUT" },
  { href: "/#solution", label: "HOW IT WORKS" },
  { href: "/#beta", label: "JOIN FREE" },
];

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
            src="/brand/lockup-horizontal.svg"
            alt="AetherSkin"
            width={137}
            height={34}
            className="block h-[34px] w-auto dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, fixed size */}
          <img
            src="/brand/lockup-horizontal-reversed.svg"
            alt=""
            aria-hidden="true"
            width={137}
            height={34}
            className="hidden h-[34px] w-auto dark:block"
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
          <Link
            href="/#beta"
            className="on-accent neo-shadow-sm neo-border px-7 py-2.5"
            style={{ background: "var(--yellow)", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.7px", color: "var(--ink)" }}
          >
            SIGN UP FREE
          </Link>
        </div>

        {/*
          The lamp hangs out of the nav rather than sitting inside it — the
          cord needs vertical room below its anchor to swing, so a 72px-tall
          bar can't contain it. Pointer events are scoped to the lamp itself
          in ThemeToggle so this overlay never blocks the hero beneath.
        */}
        <div className="pointer-events-none absolute left-6 top-[58px] z-[51] hidden md:block">
          <ThemeToggle />
        </div>

        {/* Mobile: the bulb without the chain, plus the menu. */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggleCompact />

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
