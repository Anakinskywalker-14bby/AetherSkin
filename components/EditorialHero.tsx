"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { onMediaChange } from "@/lib/media-query";
import WaitlistModal, { type WaitlistModalHandle } from "@/components/WaitlistModal";

/** Must match the phone breakpoint of the .eh styles in globals.css. */
const PHONE_LAYOUT = "(max-width:760px),(orientation:portrait) and (max-width:1024px)";
import { Inter_Tight, Playfair_Display } from "next/font/google";

const interTight = Inter_Tight({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--eh-sans", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "500"], style: ["italic"], variable: "--eh-serif", display: "swap" });

/**
 * Editorial hero: full-bleed portrait under a lilac-peach sky, thin white
 * top rule, mixed sans/italic-serif headline and a tilted polaroid. Only the UI animates; the scene is a photo plus a looping clip
 * (public/hero/hero-loop.mp4, played forward then backward so the wind in his
 * hair never jumps; built by scripts/hero-guy.py). Reduced motion: no video.
 */
export default function EditorialHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<WaitlistModalHandle>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    // iOS checks the muted attribute (React only sets the property).
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
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
    const offReduce = onMediaChange(reduce, sync);
    sync();
    return () => {
      v.removeEventListener("loadeddata", show);
      offReduce();
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

        <header className="eh-nav">
          <Link href="/" className="eh-logo eh-in" aria-label="AetherSkin home">
            {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied lockup, transparent PNG */}
            <img src="/brand/lockup-aetherskin.png" alt="AetherSkin" width={1200} height={283} />
          </Link>
          <nav className="eh-links eh-in" aria-label="Main">
            <Link href="/about">About</Link>
            <a href="#solution">How it works</a>
          </nav>
          <div className="eh-icons eh-in">
            {/* Text, not icons, so people can see what they are. "About us"
                here is for phones; desktop already has it in the links. */}
            <Link href="/about" className="eh-glass eh-glass-text eh-about-m">About us</Link>
            <Link href="/faq" className="eh-glass eh-glass-text">FAQ</Link>
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
          <div className="eh-ctas">
            <a
              href="#beta"
              className="eh-pill"
              onClick={(e) => {
                // Phones: sign up right here in a modal instead of scrolling to the footer.
                if (window.matchMedia(PHONE_LAYOUT).matches && modalRef.current) {
                  e.preventDefault();
                  modalRef.current.open();
                }
              }}
            >
              Join the waitlist
            </a>
            <a href="#solution" className="eh-arrow" aria-label="See how it works">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
            </a>
          </div>
        </div>


        <figure className="eh-polaroid" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
          <img src="/hero/polaroid-face.jpg" alt="" width={520} height={650} loading="lazy" />
          <figcaption>your skin, decoded</figcaption>
        </figure>

      </div>
      <WaitlistModal ref={modalRef} />
    </section>
  );
}
