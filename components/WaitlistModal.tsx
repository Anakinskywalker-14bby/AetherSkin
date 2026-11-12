"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useWaitlistSignup } from "@/lib/use-waitlist-signup";

/**
 * The signup popup. Mounted once on the landing page; it opens whenever any
 * link to the signup (`a[href="#beta"]`) is clicked, on phones and desktop,
 * so nobody has to scroll to the footer to join. A native <dialog> opened with
 * showModal() gives the dimmed backdrop, focus trapping and Esc-to-close.
 * Same signup flow and API as the footer form (double opt-in, consent required).
 * If <dialog> is unsupported the link simply scrolls to the footer form.
 */
export default function WaitlistModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const s = useWaitlistSignup("hero_modal");

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const d = dialogRef.current;
      if (!d || typeof d.showModal !== "function" || e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.('a[href="#beta"]');
      if (!link) return;
      e.preventDefault();
      if (!d.open) d.showModal();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      className="wm"
      aria-labelledby="wm-title"
      // A click on the dimmed backdrop lands on <dialog> itself: close.
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="wm-card">
        <button type="button" className="wm-close" onClick={close} aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <p className="wm-badge">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5 14 10l8.5 2-8.5 2-2 8.5-2-8.5L1.5 12 10 10Z" /></svg>
          BETA SPOTS OPEN
        </p>
        <h2 id="wm-title" className="wm-title">
          Join the <em>waitlist</em>
        </h2>
        <p className="wm-sub">Join free, then take the 3-minute skin quiz we email you.</p>

        {s.state === "sent" ? (
          <p className="wm-status" role="status" aria-live="polite">
            <strong>If you&apos;ve already signed up, you&apos;re all set.</strong> Otherwise, check your inbox for a link to confirm your spot.
          </p>
        ) : (
          <form onSubmit={s.submit} noValidate className="wm-form">
            <label htmlFor="wm-email" className="sf-visually-hidden">Email address</label>
            <input
              id="wm-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="your email"
              value={s.email}
              onChange={(e) => {
                s.setEmail(e.target.value);
                s.clearError();
              }}
              aria-invalid={s.emailInvalid || s.state === "error"}
              aria-describedby={s.message ? "wm-message" : undefined}
            />
            <label className="wm-consent">
              <input
                type="checkbox"
                checked={s.consent}
                onChange={(e) => {
                  s.setConsent(e.target.checked);
                  s.clearError();
                }}
              />
              <span>
                I agree to the <Link href="/privacy">Privacy Policy</Link> and I&apos;m 18+.
              </span>
            </label>
            <button type="submit" className="wm-submit" disabled={s.state === "loading"}>
              {s.state === "loading" ? "Sending…" : "Join the waitlist"}
            </button>
            {s.message && (
              <p id="wm-message" className="wm-message" role="alert" aria-live="assertive">
                {s.message}
              </p>
            )}
          </form>
        )}
      </div>
    </dialog>
  );
}
