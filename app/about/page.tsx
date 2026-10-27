import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero, EdBody } from "@/components/PageHero";
import { JoinCta } from "@/components/JoinCta";
import { breadcrumbJsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "AetherSkin is building AI skin analysis that ends the skincare guessing game — one scan, honest recommendations from brands you already love. Meet the mission.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Us · AetherSkin",
    description:
      "AetherSkin is building AI skin analysis that ends the skincare guessing game. Meet the mission.",
    url: "/about",
  },
};

const crumbs = [
  { name: "Home", path: "/" },
  { name: "About Us", path: "/about" },
];

const VALUES = [
  { title: "Honest by design", body: "Recommendations are matched to your scan — sponsored placements will always be labeled.", tone: "ed-card--peach" },
  { title: "Privacy first", body: "No face photos are collected before launch. Scanning will need your separate consent, and you'll be able to delete your photo. We never sell personal data.", tone: "ed-card--lilac" },
  { title: "For every face", body: "Built to work across all skin tones and types. Skincare has no gender.", tone: "" },
];

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      <PageHero
        badge="The mission"
        lead="Skincare shouldn't be"
        kicker="a guessing game."
        note="One scan, honest recommendations, from brands you already love."
        caption="your skin, decoded"
      />
      <EdBody>
        <Breadcrumbs items={crumbs} />

        <span className="ed-kicker">Why we exist</span>
        <div className="ed-lede" style={{ marginTop: 22 }}>
          <p style={{ margin: "0 0 20px" }}>
            Most people build their routine from ads, trends, and whatever a
            friend swears by. The result: cabinets full of half-used products
            and skin that never quite gets what it needs. AetherSkin exists to
            replace that guesswork with a single, honest starting point — a
            scan of your own skin.
          </p>
          <p style={{ margin: "0 0 20px" }}>
            Take one photo, and AetherSkin&apos;s AI reads what your skin is
            actually doing — hydration, texture, and the everyday concerns
            everyone has up close. Then, instead of selling you our own
            products, we match you with ones that fit —{" "}
            <strong>from brands you already know and love</strong>. When you buy
            through our links, the brand may pay us a commission. It never
            changes your price, and we&apos;ll always label it clearly.
          </p>
          <p style={{ margin: 0 }}>
            We&apos;re starting small on purpose: 500 beta spots, free, with no
            card or deposit, and a promise to build the product with early
            users rather than at them.
          </p>
        </div>

        <h2 style={{ fontSize: "clamp(28px,3vw,40px)", margin: "56px 0 24px", lineHeight: 1.1 }}>
          What we <span className="ed-em">stand for</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {VALUES.map((v) => (
            <div key={v.title} className={`ed-card ${v.tone}`}>
              <h2 style={{ fontSize: 20, margin: "0 0 10px" }}>{v.title}</h2>
              <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0 }}>{v.body}</p>
            </div>
          ))}
        </div>

        <div className="ed-end" style={{ margin: "56px 0" }}>
          <p className="ed-end-title">Be one of the first <span className="ed-em">500.</span></p>
          <JoinCta />
          <div className="ed-btns" style={{ marginTop: 18 }}>
            <Link href="/#solution" className="ed-btn ed-btn--white">How it works</Link>
            <Link href="/privacy" className="ed-btn ed-btn--white">Privacy &amp; terms</Link>
          </div>
        </div>

        <div className="ed-card">
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 8px", color: "#3B2F5C" }}>
            Follow AetherSkin on Google
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.6, margin: "0 0 12px" }}>
            Add AetherSkin as a preferred source so our updates surface for you in
            Google Search.
          </p>
          <div google-add-preferred-source-btn="" />
        </div>
      </EdBody>
    </>
  );
}
