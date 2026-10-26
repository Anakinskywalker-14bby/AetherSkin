import type { Metadata } from "next";
import NewLanding from "@/components/NewLanding";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: "AetherSkin — Free AI Skin Analysis. Stop Guessing. Start Knowing.",
  description:
    "AI skin analysis that matches you with products from brands you already love. Join the free waitlist (500 beta spots, no card) and take a 3-minute skin quiz; scanning opens at beta launch.",
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
      <NewLanding />
    </>
  );
}
