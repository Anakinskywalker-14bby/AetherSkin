import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // AI crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended)
        // are intentionally allowed so those engines can cite AetherSkin.
        userAgent: "*",
        allow: "/",
        // Private / single-use routes stay out of the index.
        disallow: ["/api/", "/quiz", "/verify", "/thank-you"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
