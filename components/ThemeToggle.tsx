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
