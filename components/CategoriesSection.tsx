"use client";

import { useEffect, useRef, useState } from "react";
import { Inter_Tight, Playfair_Display } from "next/font/google";

const interTight = Inter_Tight({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--cat-sans", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600"], style: ["italic"], variable: "--cat-serif", display: "swap" });

// Videos are the owner-supplied clips, served from public/categories.
// `lead` is set in the hero's sans; `kicker` in its italic serif.
const CATEGORIES = [
  { name: "face", video: "/categories/face.mp4", poster: "/categories/face.jpg", lead: "Know what your skin", kicker: "is doing!" },
  { name: "supplements", video: "/categories/supplements.mp4", poster: "/categories/supplements.jpg", lead: "Clear skin", kicker: "from within!" },
  { name: "body", video: "/categories/body.mp4", poster: "/categories/body.jpg", lead: "Buzzwords are marketing!", kicker: "Your skin is real!" },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, isVisible };
}

/**
 * Three looping videos. Hovering (or focusing) a card reveals its statement
 * in the hero's type; on touch screens, where hover doesn't exist, the
 * statement is always shown.
 */
export default function CategoriesSection() {
  const { ref, isVisible } = useInView(0.1);

  return (
    <section
      id="gallery"
      aria-label="What AetherSkin looks at"
      className={`cat-section text-white min-h-screen flex flex-col justify-center ${interTight.variable} ${playfair.variable}`}
    >
      <div
        ref={ref}
        className={`grid grid-cols-1 md:grid-cols-3 transition-all duration-1000 ease-out ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
        }`}
      >
        {CATEGORIES.map((c, i) => (
          <article
            key={c.name}
            tabIndex={0}
            className="cat-card group relative flex flex-col justify-between items-start p-6 sm:p-8 md:p-12 min-h-[400px] sm:min-h-[500px] md:min-h-[750px] overflow-hidden"
            style={{ transitionDelay: `${i * 150}ms` }}
          >
            <video
              src={c.video}
              poster={c.poster}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-hidden="true"
              className="cat-video absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-500" />
            <div className="cat-shade absolute inset-0" aria-hidden="true" />

            {/* The lift lives on a wrapper: the h2's own transform is the
                rotate that makes the vertical text read bottom-to-top. */}
            <div className="relative z-10 transition-transform duration-500 group-hover:-translate-y-2">
              <h2
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-medium"
                style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}
              >
                {c.name}
              </h2>
            </div>

            <p className="cat-statement relative z-10 mt-auto">
              <span>{c.lead}</span>{" "}
              <em>{c.kicker}</em>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
