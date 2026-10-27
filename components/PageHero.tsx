import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { JoinCta } from "@/components/JoinCta";

/**
 * Editorial page header for the inner pages (About, FAQ, Privacy, Terms),
 * built from the home hero's elements: the lilac-and-peach sky photo, thin
 * white grid lines, the logo + nav with round glass buttons, a peach star
 * badge, a light sans headline finished in italic serif, and a tilted
 * polaroid. Server component: no client JS.
 */
export function PageHero({
  badge,
  lead,
  kicker,
  note,
  caption,
  photo = "/hero/polaroid-face.jpg",
}: {
  badge: string;
  lead: string;
  kicker: string;
  note?: string;
  caption?: string;
  photo?: string;
}) {
  return (
    <header className="ph">
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative sky, sized by CSS */}
      <img className="ph-sky" src="/hero/hero.jpg" alt="" aria-hidden="true" fetchPriority="high" />
      <span className="ph-line ph-line-top" aria-hidden="true" />
      <span className="ph-line ph-line-v" aria-hidden="true" />
      <span className="ph-line ph-line-h" aria-hidden="true" />

      <div className="ph-nav">
        <BrandLogo height={32} />
        <nav className="ph-links" aria-label="Main">
          <Link href="/about">About</Link>
          <Link href="/#solution">How it works</Link>
        </nav>
        <div className="ph-icons">
          <Link href="/#beta" className="ph-glass" aria-label="Join the free waitlist">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>
          </Link>
          <Link href="/faq" className="ph-glass" aria-label="FAQ">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6" /><circle cx="12" cy="16.6" r=".4" /></svg>
          </Link>
        </div>
      </div>

      <div className="ph-copy">
        <p className="ph-badge">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5 14 10l8.5 2-8.5 2-2 8.5-2-8.5L1.5 12 10 10Z" /></svg>
          {badge}
        </p>
        <h1 className="ph-title">
          <span>{lead}</span> <em>{kicker}</em>
        </h1>
        {note && <p className="ph-note">{note}</p>}
        <JoinCta tone="dark" />
      </div>

      {caption && (
        <figure className="ph-polaroid" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
          <img src={photo} alt="" width={520} height={650} />
          <figcaption>{caption}</figcaption>
        </figure>
      )}
    </header>
  );
}

/** Body column for editorial pages: lilac ground, hero type. */
export function EdBody({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <main className="ed-page">
      <div className={wide ? "ed-wrap ed-wrap--wide" : "ed-wrap"}>{children}</div>
    </main>
  );
}
