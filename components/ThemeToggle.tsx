"use client";

import { useEffect, useState } from "react";
import PullCord from "@/components/kokonutui/pull-cord";

const STORAGE_KEY = "aetherskin-theme";

/**
 * Theme switch, rendered as a hanging lamp you pull.
 *
 * The lamp's `checked` state means "light is on", which maps to the light
 * theme — pulling the cord turns the lamp off and the site dark. That reads
 * the right way round, so the control explains itself without a label.
 *
 * The <html> class is set before first paint by the inline script in
 * layout.tsx; this component only mirrors and updates it. It renders nothing
 * until mounted, because the server has no way to know the stored choice and
 * guessing would render the wrong lamp state for a frame.
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isLight, setIsLight] = useState(true);

  useEffect(() => {
    setIsLight(!document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  const handleChange = (lampOn: boolean) => {
    setIsLight(lampOn);
    const root = document.documentElement;
    root.classList.toggle("dark", !lampOn);
    root.classList.toggle("light", lampOn);
    try {
      localStorage.setItem(STORAGE_KEY, lampOn ? "light" : "dark");
    } catch {
      /* Private mode or blocked storage: the choice just won't persist. */
    }
  };

  // Reserve the exact collapsed footprint so nothing shifts when it appears.
  if (!mounted) {
    return <div aria-hidden className="h-[162px] w-[130px]" />;
  }

  return (
    <div
      className="pointer-events-none origin-top-right"
      style={{ width: 130, height: 162 }}
    >
      <div
        className="pointer-events-auto origin-top-left"
        style={{ transform: "scale(0.45)", width: 288, height: 360 }}
      >
        <PullCord
          checked={isLight}
          onCheckedChange={handleChange}
          label="Site theme"
          className="!border-0 !bg-transparent"
        />
      </div>
    </div>
  );
}
