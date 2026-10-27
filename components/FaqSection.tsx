/**
 * FAQ section — plain semantic HTML (server component).
 *
 * Written for humans first; the structure happens to be exactly what AI
 * engines extract well: a direct question heading followed by a short,
 * self-contained answer. Paired with FAQPage schema in app/faq/page.tsx. Each answer is a native
 * <details>, so it collapses without JS and stays in the HTML for crawlers.
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
    a: "We send a confirmation email with a secure link. Opening that link confirms your address and takes you straight to a 17-question skin quiz that takes about three minutes. Every question is multiple choice or a number; there is nothing to write. Your spot is locked once the quiz is done.",
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
    <section id="faq" aria-label="Frequently asked questions" className="flex flex-col gap-4">
      {FAQS.map((item, i) => (
        <details key={item.q} className="faq-item ed-card" style={{ padding: 0 }}>
          <summary className="flex items-center justify-between gap-4 cursor-pointer" style={{ padding: "20px 24px" }}>
            <span className="flex items-baseline gap-4">
              <span className="faq-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="faq-q">{item.q}</span>
            </span>
            <span aria-hidden className="faq-chevron">+</span>
          </summary>
          <p style={{ fontSize: 16, lineHeight: 1.7, margin: 0, padding: "0 24px 22px 66px" }}>{item.a}</p>
        </details>
      ))}
    </section>
  );
}
