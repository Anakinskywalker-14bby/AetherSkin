import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "You're on the list",
  description: "Your AetherSkin beta spot is confirmed and your skin profile is saved.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ position?: string }>;
}) {
  const params = await searchParams;
  const raw = params.position ?? "";
  const position = /^\d{1,7}$/.test(raw) ? raw : null;

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center px-5 overflow-hidden"
      style={{ background: "#f9f9f7" }}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, rgba(26,28,27,0.12) 1.2px, transparent 1.4px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative neo-shadow neo-border p-8 md:p-14 text-center w-full max-w-lg" style={{ background: "#f9f9f7" }}>
        <div
          className="absolute neo-shadow-sm neo-border px-5 py-2.5"
          style={{ background: "#e8e883", top: -24, left: -14, transform: "rotate(-4deg)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1px", color: "#1a1c1b" }}
        >
          CONFIRMED
        </div>

        <h1 style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 900, fontSize: "clamp(34px,6vw,52px)", color: "#1a1c1b", letterSpacing: "-1.5px", lineHeight: 1.05, margin: "8px 0 16px" }}>
          You&apos;re on the list.
        </h1>
        <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: 17, color: "#484739", lineHeight: 1.7, margin: "0 0 8px" }}>
          Your skin profile is saved. We&apos;ll email you the moment your
          first scan is ready.
        </p>

        {position && (
          <div className="neo-border px-6 py-5 mt-8" style={{ background: "#beeaf8" }}>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "1.5px", color: "#1a1c1b", textTransform: "uppercase", margin: 0 }}>
              Your place in line
            </p>
            <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 900, fontSize: 56, color: "#1a1c1b", lineHeight: 1, margin: "4px 0 0" }}>
              #{position}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Link
            href="/"
            className="neo-shadow neo-border px-8 py-4"
            style={{ background: "#e8e883", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.9px", color: "#1a1c1b" }}
          >
            BACK HOME
          </Link>
          <Link
            href="/about"
            className="neo-shadow neo-border px-8 py-4"
            style={{ background: "#beeaf8", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.9px", color: "#1a1c1b" }}
          >
            ABOUT AETHERSKIN
          </Link>
        </div>
      </div>
    </main>
  );
}
