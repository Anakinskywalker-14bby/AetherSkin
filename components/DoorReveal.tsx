"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

/**
 * Wardrobe doors that part as you scroll, revealing the hero behind them.
 *
 * Structure: a tall runway whose first screen is sticky. The hero is pinned
 * inside that sticky viewport while the doors slide apart, so the hero is
 * perfectly framed at the moment they finish — rather than having scrolled
 * halfway up the page, which is what happens if the doors are a plain fixed
 * overlay over a normally-scrolling page.
 *
 * Three deliberate safeguards, because this sits between every first-time
 * visitor and the content:
 *
 *   1. Server-rendered OPEN. The doors only close after mount, so crawlers,
 *      no-JS visitors and a failed hydration all get the hero immediately.
 *      A reveal that can trap the page behind it is not worth the risk.
 *   2. prefers-reduced-motion skips the whole thing — doors never mount.
 *   3. Once open they are inert (pointer-events none, aria-hidden), so they
 *      can never swallow a click on the CTA behind them.
 */
export function DoorReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [armed, setArmed] = useState(false);

  // Arm only on the client, and only when motion is welcome.
  useEffect(() => {
    if (!reduced) setArmed(true);
  }, [reduced]);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Doors finish opening at 72% of the runway, leaving a beat of held hero
  // before the pin releases. Opening right at the end feels abrupt.
  const leftX = useTransform(scrollYProgress, [0, 0.72], ["0%", "-102%"]);
  const rightX = useTransform(scrollYProgress, [0, 0.72], ["0%", "102%"]);
  // The room behind brightens as the gap widens.
  const shade = useTransform(scrollYProgress, [0, 0.72], [0.55, 0]);
  const hint = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  if (!armed) return <>{children}</>;

  return (
    <div ref={ref} className="relative" style={{ height: "230vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {children}

        {/* Darkened room, fading as the doors part. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[70] bg-black"
          style={{ opacity: shade }}
        />

        <motion.div
          aria-hidden
          className="door-panel door-left pointer-events-none absolute inset-y-0 left-0 z-[75] w-1/2"
          style={{ x: leftX }}
        >
          <span className="door-handle door-handle-left" />
        </motion.div>

        <motion.div
          aria-hidden
          className="door-panel door-right pointer-events-none absolute inset-y-0 right-0 z-[75] w-1/2"
          style={{ x: rightX }}
        >
          <span className="door-handle door-handle-right" />
        </motion.div>

        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-10 z-[76] flex flex-col items-center gap-2"
          style={{ opacity: hint }}
        >
          <span className="door-hint">scroll to open</span>
          <span className="door-hint-rule" />
        </motion.div>
      </div>
    </div>
  );
}
