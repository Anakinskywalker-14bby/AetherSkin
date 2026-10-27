import { PageHero, EdBody } from "@/components/PageHero";
import { JoinCta } from "@/components/JoinCta";

// Prose styles for the legal pages, in the hero's type and palette.
export const h2Style = {
  fontFamily: "var(--ed-sans), 'Inter Tight', system-ui, sans-serif",
  fontWeight: 500,
  fontSize: "clamp(24px, 2.4vw, 30px)",
  color: "#3B2F5C",
  letterSpacing: "-0.015em",
  margin: "48px 0 12px",
} as const;

export const h3Style = {
  fontFamily: "var(--ed-sans), 'Inter Tight', system-ui, sans-serif",
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: "0.14em",
  color: "#3B2F5C",
  textTransform: "uppercase",
  margin: "26px 0 8px",
} as const;

export const pStyle = {
  fontFamily: "var(--ed-sans), 'Inter Tight', system-ui, sans-serif",
  fontSize: 16,
  color: "#4E4475",
  lineHeight: 1.75,
  margin: "0 0 14px",
} as const;

/**
 * Shared shell for the legal pages: the editorial header (same language as
 * the home hero), a centred prose column on the lilac ground, and a join
 * button that leads to the signup in the home page footer.
 */
export function LegalChrome({
  children,
  lead,
  kicker,
  updated,
}: {
  children: React.ReactNode;
  lead: string;
  kicker: string;
  updated: string;
}) {
  return (
    <>
      <PageHero badge={`Last updated ${updated}`} lead={lead} kicker={kicker} />
      <EdBody>
        {children}
        <div className="ed-end" style={{ marginTop: 56 }}>
          <p className="ed-end-title">Ready when <span className="ed-em">you are.</span></p>
          <JoinCta />
        </div>
      </EdBody>
    </>
  );
}
