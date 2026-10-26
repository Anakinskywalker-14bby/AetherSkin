"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "aetherskin-footer-theme";

/**
 * Theme for the footer only. The rest of the site is always light; the
 * vanity bulb in the footer switches just the footer (and its giant) between
 * light and dark. The choice is remembered per browser.
 */
export function useFooterTheme() {
  const [isLight, setIsLight] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      setIsLight(localStorage.getItem(STORAGE_KEY) !== "dark");
    } catch {
      /* Storage blocked: stay light. */
    }
    setMounted(true);
  }, []);

  const setLight = useCallback((lit: boolean) => {
    setIsLight(lit);
    try {
      localStorage.setItem(STORAGE_KEY, lit ? "light" : "dark");
    } catch {
      /* Private mode or blocked storage: the choice just won't persist. */
    }
  }, []);

  return { isLight, setLight, mounted };
}
