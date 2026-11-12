"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { isValidEmail } from "@/lib/utils";

export type SignupState = "idle" | "loading" | "sent" | "error";

/**
 * Free waitlist signup with double opt-in. No payment.
 * idle -> loading -> sent | error.
 *
 * The API intentionally returns the identical `{ ok: true }` body and status
 * for every accepted case (new signup, resend, cooldown, already quizzed) --
 * that's what keeps this endpoint from being an email-enumeration oracle.
 * This hook used to branch on a `saved`/`alreadyComplete`/202 shape the API
 * never actually sent, a client/server contract that had silently drifted
 * (PYA audit 2026-11-12, low) and risked a future edit re-introducing the
 * enumeration gap by having the two sides disagree again. Don't reintroduce
 * a state here unless the API is changed to match.
 */
export function useWaitlistSignup(surface: "footer" | "hero_modal" = "footer") {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<SignupState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const emailInvalid = email.length > 0 && !isValidEmail(email);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!isValidEmail(email)) {
      setState("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    if (!consent) {
      setState("error");
      setMessage("Please agree to the privacy policy to continue.");
      return;
    }

    setState("loading");
    try {
      const res = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent: true }),
      });
      let data: { ok?: boolean; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error("Something went wrong. Please try again.");
      }
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      setState("sent");
    } catch (err) {
      // Network/server failures reach Sentry; the email itself never does
      // (the request body isn't attached, and sentry-scrub strips PII).
      Sentry.captureException(err, { tags: { feature: "waitlist_signup", surface } });
      setState("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const clearError = () => {
    if (state === "error") setState("idle");
  };

  return { email, setEmail, consent, setConsent, state, message, emailInvalid, submit, clearError };
}
