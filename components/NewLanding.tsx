"use client";

/**
 * AetherSkin - neo-brutalist landing.
 *
 * Signup is free: email -> double opt-in -> skin quiz. No payment,
 * no card fields anywhere on this page (see components/footer/SiteFooter).
 */

import { useState, useEffect, useRef } from "react";
import { DoorReveal } from "@/components/DoorReveal";
import EditorialHero from "@/components/EditorialHero";
import ProblemSplit from "@/components/ProblemSplit";
import CategoriesSection from "@/components/CategoriesSection";
import SiteFooter from "@/components/footer/SiteFooter";
import { StickyCta } from "@/components/StickyCta";
import svgPaths from "@/lib/svg-design";

/**
 * Served from public/design.
 *
 * KNOWN LICENSING RISK, kept by the owner's decision on 21 Oct 2026: these
 * two images are screenshots of third-party Pinterest pins. Using them
 * without permission is a copyright and trademark exposure. Original
 * replacements already exist in public/art (scripts/art/render-site.cjs).
 * (The three gallery pins were replaced by CategoriesSection's videos.)
 */
const ASSET = "/design";
const imgDropper = `${ASSET}/dropper.png`;
const imgGlassSkin = `${ASSET}/glass-skin.png`;

// ─── Scroll fade-in hook ────────────────────────────────────────────
function useFadeIn(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;

    // Fail open: if IntersectionObserver is unavailable (older browsers,
    // some privacy modes, non-rendering crawlers) show the content rather
    // than leaving the page permanently blank.
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setVisible(true);
    };

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal();
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);

    // Safety net: if no callback has arrived in 1.5s, reveal anyway.
    // Content visibility must never depend on an animation firing.
    const failsafe = window.setTimeout(reveal, 1500);

    return () => {
      window.clearTimeout(failsafe);
      obs.disconnect();
    };
  }, [threshold]);

  return { ref, visible };
}

// ─── Dropper Animation ──────────────────────────────────────────────
function DropperAnimation() {
  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ minHeight: 380 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote decorative asset */}
              <img loading="lazy" decoding="async" src={imgDropper} alt="Glass dropper releasing a drop of clear serum into an open bottle" className="w-full h-full object-cover absolute inset-0" />
      <div className="absolute inset-0" style={{ background: "rgba(249,249,247,0.15)" }} />

      <svg
        className="absolute pointer-events-none"
        style={{ top: "22%", left: "50%", transform: "translateX(-50%)", width: 32, height: 240, overflow: "visible" }}
        viewBox="0 0 32 240"
      >
        <ellipse cx="16" cy="8" rx="6" ry="8" fill="rgba(200, 220, 240, 0.85)" style={{ transformOrigin: "16px 8px", animation: "dropForm 3s ease-in-out infinite" }} />
        <ellipse cx="16" cy="8" rx="7" ry="9" fill="rgba(190, 215, 240, 0.9)" style={{ transformOrigin: "16px 8px", animation: "dropFall 3s ease-in 0.05s infinite" }} />
        <ellipse cx="16" cy="208" rx="10" ry="4" fill="none" stroke="rgba(190, 215, 240, 0.6)" strokeWidth="2" style={{ transformOrigin: "16px 208px", animation: "ripple 3s ease-out 1.5s infinite" }} />
        <ellipse cx="16" cy="208" rx="10" ry="4" fill="none" stroke="rgba(190, 215, 240, 0.4)" strokeWidth="1.5" style={{ transformOrigin: "16px 208px", animation: "ripple 3s ease-out 1.7s infinite" }} />
      </svg>
    </div>
  );
}

// ─── Glass Skin / Dropper Section ───────────────────────────────────
function DropperSection() {
  const { ref, visible } = useFadeIn();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative w-full overflow-hidden"
      style={{ borderBottom: "3px solid var(--ink)", opacity: visible ? 1 : 0, transition: "opacity 0.8s ease, transform 0.8s ease", transform: visible ? "none" : "translateY(40px)" }}
    >
      <div className="flex flex-col lg:flex-row min-h-[640px]">
        {/* Left: Glass Skin image */}
        <div className="relative flex-1 overflow-hidden min-h-[420px]" style={{ borderRight: "3px solid var(--ink)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- remote decorative asset */}
              <img loading="lazy" decoding="async" src={imgGlassSkin} alt="Close-up of a glowing glass-skin complexion with shimmering highlighter" className="w-full h-full object-cover absolute inset-0" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(26,28,27,0.15) 0%, rgba(26,28,27,0.6) 100%)" }} />
          <div className="absolute bottom-12 left-10 right-10">
            <div className="on-accent neo-shadow-sm neo-border px-4 py-2 inline-block mb-4" style={{ background: "var(--yellow)", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1.6px", color: "var(--ink)" }}>
              THE GLOW-UP
            </div>
            {/* Sits on a photo under a dark gradient in BOTH themes, so it is
                pinned to Cream rather than --surface. Using --surface made it
                near-black on a near-black photo once dark mode existed. */}
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 900, fontSize: "clamp(42px, 5vw, 64px)", color: "var(--cream-fixed)", letterSpacing: "-1.5px", lineHeight: 1.0, margin: 0 }}>
              Glass Skin<br />Is Real<br />
              <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 300, fontStyle: "italic" }}>Science.</span>
            </h2>
          </div>
          <div className="absolute top-8 right-8 sticker-float neo-shadow-sm neo-border px-4 py-2" style={{ background: "var(--err-bg)", transform: "rotate(-3deg)", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 13, color: "var(--err-text)" }}>
            ✦ hydrating
          </div>
        </div>

        {/* Right: dropper animation + claim */}
        <div className="relative flex-1 flex flex-col" style={{ background: "var(--surface)" }}>
          <div className="flex-1 relative overflow-hidden" style={{ minHeight: 320 }}>
            <DropperAnimation />
          </div>
          <div className="px-8 md:px-12 py-10" style={{ borderTop: "3px solid var(--ink)" }}>
            <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1.6px", color: "var(--muted)", marginBottom: 12 }}>THE TRUTH</p>
            <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 900, fontSize: "clamp(28px, 3vw, 44px)", color: "var(--ink)", letterSpacing: "-1px", lineHeight: 1.1, margin: "0 0 16px 0" }}>
              &quot;Clean&quot; Skincare<br />
              <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontStyle: "italic", color: "var(--olive)" }}>is a buzzword.</span>
            </h3>
            <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 400, fontSize: 16, color: "var(--muted)", lineHeight: 1.7, margin: "0 0 24px 0" }}>
              Your skin doesn&apos;t care about marketing. It responds to what
              actually fits it — the right products, from brands you already
              love, matched to what your skin is really doing.
            </p>
            <a href="#beta" className="on-accent neo-shadow-sm neo-border px-7 py-4 w-full inline-block text-center" style={{ background: "var(--yellow)", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.9px", color: "var(--ink)", cursor: "pointer" }}>
              GET YOUR FREE ROUTINE →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Solution Bento ─────────────────────────────────────────────────
function SolutionSection() {
  const { ref, visible } = useFadeIn();

  return (
    <section
      id="solution"
      ref={ref as React.RefObject<HTMLElement>}
      className="on-soft relative w-full"
      style={{ background: "var(--blue)", borderBottom: "3px solid var(--ink)", opacity: visible ? 1 : 0, transition: "opacity 0.9s ease 0.15s, transform 0.9s ease 0.15s", transform: visible ? "none" : "translateY(40px)" }}
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-16 py-24">
        <div className="flex flex-col items-center gap-5 mb-16">
          <div className="on-accent neo-shadow-sm neo-border px-5 py-2.5" style={{ background: "var(--yellow)", transform: "rotate(2deg)", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "1.4px", color: "var(--ink)" }}>
            THE SOLUTION
          </div>
          <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: "clamp(36px, 4vw, 52px)", color: "var(--ink)", letterSpacing: "-1px", textAlign: "center", margin: 0 }}>
            AetherSkin&apos;s AI Skin Analysis
          </h2>
          {/* Status, stated where the features are described, so nobody has
              to reach the FAQ to learn that scanning isn't live yet. */}
          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 400, fontSize: 17, color: "var(--ink)", lineHeight: 1.6, textAlign: "center", maxWidth: 620, margin: 0 }}>
            <strong>Arriving with the beta launch.</strong> Photo analysis, product matching and
            tracking go live then. Today you can join the free waitlist and take the 3-minute skin quiz.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Card 1 — Deep Scan */}
          <div className="lg:col-span-2 neo-shadow neo-border p-7 flex flex-col gap-4" style={{ background: "var(--surface)" }}>
            <div className="flex items-center gap-2">
              <svg width="27" height="27" viewBox="0 0 27.09 27" fill="none">
                <path d={svgPaths.p18334868} fill="var(--ink)" />
              </svg>
              <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: 32, color: "var(--ink)", margin: 0 }}>Deep Scan Tech</h3>
            </div>
            <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 400, fontSize: 16, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>
              One selfie. AetherSkin&apos;s AI reads your face and maps hydration,
              texture, and everyday concerns — instantly.
            </p>
            {/* The scan readout is a device screen, so it stays dark in both
                themes. Previously it used var(--ink) as its background, which
                inverted to Cream in dark mode and left Butter-on-Cream at
                1.35:1 and the caption at 1.01:1. .scan-panel pins a fixed dark
                ground and light foreground tokens for the whole subtree. */}
            <div className="scan-panel neo-border p-6 flex flex-col justify-center gap-4" style={{ height: 200 }}>
              {[
                { label: "HYDRATION", value: 72, color: "var(--blue)" },
                { label: "TEXTURE", value: 58, color: "var(--yellow)" },
                { label: "GLOW", value: 86, color: "var(--surface)" },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-4">
                  <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "1.2px", color: "var(--surface)", width: 96 }}>{m.label}</span>
                  <div className="flex-1 h-4" style={{ background: "rgba(249,249,247,0.15)", border: "2px solid var(--surface)" }}>
                    <div className="h-full scan-fill" style={{ width: `${m.value}%`, background: m.color }} />
                  </div>
                  <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 14, color: m.color, width: 44, textAlign: "right" }}>{m.value}%</span>
                </div>
              ))}
              <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "1px", color: "rgba(249,249,247,0.5)", margin: 0, textTransform: "uppercase" }}>Sample readout — your scan will differ</p>
            </div>
          </div>

          {/* Card 2 — Zero BS */}
          <div className="on-accent neo-shadow neo-border p-7 flex flex-col justify-between" style={{ background: "var(--yellow)" }}>
            <div className="flex flex-col gap-4">
              <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: 30, color: "var(--ink)", margin: 0 }}>Zero BS Policy</h3>
              <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>
                We tell you exactly what you need. Nothing more. Nothing less.
              </p>
            </div>
            <div className="flex justify-end pt-8">
              <svg width="55" height="52.5" viewBox="0 0 55 52.5" fill="none">
                <path d={svgPaths.pac72180} fill="var(--ink)" />
              </svg>
            </div>
          </div>

          {/* Card 3 — Matches */}
          <div className="neo-shadow neo-border p-7 flex flex-col gap-4" style={{ background: "var(--surface)" }}>
            <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: 30, color: "var(--ink)", margin: 0 }}>Precision Matches</h3>
            <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 400, fontSize: 16, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>
              Products picked from brands you already love, based on your exact scan.
            </p>
            <a href="#beta" className="on-soft neo-border mt-auto py-3 w-full inline-block text-center" style={{ background: "var(--blue)", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: "1px", color: "var(--ink)", cursor: "pointer" }}>
              LEARN MORE
            </a>
          </div>

          {/* Card 4 — Continuous */}
          <div className="lg:col-span-2 neo-shadow neo-border p-7 flex flex-col md:flex-row items-center gap-8" style={{ background: "var(--surface)" }}>
            <div className="flex flex-col gap-4 flex-1">
              <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: 30, color: "var(--ink)", margin: 0 }}>Continuous Tracking</h3>
              <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 400, fontSize: 16, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>
                Your skin changes with the seasons, stress, and sleep. AetherSkin
                tracks your progress and adjusts your routine dynamically.
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="on-accent" style={{ transform: "rotate(-5deg)", background: "var(--yellow)", border: "3px solid var(--ink)", borderRadius: "9999px", width: 128, height: 128, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ink)", textAlign: "center", letterSpacing: "1px" }}>ALWAYS<br />ADAPTING</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Root ───────────────────────────────────────────────────────────
/** The FAQ lives on /faq; the waitlist signup lives in the footer (#beta). */
export default function NewLanding() {
  return (
    <div style={{ background: "var(--surface)" }}>
      {/* The hero is pinned inside the reveal while the doors part, so it is
          framed exactly as they finish rather than half-scrolled away. It
          carries its own nav, so the fixed SiteNav is not used here. */}
      <DoorReveal>
        <EditorialHero />
      </DoorReveal>
      <DropperSection />
      <ProblemSplit />
      <SolutionSection />
      <CategoriesSection />
      <SiteFooter />
      <StickyCta />
    </div>
  );
}
