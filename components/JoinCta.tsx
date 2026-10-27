import Link from "next/link";

/**
 * "Join the free beta" in the home hero's style: a pill plus a round arrow
 * button. It takes the visitor to the home page footer, where the signup
 * sits on the giant's heart (#footer).
 * tone="dark" for use over the sky photo, "light" on the lilac page.
 */
export function JoinCta({ tone = "light", label = "Join the free beta" }: { tone?: "dark" | "light"; label?: string }) {
  return (
    <div className={`join-cta join-cta--${tone}`}>
      <Link href="/#footer" className="join-cta-pill">{label}</Link>
      <Link href="/#footer" className="join-cta-arrow" aria-label={label}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
      </Link>
    </div>
  );
}
