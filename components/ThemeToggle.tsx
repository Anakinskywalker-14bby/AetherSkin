"use client";

import { useEffect, useState } from "react";
import VanityLight from "@/components/VanityLight";

const STORAGE_KEY = "aetherskin-theme";

/**
 * Theme switch: the vanity light above the dressing table.
 *
 * Bulb lit = light theme, so pulling the chain turns the bulb off and the
 * room dark. That mapping reads the right way round, which is why there is
 * no caption — the object explains itself.
 *
 * The <html> class is set before first paint by the inline script in
 * layout.tsx; this only mirrors and updates it. Nothing renders until
 * mounted, because the server cannot know the stored choice and guessing
 * would paint the wrong bulb state for a frame.
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isLight, setIsLight] = useState(true);

  useEffect(() => {
    setIsLight(!document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  const handleChange = (lit: boolean) => {
    setIsLight(lit);
    const root = document.documentElement;
    root.classList.toggle("dark", !lit);
    root.classList.toggle("light", lit);
    try {
      localStorage.setItem(STORAGE_KEY, lit ? "light" : "dark");
    } catch {
      /* Private mode or blocked storage: the choice just won't persist. */
    }
  };

  // Reserve the footprint so nothing shifts when it appears.
  if (!mounted) {
    return <div aria-hidden style={{ width: 120, height: 190 }} />;
  }

  return (
    <div className="theme-lamp pointer-events-none" style={{ width: 120, height: 190 }}>
      <div className="pointer-events-auto">
        <VanityLight checked={isLight} onCheckedChange={handleChange} label="Site theme" />
      </div>
    </div>
  );
}

/**
 * Compact bulb for the mobile bar.
 *
 * The hanging fixture needs ~190px of vertical room and a clear left margin
 * to swing in; on a phone it lands on top of the hero copy. Rather than
 * shrink it into illegibility, small screens get the same bulb as a tap
 * target and the chain is dropped.
 */
export function ThemeToggleCompact() {
  const [mounted, setMounted] = useState(false);
  const [isLight, setIsLight] = useState(true);

  useEffect(() => {
    setIsLight(!document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !isLight;
    setIsLight(next);
    const root = document.documentElement;
    root.classList.toggle("dark", !next);
    root.classList.toggle("light", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "light" : "dark");
    } catch {
      /* storage blocked: the choice just won't persist */
    }
  };

  if (!mounted) return <div aria-hidden className="h-11 w-11" />;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label="Site theme"
      onClick={toggle}
      className="neo-border grid h-11 w-11 place-items-center"
      style={{ background: "var(--surface)" }}
    >
      <span
        className="block h-5 w-5 rounded-full transition-all duration-300"
        style={{
          background: isLight ? "var(--butter)" : "transparent",
          border: `2px solid color-mix(in srgb, var(--ink) ${isLight ? 55 : 35}%, transparent)`,
          boxShadow: isLight
            ? "0 0 14px 3px color-mix(in srgb, var(--butter) 60%, transparent)"
            : "none",
        }}
      />
    </button>
  );
}
