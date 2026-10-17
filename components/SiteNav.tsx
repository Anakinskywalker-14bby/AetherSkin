"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
          background: "#f9f9f7",
          borderBottom: "3px solid #1a1c1b",
          boxShadow: scrolled ? "0 4px 0 #1a1c1b" : "4px 4px 0 #1a1c1b",
        }}
      >
        <Link
          href="/"
          aria-label="AetherSkin home"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 900, fontStyle: "italic", fontSize: 24, letterSpacing: -1.2, color: "#1a1c1b" }}
        >
          AetherSkin
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.7px", color: "#1a1c1b" }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <Link
          href="/#beta"
          className="hidden md:inline-block neo-shadow-sm neo-border px-7 py-2.5"
          style={{ background: "#e8e883", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.7px", color: "#1a1c1b" }}
        >
          SIGN UP FREE
        </Link>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="md:hidden neo-border p-3"
          style={{ background: open ? "#e8e883" : "#f9f9f7" }}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
            {open ? (
              <>
                <path d="M2 2l16 10M18 2L2 12" stroke="#1a1c1b" strokeWidth="2.5" strokeLinecap="round" />
              </>
            ) : (
              <>
                <path d="M0 1.25h20M0 7h20M0 12.75h20" stroke="#1a1c1b" strokeWidth="2.5" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 top-[72px] bottom-0 z-40 md:hidden flex flex-col gap-4 p-5"
          style={{ background: "#f9f9f7", borderTop: "3px solid #1a1c1b" }}
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="neo-shadow-sm neo-border px-6 py-5"
              style={{ background: "#f9f9f7", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: "0.8px", color: "#1a1c1b" }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/#beta"
            onClick={() => setOpen(false)}
            className="neo-shadow neo-border px-6 py-5 text-center mt-2"
            style={{ background: "#e8e883", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: "0.9px", color: "#1a1c1b" }}
          >
            SIGN UP FREE
          </Link>
        </div>
      )}
    </>
  );
}
