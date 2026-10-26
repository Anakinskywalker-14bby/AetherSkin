"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { isValidEmail } from "@/lib/utils";

export type SignupState = "idle" | "loading" | "sent" | "already" | "saved" | "error";

/**
 * Free waitlist signup with double opt-in. No payment.
 * idle -> loading -> sent (check your inbox) | already (signed up before,
 * nothing to do) | saved | error.
 */
export function useWaitlistSignup() {
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
      let data: { ok?: boolean; error?: string; saved?: boolean; alreadyComplete?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error("Something went wrong. Please try again.");
      }
      if (res.status === 202 && data.saved) {
        setState("saved");
        setMessage(data.error ?? "We saved your spot.");
        return;
      }
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      // Already confirmed and quizzed: no email is sent (the API returns
      // early), so don't tell them to check their inbox.
      setState(data.alreadyComplete ? "already" : "sent");
    } catch (err) {
      // Network/server failures reach Sentry; the email itself never does
      // (the request body isn't attached, and sentry-scrub strips PII).
      Sentry.captureException(err, { tags: { feature: "waitlist_signup", surface: "footer" } });
      setState("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const clearError = () => {
    if (state === "error") setState("idle");
  };

  return { email, setEmail, consent, setConsent, state, message, emailInvalid, submit, clearError };
}
