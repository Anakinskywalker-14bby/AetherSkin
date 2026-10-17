"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { isValidEmail } from "@/lib/utils";

type State = "idle" | "loading" | "sent" | "saved" | "error";

/**
 * Free waitlist signup with double opt-in. No payment.
 * States: idle -> loading -> sent (check your inbox) | saved | error.
 */
export function SignupSection() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

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

      setState("sent");
      setMessage(
        data.alreadyComplete
          ? "You're already on the list — nothing else to do."
          : null
      );
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <section
      id="beta"
      className="relative w-full"
      style={{ background: "#f9f9f7", borderBottom: "3px solid #1a1c1b" }}
    >
      <div className="max-w-[800px] mx-auto px-5 md:px-16 py-20 md:py-24">
        <div className="relative neo-shadow neo-border p-6 sm:p-8 md:p-14" style={{ background: "#f9f9f7" }}>
          <div
            className="absolute neo-shadow-sm neo-border px-4 py-2"
            style={{ background: "#e8e883", top: -22, left: -10, transform: "rotate(-4deg)", fontFamily: "'Work Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#1a1c1b" }}
          >
            100% FREE
          </div>

          {state === "sent" ? (
            <div className="text-center py-4" role="status" aria-live="polite">
              <div
                className="inline-block neo-border neo-shadow-sm px-5 py-2.5 mb-6"
                style={{ background: "#beeaf8", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1.4px", color: "#1a1c1b" }}
              >
                CHECK YOUR INBOX
              </div>
              <h2 style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(26px,4vw,36px)", color: "#1a1c1b", margin: "0 0 14px", lineHeight: 1.15 }}>
                One tap left.
              </h2>
              <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: 16, color: "#484739", lineHeight: 1.7, margin: "0 0 8px" }}>
                {message ??
                  `We sent a confirmation link to ${email}. Open it to confirm your spot and take the 2-minute skin quiz.`}
              </p>
              <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: 14, color: "#484739", lineHeight: 1.6, margin: 0 }}>
                Nothing in a few minutes? Check spam or promotions.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 mb-8">
                <h2 style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(26px,3vw,36px)", color: "#1a1c1b", textAlign: "center", margin: 0, lineHeight: 1.15 }}>
                  Get your skin read. Free.
                </h2>
                <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: 16, color: "#484739", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
                  Drop your email, confirm it, and answer a 2-minute quiz.
                  That&apos;s your whole signup. No card, no cost, ever.
                </p>
              </div>

              <form onSubmit={submit} noValidate>
                <label
                  htmlFor="signup-email"
                  className="block mb-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1px", color: "#1a1c1b", textTransform: "uppercase" }}
                >
                  Email address
                </label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (state === "error") setState("idle");
                  }}
                  aria-invalid={emailInvalid || state === "error"}
                  aria-describedby={message ? "signup-message" : undefined}
                  className="neo-border px-5 py-4 w-full outline-none"
                  style={{
                    background: "#f9f9f7",
                    fontFamily: "'Work Sans', sans-serif",
                    fontSize: 16,
                    color: "#1a1c1b",
                    borderColor: emailInvalid ? "#ba1a1a" : "#1a1c1b",
                  }}
                />
                {emailInvalid && (
                  <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: 13, color: "#ba1a1a", margin: "6px 0 0", fontWeight: 700 }}>
                    That doesn&apos;t look like a valid email.
                  </p>
                )}

                <label className="flex items-start gap-3 mt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      if (state === "error") setState("idle");
                    }}
                    className="mt-1 h-5 w-5 shrink-0"
                    style={{ accentColor: "#1a1c1b" }}
                  />
                  <span style={{ fontFamily: "'Work Sans', sans-serif", fontSize: 14, color: "#484739", lineHeight: 1.6 }}>
                    I agree to AetherSkin storing my email and quiz answers as
                    described in the{" "}
                    <Link href="/privacy" style={{ color: "#1a1c1b", fontWeight: 700, textDecoration: "underline" }}>
                      Privacy Policy
                    </Link>
                    , and I&apos;m 18 or older.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={state === "loading"}
                  className="neo-shadow neo-border py-5 md:py-6 w-full mt-6 disabled:opacity-60"
                  style={{ background: "#e8e883", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: "1px", color: "#1a1c1b", textTransform: "uppercase" }}
                >
                  {state === "loading" ? (
                    <span className="inline-flex items-center gap-3">
                      <span
                        aria-hidden
                        className="inline-block h-4 w-4 animate-spin"
                        style={{ border: "3px solid #1a1c1b", borderTopColor: "transparent", borderRadius: "50%" }}
                      />
                      Sending your link...
                    </span>
                  ) : (
                    "Join the waitlist"
                  )}
                </button>

                {message && (
                  <p
                    id="signup-message"
                    ref={liveRef}
                    role="alert"
                    aria-live="assertive"
                    className="neo-border px-4 py-3 mt-4"
                    style={{
                      background: state === "saved" ? "#beeaf8" : "#ffdad6",
                      fontFamily: "'Work Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: 14,
                      color: state === "saved" ? "#1a1c1b" : "#93000a",
                    }}
                  >
                    {message}
                  </p>
                )}

                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: "#484739", textAlign: "center", opacity: 0.75, margin: "16px 0 0", letterSpacing: "0.5px" }}>
                  NO PAYMENT · NO SPAM · UNSUBSCRIBE ANY TIME
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
