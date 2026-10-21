"use client";

/**
 * Vanity pull-light.
 *
 * Cord physics adapted from kokonutui's Pull Cord (MIT, @dorianbaffier,
 * https://kokonutui.com) — a Verlet chain with distance and bend constraints.
 * The fixture is redrawn: instead of a desk lamp this is a round vanity bulb
 * on a brass chain, matching the arched-mirror mark and the bulb row across
 * the hero. Forked rather than CSS-skinned because the lamp's shade and bulb
 * are paths inside the component, and no amount of recolouring turns a
 * trapezoid shade into a bulb.
 *
 * Lamp lit = light theme. Pulling the chain turns the bulb off and the room
 * dark, which is why the control needs no label.
 */

import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";

const WIDTH = 120;
/* Canvas height = chain end at rest (48 + 7 x 7.5 = 100.5) + the maximum pull
   stretch (30) + the bead and some swing room. */
const HEIGHT = 150;
/* The bulb now mounts straight to the underside of the nav bar, so the chain
   starts just below it. There is no ceiling drop above the fitting. */
const ANCHOR = { x: WIDTH / 2, y: 48 };
const BULB_Y = 30;
/* 7 links (52px of chain), down from 11 (82px): a shorter pull cord. */
const LINKS = 7;
const LINK = 7.5;

const STEP = 1 / 120;
const GRAVITY = 1400;
const DAMPING = 0.992;
const MAX_SPEED = 4;
const BEND_MIN = LINK * 1.9;
const BEND_STIFFNESS = 0.8;
const ITERATIONS = 14;
const CLICK_PULL = 20;
const MAX_STRETCH = 30;
const REST_EPSILON = 0.015;
const REST_STEPS = 24;

function damp(distance: number, max: number) {
  return max * (1 - Math.exp(-distance / max));
}

function relax(
  chain: { xs: Float64Array; ys: Float64Array; held: number },
  a: number,
  b: number,
  length: number,
  bend: boolean
) {
  const { xs, ys, held } = chain;
  const aFixed = a === 0 || a === held;
  const bFixed = b === held;
  if (aFixed && bFixed) return;
  const dx = xs[b] - xs[a];
  const dy = ys[b] - ys[a];
  const dist = Math.hypot(dx, dy) || 0.0001;
  if (bend && dist >= length) return;
  const diff = ((dist - length) / dist) * (bend ? BEND_STIFFNESS : 1);
  let wa = 0.5;
  if (aFixed) wa = 0;
  else if (bFixed) wa = 1;
  xs[a] += dx * diff * wa;
  ys[a] += dy * diff * wa;
  xs[b] -= dx * diff * (1 - wa);
  ys[b] -= dy * diff * (1 - wa);
}

function cordPath(xs: Float64Array, ys: Float64Array) {
  let d = `M${xs[0].toFixed(2)} ${ys[0].toFixed(2)}`;
  for (let i = 1; i < xs.length - 1; i++) {
    const mx = (xs[i] + xs[i + 1]) / 2;
    const my = (ys[i] + ys[i + 1]) / 2;
    d += ` Q${xs[i].toFixed(2)} ${ys[i].toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`;
  }
  const n = xs.length - 1;
  d += ` L${xs[n].toFixed(2)} ${ys[n].toFixed(2)}`;
  return d;
}

function restingChain() {
  const xs = new Float64Array(LINKS + 1);
  const ys = new Float64Array(LINKS + 1);
  for (let i = 0; i <= LINKS; i++) {
    xs[i] = ANCHOR.x;
    ys[i] = ANCHOR.y + i * LINK;
  }
  return { xs, ys };
}

const REST = restingChain();
const REST_PATH = cordPath(REST.xs, REST.ys);

export interface VanityLightProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
}

export default function VanityLight({
  checked: checkedProp,
  defaultChecked = true,
  onCheckedChange,
  label = "Site theme",
}: VanityLightProps) {
  const [internal, setInternal] = useState(defaultChecked);
  const checked = checkedProp ?? internal;
  const [grabbing, setGrabbing] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const cordRef = useRef<SVGPathElement>(null);
  const hitRef = useRef<SVGPathElement>(null);
  const beadRef = useRef<SVGGElement>(null);

  const sim = useRef({
    xs: Float64Array.from(REST.xs),
    ys: Float64Array.from(REST.ys),
    pxs: Float64Array.from(REST.xs),
    pys: Float64Array.from(REST.ys),
    raf: 0,
    last: 0,
    carry: 0,
    still: 0,
    held: -1,
    targetX: 0,
    targetY: 0,
    armed: true,
    reduceMotion: false,
  });

  const latest = useRef<{ checked: boolean; toggle: (next: boolean) => void }>({
    checked,
    toggle: () => undefined,
  });

  const toggle = useCallback(
    (next: boolean) => {
      if (checkedProp === undefined) setInternal(next);
      onCheckedChange?.(next);
    },
    [checkedProp, onCheckedChange]
  );
  latest.current = { checked, toggle };

  const draw = useCallback(() => {
    const { xs, ys } = sim.current;
    const d = cordPath(xs, ys);
    cordRef.current?.setAttribute("d", d);
    hitRef.current?.setAttribute("d", d);
    const n = LINKS;
    const angle = (Math.atan2(xs[n] - xs[n - 1], ys[n] - ys[n - 1]) * 180) / Math.PI;
    beadRef.current?.setAttribute(
      "transform",
      `translate(${xs[n].toFixed(2)} ${ys[n].toFixed(2)}) rotate(${(-angle).toFixed(2)})`
    );
  }, []);

  const integrate = useCallback(() => {
    const s = sim.current;
    const { xs, ys, pxs, pys } = s;
    let moved = 0;
    for (let i = 1; i <= LINKS; i++) {
      if (i === s.held) continue;
      let vx = (xs[i] - pxs[i]) * DAMPING;
      let vy = (ys[i] - pys[i]) * DAMPING;
      const speed = Math.hypot(vx, vy);
      if (speed > MAX_SPEED) {
        vx *= MAX_SPEED / speed;
        vy *= MAX_SPEED / speed;
      }
      pxs[i] = xs[i];
      pys[i] = ys[i];
      xs[i] += vx;
      ys[i] += vy + GRAVITY * STEP * STEP;
      moved = Math.max(moved, Math.abs(vx) + Math.abs(vy));
    }
    if (s.held > 0) {
      const i = s.held;
      moved = Math.max(moved, Math.abs(s.targetX - xs[i]) + Math.abs(s.targetY - ys[i]));
      pxs[i] = xs[i];
      pys[i] = ys[i];
      xs[i] = s.targetX;
      ys[i] = s.targetY;
    }
    return moved;
  }, []);

  const constrain = useCallback(() => {
    const s = sim.current;
    for (let k = 0; k < ITERATIONS; k++) {
      for (let i = 0; i < LINKS; i++) relax(s, i, i + 1, LINK, false);
      for (let i = 0; i + 2 <= LINKS; i++) relax(s, i, i + 2, BEND_MIN, true);
    }
  }, []);

  const tick = useCallback(
    (now: number) => {
      const s = sim.current;
      s.raf = 0;
      const elapsed = s.last ? Math.min((now - s.last) / 1000, 0.05) : STEP;
      s.last = now;
      s.carry += elapsed;
      let moved = 0;
      while (s.carry >= STEP) {
        // One step is integrate-then-constrain. Integrating twice would
        // double gravity and make the chain fall at the wrong rate.
        const m = integrate();
        constrain();
        moved = Math.max(moved, m);
        s.carry -= STEP;
      }
      draw();
      s.still = moved < REST_EPSILON ? s.still + 1 : 0;
      if (s.held > 0 || s.still < REST_STEPS) {
        s.raf = requestAnimationFrame(tick);
      } else {
        s.last = 0;
      }
    },
    [draw, integrate, constrain]
  );

  const wake = useCallback(() => {
    const s = sim.current;
    s.still = 0;
    if (!s.raf) s.raf = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    const s = sim.current;
    s.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => cancelAnimationFrame(s.raf);
  }, []);

  const localPoint = (event: PointerEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  };

  const reach = (index: number, x: number, y: number) => {
    const dx = x - ANCHOR.x;
    const dy = y - ANCHOR.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const length = index * LINK;
    if (dist <= length) return { x, y, pull: 0 };
    const allowed = length + damp(dist - length, MAX_STRETCH);
    return {
      x: ANCHOR.x + (dx / dist) * allowed,
      y: ANCHOR.y + (dy / dist) * allowed,
      pull: dy > 0 ? (allowed - length) * (dy / dist) : 0,
    };
  };

  const handlePointerDown = (event: PointerEvent<SVGElement>) => {
    const s = sim.current;
    if (s.held > 0) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    const point = localPoint(event);
    let nearest = LINKS;
    let best = Number.POSITIVE_INFINITY;
    for (let i = 1; i <= LINKS; i++) {
      const d = Math.hypot(s.xs[i] - point.x, s.ys[i] - point.y);
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    svgRef.current?.setPointerCapture(event.pointerId);
    s.held = nearest;
    s.targetX = s.xs[nearest];
    s.targetY = s.ys[nearest];
    s.armed = true;
    setGrabbing(true);
    wake();
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const s = sim.current;
    if (s.held < 0) return;
    const point = localPoint(event);
    const target = reach(s.held, point.x, point.y);
    s.targetX = target.x;
    s.targetY = target.y;
    if (s.armed && target.pull > CLICK_PULL) {
      s.armed = false;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(8);
      latest.current.toggle(!latest.current.checked);
    } else if (!s.armed && target.pull < CLICK_PULL * 0.4) {
      s.armed = true;
    }
    wake();
  };

  const handlePointerUp = () => {
    const s = sim.current;
    if (s.held < 0) return;
    s.held = -1;
    setGrabbing(false);
    if (s.reduceMotion) {
      s.xs.set(REST.xs);
      s.ys.set(REST.ys);
      s.pxs.set(REST.xs);
      s.pys.set(REST.ys);
      draw();
      return;
    }
    wake();
  };

  const handleKeyToggle = () => {
    toggle(!checked);
    const s = sim.current;
    if (!s.reduceMotion) {
      s.pys[LINKS] = s.ys[LINKS] - 5;
      wake();
    }
  };

  return (
    <div className="relative select-none" style={{ width: WIDTH, height: HEIGHT }}>
      <svg
        aria-hidden="true"
        className={grabbing ? "cursor-grabbing" : "cursor-default"}
        height={HEIGHT}
        onLostPointerCapture={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        style={{ touchAction: "none", overflow: "visible" }}
      >
        <defs>
          {/* The halo only exists when the bulb is lit. */}
          <radialGradient id="vl-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--butter)" stopOpacity="0.85" />
            <stop offset="55%" stopColor="var(--butter)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--butter)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Fitting only — the bulb screws into the underside of the bar. */}
        <rect
          x={WIDTH / 2 - 13}
          y={0}
          width={26}
          height={8}
          rx={3}
          fill="var(--ink)"
          opacity={0.82}
        />
        <path
          d={`M${WIDTH / 2 - 9} 8 h18 l-3 8 h-12 Z`}
          fill="var(--ink)"
          opacity={0.7}
        />

        {/* Halo, behind the glass */}
        <circle
          cx={WIDTH / 2}
          cy={BULB_Y}
          r={44}
          fill="url(#vl-glow)"
          style={{
            opacity: checked ? 1 : 0,
            transition: "opacity 420ms ease-out",
          }}
        />

        {/* The bulb */}
        <circle
          cx={WIDTH / 2}
          cy={BULB_Y}
          r={17}
          fill={checked ? "var(--butter)" : "color-mix(in srgb, var(--ink) 22%, transparent)"}
          stroke="var(--ink)"
          strokeOpacity={0.55}
          strokeWidth={1.5}
          style={{ transition: "fill 420ms ease-out" }}
        />
        {/* Filament, visible only when lit */}
        <path
          d={`M${WIDTH / 2 - 5} ${BULB_Y + 2} q2.5 -7 5 0 q2.5 7 5 0`}
          fill="none"
          stroke="var(--ink)"
          strokeOpacity={checked ? 0.5 : 0.18}
          strokeWidth={1.4}
          strokeLinecap="round"
          style={{ transition: "stroke-opacity 420ms ease-out" }}
        />
        {/* Glass highlight — the "glint" from the brand mark */}
        <path
          d={`M${WIDTH / 2 - 9} ${BULB_Y - 6} q3 -5 7 -5.5`}
          fill="none"
          stroke="#fff6ec"
          strokeOpacity={checked ? 0.85 : 0.25}
          strokeWidth={2.4}
          strokeLinecap="round"
        />

        {/* Chain */}
        <path
          d={REST_PATH}
          fill="none"
          ref={cordRef}
          stroke="var(--ink)"
          strokeOpacity={0.42}
          strokeLinecap="round"
          strokeWidth={1.6}
          strokeDasharray="1 3.4"
        />
        <path
          className={grabbing ? undefined : "cursor-grab"}
          d={REST_PATH}
          fill="none"
          onPointerDown={handlePointerDown}
          pointerEvents="stroke"
          ref={hitRef}
          stroke="transparent"
          strokeWidth={26}
        />

        {/* Pull knob */}
        <g
          className={grabbing ? undefined : "cursor-grab"}
          onPointerDown={handlePointerDown}
          ref={beadRef}
          transform={`translate(${ANCHOR.x} ${ANCHOR.y + LINKS * LINK})`}
        >
          <circle fill="transparent" r={20} />
          <circle r={5.5} fill="var(--ink)" opacity={0.82} />
          <circle cx={-1.6} cy={-1.6} r={1.5} fill="#fff6ec" opacity={0.6} />
        </g>
      </svg>

      <button
        aria-checked={checked}
        aria-label={label}
        className="sr-only"
        onClick={handleKeyToggle}
        role="switch"
        type="button"
      />
    </div>
  );
}
