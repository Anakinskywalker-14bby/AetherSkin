import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LegalChrome, LegalContents, LegalList, LegalSection, pStyle } from "@/components/LegalChrome";
import { breadcrumbJsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms for using AetherSkin: the waitlist, what our recommendations are and aren't, eligibility, acceptable use, affiliate links, and liability.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service · AetherSkin",
    description: "The terms that govern using AetherSkin's AI skin analysis service.",
    url: "/terms",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "AetherSkin" }],
  },
};

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Terms of Service", path: "/terms" },
];

const SECTIONS = [
  { id: "acceptance", title: "Accepting these terms" },
  { id: "medical", title: "Not medical advice" },
  { id: "eligibility", title: "Eligibility and your details" },
  { id: "waitlist", title: "The waitlist and the beta" },
  { id: "use", title: "Acceptable use" },
  { id: "licence", title: "Your licence to use AetherSkin" },
  { id: "risk", title: "Recommendations and your own judgement" },
  { id: "affiliate", title: "Affiliate links" },
  { id: "pricing", title: "Pricing" },
  { id: "third-party", title: "Third-party products and links" },
  { id: "feedback", title: "Your feedback" },
  { id: "changes", title: "Changes to the service" },
  { id: "warranty", title: "No warranties" },
  { id: "liability", title: "Limitation of liability" },
  { id: "ending", title: "Ending your use" },
  { id: "general", title: "General" },
  { id: "contact", title: "Questions" },
] as const;
type Id = (typeof SECTIONS)[number]["id"];
const n = (id: Id) => SECTIONS.findIndex((s) => s.id === id) + 1;
const title = (id: Id) => SECTIONS[n(id) - 1].title;

export default function TermsPage() {
  return (
    <LegalChrome lead="The terms," kicker="kept short and fair." updated="November 4, 2026">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      <Breadcrumbs items={crumbs} />

      <p style={pStyle}>
        These Terms of Service are an agreement between you and AetherSkin
        (&ldquo;we&rdquo; or &ldquo;us&rdquo;) for your use of aetherskin.app,
        the waitlist, the skin quiz, our emails and, once it launches, the
        AetherSkin app (together, the &ldquo;Service&rdquo;).
      </p>

      <div className="ed-card ed-card--peach my-8">
        <p style={{ ...pStyle, margin: 0, color: "var(--ink)" }}>
          <strong>The short version:</strong> the waitlist is free. AetherSkin
          gives cosmetic suggestions, not medical advice. Some product links
          earn us a commission at no cost to you, and we label them. Be 18+,
          and don&apos;t abuse the service.
        </p>
      </div>

      <LegalContents items={[...SECTIONS]} />

      <LegalSection n={n("acceptance")} id="acceptance" title={title("acceptance")}>
        <p style={pStyle}>
          Please read these terms carefully. By joining the waitlist, taking
          the quiz or otherwise using the Service, you agree to them. If you
          don&apos;t agree, please don&apos;t use the Service.
        </p>
        <p style={pStyle}>
          We may update these terms as AetherSkin develops. If a change
          materially affects your rights, we will email you before it takes
          effect. Continuing to use the Service after that date means you
          accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection n={n("medical")} id="medical" title={title("medical")}>
        <p style={pStyle}>
          AetherSkin provides cosmetic and general wellness information to help
          you choose skincare products. It is not a medical device. It does not
          diagnose, treat, cure or prevent any condition, and it is not a
          substitute for a dermatologist or doctor. Our information is not
          comprehensive and does not cover every skin condition or treatment.
        </p>
        <p style={pStyle}>
          The skin quiz asks whether you take medication for skin concerns and
          whether you have ingredient allergies, but not about pregnancy or
          breastfeeding, and it can&apos;t know everything about your health.
          If any of these apply to you, check every product label and ask your
          doctor or pharmacist before using something we suggest.
        </p>
        <p style={pStyle}>
          If you have a persistent, painful, spreading or changing skin
          problem, see a qualified healthcare professional, and never delay
          seeking medical advice because of something AetherSkin suggested. If
          you think you have a medical emergency, call your local emergency
          number straight away.
        </p>
      </LegalSection>

      <LegalSection n={n("eligibility")} id="eligibility" title={title("eligibility")}>
        <p style={pStyle}>
          You must be 18 or older to use the Service. When you join, you agree
          to give us an email address that is yours and to keep your details
          accurate. One entry per person. We handle your details as described
          in our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection n={n("waitlist")} id="waitlist" title={title("waitlist")}>
        <p style={pStyle}>
          Joining the waitlist is free. You give us your email, confirm it, and
          answer a short skin quiz. Joining doesn&apos;t guarantee a launch
          date, a place in line, or any particular feature, and we may change,
          delay or cancel the beta.
        </p>
      </LegalSection>

      <LegalSection n={n("use")} id="use" title={title("use")}>
        <p style={pStyle}>
          You are responsible for how you use the Service and must follow the
          laws that apply to you. You agree not to:
        </p>
        <LegalList>
          <li>Submit someone else&apos;s email address or personal information.</li>
          <li>Probe, scan, overload, break or reverse-engineer the Service, or get around its security or rate limits.</li>
          <li>Use bots, scripts or other automated tools to create entries or collect data from the Service.</li>
          <li>Copy, resell, sublicense or build a competing product from the Service or its data.</li>
          <li>Use the Service to send spam or advertising, or for anything illegal.</li>
          <li>Upload anything that is unlawful, hateful, sexually explicit, or contains viruses or other harmful code.</li>
        </LegalList>
        <p style={pStyle}>
          If you do, we may remove your entry and block your access without
          notice.
        </p>
      </LegalSection>

      <LegalSection n={n("licence")} id="licence" title={title("licence")}>
        <p style={pStyle}>
          We give you a personal, non-exclusive, non-transferable, revocable
          licence to use the Service for your own non-commercial purposes under
          these terms. Everything else, including the AetherSkin name, logo,
          design, text and software, stays ours. To use our brand or content
          for anything else, ask us for written permission first.
        </p>
      </LegalSection>

      <LegalSection n={n("risk")} id="risk" title={title("risk")}>
        <p style={pStyle}>
          Our goal is to make good skincare information easier to find, but we
          can&apos;t guarantee results. Everyone&apos;s skin is different and
          can react differently to the same product. Our estimates and
          suggestions may not be accurate or complete, and AetherSkin is not
          intended to serve the purpose of a medical or scientific device. You
          use them at your own judgement: read ingredient lists, patch test new
          products, and stop using anything that irritates your skin.
        </p>
      </LegalSection>

      <LegalSection n={n("affiliate")} id="affiliate" title={title("affiliate")}>
        <p style={pStyle}>
          AetherSkin recommends products from third-party brands and retailers.
          Some links are affiliate links: if you buy through them, the brand or
          retailer may pay us a commission. This never changes the price you
          pay. Paid or sponsored placements are labelled and kept visually
          separate from recommendations generated by your quiz or scan.
        </p>
      </LegalSection>

      <LegalSection n={n("pricing")} id="pricing" title={title("pricing")}>
        <p style={pStyle}>
          The waitlist, the quiz and the beta are free, and we don&apos;t ask
          for payment details. If we ever offer paid features, we will show the
          price and the terms that apply before you pay, and nothing will be
          charged without your clear agreement.
        </p>
      </LegalSection>

      <LegalSection n={n("third-party")} id="third-party" title={title("third-party")}>
        <p style={pStyle}>
          The Service links to products, shops and websites run by other
          companies. We don&apos;t control them and aren&apos;t responsible for
          their products, prices, delivery, content or privacy practices. Your
          purchase is with the retailer, under their terms.
        </p>
      </LegalSection>

      <LegalSection n={n("feedback")} id="feedback" title={title("feedback")}>
        <p style={pStyle}>
          We love hearing from you. If you send us ideas or feedback, you agree
          we may use them to improve AetherSkin without owing you anything. We
          won&apos;t publish your name or personal details with them without
          asking.
        </p>
      </LegalSection>

      <LegalSection n={n("changes")} id="changes" title={title("changes")}>
        <p style={pStyle}>
          AetherSkin is pre-launch software, so it will change. We may add,
          change or remove features, or pause or stop all or part of the
          Service, at any time.
        </p>
      </LegalSection>

      <LegalSection n={n("warranty")} id="warranty" title={title("warranty")}>
        <p style={pStyle}>
          To the extent the law allows, the Service is provided &ldquo;as
          is&rdquo; and &ldquo;as available&rdquo;, without warranties of any
          kind. We don&apos;t promise that it will always be available, secure
          or error-free, or that it will meet your needs. Some places
          don&apos;t allow these exclusions, so they may not all apply to you.
        </p>
      </LegalSection>

      <LegalSection n={n("liability")} id="liability" title={title("liability")}>
        <p style={pStyle}>
          To the extent the law allows, we are not liable for any indirect,
          incidental, special or consequential loss, or for lost data, profits
          or opportunities, arising from your use of the Service or any product
          you choose to buy. Nothing in these terms limits rights you have
          under consumer law that can&apos;t be excluded, or our liability for
          anything that can&apos;t legally be limited.
        </p>
        <p style={pStyle}>
          You agree to cover any claims, losses and reasonable legal costs we
          incur because you broke these terms.
        </p>
      </LegalSection>

      <LegalSection n={n("ending")} id="ending" title={title("ending")}>
        <p style={pStyle}>
          You can leave at any time by asking us to delete your data. We may
          remove an entry, refuse service or change who can join if we need to,
          for example to stop abuse. Sections that by their nature should
          continue (such as warranties and liability) survive after you stop
          using the Service.
        </p>
      </LegalSection>

      <LegalSection n={n("general")} id="general" title={title("general")}>
        <p style={pStyle}>
          If a court finds part of these terms unenforceable, the rest still
          applies. If we don&apos;t enforce a term straight away, we haven&apos;t
          given up the right to do so later. These terms, together with our
          Privacy Policy, are the whole agreement between you and us about the
          Service.
        </p>
        <p style={pStyle}>
          <strong>Governing law.</strong> AetherSkin is based in Sydney. These
          terms are governed by the laws of New South Wales, Australia, and you
          and we submit to the non-exclusive jurisdiction of the courts of New
          South Wales. If you are a consumer, nothing in this clause takes away
          protections you have under the Australian Consumer Law or the
          consumer laws of the place where you live.
        </p>
      </LegalSection>

      <LegalSection n={n("contact")} id="contact" title={title("contact")}>
        <p style={pStyle}>
          A dedicated support address is being set up and will be published
          here. Until then, reply to any email you have received from
          AetherSkin to reach us with questions about these terms.
        </p>
      </LegalSection>

      <div className="ed-btns mt-12">
        <Link href="/" className="ed-btn ed-btn--white">
          Back home
        </Link>
        <Link href="/privacy" className="ed-btn ed-btn--peach">
          Privacy policy
        </Link>
      </div>
    </LegalChrome>
  );
}
