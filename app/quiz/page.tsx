import type { Metadata } from "next";
import Link from "next/link";
import { QuizForm } from "@/components/QuizForm";

export const metadata: Metadata = {
  title: "Your Skin Quiz",
  description:
    "Two minutes of questions so AetherSkin can match you with skincare that actually fits your skin.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <main className="min-h-screen" style={{ background: "#f9f9f7" }}>
      <nav
        className="flex items-center justify-between px-6 md:px-16 h-[72px]"
        style={{ background: "#f9f9f7", borderBottom: "3px solid #1a1c1b" }}
      >
        <Link href="/" aria-label="AetherSkin home" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 900, fontStyle: "italic", fontSize: 24, letterSpacing: -1.2, color: "#1a1c1b" }}>
          AetherSkin
        </Link>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1.2px", color: "#484739", textTransform: "uppercase" }}>
          Skin Quiz
        </span>
      </nav>

      <div className="max-w-[720px] mx-auto px-5 md:px-8 py-12 md:py-16">
        {!token ? (
          <div className="neo-shadow neo-border p-8 md:p-12 text-center" style={{ background: "#f9f9f7" }}>
            <span
              className="inline-block neo-border neo-shadow-sm px-4 py-2 mb-6"
              style={{ background: "#ffdad6", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1px", color: "#93000a" }}
            >
              LINK REQUIRED
            </span>
            <h1 style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 900, fontSize: "clamp(28px,5vw,40px)", color: "#1a1c1b", margin: "0 0 16px", lineHeight: 1.15 }}>
              Check your inbox to start.
            </h1>
            <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: 16, color: "#484739", lineHeight: 1.7, margin: "0 0 28px" }}>
              The quiz opens from the confirmation link we email you. It keeps
              your answers tied to the right person and stops spam entries.
            </p>
            <Link
              href="/#beta"
              className="neo-shadow neo-border px-8 py-4 inline-block"
              style={{ background: "#e8e883", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.9px", color: "#1a1c1b" }}
            >
              JOIN THE WAITLIST
            </Link>
          </div>
        ) : (
          <>
            <span
              className="inline-block neo-border neo-shadow-sm px-4 py-2 mb-6"
              style={{ background: "#beeaf8", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1.4px", color: "#1a1c1b" }}
            >
              EMAIL CONFIRMED
            </span>
            <h1 style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 900, fontSize: "clamp(32px,6vw,52px)", color: "#1a1c1b", letterSpacing: "-1.5px", lineHeight: 1.05, margin: "0 0 12px" }}>
              Let&apos;s read your skin.
            </h1>
            <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: 17, color: "#484739", lineHeight: 1.7, margin: "0 0 32px" }}>
              About two minutes. Answer honestly, not aspirationally. Your
              answers shape every recommendation you get.
            </p>
            <QuizForm token={token} />
            <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: 13, color: "#484739", lineHeight: 1.6, margin: "20px 0 0" }}>
              AetherSkin gives cosmetic and wellness guidance, not medical advice.
              See our{" "}
              <Link href="/privacy" style={{ color: "#1a1c1b", fontWeight: 700, textDecoration: "underline" }}>
                Privacy Policy
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </main>
  );
}
