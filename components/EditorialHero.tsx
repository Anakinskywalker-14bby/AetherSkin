"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Inter_Tight, Playfair_Display } from "next/font/google";

const interTight = Inter_Tight({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--eh-sans", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "500"], style: ["italic"], variable: "--eh-serif", display: "swap" });

/**
 * Editorial hero: full-bleed portrait under a lilac-peach sky, thin white
 * grid, mixed sans/italic-serif headline, a tilted polaroid and a giant
 * watermark. Only the UI animates; the scene is a photo plus a looping clip
 * (public/hero/hero-loop.mp4, its last second crossfaded into its first so it
 * never jumps). Reduced motion: no video.
 */
export default function EditorialHero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const show = () => v.classList.add("is-ready");
    const sync = () => {
      if (reduce.matches) {
        v.pause();
        v.classList.remove("is-ready");
      } else {
        void v.play().catch(() => { /* Autoplay blocked: the photo stays. */ });
        if (v.readyState >= 2) show();
      }
    };
    v.addEventListener("loadeddata", show);
    reduce.addEventListener("change", sync);
    sync();
    return () => {
      v.removeEventListener("loadeddata", show);
      reduce.removeEventListener("change", sync);
    };
  }, []);

  return (
    <section className={`eh ${interTight.variable} ${playfair.variable}`} aria-label="Introduction">
      <div className="eh-media" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed LCP photo, sized by CSS */}
        <img src="/hero/hero.jpg" alt="" fetchPriority="high" decoding="async" />
        <video ref={videoRef} src="/hero/hero-loop.mp4" muted loop playsInline preload="auto" />
      </div>

      <div className="eh-stage">
        <span className="eh-line eh-line-top" aria-hidden="true" />
        <span className="eh-line eh-line-v1" aria-hidden="true" />
        <span className="eh-line eh-line-v2" aria-hidden="true" />
        <span className="eh-line eh-line-h" aria-hidden="true" />

        <header className="eh-nav">
          <Link href="/" className="eh-logo eh-in" aria-label="AetherSkin home">
            {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied lockup, transparent PNG */}
            <img src="/brand/lockup-aetherskin.png" alt="AetherSkin" width={1200} height={283} />
          </Link>
          <nav className="eh-links eh-in" aria-label="Main">
            <Link href="/about">About</Link>
            <a href="#solution">How it works</a>
            <Link href="/faq">FAQ</Link>
          </nav>
          <div className="eh-icons eh-in">
            <a href="#beta" className="eh-glass" aria-label="Join the free waitlist">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>
            </a>
            <Link href="/faq" className="eh-glass" aria-label="Questions">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6" /><circle cx="12" cy="16.6" r=".4" /></svg>
            </Link>
          </div>
        </header>

        <h1 className="eh-headline">
          <span className="eh-rise" style={{ animationDelay: ".35s" }}>Stop guessing,</span>
          <span className="eh-rise" style={{ animationDelay: ".5s" }}>start knowing</span>
          <em className="eh-rise" style={{ animationDelay: ".65s" }}>Your Skin</em>
        </h1>

        <p className="eh-badge eh-fade">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5 14 10l8.5 2-8.5 2-2 8.5-2-8.5L1.5 12 10 10Z" /></svg>
          FREE WAITLIST
        </p>

        <div className="eh-side eh-fade">
          <p>
            AI skin analysis that matches you with products from brands you
            already love. Join the free waitlist; photo scanning opens at beta
            launch.
          </p>
          <div className="eh-ctas">
            <a href="#beta" className="eh-pill">Join the waitlist</a>
            <a href="#solution" className="eh-arrow" aria-label="See how it works">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
            </a>
          </div>
        </div>

        <p className="eh-season eh-fade">AI<br />SKIN<br />ANALYSIS</p>

        <figure className="eh-polaroid" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
          <img src="/hero/polaroid-face.jpg" alt="" width={520} height={650} loading="lazy" />
          <figcaption>your skin, decoded</figcaption>
        </figure>

        <p className="eh-watermark" aria-hidden="true">AetherSkin</p>
      </div>
    </section>
  );
}
