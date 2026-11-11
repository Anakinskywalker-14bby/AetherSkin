"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Interactive demo of the hook: one selfie, a scan, a readout.
 *
 * This is a demonstration only. The photo is an AI-generated image of a
 * fictional person (never a visitor's photo: nothing is uploaded or captured
 * here), and the numbers are a fixed sample. Both facts are stated on screen,
 * because real scanning only opens at beta launch.
 */
const SAMPLE = [
  { label: "Hydration", value: 72, color: "#DCD5F0" },
  { label: "Texture", value: 58, color: "#F4B8A2" },
  { label: "Glow", value: 86, color: "#F7F5FC" },
] as const;

const SCAN_MS = 2400;

type Phase = "idle" | "scanning" | "done";

export default function SelfieDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function scan() {
    if (phase === "scanning") return;
    if (timer.current) clearTimeout(timer.current);
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPhase("done");
      return;
    }
    setPhase("scanning");
    timer.current = setTimeout(() => setPhase("done"), SCAN_MS);
  }

  return (
    <div className={`sd sd--${phase}`}>
      <div className="sd-phone" aria-hidden="true">
        <span className="sd-notch" />
        {/* eslint-disable-next-line @next/next/no-img-element -- demo photo, lazy */}
        <img src="/story/selfie.jpg" alt="" loading="lazy" decoding="async" />
        <span className="sd-guide" />
        <span className="sd-beam" />
      </div>

      <div className="sd-side">
        <p className="sd-step">
          {phase === "idle" && "1. Take one selfie"}
          {phase === "scanning" && "2. Reading your skin…"}
          {phase === "done" && "3. Your readout"}
        </p>

        <div className="sd-readout" role="status" aria-live="polite">
          {SAMPLE.map((m) => (
            <div key={m.label} className="sd-row">
              <span className="sd-label">{m.label}</span>
              <span className="sd-bar">
                <span className="sd-fill" style={{ width: phase === "done" ? `${m.value}%` : "0%", background: m.color }} />
              </span>
              <span className="sd-val" style={{ color: m.color }}>{phase === "done" ? `${m.value}%` : "--"}</span>
            </div>
          ))}
          <p className="sd-note">Sample readout on a demo photo. Your scan will differ.</p>
        </div>

        <div className="sd-actions">
          <button type="button" className="sd-btn" onClick={scan} disabled={phase === "scanning"}>
            {phase === "idle" ? "Tap to scan" : phase === "scanning" ? "Scanning…" : "Scan again"}
          </button>
          {phase === "done" && (
            <a href="#beta" className="sd-join">Get mine at beta launch →</a>
          )}
        </div>
      </div>
    </div>
  );
}
