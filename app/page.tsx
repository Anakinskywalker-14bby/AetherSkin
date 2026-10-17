import type { Metadata } from "next";
import NewLanding from "@/components/NewLanding";
import { FaqSection, FAQS } from "@/components/FaqSection";
import { organizationJsonLd, webSiteJsonLd, faqJsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: "AetherSkin — Free AI Skin Analysis. Stop Guessing. Start Knowing.",
  description:
    "One free scan. AetherSkin's AI reads your skin and matches you with products from brands you already love. No payment, no card — join the beta, only 500 spots.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AetherSkin — Free AI Skin Analysis. Stop Guessing. Start Knowing.",
    description:
      "One free scan. AetherSkin's AI reads your skin and matches you with skincare from brands you already love. Join the beta.",
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
