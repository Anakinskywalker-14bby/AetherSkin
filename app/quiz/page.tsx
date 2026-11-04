import type { Metadata } from "next";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { QuizForm } from "@/components/QuizForm";
import { QuizShell } from "@/components/QuizShell";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveQuizLink, type LinkState } from "@/lib/quiz-link";

export const metadata: Metadata = {
  title: "Your Skin Quiz",
  description:
    "Three minutes of questions so AetherSkin can match you with skincare that actually fits your skin.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Check the link before showing the quiz, so nobody answers twenty
 * questions on a link that has expired. If the check itself fails we still
 * show the quiz: POST /api/quiz enforces the same rules on submit.
 */
async function checkLink(token: string): Promise<LinkState["state"] | "unknown"> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return "unknown";
  try {
    return (await resolveQuizLink(createAdminClient(), token)).state;
  } catch (err) {
    Sentry.captureException(err, { tags: { route: "quiz-page" } });
    return "unknown";
  }
}

function LinkProblem({ badge, lead, kicker, body }: { badge: string; lead: string; kicker: string; body: string }) {
  return (
    <QuizShell badge={badge} lead={lead} kicker={kicker}>
      <div className="qz-card qz-center">
        <p className="qz-lede">{body}</p>
        <div className="qz-actions">
          <Link href="/#footer" className="qz-pill">Get a fresh link</Link>
        </div>
      </div>
    </QuizShell>
  );
}

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.slice(0, 128) : "";

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

  const state = await checkLink(token);
  if (state === "expired") {
    return (
      <LinkProblem
        badge="LINK EXPIRED"
        lead="This link has"
        kicker="expired."
        body="Quiz links work for 24 hours. Enter your email on the home page and we'll send you a fresh one straight away."
      />
    );
  }
  if (state === "invalid") {
    return (
      <LinkProblem
        badge="LINK NOT VALID"
        lead="This link has"
        kicker="already been used."
        body="Each quiz link works once. If you haven't finished the quiz yet, enter your email on the home page for a new link."
      />
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
