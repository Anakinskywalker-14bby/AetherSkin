/**
 * Three steps from "interested" to "on the list". Says plainly what happens
 * today (email, quiz) and what comes later (the selfie scan at beta launch).
 */
const STEPS = [
  {
    n: "1",
    title: "Join with your email",
    body: "It takes ten seconds. We send you one link to confirm it's really you.",
  },
  {
    n: "2",
    title: "Take the 3-minute quiz",
    body: "Open the link in your inbox and tell us about your skin, your habits and your routine. The link lasts 24 hours.",
  },
  {
    n: "3",
    title: "Hold your beta spot",
    body: "You get your place in line by email. When the beta opens, one selfie turns your answers into a routine built around you.",
  },
] as const;

export default function HowItWorks() {
  return (
    <section id="how" className="hw on-soft" aria-labelledby="how-heading">
      <div className="hw-inner">
        <p className="hw-kicker">How it works</p>
        <h2 id="how-heading" className="hw-title">
          From guessing to knowing, <em>in three steps</em>
        </h2>
        <ol className="hw-steps">
          {STEPS.map((s) => (
            <li key={s.n} className="hw-step">
              <span className="hw-n" aria-hidden="true">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="hw-cta">
          <a href="#beta" className="hw-btn">Join the waitlist</a>
          <span className="hw-open">Beta spots are open.</span>
        </div>
      </div>
    </section>
  );
}
