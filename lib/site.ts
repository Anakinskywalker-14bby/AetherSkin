/** Single source of truth for site identity + structured data. */

/**
 * Canonical origin. Must be a hostname that actually serves this build —
 * a canonical tag pointing at a different deployment tells Google to index
 * that one instead. See the note in .env.production.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://aetherskin.app";

export const SITE_NAME = "AetherSkin";

export const SITE_DESCRIPTION =
  "Free AI skin analysis. One scan matches you with skincare from brands you already love. No payment — join the beta.";

/** Organization schema — used on the homepage. */
export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description: SITE_DESCRIPTION,
};

/** WebSite schema — used on the homepage. */
export const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
};

/**
 * FAQPage schema. Mirrors the visible FAQ exactly — schema that doesn't
 * match on-page content violates Google's structured-data guidelines.
 */
export function faqJsonLd(faqs: readonly { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** BreadcrumbList schema for subpages. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
