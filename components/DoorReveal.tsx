"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";

// window.__lenis (the smooth-scroll instance) is declared in SmoothScroll.tsx.
// It may not exist yet when the doors first lock (child effects run before
// the layout's), so gestures are also blocked at the event level below.

type Phase = "off" | "closed" | "opening" | "open";

const OPEN_DURATION_S = 1.4;
const OPEN_KEYS = new Set(["ArrowDown", "PageDown", " ", "Spacebar", "End"]);

/**
 * Wardrobe doors over the hero that swing open on the first scroll.
 *
 * The page cannot scroll while the doors are closed or opening. The first
 * scroll gesture (wheel, swipe, ArrowDown / PageDown / Space / End) starts the
 * doors opening; they finish on their own in OPEN_DURATION_S, revealing the
 * whole first slide, and only then is scrolling unlocked. Scrolling is
 * therefore never ahead of the doors.
 *
 * (This replaced a scroll-driven version where the door position followed
 * the scrollbar inside a tall pinned runway. With smooth scrolling, a quick
 * flick carried the page past the hero while the doors were still visibly
 * opening, and the pinned viewport clipped any hero taller than the screen,
 * which hid the CTA buttons on most laptops.)
 *
 * Safeguards, because this sits between every first-time visitor and the
 * content:
 *   1. Server-rendered OPEN. Doors only close after mount, so crawlers,
 *      no-JS visitors and a failed hydration all get the hero immediately.
 *   2. prefers-reduced-motion: no doors at all.
 *   3. Arriving anywhere but the top of the page (a #link, a reload that
 *      restored the scroll position): no doors.
 *   4. Nothing can get stuck behind them: tabbing into the page opens them,
 *      and clicking any in-page #link (the nav) opens them instantly and lets
 *      the link work.
 *   5. Doors sit under the nav bar, so the nav and the lamp stay usable.
 */
export function DoorReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("off");

  // 0 = closed, 1 = fully open.
  const progress = useMotionValue(0);
  const leftX = useTransform(progress, [0, 1], ["0%", "-102%"]);
  const rightX = useTransform(progress, [0, 1], ["0%", "102%"]);
  // The room behind brightens as the gap widens.
  const shade = useTransform(progress, [0, 1], [0.55, 0]);
  const hint = useTransform(progress, [0, 0.15], [1, 0]);

  // Arm after mount (see safeguards 1 to 3). Set from a frame callback.
  useEffect(() => {
    if (reduced) return;
    const id = requestAnimationFrame(() => {
      const atTop = window.scrollY < 2 && !window.location.hash;
      setPhase(atTop ? "closed" : "off");
    });
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  // While closed or opening: block scrolling, and turn the first scroll
  // gesture into "open the doors".
  useEffect(() => {
    if (phase !== "closed" && phase !== "opening") return;

    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden"; // also stops scrollbar dragging
    window.__lenis?.stop();

    const unlock = () => {
      root.style.overflow = prevOverflow;
      window.__lenis?.start();
    };

    const open = () => {
      if (phase !== "closed") return;
      setPhase("opening");
      animate(progress, 1, {
        duration: OPEN_DURATION_S,
        ease: [0.65, 0, 0.35, 1],
        onComplete: () => setPhase("open"),
      });
    };

    // Swallow the gesture so neither the browser nor Lenis scrolls the page.
    const block = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onWheel = (e: WheelEvent) => {
      block(e);
      if (e.deltaY > 0) open();
    };
    const onTouchMove = (e: TouchEvent) => {
      block(e);
      open();
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable]")) return;
      if (OPEN_KEYS.has(e.key)) {
        block(e);
        open();
      }
    };
    // Keyboard users tabbing into the hero shouldn't be stuck behind doors.
    const onFocusIn = (e: FocusEvent) => {
      if (ref.current?.contains(e.target as Node)) open();
    };
    // In-page links (nav, CTA) open instantly and then work as normal.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest('a[href*="#"]');
      if (!a) return;
      progress.stop();
      progress.set(1);
      unlock();
      setPhase("open");
    };

    const opts = { capture: true, passive: false } as const;
    window.addEventListener("wheel", onWheel, opts);
    window.addEventListener("touchmove", onTouchMove, opts);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("focusin", onFocusIn, true);
    window.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("wheel", onWheel, opts);
      window.removeEventListener("touchmove", onTouchMove, opts);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("focusin", onFocusIn, true);
      window.removeEventListener("click", onClick, true);
      unlock();
    };
  }, [phase, progress]);

  const showDoors = phase === "closed" || phase === "opening";

  /*
   * The tree shape is identical whether or not the doors are showing; only
   * the doors themselves come and go. Returning <>{children}</> in one state
   * and a wrapped tree in another remounted the hero <section>, and
   * StickyCta's IntersectionObserver kept watching the detached copy.
   */
  return (
    <div ref={ref} className="relative">
      {children}

      {/* After children so the hero keeps the same position in the tree.
          Fixed to the viewport (the page is locked at the top while they
          show), and under the nav bar (z-50) so it stays usable. */}
      {showDoors && (
        <>
          <motion.div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[44] bg-black"
            style={{ opacity: shade }}
          />

          <motion.div
            aria-hidden
            className="door-panel door-left pointer-events-none fixed inset-y-0 left-0 z-[45] w-1/2"
            style={{ x: leftX }}
          >
            <span className="door-handle door-handle-left" />
          </motion.div>

          <motion.div
            aria-hidden
            className="door-panel door-right pointer-events-none fixed inset-y-0 right-0 z-[45] w-1/2"
            style={{ x: rightX }}
          >
            <span className="door-handle door-handle-right" />
          </motion.div>

          <motion.div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 bottom-10 z-[46] flex flex-col items-center gap-2"
            style={{ opacity: hint }}
          >
            <span className="door-hint">scroll to open</span>
            <span className="door-hint-rule" />
          </motion.div>
        </>
      )}
    </div>
  );
}
