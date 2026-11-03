"use client";

import { useEffect, useState } from "react";

/**
 * Phones only (CSS hides it above 767px): a slim "Join the free waitlist" bar
 * pinned to the bottom of the screen, so the signup is one tap away from
 * anywhere on the page.
 *
 * It appears only once the hero's "Join the waitlist" button has scrolled
 * completely off screen, and steps aside whenever another primary button is
 * visible (the problem slide's "Get your skin read") or the footer signup
 * (#beta) itself is on screen, so there is never a double call to action.
 * It sits above the iPhone home indicator via env(safe-area-inset-bottom).
 */
export default function MobileJoinBar() {
  const [heroCtaHidden, setHeroCtaHidden] = useState(false);
  const [otherCtaVisible, setOtherCtaVisible] = useState(false);
  const [signupVisible, setSignupVisible] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const watch = (el: Element | null, fn: (visible: boolean) => void, rootMargin = "0px") => {
      if (!el) return undefined;
      const o = new IntersectionObserver(([e]) => fn(e.isIntersecting), { rootMargin, threshold: 0 });
      o.observe(el);
      return o;
    };
    const observers = [
      watch(document.querySelector(".eh-ctas"), (v) => setHeroCtaHidden(!v)),
      watch(document.querySelector(".ps-btn"), setOtherCtaVisible),
      watch(document.getElementById("beta"), setSignupVisible, "0px 0px 120px 0px"),
    ];
    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  const show = heroCtaHidden && !otherCtaVisible && !signupVisible;

  return (
    <div className={`mjb${show ? " is-on" : ""}`} aria-hidden={!show}>
      {/* Blur on tap: the bar hides as the signup scrolls into view, and a
          hidden (aria-hidden) element must not keep focus. */}
      <a href="#beta" className="mjb-btn" tabIndex={show ? 0 : -1} onClick={(e) => e.currentTarget.blur()}>
        <span className="mjb-main">Join the free waitlist</span>
        <span className="mjb-sub">Start investing in you</span>
      </a>
    </div>
  );
}
