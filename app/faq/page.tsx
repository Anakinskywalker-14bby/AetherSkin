import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FaqSection, FAQS } from "@/components/FaqSection";
import SiteFooter from "@/components/footer/SiteFooter";
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
    <main style={{ background: "var(--surface)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQS)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      <SiteNav />
      <div className="max-w-[880px] mx-auto px-5 md:px-16 pt-28 md:pt-32">
        <Breadcrumbs items={crumbs} />
      </div>
      <FaqSection />
      <SiteFooter />
    </main>
  );
}
