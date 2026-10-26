"use client";

import { useRef } from "react";
import Link from "next/link";
import FooterBackground from "./FooterBackground";
import VanityLight from "@/components/VanityLight";
import { useFooterTheme } from "@/lib/use-theme";
import { useWaitlistSignup } from "@/lib/use-waitlist-signup";

const LINKEDIN = "https://www.linkedin.com/in/khaleed-mohammed-b5b431223";
const INSTAGRAM = "https://www.instagram.com/aetherskincare/";

function LinkedInIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M3 3h18v18H3V3Zm4.2 7.4H5.1V19h2.1v-8.6ZM6.15 5.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5ZM19 14.1c0-2.4-1.3-3.9-3.4-3.9-1.1 0-1.9.6-2.3 1.2v-1h-2V19h2.1v-4.6c0-1.2.5-2.1 1.6-2.1 1 0 1.5.8 1.5 2.1V19H19v-4.9Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** The waitlist signup, held between the giant's thumbs. */
function HeldSignup({ holdRef }: { holdRef: React.RefObject<HTMLDivElement> }) {
  const s = useWaitlistSignup();

  return (
    <div id="beta" ref={holdRef} className="sf-hold">
      {s.state === "already" ? (
        <p className="sf-hold-status" role="status" aria-live="polite">
          <strong>You&apos;ve already signed up.</strong> {s.email} is confirmed
          and your quiz is done, so your spot is locked.
        </p>
      ) : s.state === "sent" ? (
        <p className="sf-hold-status" role="status" aria-live="polite">
          <strong>Check your inbox.</strong> We sent a link to {s.email}. Open it
          to confirm and take the 3-minute skin quiz.
        </p>
      ) : (
        <form onSubmit={s.submit} noValidate className="sf-form">
          <label htmlFor="signup-email" className="sf-visually-hidden">
            Email address
          </label>
          <div className="sf-pill">
            <input
              id="signup-email"
              name="email"
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
              aria-describedby={s.message ? "signup-message" : undefined}
            />
            <button type="submit" disabled={s.state === "loading"}>
              {s.state === "loading" ? "Sending…" : "Join"}
            </button>
          </div>
          <label className="sf-consent">
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
          {s.message && (
            <p id="signup-message" className="sf-hold-message" role="alert" aria-live="assertive">
              {s.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

export default function SiteFooter() {
  const { isLight, setLight, mounted } = useFooterTheme();
  const holdRef = useRef<HTMLDivElement>(null);
  const dark = mounted && !isLight;

  return (
    // `.dark` swaps the theme tokens for this subtree only (globals.css):
    // the bulb themes the footer and nothing else on the site.
    <footer id="footer" className={`sf${dark ? " dark" : ""}`} aria-label="Footer">
      <FooterBackground dark={dark} holdRef={holdRef} />
      {mounted && (
        <>
          <div className="sf-lamp">
            <VanityLight checked={isLight} onCheckedChange={setLight} label="Footer theme" />
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isLight}
            aria-label="Footer theme"
            className="sf-bulb"
            onClick={() => setLight(!isLight)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" />
            </svg>
          </button>
        </>
      )}
      <div className="sf-jobs">
        <span className="sf-tag">get to know us</span>
        <nav className="sf-headline sf-links" aria-label="Company">
          <Link href="/about">About us</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms &amp; Conditions</Link>
        </nav>
      </div>
      <div className="sf-logo">AetherSkin</div>
      <div className="sf-contact">
        <span className="sf-tag">say hey</span>
        <div className="sf-headline sf-contact-links">
          <span>let’s team up!</span>
          <span>Join our journey</span>
        </div>
        <p className="sf-note">outer calm, inner peace</p>
        <div className="sf-socials">
          <a href={LINKEDIN} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <LinkedInIcon />
          </a>
          <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <InstagramIcon />
          </a>
        </div>
      </div>
      <HeldSignup holdRef={holdRef} />
    </footer>
  );
}
