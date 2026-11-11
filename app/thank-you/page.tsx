import type { Metadata } from "next";
import Link from "next/link";
import { QuizShell } from "@/components/QuizShell";
import Confetti from "@/components/Confetti";

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
    <QuizShell badge="CONFIRMED" lead="Thank you," kicker="you're on the list.">
      {/* A burst of confetti on arrival (skipped for reduced motion). */}
      <Confetti />
      <div className="qz-card qz-center">
        <p className="qz-lede">
          You&apos;ve successfully joined the AetherSkin waitlist and your skin
          profile is saved. We&apos;ve also sent you an email with your place
          in line. We&apos;ll email you again the moment your first scan is ready.
        </p>

        {position && (
          <div className="qz-place">
            <p className="qz-eyebrow">Your place on the waitlist</p>
            <p className="qz-place-n">#{position}</p>
          </div>
        )}

        <div className="qz-actions">
          <Link href="/" className="qz-pill">Back home</Link>
          <Link href="/about" className="qz-btn">About AetherSkin</Link>
        </div>
      </div>
    </QuizShell>
  );
}
