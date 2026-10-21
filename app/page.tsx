import type { Metadata } from "next";
import NewLanding from "@/components/NewLanding";
import { FaqSection, FAQS } from "@/components/FaqSection";
import { organizationJsonLd, webSiteJsonLd, faqJsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: "AetherSkin — Free AI Skin Analysis. Stop Guessing. Start Knowing.",
  description:
    "AI skin analysis that matches you with products from brands you already love. Join the free waitlist (500 beta spots, no card) and take a 2-minute skin quiz; scanning opens at beta launch.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AetherSkin — Free AI Skin Analysis. Stop Guessing. Start Knowing.",
    description:
      "AI skin analysis that matches you with skincare from brands you already love. Join the free waitlist; scanning opens at beta launch.",
    url: "/",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQS)) }}
      />
      <NewLanding faq={<FaqSection />} />
    </>
  );
}
