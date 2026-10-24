import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LegalChrome, h2Style, h3Style, pStyle } from "@/components/LegalChrome";
import { breadcrumbJsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What data AetherSkin collects, how we use it, how long we keep it, and how to delete it. Plain English, no legalese padding.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy · AetherSkin",
    description: "What AetherSkin collects, how we use it, and how to delete it.",
    url: "/privacy",
  },
};

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Privacy Policy", path: "/privacy" },
];

export default function PrivacyPage() {
  return (
    <LegalChrome>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      <Breadcrumbs items={crumbs} />

      <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 900, fontSize: "clamp(34px, 5vw, 52px)", color: "var(--ink)", letterSpacing: "-1.5px", lineHeight: 1.1, margin: "0 0 8px" }}>
        Privacy Policy
      </h1>
      <p style={{ ...pStyle, fontSize: 14 }}>Last updated: October 21, 2026</p>

      <div className="on-soft neo-border p-5 my-8" style={{ background: "var(--blue)" }}>
        <p style={{ ...pStyle, margin: 0, color: "var(--ink)" }}>
          <strong>The short version:</strong> we collect your email and your
          skin quiz answers. That&apos;s it. No payment, no card details. We
          don&apos;t sell your data. You can ask us to delete everything at any
          time and we will.
        </p>
      </div>

      <h2 style={h2Style}>What we collect</h2>
      <h3 style={h3Style}>When you join the waitlist</h3>
      <p style={pStyle}>
        Your email address, and a one-way hash of your IP address plus your
        browser&apos;s user-agent string. The hash lets us block spam and abuse
        without storing your actual IP address.
      </p>
      <h3 style={h3Style}>When you complete the skin quiz</h3>
      <p style={pStyle}>
        Seventeen multiple-choice and number answers: your main skin goal,
        skin type, daily environment, preferred product texture, how often you
        wear sunscreen, your stress level over the past month, how complex your
        routine is, your age, your average hours of sleep, roughly how much
        water you drink, how often you have sugary foods, dairy, fruit and
        vegetables, and alcohol, and how much breakouts, redness and dryness
        you have right now. There are no free-text fields, and we don&apos;t
        ask for your name.
      </p>
      <p style={pStyle}>
        Your quiz answers are stored separately from your email address, linked
        only by an internal ID. Some of them (stress, sleep, diet, alcohol and
        your skin&apos;s current condition) say something about your health
        and wellbeing, so we treat them as sensitive: we do not sell them and
        we do not share them with advertisers.
      </p>

      <h2 style={h2Style}>What we do with it</h2>
      <p style={pStyle}>
        We use your email to confirm your spot, tell you when your scan is
        ready, and send occasional product updates. We use your quiz answers to
        build your skin profile and match you with products. We use aggregate,
        de-identified patterns (for example, &ldquo;38% of our waitlist has
        combination skin&rdquo;) to decide what to build first.
      </p>
      <p style={pStyle}>
        We also use quiz answers to train and test AetherSkin&apos;s own
        machine-learning models. One estimates, from your habits, how likely
        you are to be prone to skin concerns such as breakouts, redness or
        dryness, and suggests product categories for a simple routine. The
        other looks across everyone&apos;s anonymised answers together to
        measure how habits like sleep and diet relate to skin, without
        looking at any one person. These estimates are cosmetic guidance, not
        a diagnosis; they shape the suggestions we show you and are not used
        for anything else, such as pricing or eligibility. Training data never
        includes your email address, and we don&apos;t give it to anyone else
        to train their models. You can ask us to delete your answers at any
        time, and we will remove them from future training.
      </p>
      <p style={pStyle}>
        We share data only with the vendors that run AetherSkin: Supabase (database
        hosting), Vercel (site hosting), Resend (email delivery), and Sentry
        (error monitoring). They process data on our behalf under their own
        terms. We do not sell or rent personal information to anyone.
      </p>
      <p style={pStyle}>
        Sentry receives technical details when something on the site breaks,
        such as the page, browser and error message, so we can fix it. On the
        main pages it may also record a sample of anonymised sessions, with all
        text, form inputs and images masked. It never records the quiz, the
        email confirmation page or your answers, and we strip verification
        links, email addresses, cookies and request contents before anything
        is sent.
      </p>

      <h2 style={h2Style}>How long we keep it</h2>
      <p style={pStyle}>
        Waitlist and quiz data is kept while your entry is active and for up to
        24 months after your last interaction with us, after which it is
        deleted or irreversibly anonymized. Unverified signups (where you never
        clicked the confirmation link) are deleted after 90 days. Verification
        links themselves expire after 7 days.
      </p>

      <h2 style={h2Style}>Future scan data</h2>
      <p style={pStyle}>
        Face scans are not collected today. When the AetherSkin app launches, scans
        will be governed by a separate, explicit consent step shown before any
        photo is taken. Our standing commitments: your photo is used to
        generate your results, we will not use it to train models without a
        separate opt-in you can decline, and you will be able to delete it.
      </p>

      <h2 style={h2Style}>Your rights</h2>
      <p style={pStyle}>
        You can ask us to show you your data, correct it, or delete it, and you
        can withdraw consent or unsubscribe at any time using the link in any
        email we send. Depending on where you live (for example the UK, EU,
        California, or Australia) you may have additional rights including data
        portability and the right to complain to your local regulator. We
        honour these requests regardless of where you live.
      </p>

      <h2 style={h2Style}>Cookies</h2>
      <p style={pStyle}>
        AetherSkin does not use advertising or tracking cookies. We store a single
        local preference recording your cookie-banner choice so we don&apos;t
        ask you twice. If we add analytics later, it will only load after you
        opt in, and this page will be updated first.
      </p>

      <h2 style={h2Style}>Children</h2>
      <p style={pStyle}>
        AetherSkin is intended for people 18 and over. We do not knowingly collect
        information from children. If you believe a minor has given us data,
        contact us and we will delete it.
      </p>

      <h2 style={h2Style}>Contact &amp; changes</h2>
      <p style={pStyle}>
        A dedicated support address is being set up and will be published here.
        In the meantime you can reply to any email you receive from AetherSkin to
        reach us, including for access or deletion requests. If we change this
        policy materially, we will say so by email before the change takes
        effect.
      </p>

      <div className="flex flex-wrap gap-4 mt-12">
        <Link href="/" className="neo-shadow neo-border px-8 py-4" style={{ background: "var(--surface)", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.9px", color: "var(--ink)" }}>
          BACK HOME
        </Link>
        <Link href="/terms" className="on-soft neo-shadow neo-border px-8 py-4" style={{ background: "var(--blue)", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.9px", color: "var(--ink)" }}>
          TERMS OF SERVICE
        </Link>
      </div>
    </LegalChrome>
  );
}
