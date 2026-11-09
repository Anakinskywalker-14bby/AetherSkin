"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import Link from "next/link";
import { useWaitlistSignup } from "@/lib/use-waitlist-signup";

export type WaitlistModalHandle = { open: () => void };

/**
 * Phones: the hero's "Join the waitlist" opens this instead of scrolling to
 * the footer. A native <dialog> opened with showModal() gives the dimmed
 * backdrop, focus trapping and Esc-to-close for free. Same signup flow and
 * API as the footer form (double opt-in, consent required).
 */
const WaitlistModal = forwardRef<WaitlistModalHandle>(function WaitlistModal(_props, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const s = useWaitlistSignup("hero_modal");

  useImperativeHandle(ref, () => ({
    open: () => {
      const d = dialogRef.current;
      if (d && !d.open) d.showModal();
    },
  }));

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      className="wm"
      aria-labelledby="wm-title"
      // Tap on the dimmed backdrop closes it (the click lands on <dialog> itself).
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
          FREE WAITLIST
        </p>
        <h2 id="wm-title" className="wm-title">
          Join the <em>waitlist</em>
        </h2>
        <p className="wm-sub">500 beta spots. No card, ever. Then a 3-minute skin quiz.</p>

        {s.state === "already" ? (
          <p className="wm-status" role="status" aria-live="polite">
            <strong>You&apos;ve already signed up.</strong> Your spot is locked.
          </p>
        ) : s.state === "sent" ? (
          <p className="wm-status" role="status" aria-live="polite">
            <strong>Check your inbox.</strong> We sent a link to {s.email}. Open it to confirm and take the quiz.
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
});

export default WaitlistModal;
