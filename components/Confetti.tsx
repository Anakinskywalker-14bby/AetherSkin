"use client";

import { useEffect, useRef } from "react";

/** Brand colours only: peach, coral, blush, lilac, violet, plum, cream. */
const COLORS = ["#F4B8A2", "#E8907D", "#F6D9E0", "#DCD5F0", "#7A5BB0", "#3B2F5C", "#F7F5FC"];
const COUNT = 150;
const DURATION_MS = 4200;

/**
 * One burst of confetti over the page, drawn on a canvas that ignores clicks
 * and removes itself when the pieces have fallen. No library, no network.
 * Skipped entirely for visitors who ask for reduced motion.
 */
export default function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Two bursts from the lower corners, thrown up and inward.
    const pieces = Array.from({ length: COUNT }, (_, i) => {
      const left = i % 2 === 0;
      const angle = (left ? -Math.PI / 3 : (-2 * Math.PI) / 3) + (Math.random() - 0.5) * 0.9;
      const speed = 9 + Math.random() * 11;
      return {
        x: left ? w * 0.08 : w * 0.92,
        y: h * 0.82,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 1.25,
        size: 6 + Math.random() * 7,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        color: COLORS[i % COLORS.length],
        round: i % 5 === 0,
      };
    });

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, w, h);
      const fade = t > DURATION_MS - 900 ? Math.max(0, (DURATION_MS - t) / 900) : 1;
      for (const p of pieces) {
        p.vy += 0.32; // gravity
        p.vx *= 0.992; // air
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }
      if (t < DURATION_MS) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 60, pointerEvents: "none" }}
    />
  );
}
