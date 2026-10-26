import type { Metadata } from "next";
import Script from "next/script";
import { Manrope, Hanken_Grotesk } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SmoothScroll } from "@/components/SmoothScroll";
import { CookieBanner } from "@/components/CookieBanner";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — AI Skin Analysis. Stop Guessing. Start Knowing.`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Light only. The `light` class keeps OS dark-mode extensions/UA styles off.
    <html
      lang="en"
      className={`light ${manrope.variable} ${hanken.variable} ${GeistSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* Keyboard users can jump straight past the nav. */}
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SmoothScroll>
          <div id="main">{children}</div>
        </SmoothScroll>
        <CookieBanner />
        {/* Google Preferred Sources button library. */}
        <Script
          src="https://news.google.com/swg/js/v1/publisher.js"
          strategy="afterInteractive"
        />
        {/*
          Vercel Analytics is cookieless and stores no cross-site identifier,
          which is why the cookie banner is informational rather than a
          consent gate. Speed Insights reports Core Web Vitals only.
        */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
