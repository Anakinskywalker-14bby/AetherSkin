import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { breadcrumbJsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "AetherSkin is building AI skin analysis that ends the skincare guessing game — one scan, honest recommendations from brands you already love. Meet the mission.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Us · AetherSkin",
    description:
      "AetherSkin is building AI skin analysis that ends the skincare guessing game. Meet the mission.",
    url: "/about",
  },
};

const crumbs = [
  { name: "Home", path: "/" },
  { name: "About Us", path: "/about" },
];

export default function AboutPage() {
  return (
    <main className="relative min-h-screen" style={{ background: "#f9f9f7" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />

      {/* Top bar */}
      <nav
        className="flex items-center justify-between px-6 md:px-16 h-[72px]"
        style={{ background: "#f9f9f7", borderBottom: "3px solid #1a1c1b" }}
      >
        <Link href="/" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 900, fontStyle: "italic", fontSize: 24, letterSpacing: -1.2, color: "#1a1c1b" }}>
          AetherSkin
        </Link>
        <Link
          href="/#beta"
          className="neo-shadow-sm neo-border px-7 py-2.5"
          style={{ background: "#e8e883", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.7px", color: "#1a1c1b" }}
        >
          JOIN BETA
        </Link>
      </nav>

      <div className="max-w-[860px] mx-auto px-6 md:px-16 py-16">
        <Breadcrumbs items={crumbs} />

        <div className="relative">
          <span
            className="inline-block neo-border neo-shadow-sm px-4 py-2 mb-6"
            style={{ background: "#beeaf8", transform: "rotate(-2deg)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1.4px", color: "#1a1c1b" }}
          >
            THE MISSION
          </span>
        </div>

        <h1 style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 900, fontSize: "clamp(40px, 6vw, 64px)", color: "#1a1c1b", letterSpacing: "-2px", lineHeight: 1.05, margin: "0 0 24px" }}>
          Skincare shouldn&apos;t be
          <br />
          <span style={{ fontFamily: "'Epilogue', sans-serif", fontWeight: 400, fontStyle: "italic", color: "#cbcb6a" }}>a guessing game.</span>
        </h1>

        <div style={{ fontFamily: "'Work Sans', sans-serif", fontSize: 18, color: "#484739", lineHeight: 1.75 }}>
          <p style={{ margin: "0 0 20px" }}>
            Most people build their routine from ads, trends, and whatever a
            friend swears by. The result: cabinets full of half-used products
            and skin that never quite gets what it needs. AetherSkin exists to
            replace that guesswork with a single, honest starting point — a
            scan of your own skin.
          </p>
          <p style={{ margin: "0 0 20px" }}>
            Take one photo, and AetherSkin&apos;s AI reads what your skin is
            actually doing — hydration, texture, and the everyday concerns
            everyone has up close. Then, instead of selling you our own
            products, we match you with ones that fit —{" "}
            <strong style={{ color: "#1a1c1b" }}>
              from brands you already know and love
            </strong>
            . When you buy through our links, the brand may pay us a
            commission. It never changes your price, and we&apos;ll always
            label it clearly.
          </p>
          <p style={{ margin: "0 0 20px" }}>
            We&apos;re starting small on purpose: 500 beta spots, a refundable
            $1 deposit to keep the list real, and a promise to build the
            product with early users rather than at them.
          </p>
        </div>

        {/* Value cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
          {[
            { title: "Honest by design", body: "Recommendations are matched to your scan — sponsored placements will always be labeled.", color: "#e8e883" },
            { title: "Privacy first", body: "Your face is analyzed, not collected. We never sell personal data.", color: "#beeaf8" },
            { title: "For every face", body: "Built to work across all skin tones and types. Skincare has no gender.", color: "#f9f9f7" },
          ].map((c) => (
            <div key={c.title} className="neo-shadow-sm neo-border p-6" style={{ background: c.color }}>
              <h2 style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 20, color: "#1a1c1b", margin: "0 0 8px" }}>{c.title}</h2>
              <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: 15, color: "#484739", lineHeight: 1.6, margin: 0 }}>{c.body}</p>
            </div>
          ))}
        </div>

        {/* Internal links */}
        <div className="flex flex-wrap gap-4 mb-16">
          <Link href="/#beta" className="neo-shadow neo-border px-8 py-4" style={{ background: "#e8e883", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.9px", color: "#1a1c1b" }}>
            JOIN THE BETA →
          </Link>
          <Link href="/#solution" className="neo-shadow neo-border px-8 py-4" style={{ background: "#f9f9f7", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.9px", color: "#1a1c1b" }}>
            HOW IT WORKS
          </Link>
          <Link href="/legal" className="neo-shadow neo-border px-8 py-4" style={{ background: "#beeaf8", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.9px", color: "#1a1c1b" }}>
            PRIVACY &amp; TERMS
          </Link>
        </div>

        {/* Preferred source deeplink */}
        <div className="neo-border p-6" style={{ background: "#f4f4f2" }}>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1.2px", color: "#1a1c1b", textTransform: "uppercase", margin: "0 0 8px" }}>
            Follow AetherSkin on Google
          </p>
          <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: 15, color: "#484739", lineHeight: 1.6, margin: "0 0 12px" }}>
            Add AetherSkin as a preferred source so our updates surface for you in
            Google Search.
          </p>
          <div google-add-preferred-source-btn="" />
        </div>
      </div>
    </main>
  );
}
