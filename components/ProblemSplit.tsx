"use client";

import { useEffect, useRef, useState } from "react";
import { Inter_Tight, Playfair_Display, Permanent_Marker } from "next/font/google";

const interTight = Inter_Tight({ subsets: ["latin"], weight: ["300", "400", "500", "700"], variable: "--ps-sans", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400"], style: ["italic"], variable: "--ps-serif", display: "swap" });
const marker = Permanent_Marker({ subsets: ["latin"], weight: "400", variable: "--ps-marker", display: "swap" });

const TEXT = "#ffffff";
const BG_LILAC = "#8A7EAD"; // sampled from the hero sky
const PLUM = "#3B2F5C"; // hero fallback colour, used for text on white
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// Media. VIDEO: the woman frowns, kisses the screen, then smiles gently.
// POLAROID: the same woman looking confused, thinking. The clip is the
// owner-supplied one (kiss -> soft smile; it has no frown yet) and the
// polaroid is a neutral still from it. Replacing either file needs no code
// change.
const VIDEO_SRC = "/problem/problem.mp4";
const VIDEO_POSTER = "/problem/problem-poster.jpg";
const POLAROID_SRC = "/problem/polaroid-confused.jpg";

const PAINS = [
  { label: "01", text: "Wasting money on hype ingredients" },
  { label: "02", text: "Irritating your skin with clashing products" },
  { label: "03", text: "Waiting months for results that never come" },
];

function anim(visible: boolean, delay: number, opts: { y?: number; x?: number; duration?: number } = {}) {
  const { y = 20, x = 0, duration = 1600 } = opts;
  const from = y !== 0 ? `translateY(${y}px)` : x !== 0 ? `translateX(${x}px)` : "none";
  return {
    style: {
      opacity: visible ? 1 : 0,
      transform: visible ? "translate(0,0)" : from,
      transition: `opacity ${duration}ms ${EASE} ${delay}ms, transform ${duration}ms ${EASE} ${delay}ms`,
    } as React.CSSProperties,
  };
}

function ProblemVideo({ className, style }: { className: string; style: React.CSSProperties }) {
  return (
    <div className={className} style={style}>
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={VIDEO_POSTER}
        aria-hidden="true"
        className="ps-video absolute inset-0 w-full h-full object-cover"
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>
    </div>
  );
}

function ProblemPanel({ visible }: { visible: boolean }) {
  return (
    <div
      className="relative flex flex-col px-6 md:px-10 pt-6 md:pt-8 pb-8 md:pb-10 overflow-hidden"
      style={{ backgroundColor: BG_LILAC, color: TEXT, minHeight: "100%" }}
    >
      {/* Same sky as the hero: a peach glow low on the panel. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 70% at 85% 110%, rgba(244,184,162,.55), transparent 60%)" }}
      />

      <div className="relative flex items-start justify-between mb-auto" {...anim(visible, 0, { y: 12, duration: 1400 })}>
        <span className="text-xs font-medium tracking-[.16em] uppercase">The problem</span>
        <span className="text-xs font-medium tracking-[.16em] uppercase">Spoiler: no</span>
      </div>

      <div
        className="relative flex flex-col py-10 md:py-8"
        style={{ flex: 1, justifyContent: "center", ...anim(visible, 300, { y: 40, duration: 1800 }).style }}
      >
        <h2 id="problem-heading" className="ps-title m-0">
          <span>The skincare</span>
          <span>guessing game</span>
          <em>is over.</em>
        </h2>
        <p className="ps-body" {...anim(visible, 600, { y: 10, duration: 1400 })}>
          Buying serums based on vibes? Stop it. Your skin is a complex
          ecosystem, not a mood board. Most routines fail because they chase
          trends instead of what your skin actually needs.
        </p>
      </div>

      <figure className="ps-polaroid" aria-hidden="true" style={anim(visible, 750, { y: -30, duration: 1600 }).style}>
        <div className="ps-polaroid-tilt">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
          <img src={POLAROID_SRC} alt="" width={520} height={650} loading="lazy" />
          <figcaption>Is it working?</figcaption>
        </div>
      </figure>

      <div className="relative flex items-end justify-between gap-6 flex-wrap">
        <ul className="ps-pains" {...anim(visible, 900, { y: 16, duration: 1400 })}>
          {PAINS.map((p) => (
            <li key={p.label}>
              <span className="ps-pain-label">{p.label}</span>
              <span className="ps-pain-text">{p.text}</span>
            </li>
          ))}
        </ul>
        <a
          href="#beta"
          className="ps-btn group"
          style={{ color: TEXT, borderColor: TEXT, ...anim(visible, 1150, { y: 16, duration: 1400 }).style }}
        >
          <span className="relative z-10 transition-colors duration-500 group-hover:text-[color:var(--ps-plum)]">Get your skin read</span>
          <span
            aria-hidden="true"
            className="absolute inset-0 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out"
            style={{ backgroundColor: "#ffffff" }}
          />
        </a>
      </div>
    </div>
  );
}

/**
 * The problem, as a split: the video on the left, the pain points on a
 * hero-lilac panel on the right. Phones: panel first, video strip below
 * (flex-col-reverse on DOM order [video, video-mobile, panel]).
 */
export default function ProblemSplit() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    // Fail open where IntersectionObserver is missing (crawlers, old browsers).
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    const failsafe = window.setTimeout(() => setVisible(true), 4000);
    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
    };
  }, []);

  return (
    <section
      ref={ref}
      id="problem"
      aria-labelledby="problem-heading"
      className={`ps relative w-full ${interTight.variable} ${playfair.variable} ${marker.variable}`}
      style={{ ["--ps-plum" as string]: PLUM } as React.CSSProperties}
    >
      <div className="flex flex-col-reverse md:grid md:min-h-screen" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <ProblemVideo className="hidden md:block relative overflow-hidden" style={{ backgroundColor: PLUM, minHeight: "100%" }} />
        <ProblemVideo className="md:hidden relative overflow-hidden" style={{ height: "75vw", backgroundColor: PLUM }} />
        <ProblemPanel visible={visible} />
      </div>
    </section>
  );
}
