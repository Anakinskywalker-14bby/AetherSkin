import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LegalChrome, LegalContents, LegalList, LegalSection, h3Style, pStyle } from "@/components/LegalChrome";
import { breadcrumbJsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What data AetherSkin collects and why, the legal basis for each use, how long we keep it, who processes it, and how to use your rights.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy · AetherSkin",
    description: "What AetherSkin collects, why, how long we keep it, and how to delete it.",
    url: "/privacy",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "AetherSkin" }],
  },
};

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Privacy Policy", path: "/privacy" },
];

const SECTIONS = [
  { id: "collect", title: "What data we collect and why" },
  { id: "face-data", title: "Face scans (not collected yet)" },
  { id: "retention", title: "How long we keep your data" },
  { id: "rights", title: "Your data protection rights" },
  { id: "security", title: "How we protect your data" },
  { id: "children", title: "Children's privacy" },
  { id: "sharing", title: "Who we share data with" },
  { id: "cookies", title: "Cookies" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact us" },
] as const;
const n = (id: (typeof SECTIONS)[number]["id"]) => SECTIONS.findIndex((s) => s.id === id) + 1;
const title = (id: (typeof SECTIONS)[number]["id"]) => SECTIONS[n(id) - 1].title;

/** Every row is something the site actually collects today. */
const DATA_ROWS = [
  {
    data: "Your email address",
    how: "You give it to us when you join the waitlist",
    why: "To confirm your spot, tell you when the beta opens, and send occasional product updates. Every email has an unsubscribe link.",
    basis: "Your consent, given when you tick the box at signup (APP 3 and APP 7; Spam Act 2003 (Cth)). Unsubscribe any time",
  },
  {
    data: "A one-way hash of your IP address and browser user-agent",
    how: "Collected automatically at signup",
    why: "To block spam and abuse without storing your actual IP address.",
    basis: "Reasonably necessary to keep the Service secure (APP 3.2 and APP 11)",
  },
  {
    data: "Your skin quiz answers",
    note: "20 multiple-choice and number answers, plus two optional typed notes (medications, allergies); no name",
    how: "You give them to us in the quiz",
    why: "To build your skin profile and match you with products.",
    basis: "Your consent, because some answers are health information, which is sensitive information (APP 3.3). You can withdraw it at any time",
  },
  {
    data: "Quiz answers, with your email removed",
    how: "Derived from your quiz answers",
    why: "To train and test AetherSkin's own models and to see aggregate patterns that decide what we build first.",
    basis: "Your consent, as a secondary use you agreed to (APP 6.1(a)). Deleting your answers removes them from future training",
  },
  {
    data: "Error reports and masked session samples",
    note: "Page, browser and error message; all text, inputs and images masked",
    how: "Collected automatically when something breaks",
    why: "To find and fix bugs. Never recorded on the quiz, the confirmation page or your answers.",
    basis: "Reasonably necessary to run and secure the Service (APP 3.2 and APP 11)",
  },
  {
    data: "Your cookie-banner choice",
    how: "Stored on your own device",
    why: "So we don't ask you twice.",
    basis: "Needed to remember the choice you made; stays on your device",
  },
];

export default function PrivacyPage() {
  return (
    <LegalChrome lead="Your data," kicker="in plain English." updated="November 4, 2026">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      <Breadcrumbs items={crumbs} />

      <p style={pStyle}>
        This Privacy Policy explains how AetherSkin (&ldquo;we&rdquo; or
        &ldquo;us&rdquo;) collects, stores, uses and protects your personal
        data when you use aetherskin.app, the waitlist, the skin quiz and, once
        it launches, the AetherSkin app (together, the &ldquo;Service&rdquo;).
        It also explains your rights over that data, and we&apos;re happy to
        help you use them.
      </p>
      <p style={pStyle}>
        AetherSkin is based in Sydney, Australia. We handle personal
        information in line with the <em>Privacy Act 1988</em> (Cth) and the
        Australian Privacy Principles (APPs) and, for health information, the{" "}
        <em>Health Records and Information Privacy Act 2002</em> (NSW) where it
        applies. Our marketing emails follow the <em>Spam Act 2003</em> (Cth).
      </p>

      <div className="ed-card my-8">
        <p style={{ ...pStyle, margin: 0, color: "var(--ink)" }}>
          <strong>The short version:</strong> we collect your email and your
          skin quiz answers. No payment, no card details, no face photos yet.
          We don&apos;t sell your data or share it with advertisers. You can
          ask us to delete everything at any time and we will.
        </p>
      </div>

      <LegalContents items={[...SECTIONS]} />

      <LegalSection n={n("collect")} id="collect" title={title("collect")}>
        <p style={pStyle}>When you use the Service, we may collect the following data:</p>
        <div className="lg-table-wrap">
          <table className="lg-table">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">How we get it</th>
                <th scope="col">Why we use it</th>
                <th scope="col">Legal basis (Australia)</th>
              </tr>
            </thead>
            <tbody>
              {DATA_ROWS.map((r) => (
                <tr key={r.data}>
                  <td data-label="Data">
                    {r.data}
                    {r.note && <small>{r.note}</small>}
                  </td>
                  <td data-label="How we get it">{r.how}</td>
                  <td data-label="Why we use it">{r.why}</td>
                  <td data-label="Legal basis (Australia)">{r.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 style={h3Style}>What the quiz asks</h3>
        <p style={pStyle}>
          Your main skin goal, skin type, daily environment, preferred product
          texture, how often you wear sunscreen, your stress level over the
          past month, how complex your routine is, your age, your average hours
          of sleep, roughly how much water you drink, how often you have sugary
          foods, dairy, fruit and vegetables, and alcohol, and how much
          breakouts, redness and dryness you have right now. It also asks your
          gender, whether you take any medication for skin concerns, and
          whether you are allergic to specific active ingredients. If you say
          yes to the last two, you can list the medications or ingredients so
          our suggestions can take them into account. Those typed notes
          are used only for that purpose and are never part of the data we
          train our models on.
        </p>
        <p style={pStyle}>
          Your answers are stored separately from your email address, linked
          only by an internal ID. Some of them (stress, sleep, diet, alcohol,
          medication, allergies and your skin&apos;s current condition) say
          something about your health and wellbeing, so we treat them as
          sensitive data.
        </p>
        <h3 style={h3Style}>How our models use your answers</h3>
        <p style={pStyle}>
          One model estimates, from your habits, how likely you are to be prone
          to concerns such as breakouts, redness or dryness, and suggests
          product categories for a simple routine. Another looks across
          everyone&apos;s anonymised answers together to measure how habits
          like sleep and diet relate to skin, without looking at any one
          person. These estimates are cosmetic guidance, not a diagnosis. They
          shape the suggestions we show you and are never used for anything
          else, such as pricing or eligibility. Training data never includes
          your email address, and we don&apos;t give it to anyone else to train
          their models.
        </p>
      </LegalSection>

      <LegalSection n={n("face-data")} id="face-data" title={title("face-data")}>
        <p style={pStyle}>
          Photo scanning opens with the beta. Until then we collect no photos of
          your face (&ldquo;Face Data&rdquo;). When scanning launches, these are
          our standing commitments:
        </p>
        <LegalList>
          <li><strong>Consent every time.</strong> The app will ask before any photo is taken or uploaded. We never capture a photo without you actively taking it.</li>
          <li><strong>Used for your results.</strong> Your photo is analysed to score your skin concerns and tailor your recommendations.</li>
          <li><strong>Not shared.</strong> We will not sell Face Data or share it with advertisers or brands.</li>
          <li><strong>No training without a separate opt-in.</strong> We will only use photos to improve AetherSkin if you agree in a separate step you can decline, and you can withdraw that at any time.</li>
          <li><strong>Yours to delete.</strong> You will be able to delete your photos, and we will update this section with the exact retention period before scanning goes live.</li>
        </LegalList>
      </LegalSection>

      <LegalSection n={n("retention")} id="retention" title={title("retention")}>
        <p style={pStyle}>
          We keep personal data only as long as we need it for the purposes
          above, unless the law requires us to keep it longer or we need it to
          resolve a dispute.
        </p>
        <LegalList>
          <li>Waitlist and quiz data: while your entry is active and for up to 24 months after your last interaction with us, then deleted or irreversibly anonymised.</li>
          <li>Unverified signups (you never clicked the confirmation link): deleted after 90 days.</li>
          <li>Quiz links: work once and expire 24 hours after we email them.</li>
        </LegalList>
      </LegalSection>

      <LegalSection n={n("rights")} id="rights" title={title("rights")}>
        <p style={pStyle}>
          Under the Australian Privacy Principles you can ask to see and
          correct the personal information we hold about you. We also offer
          the extra choices below to everyone, wherever you live.
        </p>
        <LegalList>
          <li><strong>Access (APP 12).</strong> Ask what information we hold about you and get a copy, free of charge.</li>
          <li><strong>Correction (APP 13).</strong> Ask us to fix information that is wrong, out of date or incomplete.</li>
          <li><strong>Deletion.</strong> Ask us to erase your data. Deleting it ends your place on the waitlist.</li>
          <li><strong>Opt out of marketing (APP 7).</strong> Unsubscribe from any email with one click.</li>
          <li><strong>Withdraw consent.</strong> Ask us to stop using your quiz answers, including for training, at any time.</li>
          <li><strong>Stay anonymous.</strong> You can read the site without giving us anything (APP 2); we only need an email to hold your waitlist spot.</li>
          <li><strong>Portability.</strong> Get your data in a structured, machine-readable format.</li>
        </LegalList>
        <p style={pStyle}>
          To use any of these, contact us (see <a href="#contact">Contact us</a>)
          and describe your request in plain language. We aim to respond within
          30 days. We may ask you to confirm your identity, which is easiest if
          you write from the email address you signed up with. If we refuse a
          request, we will tell you why in writing and how to complain.
        </p>
        <h3 style={h3Style}>Complaints</h3>
        <p style={pStyle}>
          If you think we have mishandled your information, please contact us
          first and we will respond within 30 days. If you are not satisfied
          with our answer, you can complain to the Office of the Australian
          Information Commissioner (OAIC) at{" "}
          <a href="https://www.oaic.gov.au" rel="noopener noreferrer" target="_blank">oaic.gov.au</a>{" "}
          or on 1300 363 992. For health information handled in NSW, you can
          also contact the NSW Information and Privacy Commission at{" "}
          <a href="https://www.ipc.nsw.gov.au" rel="noopener noreferrer" target="_blank">ipc.nsw.gov.au</a>.
        </p>
      </LegalSection>

      <LegalSection n={n("security")} id="security" title={title("security")}>
        <p style={pStyle}>
          We take reasonable, appropriate measures to protect your data from
          loss, theft, misuse and unauthorised access, including:
        </p>
        <LegalList>
          <li>Encryption in transit (HTTPS) on every page, and encryption at rest by our database provider.</li>
          <li>Hashing your IP address instead of storing it, and keeping quiz answers apart from your email.</li>
          <li>Short-lived verification links, and error reports scrubbed of links, emails, cookies and request contents before they leave the site.</li>
          <li>Access to stored data limited to the people who run AetherSkin.</li>
        </LegalList>
        <p style={pStyle}>
          No system is perfectly secure, so we can&apos;t guarantee that data
          will never be intercepted. If a breach affects your data, we will act
          quickly to contain it, find the cause and fix it. If it is likely to
          cause you serious harm, we will notify you and the OAIC under the
          Notifiable Data Breaches scheme. To report a security issue, please
          contact us.
        </p>
      </LegalSection>

      <LegalSection n={n("children")} id="children" title={title("children")}>
        <p style={pStyle}>
          AetherSkin is for people aged 18 and over. We do not knowingly
          collect personal data from anyone under 18. If you believe a minor
          has given us data, contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection n={n("sharing")} id="sharing" title={title("sharing")}>
        <p style={pStyle}>
          We do not sell or rent personal data, and we do not share it with
          advertisers. We share it only with the service providers that run
          AetherSkin on our behalf, under agreements that protect it:
        </p>
        <LegalList>
          <li><strong>Supabase</strong> for database hosting.</li>
          <li><strong>Vercel</strong> for hosting the website.</li>
          <li><strong>Resend</strong> for delivering our emails.</li>
          <li><strong>Sentry</strong> for error monitoring, as described above.</li>
        </LegalList>
        <p style={pStyle}>
          <strong>Overseas disclosure (APP 8).</strong> These providers may
          store or process your information outside Australia, including in
          the United States. Before we disclose information overseas we take
          reasonable steps, such as contractual commitments, to make sure it is
          handled in line with the Australian Privacy Principles. We may also
          disclose data where the law requires it, to
          protect our rights, or to a successor if AetherSkin is merged or
          sold, in which case this policy continues to apply.
        </p>
        <p style={pStyle}>
          <strong>Aggregated data.</strong> We may combine answers from many
          people into anonymised statistics (for example, &ldquo;38% of our
          waitlist has combination skin&rdquo;) and share or publish them. They
          never include your email or individual answers, and we never try to
          re-identify anyone from them.
        </p>
      </LegalSection>

      <LegalSection n={n("cookies")} id="cookies" title={title("cookies")}>
        <p style={pStyle}>
          AetherSkin does not use advertising or tracking cookies. We store a
          single local preference recording your cookie-banner choice. If we
          add analytics later, it will only load after you opt in, and we will
          update this page first.
        </p>
      </LegalSection>

      <LegalSection n={n("changes")} id="changes" title={title("changes")}>
        <p style={pStyle}>
          We review this policy as AetherSkin grows and whenever the law
          changes. The latest version always lives on this page with its
          update date. If we make a material change, such as using your data
          for a new purpose, we will email you before it takes effect and, where
          the law requires, ask for your consent.
        </p>
      </LegalSection>

      <LegalSection n={n("contact")} id="contact" title={title("contact")}>
        <p style={pStyle}>
          A dedicated privacy address is being set up and will be published
          here. Until then, reply to any email you have received from
          AetherSkin to reach us, including for access and deletion requests.
        </p>
      </LegalSection>

      <div className="ed-btns mt-12">
        <Link href="/" className="ed-btn ed-btn--white">
          Back home
        </Link>
        <Link href="/terms" className="ed-btn ed-btn--peach">
          Terms of service
        </Link>
      </div>
    </LegalChrome>
  );
}
