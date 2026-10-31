import type { Metadata } from "next";
import Link from "next/link";
import { QuizForm } from "@/components/QuizForm";
import { QuizShell } from "@/components/QuizShell";

export const metadata: Metadata = {
  title: "Your Skin Quiz",
  description:
    "Three minutes of questions so AetherSkin can match you with skincare that actually fits your skin.",
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

  if (!token) {
    return (
      <QuizShell badge="LINK REQUIRED" lead="Check your inbox" kicker="to start.">
        <div className="qz-card qz-center">
          <p className="qz-lede">
            The quiz opens from the confirmation link we email you. It keeps
            your answers tied to the right person and stops spam entries.
          </p>
          <div className="qz-actions">
            <Link href="/#footer" className="qz-pill">Join the free beta</Link>
          </div>
        </div>
      </QuizShell>
    );
  }

  return (
    <QuizShell badge="EMAIL CONFIRMED" lead="Let's read" kicker="your skin.">
      <p className="qz-lede qz-lede--gap">
        Answer honestly, not aspirationally. Your answers shape every
        recommendation you get.
      </p>
      <QuizForm token={token} />
      <p className="qz-small qz-foot">
        AetherSkin gives cosmetic and wellness guidance, not medical advice.
        See our <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </QuizShell>
  );
}
