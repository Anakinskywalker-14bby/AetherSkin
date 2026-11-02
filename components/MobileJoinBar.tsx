"use client";

import { useEffect, useState } from "react";

/**
 * Phones only (CSS hides it above 767px): a slim "Join the waitlist" bar
 * pinned to the bottom of the screen, so the signup is one tap away from
 * anywhere on the page. It stays out of the way while the hero's own button
 * is on screen and while the footer signup (#beta) is visible, and it sits
 * above the iPhone home indicator via env(safe-area-inset-bottom).
 */
export default function MobileJoinBar() {
  const [pastHero, setPastHero] = useState(false);
  const [signupVisible, setSignupVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    let obs: IntersectionObserver | undefined;
    const beta = document.getElementById("beta");
    if (beta && typeof IntersectionObserver !== "undefined") {
      obs = new IntersectionObserver(([e]) => setSignupVisible(e.isIntersecting), { rootMargin: "0px 0px 120px 0px" });
      obs.observe(beta);
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      obs?.disconnect();
    };
  }, []);

  const show = pastHero && !signupVisible;

  return (
    <div className={`mjb${show ? " is-on" : ""}`} aria-hidden={!show}>
      <a href="#beta" className="mjb-btn" tabIndex={show ? 0 : -1}>
        <span className="mjb-main">Join the free waitlist</span>
        <span className="mjb-sub">3-minute skin quiz · no card</span>
      </a>
    </div>
  );
}
