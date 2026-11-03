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

// Drawn by the owner (desktop on 27 Oct 2026 at 1264px: 17 points;
// phone redrawn on 3 Nov 2026 at 484px for the phone-first layout: 24 points).
export const DESKTOP_PATH: BeePoint[] | null = [
  { sec: ".eh", fx: 0.8592, fy: 0.6988, perch: true },
  { sec: "#problem", fx: 0.692, fy: 0.0621 },
  { sec: "#problem", fx: 0.8318, fy: 0.1552 },
  { sec: "#problem", fx: 0.779, fy: 0.3521 },
  { sec: "#problem", fx: 0.9597, fy: 0.6359 },
  { sec: "#problem", fx: 0.9422, fy: 0.8408 },
  { sec: "#problem", fx: 0.7223, fy: 0.9193 },
  { sec: "#solution", fx: 0.6068, fy: 0.1025 },
  { sec: "#solution", fx: 0.8323, fy: 0.1709 },
  { sec: "#solution", fx: 0.9312, fy: 0.3336 },
  { sec: "#solution", fx: 0.9272, fy: 0.5951 },
  { sec: "#solution", fx: 0.7901, fy: 0.8055 },
  { sec: "#solution", fx: 0.9343, fy: 0.9068 },
  { sec: "#solution", fx: 0.9422, fy: 0.9813 },
  { sec: "#footer", fx: 0.2131, fy: 0.2097 },
  { sec: "#footer", fx: 0.6962, fy: 0.3477 },
  { sec: "#footer", fx: 0.6242, fy: 0.6157, perch: true },
];

export const MOBILE_PATH: BeePoint[] | null = [
  { sec: ".eh", fx: 0.9153, fy: 0.699, perch: true },
  { sec: ".eh", fx: 0.3554, fy: 0.8438 },
  { sec: "#problem", fx: 0.7851, fy: 0.0346 },
  { sec: "#problem", fx: 0.9112, fy: 0.0948 },
  { sec: "#problem", fx: 0.7045, fy: 0.1517 },
  { sec: "#problem", fx: 0.6591, fy: 0.3464 },
  { sec: "#problem", fx: 0.9504, fy: 0.3754 },
  { sec: "#problem", fx: 0.8444, fy: 0.6556 },
  { sec: "#solution", fx: 0.9483, fy: 0.0065 },
  { sec: "#solution", fx: 0.6791, fy: 0.0744 },
  { sec: "#solution", fx: 0.9132, fy: 0.1758 },
  { sec: "#solution", fx: 0.8691, fy: 0.4141 },
  { sec: "#solution", fx: 0.0661, fy: 0.5374 },
  { sec: "#solution", fx: 0.0675, fy: 0.6168 },
  { sec: "#solution", fx: 0.0647, fy: 0.9156 },
  { sec: "#solution", fx: 0.9194, fy: 0.9811 },
  { sec: "#gallery", fx: 0.9215, fy: 0.3257 },
  { sec: "#gallery", fx: 0.9174, fy: 0.6702 },
  { sec: "#gallery", fx: 0.936, fy: 0.9983 },
  { sec: "#footer", fx: 0.5744, fy: 0.0795 },
  { sec: "#footer", fx: 0.8774, fy: 0.2998 },
  { sec: "#footer", fx: 0.6433, fy: 0.476 },
  { sec: "#footer", fx: 0.8698, fy: 0.5832 },
  { sec: "#footer", fx: 0.1157, fy: 0.8529 },
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
