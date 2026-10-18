import Link from "next/link";

export const h2Style = {
  fontFamily: "'Hanken Grotesk', sans-serif",
  fontWeight: 800,
  fontSize: 28,
  color: "var(--ink)",
  letterSpacing: "-0.5px",
  margin: "40px 0 12px",
} as const;

export const h3Style = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 700,
  fontSize: 15,
  letterSpacing: "0.8px",
  color: "var(--ink)",
  textTransform: "uppercase",
  margin: "24px 0 8px",
} as const;

export const pStyle = {
  fontFamily: "'Work Sans', sans-serif",
  fontSize: 16,
  color: "var(--muted)",
  lineHeight: 1.75,
  margin: "0 0 14px",
} as const;

/** Shared shell for the legal pages: nav + centered prose column. */
export function LegalChrome({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen" style={{ background: "var(--surface)" }}>
      <nav
        className="flex items-center justify-between px-6 md:px-16 h-[72px]"
        style={{ background: "var(--surface)", borderBottom: "3px solid var(--ink)" }}
      >
        <Link href="/" aria-label="AetherSkin home" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 900, fontStyle: "italic", fontSize: 24, letterSpacing: -1.2, color: "var(--ink)" }}>
          AetherSkin
        </Link>
        <Link
          href="/#beta"
          className="on-accent neo-shadow-sm neo-border px-6 py-2.5"
          style={{ background: "var(--yellow)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.7px", color: "var(--ink)" }}
        >
          JOIN FREE
        </Link>
      </nav>
      <div className="max-w-[780px] mx-auto px-5 md:px-16 py-14">{children}</div>
    </main>
  );
}
