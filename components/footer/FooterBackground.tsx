"use client";

import { useEffect, useRef } from "react";
import gazeFrames from "./gaze-frames.json";

const TAU = Math.PI * 2;
const wrappedAngle = (angle: number) => ((angle % TAU) + TAU) % TAU;

// Where the signup sits, in source-frame pixels (1920x1080).
// Desktop: the pill's left curve touches the heart's right edge, measured
// from frame 0 (the heart's widest point is x≈1130 at y=680, after its
// soft fuzz).
export const HEART_EDGE_X = 1128;
export const HEART_EDGE_Y = 680;
// Phones: too narrow to sit beside the heart, so it centres on it.
export const HOLD_X = 880;
export const HOLD_Y = 745;

// These angles were measured from the actual pupil positions in the clip's
// first complete orbit. Match direction, rather than assuming constant speed.
function timeForAngle(angle: number) {
  const target = wrappedAngle(angle);
  let nearestTime = gazeFrames[0][1];
  let nearestDistance = Infinity;
  for (const [sampleAngle, time] of gazeFrames) {
    const difference = Math.abs(target - sampleAngle);
    const distance = Math.min(difference, TAU - difference);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestTime = time;
    }
  }
  return nearestTime + 1 / 240;
}

/** Map a source-frame point to viewport coordinates under object-fit: cover. */
export function sourceToScreen(rect: DOMRect, x: number, y: number) {
  const scale = Math.max(rect.width / 1920, rect.height / 1080);
  return {
    x: rect.left + rect.width / 2 + (x - 960) * scale,
    y: rect.top + rect.height / 2 + (y - 540) * scale,
  };
}

export default function FooterBackground({
  holdRef,
}: {
  /** Element pinned between the thumbs (positioned relative to the footer). */
  holdRef?: React.RefObject<HTMLElement>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current!;
    let frame = 0;
    let desiredTime = 0;
    let pointer: { x: number; y: number } | null = null;
    let disposed = false;
    const mobile = window.matchMedia("(max-width: 700px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const placeHold = () => {
      const hold = holdRef?.current;
      const parent = hold?.offsetParent as HTMLElement | null;
      if (!hold || !parent) return;
      const rect = video.getBoundingClientRect();
      const base = parent.getBoundingClientRect();
      const beside = !mobile.matches;
      const p = beside
        ? sourceToScreen(rect, HEART_EDGE_X, HEART_EDGE_Y)
        : sourceToScreen(rect, HOLD_X, HOLD_Y);
      hold.dataset.place = beside ? "beside" : "centre";
      hold.style.left = `${p.x - base.left}px`;
      hold.style.top = `${p.y - base.top}px`;
    };
    const seek = () => {
      frame = 0;
      if (disposed || mobile.matches || video.readyState < 2 || video.seeking) return;
      if (Math.abs(video.currentTime - desiredTime) > 1 / 48) {
        video.currentTime = Math.min(desiredTime, video.duration - 1 / 24);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(seek);
    };
    const updateTarget = () => {
      if (mobile.matches || !pointer) return;
      const eye = sourceToScreen(video.getBoundingClientRect(), 948, 418);
      const dx = pointer.x - eye.x;
      const dy = pointer.y - eye.y;
      // Avoid unstable angles directly between the eyes.
      if (Math.hypot(dx, dy) > 8) {
        desiredTime = timeForAngle(Math.atan2(dy, dx));
        schedule();
      }
    };
    const move = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      updateTarget();
    };
    const relayout = () => {
      placeHold();
      updateTarget();
    };
    const ready = () => {
      placeHold();
      video.loop = mobile.matches;
      if (mobile.matches && !reducedMotion.matches) {
        void video.play().catch(() => {
          /* Keep the first frame if autoplay is unavailable. */
        });
      } else {
        video.pause();
        if (!mobile.matches) {
          updateTarget();
          schedule();
        }
      }
    };
    // Coalesce fast pointer movements while a frame is decoding. When it
    // finishes, seek immediately to the latest requested gaze direction.
    const resizeObserver = new ResizeObserver(placeHold);
    resizeObserver.observe(video);
    video.addEventListener("seeked", schedule);
    video.addEventListener("loadeddata", ready);
    mobile.addEventListener("change", ready);
    reducedMotion.addEventListener("change", ready);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("resize", relayout);
    window.addEventListener("scroll", updateTarget, { passive: true });
    placeHold();
    if (video.readyState >= 2) ready();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      video.removeEventListener("seeked", schedule);
      video.removeEventListener("loadeddata", ready);
      mobile.removeEventListener("change", ready);
      reducedMotion.removeEventListener("change", ready);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("resize", relayout);
      window.removeEventListener("scroll", updateTarget);
    };
  }, [holdRef]);

  return (
    <div className="sf-background" aria-hidden="true">
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        src="/footer-scrub.mp4"
      />
    </div>
  );
}
