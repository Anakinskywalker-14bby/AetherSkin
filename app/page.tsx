import type { Metadata } from "next";
import NewLanding from "@/components/NewLanding";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/site";

export const metadata: Metadata = {
  // The tab and the social-share title both read just the brand. The share
  // image is a screenshot of the live hero (public/og-image.jpg).
  title: { absolute: "AetherSkin" },
  description:
    "Skin analysis that matches you with products from brands you already love. Join the free waitlist (beta spots are open) and take a 3-minute skin quiz; scanning opens at beta launch.",
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "AetherSkin",
    type: "website",
    title: "AetherSkin",
    description:
      "Skin analysis that matches you with skincare from brands you already love. Join the free waitlist; scanning opens at beta launch.",
    url: "/",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "AetherSkin: stop guessing, start knowing your skin." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AetherSkin",
    images: ["/og-image.jpg"],
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
