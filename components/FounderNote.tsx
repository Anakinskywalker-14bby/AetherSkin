import { FOUNDER_NOTE } from "@/lib/founder-note";

/**
 * A short note from the founder: why AetherSkin exists and why it beats
 * following social-media trends (personal to you, and the brands in one spot).
 * Text only, by the owner's choice (no photo). The words live in
 * lib/founder-note.ts and are shared with the About page and the email.
 *
 * `cta` is the button under the signature: the landing page passes nothing
 * (a link to #beta, which opens the signup popup); the About page passes its
 * own join form.
 */
export default function FounderNote({ cta, bare }: { cta?: React.ReactNode; bare?: boolean }) {
  const n = FOUNDER_NOTE;
  return (
    <section id="founder" className={bare ? "fn fn--bare" : "fn"} aria-labelledby="founder-heading">
      <div className="fn-card">
        <p className="fn-kicker">{n.kicker}</p>
        <h2 id="founder-heading" className="fn-title">
          {n.titleLead} <em>{n.titleBrand}</em>
        </h2>
        <div className="fn-body">
          {n.paragraphs.map((segments, i) => (
            <p key={i}>
              {segments.map((s, j) => (s.b ? <strong key={j}>{s.t}</strong> : <span key={j}>{s.t}</span>))}
            </p>
          ))}
        </div>
        <p className="fn-sign">
          <span>{n.name}</span>
          {n.role}
        </p>
        {cta ?? <a href="#beta" className="fn-btn">Join the waitlist</a>}
      </div>
    </section>
  );
}
