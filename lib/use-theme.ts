"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "aetherskin-theme";

/**
 * Shared theme state for every switch on the page.
 *
 * There are two switches — the hanging lamp on desktop and the compact bulb
 * on mobile — and both are mounted at once, with CSS deciding which is shown.
 * When each held its own useState they drifted: toggling the lamp left the
 * bulb reporting the opposite value, so resizing across the breakpoint
 * revealed a switch in the wrong position, and `aria-checked` lied to screen
 * readers on whichever one was hidden.
 *
 * The <html> class is the single source of truth, since the no-flash script
 * in layout.tsx sets it before React exists. A MutationObserver keeps every
 * consumer in step no matter which one did the toggling.
 */
export function useTheme() {
  const [isLight, setIsLight] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setIsLight(!root.classList.contains("dark"));

    read();
    setMounted(true);

    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const setLight = useCallback((lit: boolean) => {
    const root = document.documentElement;
    root.classList.toggle("dark", !lit);
    root.classList.toggle("light", lit);
    // The observer above updates local state, so this doesn't set it directly.
    try {
      localStorage.setItem(STORAGE_KEY, lit ? "light" : "dark");
    } catch {
      /* Private mode or blocked storage: the choice just won't persist. */
    }
  }, []);

  return { isLight, setLight, mounted };
}
