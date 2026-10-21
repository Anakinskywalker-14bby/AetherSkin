"use client";

import VanityLight from "@/components/VanityLight";
import { useTheme } from "@/lib/use-theme";

/**
 * Theme switch: the vanity light above the dressing table.
 *
 * Bulb lit = light theme, so pulling the chain turns the bulb off and the
 * room dark. That mapping reads the right way round, which is why there is
 * no caption — the object explains itself.
 *
 * State comes from useTheme so this and the mobile bulb below can never
 * disagree. Nothing renders until mounted, because the server cannot know
 * the stored choice and guessing would paint the wrong bulb for a frame.
 */
export function ThemeToggle() {
  const { isLight, setLight, mounted } = useTheme();

  // Reserve the footprint so nothing shifts when it appears.
  if (!mounted) {
    return <div aria-hidden style={{ width: 120, height: 150 }} />;
  }

  return (
    <div className="theme-lamp pointer-events-none" style={{ width: 120, height: 150 }}>
      <div className="pointer-events-auto">
        <VanityLight checked={isLight} onCheckedChange={setLight} label="Site theme" />
      </div>
    </div>
  );
}

/**
 * Compact bulb for the mobile bar.
 *
 * The hanging fixture needs ~190px of vertical room and a clear left margin
 * to swing in; on a phone it lands on top of the hero copy. Rather than
 * shrink it into illegibility, small screens get the same bulb as a 44px tap
 * target and the chain is dropped.
 */
export function ThemeToggleCompact() {
  const { isLight, setLight, mounted } = useTheme();

  if (!mounted) return <div aria-hidden className="h-11 w-11" />;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label="Site theme"
      onClick={() => setLight(!isLight)}
      className="neo-border grid h-11 w-11 place-items-center"
      style={{ background: "var(--surface)" }}
    >
      <span
        className="block h-5 w-5 rounded-full transition-all duration-300"
        style={{
          background: isLight ? "var(--butter)" : "transparent",
          border: `2px solid color-mix(in srgb, var(--ink) ${isLight ? 60 : 38}%, transparent)`,
          boxShadow: isLight
            ? "0 0 12px 3px color-mix(in srgb, var(--butter) 70%, transparent)"
            : "none",
        }}
      />
    </button>
  );
}
