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

export const DESKTOP_PATH: BeePoint[] | null = null;
export const MOBILE_PATH: BeePoint[] | null = null;

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
