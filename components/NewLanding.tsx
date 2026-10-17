"use client";

/**
 * AetherSkin - neo-brutalist landing.
 *
 * Signup is free: email -> double opt-in -> skin quiz. No payment,
 * no card fields anywhere on this page (see components/SignupSection).
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SignupSection } from "@/components/SignupSection";
import { StickyCta } from "@/components/StickyCta";
import svgPaths from "@/lib/svg-design";

/**
 * Served from public/design, not from GitHub raw.
 *
 * These were previously fetched from raw.githubusercontent.com, which meant
 * the landing page's images depended on the repo keeping its name and staying
 * public — renaming the repo would have silently broken every image. They're
 * in the repo already, so Vercel serves them from the same origin: faster,
 * cacheable, and one less external host in the CSP.
 */
const ASSET = "/design";
const imgHand = `${ASSET}/hand.png`;
const imgDropper = `${ASSET}/dropper.png`;
const imgGlassSkin = `${ASSET}/glass-skin.png`;
const imgNoGender = `${ASSET}/no-gender.png`;
const imgClarity = `${ASSET}/clarity.png`;
const imgCleanBS = `${ASSET}/clean-bs.png`;

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

// ─── Nav ────────────────────────────────────────────────────────────
// ─── Hero ───────────────────────────────────────────────────────────
function HeroSection() {
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const mask = `radial-gradient(circle at ${cursor.x}px ${cursor.y}px, #000 80px, transparent 140px)`;

  return (
    <section
      className="relative overflow-hidden pt-[72px] min-h-screen flex flex-col"
      style={{ background: "var(--surface)", borderBottom: "3px solid var(--ink)" }}
      onPointerEnter={() => setHovering(true)}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setCursor({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onPointerLeave={() => setHovering(false)}
    >
      {/* Dot grid base */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at center, rgba(26,28,27,0.12) 1.2px, transparent 1.4px)",
          backgroundSize: "20px 20px",
        }}
      />
      {/* Dot grid hover bloom */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-150"
        style={{
          backgroundImage: "radial-gradient(circle at center, rgba(26,28,27,0.28) 2.2px, transparent 2.4px)",
          backgroundSize: "20px 20px",
          opacity: hovering ? 1 : 0,
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between px-6 md:px-16 py-16 flex-1 gap-12 max-w-[1280px] mx-auto w-full">
        {/* Left: text */}
        <div className="flex flex-col items-start gap-6 max-w-[620px]">
          <div className="sticker-float neo-shadow-sm neo-border px-5 py-2.5 self-start" style={{ background: "var(--blue)" }}>
            <span style={{ fontFamily: "'Epilogue', sans-serif", fontWeight: 400, fontSize: 22, color: "var(--ink)" }}>Ouch!</span>
          </div>

          <div className="leading-none" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            <p style={{ fontWeight: 900, fontSize: "clamp(48px, 6vw, 78px)", color: "var(--ink)", letterSpacing: "-2.5px", lineHeight: 1.05, margin: 0 }}>
              Their replies are dry
            </p>
            <p style={{ fontWeight: 900, fontSize: "clamp(48px, 6vw, 78px)", letterSpacing: "-2.5px", lineHeight: 1.05, margin: 0 }}>
              <span style={{ color: "var(--olive)" }}>but </span>
              <span style={{ fontFamily: "'Epilogue', sans-serif", fontWeight: 400, fontStyle: "italic", color: "var(--ink)", textTransform: "lowercase" }}>your skin</span>
            </p>
            <p style={{ fontWeight: 900, fontSize: "clamp(48px, 6vw, 78px)", color: "var(--ink)", letterSpacing: "-2.5px", lineHeight: 1.05, margin: 0 }}>
              doesn&apos;t have to be.
            </p>
          </div>

          <p style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 400, fontSize: 18, color: "var(--muted)", lineHeight: 1.6 }}>
            Stop guessing. Start knowing. AI skin analysis for the modern age.
            Join the free beta and get a routine built around your skin.
          </p>

          <div className="flex gap-4 flex-wrap">
            <a href="#beta" className="neo-shadow neo-border px-9 py-5" style={{ background: "var(--yellow)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: "0.9px", color: "var(--ink)", cursor: "pointer" }}>
              JOIN BETA
            </a>
            <a href="#solution" className="neo-shadow neo-border px-9 py-5" style={{ background: "var(--surface)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: "0.9px", color: "var(--ink)", cursor: "pointer" }}>
              SEE HOW IT WORKS
            </a>
          </div>
        </div>

        {/* Right: image hero */}
        <div className="relative flex-shrink-0">
          <div className="neo-shadow neo-border overflow-hidden" style={{ width: "min(480px, 80vw)", aspectRatio: "3/4" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- remote decorative asset; see note above */}
              <img fetchPriority="high" decoding="async" src={imgHand} alt="Four skincare textures — cream, serum, and gel boosters — swatched on the back of a hand" className="w-full h-full object-cover" />
          </div>
          <div className="sticker-float-alt absolute -bottom-4 -right-6 neo-shadow-sm neo-border px-5 py-3" style={{ background: "var(--yellow)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "1.6px", color: "var(--ink)" }}>
            HYDRATE NOW
          </div>
          <div className="absolute -top-4 -left-6 neo-shadow-sm neo-border px-4 py-2" style={{ background: "var(--blue)", fontFamily: "'Work Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>
            ✦ BETA OPEN
          </div>
        </div>
      </div>
    </section>
  );
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
            <div className="neo-shadow-sm neo-border px-4 py-2 inline-block mb-4" style={{ background: "var(--yellow)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1.6px", color: "var(--ink)" }}>
              THE GLOW-UP
            </div>
            <h2 style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 900, fontSize: "clamp(42px, 5vw, 64px)", color: "var(--surface)", letterSpacing: "-1.5px", lineHeight: 1.0, margin: 0 }}>
              Glass Skin<br />Is Real<br />
              <span style={{ fontFamily: "'Epilogue', sans-serif", fontWeight: 300, fontStyle: "italic" }}>Science.</span>
            </h2>
          </div>
          <div className="absolute top-8 right-8 sticker-float neo-shadow-sm neo-border px-4 py-2" style={{ background: "var(--err-bg)", transform: "rotate(-3deg)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--err-text)" }}>
            ✦ hydrating
          </div>
        </div>

        {/* Right: dropper animation + claim */}
        <div className="relative flex-1 flex flex-col" style={{ background: "var(--surface)" }}>
          <div className="flex-1 relative overflow-hidden" style={{ minHeight: 320 }}>
            <DropperAnimation />
          </div>
          <div className="px-8 md:px-12 py-10" style={{ borderTop: "3px solid var(--ink)" }}>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1.6px", color: "var(--muted)", marginBottom: 12 }}>THE TRUTH</p>
            <h3 style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 900, fontSize: "clamp(28px, 3vw, 44px)", color: "var(--ink)", letterSpacing: "-1px", lineHeight: 1.1, margin: "0 0 16px 0" }}>
              &quot;Clean&quot; Skincare<br />
              <span style={{ fontFamily: "'Epilogue', sans-serif", fontWeight: 400, fontStyle: "italic", color: "var(--olive)" }}>is a buzzword.</span>
            </h3>
            <p style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 400, fontSize: 16, color: "var(--muted)", lineHeight: 1.7, margin: "0 0 24px 0" }}>
              Your skin doesn&apos;t care about marketing. It responds to what
              actually fits it — the right products, from brands you already
              love, matched to what your skin is really doing.
            </p>
            <a href="#beta" className="neo-shadow-sm neo-border px-7 py-4 w-full inline-block text-center" style={{ background: "var(--yellow)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.9px", color: "var(--ink)", cursor: "pointer" }}>
              GET YOUR FREE ROUTINE →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Problem Section ────────────────────────────────────────────────
function ProblemSection() {
  const { ref, visible } = useFadeIn();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative w-full"
      style={{ background: "var(--surface-2)", borderBottom: "3px solid var(--ink)", opacity: visible ? 1 : 0, transition: "opacity 0.8s ease 0.1s, transform 0.8s ease 0.1s", transform: visible ? "none" : "translateY(40px)" }}
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-16 py-24 flex flex-col lg:flex-row gap-16 items-center">
        <div className="flex-1 relative">
          <div style={{ position: "absolute", top: -28, left: -8 }}>
            <span style={{ background: "var(--err-bg)", display: "inline-block", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "1px", color: "var(--err-text)", padding: "10px 19px", border: "3px solid var(--ink)", boxShadow: "4px 4px 0 var(--ink)", transform: "rotate(-2deg)" }}>
              THE PROBLEM
            </span>
          </div>
          <h2 style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(36px, 4vw, 52px)", color: "var(--ink)", letterSpacing: "-1px", lineHeight: 1.15, marginTop: 48, marginBottom: 20 }}>
            The Skincare<br />Guessing Game<br />is Over.
          </h2>
          <p style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 400, fontSize: 18, color: "var(--muted)", lineHeight: 1.7, marginBottom: 32 }}>
            Buying serums based on vibes? Stop it. Your skin is a complex
            ecosystem, not a mood board. Most routines fail because they chase
            trends instead of what your skin actually needs.
          </p>
          <div className="flex flex-col gap-4">
            {[
              "Wasting money on hype ingredients.",
              "Irritating your skin with contradictory products.",
              "Waiting months for results that never come.",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d={svgPaths.p28843fc0} fill="var(--err-border)" />
                </svg>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.7px", color: "var(--ink)" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* "Is it working?" card */}
        <div className="flex-1 flex justify-center">
          <div className="relative w-full max-w-[380px]">
            <div style={{ background: "var(--surface)", border: "3px solid var(--ink)", boxShadow: "8px 8px 0 var(--ink)", padding: 36, transform: "rotate(1deg)" }}>
              <div className="neo-border" style={{ background: "var(--blue)", padding: "120px 20px", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
                <p style={{ fontFamily: "'Epilogue', sans-serif", fontWeight: 400, fontSize: 34, color: "var(--ink)", textAlign: "center", margin: 0 }}>&quot;Is it working?&quot;</p>
                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1px", color: "var(--ink)", textAlign: "center", margin: 0 }}>(SPOILER: NO)</p>
              </div>
            </div>
            <div className="absolute neo-border neo-shadow-sm px-5 py-2.5" style={{ background: "var(--yellow)", top: -20, right: -20, transform: "rotate(10deg)", fontFamily: "'Work Sans', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>
              ?!?
            </div>
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
      className="relative w-full"
      style={{ background: "var(--blue)", borderBottom: "3px solid var(--ink)", opacity: visible ? 1 : 0, transition: "opacity 0.9s ease 0.15s, transform 0.9s ease 0.15s", transform: visible ? "none" : "translateY(40px)" }}
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-16 py-24">
        <div className="flex flex-col items-center gap-5 mb-16">
          <div className="neo-shadow-sm neo-border px-5 py-2.5" style={{ background: "var(--yellow)", transform: "rotate(2deg)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "1.4px", color: "var(--ink)" }}>
            THE SOLUTION
          </div>
          <h2 style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(36px, 4vw, 52px)", color: "var(--ink)", letterSpacing: "-1px", textAlign: "center", margin: 0 }}>
            AetherSkin&apos;s AI Skin Analysis
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Card 1 — Deep Scan */}
          <div className="lg:col-span-2 neo-shadow neo-border p-7 flex flex-col gap-4" style={{ background: "var(--surface)" }}>
            <div className="flex items-center gap-2">
              <svg width="27" height="27" viewBox="0 0 27.09 27" fill="none">
                <path d={svgPaths.p18334868} fill="var(--ink)" />
              </svg>
              <h3 style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 32, color: "var(--ink)", margin: 0 }}>Deep Scan Tech</h3>
            </div>
            <p style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 400, fontSize: 16, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>
              One selfie. AetherSkin&apos;s AI reads your face and maps hydration,
              texture, and everyday concerns — instantly.
            </p>
            <div className="neo-border p-6 flex flex-col justify-center gap-4" style={{ background: "var(--ink)", height: 200 }}>
              {[
                { label: "HYDRATION", value: 72, color: "var(--blue)" },
                { label: "TEXTURE", value: 58, color: "var(--yellow)" },
                { label: "GLOW", value: 86, color: "var(--surface)" },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-4">
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "1.2px", color: "var(--surface)", width: 96 }}>{m.label}</span>
                  <div className="flex-1 h-4" style={{ background: "rgba(249,249,247,0.15)", border: "2px solid var(--surface)" }}>
                    <div className="h-full scan-fill" style={{ width: `${m.value}%`, background: m.color }} />
                  </div>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: m.color, width: 44, textAlign: "right" }}>{m.value}%</span>
                </div>
              ))}
              <p style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "1px", color: "rgba(249,249,247,0.5)", margin: 0, textTransform: "uppercase" }}>Sample readout — your scan will differ</p>
            </div>
          </div>

          {/* Card 2 — Zero BS */}
          <div className="neo-shadow neo-border p-7 flex flex-col justify-between" style={{ background: "var(--yellow)" }}>
            <div className="flex flex-col gap-4">
              <h3 style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 30, color: "var(--ink)", margin: 0 }}>Zero BS Policy</h3>
              <p style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>
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
            <h3 style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 30, color: "var(--ink)", margin: 0 }}>Precision Matches</h3>
            <p style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 400, fontSize: 16, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>
              Products picked from brands you already love, based on your exact scan.
            </p>
            <a href="#beta" className="neo-border mt-auto py-3 w-full inline-block text-center" style={{ background: "var(--blue)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: "1px", color: "var(--ink)", cursor: "pointer" }}>
              LEARN MORE
            </a>
          </div>

          {/* Card 4 — Continuous */}
          <div className="lg:col-span-2 neo-shadow neo-border p-7 flex flex-col md:flex-row items-center gap-8" style={{ background: "var(--surface)" }}>
            <div className="flex flex-col gap-4 flex-1">
              <h3 style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 30, color: "var(--ink)", margin: 0 }}>Continuous Tracking</h3>
              <p style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 400, fontSize: 16, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>
                Your skin changes with the seasons, stress, and sleep. AetherSkin
                tracks your progress and adjusts your routine dynamically.
              </p>
            </div>
            <div className="flex-shrink-0">
              <div style={{ transform: "rotate(-5deg)", background: "var(--yellow)", border: "3px solid var(--ink)", borderRadius: "9999px", width: 128, height: 128, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ink)", textAlign: "center", letterSpacing: "1px" }}>ALWAYS<br />ADAPTING</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Visual Gallery ─────────────────────────────────────────────────
function GallerySection() {
  const { ref, visible } = useFadeIn();

  const panels = [
    { img: imgNoGender, alt: "Water droplets on bare shoulders beside the words: skincare has no gender", label: "UNIVERSAL", text: "Skincare has no gender.", color: "var(--surface)" },
    { img: imgClarity, alt: "Freckled face with clear, hydrated skin in warm golden light", label: "CLARITY", text: "Clarity Is The New Glow", color: "var(--yellow)" },
    { img: imgCleanBS, alt: "Serum dropper and glass bottle beside bold editorial typography", label: "TRUTH", text: "Buzzwords are marketing. Your skin is real.", color: "var(--blue)" },
  ];

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{ borderBottom: "3px solid var(--ink)", opacity: visible ? 1 : 0, transition: "opacity 1s ease 0.2s", transform: visible ? "none" : "translateY(30px)" }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3" style={{ minHeight: 480 }}>
        {panels.map((p, i) => (
          <div
            key={i}
            className="relative overflow-hidden group min-h-[320px]"
            style={{ borderRight: i < 2 ? "3px solid var(--ink)" : undefined, cursor: "pointer" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- remote decorative asset */}
              <img loading="lazy" decoding="async" src={p.img} alt={p.alt} className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-105" />
            <div
              className="absolute inset-0 flex flex-col justify-end p-8 opacity-0 group-hover:opacity-100 transition-all duration-500"
              style={{ background: "rgba(26,28,27,0.35)" }}
            >
              <div className="neo-shadow-sm neo-border px-4 py-2 inline-block self-start mb-3" style={{ background: p.color, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "1.5px", color: "var(--ink)" }}>
                {p.label}
              </div>
              <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 900, fontSize: 28, color: "var(--surface)", margin: 0, textShadow: "2px 2px 0 rgba(0,0,0,0.3)" }}>{p.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Glow O'Clock Interactive Liquid ────────────────────────────────
function GlowOClockSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999, active: false });
  const rafRef = useRef<number>(0);
  const { ref: sectionRef, visible } = useFadeIn(0.1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const N = 24;
    const baseAngles = Array.from({ length: N }, (_, i) => (i / N) * Math.PI * 2);

    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const drawBlob = (pts: { x: number; y: number }[]) => {
      const n = pts.length;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n];
        const p1 = pts[i];
        const p2 = pts[(i + 1) % n];
        const p3 = pts[(i + 2) % n];
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        if (i === 0) ctx.moveTo(p1.x, p1.y);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
      ctx.closePath();
    };

    const animate = () => {
      t += 0.006;
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const baseR = Math.min(W, H) * 0.34;

      ctx.clearRect(0, 0, W, H);

      const pts = baseAngles.map((angle, i) => {
        const wave = Math.sin(t * 0.9 + i * 0.65) * 22 + Math.cos(t * 1.3 + i * 1.1) * 14;
        const r = baseR + wave;

        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;

        if (!mouse.current.active) return { x: px, y: py };

        const dx = mouse.current.x - cx;
        const dy = mouse.current.y - cy;
        const md = Math.sqrt(dx * dx + dy * dy);
        const dot = Math.cos(angle) * (dx / (md || 1)) + Math.sin(angle) * (dy / (md || 1));
        const inf = Math.max(0, dot) * Math.max(0, 1 - md / (baseR * 1.8)) * 90;

        const nr = r + inf;
        return { x: cx + Math.cos(angle) * nr, y: cy + Math.sin(angle) * nr };
      });

      ctx.save();
      ctx.shadowColor = "rgba(180, 165, 130, 0.5)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetX = 20;
      ctx.shadowOffsetY = 30;

      const grad = ctx.createRadialGradient(cx - baseR * 0.25, cy - baseR * 0.2, baseR * 0.05, cx, cy, baseR * 1.2);
      grad.addColorStop(0, "rgba(244, 239, 225, 0.97)");
      grad.addColorStop(0.5, "rgba(234, 228, 210, 0.95)");
      grad.addColorStop(1, "rgba(218, 210, 190, 0.93)");
      ctx.fillStyle = grad;
      drawBlob(pts);
      ctx.fill();
      ctx.restore();

      ctx.save();
      const hl = ctx.createRadialGradient(cx - baseR * 0.35, cy - baseR * 0.3, 0, cx - baseR * 0.3, cy - baseR * 0.25, baseR * 0.55);
      hl.addColorStop(0, "rgba(255,255,255,0.55)");
      hl.addColorStop(0.6, "rgba(255,255,255,0.12)");
      hl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hl;
      drawBlob(pts);
      ctx.fill();
      ctx.restore();

      ctx.save();
      const edge = ctx.createRadialGradient(cx, cy, baseR * 0.6, cx, cy, baseR * 1.1);
      edge.addColorStop(0, "rgba(255,255,255,0)");
      edge.addColorStop(1, "rgba(200,195,175,0.25)");
      ctx.fillStyle = edge;
      drawBlob(pts);
      ctx.fill();
      ctx.restore();

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="relative w-full overflow-hidden"
      style={{
        background: "var(--sand)",
        borderBottom: "3px solid var(--ink)",
        minHeight: 700,
        opacity: visible ? 1 : 0,
        transition: "opacity 1s ease 0.1s",
      }}
    >
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3">
        <div className="neo-shadow-sm neo-border px-6 py-2.5" style={{ background: "var(--surface)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1.6px", color: "var(--muted)" }}>
          ✦ INTERACTIVE
        </div>
        <p style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 400, fontSize: 14, color: "var(--muted)", margin: 0 }}>
          move your cursor over the liquid
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-full absolute inset-0"
        style={{ minHeight: 700 }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top, active: true };
        }}
        onMouseLeave={() => {
          mouse.current = { x: -9999, y: -9999, active: false };
        }}
        onTouchMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const t2 = e.touches[0];
          mouse.current = { x: t2.clientX - r.left, y: t2.clientY - r.top, active: true };
        }}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
        <p style={{ fontFamily: "'Epilogue', sans-serif", fontWeight: 300, fontStyle: "italic", fontSize: "clamp(28px, 4vw, 56px)", color: "var(--ink)", letterSpacing: "-1px", margin: 0, mixBlendMode: "multiply" }}>
          it&apos;s glow o&apos;clock
        </p>
      </div>

      <div className="absolute bottom-10 right-10 z-20">
        <div className="neo-shadow-sm neo-border px-5 py-3 sticker-float" style={{ background: "var(--yellow)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ink)", transform: "rotate(3deg)" }}>
          ✨ glow activated
        </div>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────
function NewFooter() {
  return (
    <footer className="flex flex-col md:flex-row gap-6 items-center justify-between px-6 md:px-16 py-12" style={{ background: "var(--blue)", borderTop: "3px solid var(--ink)" }}>
      <div className="flex flex-col gap-3 items-center md:items-start">
        <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 900, fontSize: 30, color: "var(--deep)" }}>AetherSkin</span>
        {/* Official Google "Add as preferred source" button */}
        <div google-add-preferred-source-btn="" />
      </div>
      <div className="flex gap-6 flex-wrap justify-center">
        <Link href="/about" style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "1.6px", color: "var(--deep)" }}>ABOUT US</Link>
        <Link href="/privacy" style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "1.6px", color: "var(--deep)" }}>PRIVACY</Link>
        <Link href="/terms" style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "1.6px", color: "var(--deep)" }}>TERMS</Link>
        <Link href="/#beta" style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "1.6px", color: "var(--deep)" }}>JOIN FREE</Link>
      </div>
      <span style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1.6px", color: "var(--deep)" }}>{`© ${new Date().getFullYear()} AETHERSKIN. BUILT FOR THE BOLD.`}</span>
    </footer>
  );
}

// ─── Root ───────────────────────────────────────────────────────────
/**
 * `faq` is injected as a slot from the server component (app/page.tsx) so
 * the FAQ copy and its matching FAQPage JSON-LD stay in one server-rendered
 * source. Keeping it server-side means crawlers and AI engines read the
 * answers straight out of the HTML with no hydration step.
 */
export default function NewLanding({ faq }: { faq?: React.ReactNode }) {
  return (
    <div style={{ background: "var(--surface)" }}>
      <SiteNav />
      <HeroSection />
      <DropperSection />
      <ProblemSection />
      <SolutionSection />
      <GallerySection />
      <GlowOClockSection />
      {faq}
      <SignupSection />
      <NewFooter />
      <StickyCta />
    </div>
  );
}
