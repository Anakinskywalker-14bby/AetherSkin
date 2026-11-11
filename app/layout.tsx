import type { Metadata, Viewport } from "next";
import { Manrope, Hanken_Grotesk, Inter_Tight, Playfair_Display } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SmoothScroll } from "@/components/SmoothScroll";
import { CookieBanner } from "@/components/CookieBanner";
import { ConditionalScripts } from "@/components/ConditionalScripts";
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

// The hero's type, shared by the editorial pages (components/PageHero):
// Inter Tight for text, Playfair Display italic for the accent words.
const edSans = Inter_Tight({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--ed-sans",
  display: "swap",
});
const edSerif = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["italic"],
  variable: "--ed-serif",
  display: "swap",
});

// <meta name="color-scheme" content="only light">: Android Chrome's auto dark
// mode and Samsung Internet's dark mode otherwise repaint the site in navy
// and maroon. The palette is designed for light only, on every device.
export const viewport: Viewport = {
  colorScheme: "only light",
  themeColor: "#EEEAF7",
  // Lets env(safe-area-inset-bottom) report the iPhone home-indicator inset,
  // so the phone join bar sits clear of it.
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | AI Skin Analysis. Stop Guessing. Start Knowing.`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, type: "website", locale: "en_US", images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "AetherSkin" }] },
  twitter: { card: "summary_large_image", images: ["/og-image.jpg"] },
  robots: { index: true, follow: true },
  // Commission Factory site verification (keep: they revalidate periodically).
  other: { "commission-factory-verification": "24560833f0b74de8b8c68bd974efe51f" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Light only. The `light` class keeps OS dark-mode extensions/UA styles off.
    <html
      lang="en"
      className={`light ${manrope.variable} ${hanken.variable} ${GeistSans.variable} ${edSans.variable} ${edSerif.variable}`}
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
        <ConditionalScripts />
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
