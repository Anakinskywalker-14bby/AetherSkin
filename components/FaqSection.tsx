/**
 * FAQ section — plain semantic HTML (server component, no JS).
 *
 * Written for humans first; the structure happens to be exactly what AI
 * engines extract well: a direct question heading followed by a short,
 * self-contained answer. Paired with FAQPage schema in page.tsx.
 */

export const FAQS = [
  {
    q: "Is AetherSkin free?",
    a: "Yes. Joining the waitlist, taking the skin quiz, and getting your scan results at launch all cost nothing. There is no card field anywhere on this site. AetherSkin earns an affiliate commission when you buy a recommended product, which never changes your price.",
  },
  {
    q: "How does the AI skin analysis work?",
    a: "You take one photo. AetherSkin reads everyday characteristics from it — hydration, texture, visible pores, dark spots, fine lines and breakouts — then combines that with your quiz answers to build a skin profile and match you with suitable products.",
  },
  {
    q: "What happens after I enter my email?",
    a: "We send a confirmation email with a secure link. Opening that link confirms your address and takes you straight to a 13-question skin quiz that takes about two minutes. Your spot is locked once the quiz is done.",
  },
  {
    q: "Does AetherSkin store my photos?",
    a: "Face scans are not collected before launch. When scanning goes live it will require a separate, explicit consent step, your photo will not be used to train models without a distinct opt-in you can decline, and you will be able to delete it.",
  },
  {
    q: "Is AetherSkin medical advice?",
    a: "No. AetherSkin gives cosmetic and general wellness guidance to help you choose skincare. It is not a medical device and does not diagnose, treat, or cure any condition. For persistent, painful, or changing skin problems, see a qualified healthcare professional.",
  },
  {
    q: "Which brands does AetherSkin recommend?",
    a: "AetherSkin does not make its own products. It recommends items from established skincare brands and retailers you already know, chosen against your quiz answers and scan rather than against who pays the most.",
  },
  {
    q: "How do I delete my data?",
    a: "Ask us and we will delete it. Waitlist and quiz data is kept for up to 24 months after your last interaction, unverified signups are removed after 90 days, and verification links expire after 7 days.",
  },
] as const;

export function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="relative w-full"
      style={{ background: "#f4f4f2", borderBottom: "3px solid #1a1c1b" }}
    >
      <div className="max-w-[880px] mx-auto px-5 md:px-16 py-20 md:py-24">
        <div
          className="inline-block neo-border neo-shadow-sm px-4 py-2 mb-6"
          style={{
            background: "#beeaf8",
            transform: "rotate(-1.5deg)",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "1.4px",
            color: "#1a1c1b",
          }}
        >
          QUESTIONS
        </div>

        <h2
          id="faq-heading"
          style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontWeight: 800,
            fontSize: "clamp(32px, 4vw, 48px)",
            color: "#1a1c1b",
            letterSpacing: "-1px",
            lineHeight: 1.1,
            margin: "0 0 32px",
          }}
        >
          Straight answers.
        </h2>

        <dl className="flex flex-col gap-5">
          {FAQS.map((item) => (
            <div
              key={item.q}
              className="neo-border p-5 md:p-6"
              style={{ background: "#f9f9f7" }}
            >
              <dt
                style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 800,
                  fontSize: 19,
                  color: "#1a1c1b",
                  margin: "0 0 8px",
                  lineHeight: 1.3,
                }}
              >
                {item.q}
              </dt>
              <dd
                style={{
                  fontFamily: "'Work Sans', sans-serif",
                  fontSize: 16,
                  color: "#484739",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
