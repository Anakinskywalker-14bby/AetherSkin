/**
 * The bee's flight path (components/BeeGuide).
 *
 * Points are drawn by the owner in the local path editor
 * (localhost:3005/?beepath=draw, components/BeePathEditor) and pasted here.
 * Each point is stored relative to the page section it sits in, so the path
 * survives different screen sizes and changes in section height:
 *   sec  which section (one of BEE_SECTIONS)
 *   fx   0..1 across the viewport width
 *   fy   0..1 down that section's height
 *   perch  land here with wings folded
 * Separate paths for desktop and phones (< 760px wide). `null` means "use
 * the built-in path that follows the page's headings".
 */
export type BeePoint = { sec: string; fx: number; fy: number; perch?: boolean };

export const BEE_SECTIONS = [".eh", "#problem", "#solution", "#gallery", "#footer"] as const;

// Drawn by the owner on 27 Oct 2026 (desktop at 1264px, phone at 484px).
export const DESKTOP_PATH: BeePoint[] | null = [
  { sec: ".eh", fx: 0.8797, fy: 0.6934, perch: true },
  { sec: ".eh", fx: 0.1994, fy: 0.455 },
  { sec: ".eh", fx: 0.1434, fy: 0.9449 },
  { sec: ".eh", fx: 0.4501, fy: 0.9758 },
  { sec: "#problem", fx: 0.8291, fy: 0.0789 },
  { sec: "#problem", fx: 0.8188, fy: 0.2834 },
  { sec: "#problem", fx: 0.9684, fy: 0.6359 },
  { sec: "#problem", fx: 0.9494, fy: 0.8896 },
  { sec: "#solution", fx: 0.8424, fy: 0.0009 },
  { sec: "#solution", fx: 0.6203, fy: 0.0523 },
  { sec: "#solution", fx: 0.9267, fy: 0.1758 },
  { sec: "#solution", fx: 0.6018, fy: 0.3593 },
  { sec: "#solution", fx: 0.8871, fy: 0.6433 },
  { sec: "#solution", fx: 0.6603, fy: 0.7576 },
  { sec: "#solution", fx: 0.8782, fy: 0.9883 },
  { sec: "#solution", fx: 0.0622, fy: 0.9694 },
  { sec: "#gallery", fx: 0.0886, fy: 0.7636 },
  { sec: "#footer", fx: 0.2263, fy: 0.1939 },
  { sec: "#footer", fx: 0.6915, fy: 0.3314 },
  { sec: "#footer", fx: 0.6369, fy: 0.6142, perch: true },
];

export const MOBILE_PATH: BeePoint[] | null = [
  { sec: ".eh", fx: 0.9318, fy: 0.4978, perch: true },
  { sec: ".eh", fx: 0.7128, fy: 0.7692 },
  { sec: ".eh", fx: 0.5826, fy: 0.881 },
  { sec: "#problem", fx: 0.531, fy: 0.0511 },
  { sec: "#problem", fx: 0.6054, fy: 0.1825 },
  { sec: "#problem", fx: 0.9132, fy: 0.3438 },
  { sec: "#problem", fx: 0.9112, fy: 0.5433 },
  { sec: "#problem", fx: 0.5496, fy: 0.5804 },
  { sec: "#solution", fx: 0.936, fy: 0.0087 },
  { sec: "#solution", fx: 0.4566, fy: 0.0257 },
  { sec: "#solution", fx: 0.938, fy: 0.0878 },
  { sec: "#solution", fx: 0.7603, fy: 0.1297 },
  { sec: "#solution", fx: 0.9091, fy: 0.2258 },
  { sec: "#solution", fx: 0.874, fy: 0.4592 },
  { sec: "#solution", fx: 0.095, fy: 0.6296 },
  { sec: "#solution", fx: 0.1322, fy: 0.715 },
  { sec: "#solution", fx: 0.7479, fy: 0.767 },
  { sec: "#solution", fx: 0.8988, fy: 0.8078 },
  { sec: "#solution", fx: 0.7231, fy: 0.9118 },
  { sec: "#solution", fx: 0.2397, fy: 0.9845 },
  { sec: "#gallery", fx: 0.9318, fy: 0.0141 },
  { sec: "#gallery", fx: 0.8388, fy: 0.3224 },
  { sec: "#gallery", fx: 0.1157, fy: 0.3207 },
  { sec: "#gallery", fx: 0.9236, fy: 0.5707 },
  { sec: "#gallery", fx: 0.9401, fy: 0.6582 },
  { sec: "#gallery", fx: 0.0785, fy: 0.8916 },
  { sec: "#footer", fx: 0.9029, fy: 0.003 },
  { sec: "#footer", fx: 0.6446, fy: 0.0665 },
  { sec: "#footer", fx: 0.3657, fy: 0.1383 },
  { sec: "#footer", fx: 0.436, fy: 0.2017 },
  { sec: "#footer", fx: 0.8533, fy: 0.2808 },
  { sec: "#footer", fx: 0.8347, fy: 0.3776 },
  { sec: "#footer", fx: 0.6364, fy: 0.4161 },
  { sec: "#footer", fx: 0.686, fy: 0.5524 },
  { sec: "#footer", fx: 0.3781, fy: 0.5972 },
  { sec: "#footer", fx: 0.186, fy: 0.671 },
  { sec: "#footer", fx: 0.095, fy: 0.7647 },
  { sec: "#footer", fx: 0.0744, fy: 0.8157 },
  { sec: "#footer", fx: 0.1322, fy: 0.8448, perch: true },
];

export const MOBILE_MAX = 760;
export type BeeMode = "desktop" | "mobile";
export const beeMode = (): BeeMode => (window.innerWidth < MOBILE_MAX ? "mobile" : "desktop");

/** The editor only ever runs on the owner's own machine. */
export function isDrawMode(): boolean {
  if (typeof window === "undefined") return false;
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  return local && new URLSearchParams(window.location.search).get("beepath") === "draw";
}

export const DRAFT_EVENT = "beepath-change";
const draftKey = (mode: BeeMode) => `aetherskin-beepath-${mode}`;

export function readDraft(mode: BeeMode): BeePoint[] | null {
  try {
    const raw = localStorage.getItem(draftKey(mode));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BeePoint[]) : null;
  } catch {
    return null;
  }
}

export function writeDraft(mode: BeeMode, points: BeePoint[]) {
  try {
    localStorage.setItem(draftKey(mode), JSON.stringify(points));
  } catch {
    /* storage blocked: the draft just won't survive a reload */
  }
  window.dispatchEvent(new Event(DRAFT_EVENT));
}

/** Where a point is right now: viewport x/y and its document y. */
export function locate(p: BeePoint): { x: number; y: number; docY: number } | null {
  const el = document.querySelector(p.sec);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const y = r.top + p.fy * r.height;
  return { x: p.fx * window.innerWidth, y, docY: y + window.scrollY };
}
