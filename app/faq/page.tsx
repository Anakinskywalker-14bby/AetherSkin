import type { Metadata } from "next";
import { JoinCta } from "@/components/JoinCta";
import { PageHero, EdBody } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FaqSection, FAQS } from "@/components/FaqSection";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Straight answers about AetherSkin: what it costs (nothing), how the AI skin analysis works, what happens after you sign up, and how your data is handled.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "FAQ · AetherSkin",
    description: "Straight answers about AetherSkin's free AI skin analysis and waitlist.",
    url: "/faq",
  },
};

const crumbs = [
  { name: "Home", path: "/" },
  { name: "FAQ", path: "/faq" },
];

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQS)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      <PageHero
        badge="Questions"
        lead="Straight"
        kicker="answers."
        note="What AetherSkin costs (nothing), how the analysis works, and what happens to your data."
        caption="is it working?"
        photo="/problem/polaroid-frown.jpg"
      />
      <EdBody>
        <Breadcrumbs items={crumbs} />
        <FaqSection />
        <div className="ed-end">
          <p className="ed-end-title">Still curious? <span className="ed-em">Try it free.</span></p>
          <JoinCta />
        </div>
      </EdBody>
    </>
  );
}
