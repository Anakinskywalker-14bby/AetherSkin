import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

/**
 * Frame for the quiz and thank-you pages, in the site's hero language: the
 * sunset sky band with thin white grid lines, the AetherSkin lockup and a
 * round glass FAQ button, a peach-star badge and a light sans title finished
 * in italic serif. Below it, the lilac page ground. Server component.
 */
export function QuizShell({
  badge,
  lead,
  kicker,
  children,
}: {
  badge: string;
  lead: string;
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <main className="qz-page">
      <header className="qz-top">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative sky band, sized by CSS */}
        <img className="qz-sky" src="/pages/sky-portrait.jpg" alt="" aria-hidden="true" fetchPriority="high" />
        <span className="qz-line qz-line-nav" aria-hidden="true" />
        <div className="qz-nav">
          <BrandLogo height={32} />
          <Link href="/faq" className="qz-glass" aria-label="FAQ">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6" /><circle cx="12" cy="16.6" r=".4" /></svg>
          </Link>
        </div>
        <div className="qz-head">
          <p className="qz-badge">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5 14 10l8.5 2-8.5 2-2 8.5-2-8.5L1.5 12 10 10Z" /></svg>
            {badge}
          </p>
          <h1 className="qz-title">
            {lead} <em>{kicker}</em>
          </h1>
        </div>
      </header>
      <div className="qz-body">{children}</div>
    </main>
  );
}
