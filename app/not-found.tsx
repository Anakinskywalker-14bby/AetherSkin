import Link from "next/link";

export const metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: "#f9f9f7" }}
    >
      {/* dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at center, rgba(26,28,27,0.12) 1.2px, transparent 1.4px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative neo-shadow neo-border p-10 md:p-16 text-center max-w-lg" style={{ background: "#f9f9f7" }}>
        <div
          className="absolute neo-shadow-sm neo-border px-5 py-2.5"
          style={{ background: "#ffdad6", top: -24, left: -18, transform: "rotate(-4deg)", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "1px", color: "#93000a" }}
        >
          LOST?
        </div>

        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 900, fontSize: "clamp(80px, 16vw, 140px)", color: "#1a1c1b", letterSpacing: "-6px", lineHeight: 1, margin: 0 }}>
          404
        </p>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontStyle: "italic", fontSize: 26, color: "#1a1c1b", margin: "16px 0 8px" }}>
          this page ghosted you.
        </p>
        <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 400, fontSize: 16, color: "#484739", lineHeight: 1.6, margin: "0 0 32px" }}>
          The page you&apos;re looking for doesn&apos;t exist or moved.
          Your skin, however, still deserves answers.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="neo-shadow neo-border px-8 py-4"
            style={{ background: "#e8e883", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.9px", color: "#1a1c1b" }}
          >
            BACK HOME
          </Link>
          <Link
            href="/#beta"
            className="neo-shadow neo-border px-8 py-4"
            style={{ background: "#beeaf8", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.9px", color: "#1a1c1b" }}
          >
            JOIN THE BETA
          </Link>
        </div>
      </div>
    </main>
  );
}
