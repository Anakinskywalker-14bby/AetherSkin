"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useHydrated } from "@/lib/use-hydrated";

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
function subscribeToThemeClass(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const readIsLight = () => !document.documentElement.classList.contains("dark");

// The server can't see the visitor's choice; it renders light, as before.
const serverIsLight = () => true;

export function useTheme() {
  // The <html> class is an external store: useSyncExternalStore subscribes to
  // it directly instead of mirroring it into state from an effect.
  const isLight = useSyncExternalStore(subscribeToThemeClass, readIsLight, serverIsLight);
  const mounted = useHydrated();

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
