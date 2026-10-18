"use client";

import { useEffect, useState } from "react";
import PullCord from "@/components/kokonutui/pull-cord";

const STORAGE_KEY = "aetherskin-theme";

/**
 * Theme switch, rendered as a hanging lamp you pull.
 *
 * Lamp on = light theme, so pulling the cord to turn the light off darkens
 * the site. That reads the right way round, so the control needs no label —
 * which is why the component's own "Desk lamp / pull the cord" caption is
 * hidden below rather than relabelled.
 *
 * The <html> class is set before first paint by the inline script in
 * layout.tsx; this only mirrors and updates it. It renders nothing until
 * mounted, because the server cannot know the stored choice and guessing
 * would paint the wrong lamp state for a frame.
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

  // Reserve the collapsed footprint so nothing shifts when it appears.
  if (!mounted) {
    return <div aria-hidden className="h-[128px] w-[112px]" />;
  }

  return (
    <div
      className="theme-lamp pointer-events-none"
      style={{ width: 112, height: 128 }}
    >
      <div
        className="pointer-events-auto origin-top-left"
        style={{ transform: "scale(0.42)", width: 288, height: 360 }}
      >
        <PullCord
          checked={isLight}
          onCheckedChange={handleChange}
          label="Site theme"
        />
      </div>
    </div>
  );
}
