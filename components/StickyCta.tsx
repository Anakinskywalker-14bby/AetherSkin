"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Mobile-only sticky CTA.
 *
 * Uses IntersectionObserver rather than scroll math: Lenis' smooth scrolling
 * makes native scroll events unreliable, but IntersectionObserver is driven
 * by the compositor and fires correctly either way.
 *
 * Shows once the hero has scrolled away, hides again when the signup section
 * is on screen so it never covers the form it points at.
 */
export function StickyCta() {
  const [heroGone, setHeroGone] = useState(false);
  const [betaVisible, setBetaVisible] = useState(false);

  useEffect(() => {
    const hero = document.querySelector("section");
    const beta = document.getElementById("beta");

    // No IntersectionObserver feature check: Next 16's supported browsers
    // (Chrome/Edge/Firefox 111+, Safari 16.4+) all have it.
    const observers: IntersectionObserver[] = [];

    /*
     * Failsafe, for the case where the observer never reports at all,
     * including a page with no hero <section> to observe.
     *
     * It used to fire unconditionally after 2s, which meant the CTA forced
     * itself on screen even while the observer was correctly reporting the
     * hero as visible — so it floated over the closed wardrobe doors during
     * the reveal. It now only fires if nothing has been heard back.
     */
    let heard = false;
    const failsafe = window.setTimeout(() => {
      if (!heard) setHeroGone(true);
    }, 2000);

    if (hero) {
      const o = new IntersectionObserver(
        ([entry]) => {
          heard = true;
          setHeroGone(!entry.isIntersecting);
        },
        { threshold: 0 }
      );
      o.observe(hero);
      observers.push(o);
    }
    // No hero: nothing reports, so the failsafe shows the CTA after 2s.

    if (beta) {
      const o = new IntersectionObserver(
        ([entry]) => setBetaVisible(entry.isIntersecting),
        { threshold: 0 }
      );
      o.observe(beta);
      observers.push(o);
    }

    return () => {
      window.clearTimeout(failsafe);
      observers.forEach((o) => o.disconnect());
    };
  }, []);

  const show = heroGone && !betaVisible;

  return (
    <div
      className="md:hidden fixed inset-x-0 bottom-0 z-40 p-3 transition-transform duration-300"
      style={{
        transform: show ? "translateY(0)" : "translateY(140%)",
        pointerEvents: show ? "auto" : "none",
      }}
      aria-hidden={!show}
    >
      <Link
        href="/#beta"
        className="on-accent neo-shadow neo-border block w-full py-4 text-center"
        style={{
          background: "var(--yellow)",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: "0.9px",
          color: "var(--ink)",
        }}
        tabIndex={show ? 0 : -1}
      >
        JOIN THE WAITLIST — FREE
      </Link>
    </div>
  );
}
