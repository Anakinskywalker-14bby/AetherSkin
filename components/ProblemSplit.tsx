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
// polaroid is the owner-supplied frown photo. Replacing either file needs no code
// change.
const VIDEO_SRC = "/problem/problem.mp4";
const VIDEO_POSTER = "/problem/problem-poster.jpg";
const POLAROID_SRC = "/problem/polaroid-frown.jpg";

// Each pain point gets its own icon instead of a number, so it reads at a glance.
function MoneyDrainIcon() {
  // A coin with its value falling away: money spent on viral ingredients.
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10" cy="10" r="6.5" />
      <path d="M11.8 7.6c-.4-.6-1.1-.9-1.8-.9-1 0-1.9.6-1.9 1.4 0 1.9 3.8 1 3.8 2.9 0 .8-.9 1.4-1.9 1.4-.8 0-1.5-.4-1.9-1M10 5.6v.9M10 13.5v.9" />
      <path d="M18.5 13v7M16 17.6l2.5 2.6 2.5-2.6" />
    </svg>
  );
}
function ClashIcon() {
  // Two products colliding with a spark: mixing things that don't match.
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10h4v10H4zM5 10V7.5h2V10M5.4 7.5V5.5h1.2v2" />
      <path d="M16 12h4v8h-4zM17 12V9.5h2V12" />
      <path d="M12.6 4.5 10.8 8h2.4l-1.8 3.5" />
    </svg>
  );
}
function WaitingIcon() {
  // An hourglass: months of waiting.
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 3.5h11M6.5 20.5h11" />
      <path d="M7.5 3.5c0 4 4.5 5.5 4.5 8.5s-4.5 4.5-4.5 8.5M16.5 3.5c0 4-4.5 5.5-4.5 8.5s4.5 4.5 4.5 8.5" />
      <path d="M9.5 18.8c.8-1.3 1.6-1.8 2.5-1.8s1.7.5 2.5 1.8" />
    </svg>
  );
}

const PAINS = [
  { key: "money", Icon: MoneyDrainIcon, text: "Wasting hundreds on viral ingredients that do nothing." },
  { key: "clash", Icon: ClashIcon, text: "Breaking out from mixing products that don't match." },
  { key: "wait", Icon: WaitingIcon, text: "Waiting months for changes that never show up." },
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

function Polaroid({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <figure className={className} aria-hidden="true" style={style}>
      <div className="ps-polaroid-tilt">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
        <img src={POLAROID_SRC} alt="" width={520} height={650} loading="lazy" />
        <figcaption>Is it working?</figcaption>
      </div>
    </figure>
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

      <div className="ps-top relative flex items-start justify-between mb-auto" {...anim(visible, 0, { y: 12, duration: 1400 })}>
        <span className="ps-kicker">The problem</span>
      </div>

      <div
        className="ps-mid relative flex flex-col py-10 md:py-8"
        style={{ flex: 1, justifyContent: "center", ...anim(visible, 300, { y: 40, duration: 1800 }).style }}
      >
        {/* Phones: the same polaroid, centred under the headline (CSS order). */}
        <Polaroid className="ps-polaroid ps-polaroid--mob" />
        <h2 id="problem-heading" className="ps-title m-0">
          <span>The skincare</span>
          <span>guessing game</span>
          <em>is over.</em>
        </h2>
        <p className="ps-body" {...anim(visible, 600, { y: 10, duration: 1400 })}>
          {/* Short, single-line fragments that read like the visitor's own thoughts. */}
          <span className="ps-line">Buying serums based on TikTok trends?</span>
          <span className="ps-line ps-line--stop">Stop it.</span>
        </p>
      </div>

      <Polaroid className="ps-polaroid ps-polaroid--desk" style={anim(visible, 750, { y: -30, duration: 1600 }).style} />

      <div className="ps-bottom relative flex items-end justify-between gap-6 flex-wrap">
        <ul className="ps-pains" {...anim(visible, 900, { y: 16, duration: 1400 })}>
          {PAINS.map((p) => (
            <li key={p.key}>
              <span className="ps-pain-label"><p.Icon /></span>
              <span className="ps-pain-text">{p.text}</span>
            </li>
          ))}
        </ul>
        {/* The primary action after the problems: solid, high contrast. */}
        <a href="#beta" className="ps-btn" style={anim(visible, 1150, { y: 16, duration: 1400 }).style}>
          Start Your 3-Minute Skin Quiz <span aria-hidden="true">→</span>
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
        <ProblemVideo className="md:hidden relative overflow-hidden" style={{ height: "60vw", backgroundColor: PLUM }} />
        <ProblemPanel visible={visible} />
      </div>
    </section>
  );
}
