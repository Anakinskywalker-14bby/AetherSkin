"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BEE_SECTIONS, BeePoint, DRAFT_EVENT, beeMode, locate, readDraft, writeDraft, type BeeMode } from "@/lib/bee-path";

/**
 * Local-only tool for drawing the bee's flight path on the real page.
 * Opens at localhost:3005/?beepath=draw (see lib/bee-path.ts isDrawMode).
 *
 * Scroll normally; click to drop the next point; drag a dot to move it;
 * select a dot to make it a perch or delete it. The bee previews the draft
 * live. "Copy path" puts the JSON on the clipboard to paste back.
 * Desktop and phone drafts are kept separately (phone = under 760px wide).
 */

const ink = "#3B2F5C";

/** Convert a viewport point into section-relative coordinates. */
function toPoint(clientX: number, clientY: number, perch = false): BeePoint | null {
  let best: { sec: string; r: DOMRect; d: number } | null = null;
  for (const sec of BEE_SECTIONS) {
    const el = document.querySelector(sec);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    const d = clientY < r.top ? r.top - clientY : clientY > r.bottom ? clientY - r.bottom : 0;
    if (!best || d < best.d) best = { sec, r, d };
  }
  if (!best) return null;
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return {
    sec: best.sec,
    fx: round(Math.min(1, Math.max(0, clientX / window.innerWidth))),
    fy: round((clientY - best.r.top) / best.r.height),
    ...(perch ? { perch: true } : {}),
  };
}

export default function BeePathEditor() {
  const [mode, setMode] = useState<BeeMode>(() => beeMode());
  const [points, setPoints] = useState<BeePoint[]>(() => readDraft(beeMode()) ?? []);
  const [selected, setSelected] = useState<number | null>(null);
  const [showDots, setShowDots] = useState(true);
  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0);
  const drag = useRef<number | null>(null);
  const moved = useRef(false);

  const save = useCallback(
    (next: BeePoint[]) => {
      setPoints(next);
      writeDraft(mode, next);
    },
    [mode]
  );

  // Re-render dots as the page scrolls/resizes; switch drafts across 760px.
  useEffect(() => {
    let raf = 0;
    const bump = () => {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; setTick((t) => t + 1); });
    };
    const onResize = () => {
      const m = beeMode();
      setMode((prev) => {
        if (prev !== m) {
          setPoints(readDraft(m) ?? []);
          setSelected(null);
        }
        return m;
      });
      bump();
    };
    const loop = () => { bump(); id = requestAnimationFrame(loop); };
    let id = requestAnimationFrame(loop); // the page also moves on its own (smooth scroll, doors)
    window.addEventListener("resize", onResize);
    window.addEventListener(DRAFT_EVENT, bump);
    return () => {
      cancelAnimationFrame(id);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener(DRAFT_EVENT, bump);
    };
  }, []);

  const onLayerClick = (e: React.MouseEvent) => {
    if (moved.current) { moved.current = false; return; }
    const p = toPoint(e.clientX, e.clientY, points.length === 0);
    if (!p) return;
    const next = [...points, p];
    save(next);
    setSelected(next.length - 1);
  };

  const onDotDown = (i: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = i;
    moved.current = false;
    setSelected(i);
  };
  const onDotMove = (e: React.PointerEvent) => {
    if (drag.current === null) return;
    const p = toPoint(e.clientX, e.clientY, !!points[drag.current]?.perch);
    if (!p) return;
    moved.current = true;
    const next = points.slice();
    next[drag.current] = p;
    save(next);
  };
  const onDotUp = () => { drag.current = null; };

  const togglePerch = () => {
    if (selected === null) return;
    const next = points.slice();
    const p = { ...next[selected] };
    if (p.perch) delete p.perch; else p.perch = true;
    next[selected] = p;
    save(next);
  };
  const remove = () => {
    if (selected === null) return;
    save(points.filter((_, i) => i !== selected));
    setSelected(null);
  };
  const undo = () => { save(points.slice(0, -1)); setSelected(null); };
  const clear = () => { if (window.confirm(`Clear the ${mode} path?`)) { save([]); setSelected(null); } };
  const json = JSON.stringify({ mode, width: window.innerWidth, points }, null, 1);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy this path:", json);
    }
  };

  const located = points.map((p) => locate(p));
  const btn: React.CSSProperties = { padding: "7px 11px", borderRadius: 999, border: `1.5px solid ${ink}`, background: "#fff", color: ink, font: "600 12px system-ui, sans-serif", cursor: "pointer" };

  return (
    <>
      {/* Click layer: the page still scrolls under it. */}
      <div onClick={onLayerClick} style={{ position: "fixed", inset: 0, zIndex: 9990, cursor: "crosshair" }} />

      {showDots && (
        <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 9991, pointerEvents: "none" }}>
          <polyline
            points={located.filter(Boolean).map((a) => `${a!.x},${a!.y}`).join(" ")}
            fill="none"
            stroke={ink}
            strokeWidth={2}
            strokeDasharray="6 6"
            opacity={0.8}
          />
        </svg>
      )}

      {showDots &&
        located.map((a, i) =>
          a ? (
            <div
              key={i}
              onPointerDown={onDotDown(i)}
              onPointerMove={onDotMove}
              onPointerUp={onDotUp}
              onClick={(e) => e.stopPropagation()}
              title={`${i + 1}: ${points[i].sec} (${points[i].fx}, ${points[i].fy})${points[i].perch ? " perch" : ""}`}
              style={{
                position: "fixed",
                left: a.x - 13,
                top: a.y - 13,
                width: 26,
                height: 26,
                zIndex: 9992,
                borderRadius: points[i].perch ? 6 : 999,
                background: selected === i ? "#F4B8A2" : "#fff",
                border: `2px solid ${ink}`,
                color: ink,
                font: "700 12px system-ui, sans-serif",
                display: "grid",
                placeItems: "center",
                cursor: "grab",
                touchAction: "none",
                boxShadow: "0 4px 12px rgba(40,24,70,.35)",
              }}
            >
              {i + 1}
            </div>
          ) : null
        )}

      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: "fixed", left: 12, bottom: 12, zIndex: 9999, maxWidth: "calc(100vw - 24px)", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", padding: 10, borderRadius: 16, background: "rgba(255,255,255,.94)", boxShadow: "0 10px 30px rgba(40,24,70,.3)", font: "600 12px system-ui, sans-serif", color: ink }}
      >
        <span style={{ padding: "0 6px" }}>
          Bee path · <b>{mode === "mobile" ? "Phone" : "Desktop"}</b> ({window.innerWidth}px) · {points.length} pts
        </span>
        <button style={btn} onClick={undo} disabled={!points.length}>Undo</button>
        <button style={btn} onClick={togglePerch} disabled={selected === null}>
          {selected !== null && points[selected]?.perch ? "Unperch" : "Perch"}
        </button>
        <button style={btn} onClick={remove} disabled={selected === null}>Delete</button>
        <button style={btn} onClick={clear} disabled={!points.length}>Clear</button>
        <button style={btn} onClick={() => setShowDots((s) => !s)}>{showDots ? "Hide dots" : "Show dots"}</button>
        <button style={{ ...btn, background: ink, color: "#fff" }} onClick={copy} disabled={!points.length}>
          {copied ? "Copied!" : "Copy path"}
        </button>
      </div>
    </>
  );
}
