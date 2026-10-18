"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  QUIZ_QUESTIONS,
  AGE_BANDS,
  GENDERS,
} from "@/lib/validation/quiz";

/**
 * The skin quiz. Reachable only from the emailed verification link, so the
 * token travels with the submission and acts as authorization.
 * One question per step: fewer abandons than a 14-field wall.
 */
export function QuizForm({ token }: { token: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [ageBand, setAgeBand] = useState("");
  const [gender, setGender] = useState("");
  const [allergies, setAllergies] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 0 = about you, 1..N = questions, last = allergies + submit
  const totalSteps = QUIZ_QUESTIONS.length + 2;
  const progress = Math.round(((step + 1) / totalSteps) * 100);

  const canAdvance = (() => {
    if (step === 0) return name.trim().length > 0 && ageBand !== "" && gender !== "";
    if (step <= QUIZ_QUESTIONS.length) {
      const q = QUIZ_QUESTIONS[step - 1];
      return Boolean(answers[q.id]);
    }
    return true;
  })();

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          full_name: name,
          age_band: ageBand,
          gender,
          allergies,
          ...answers,
        }),
      });

      let data: { ok?: boolean; position?: number; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error("Something went wrong. Please try again.");
      }
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      router.push(`/thank-you?position=${data.position ?? ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  const cardStyle = {
    background: "#f9f9f7",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  } as const;

  const optionButton = (selected: boolean) =>
    ({
      background: selected ? "#e8e883" : "#f9f9f7",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontWeight: selected ? 700 : 400,
      fontSize: 16,
      color: "#1a1c1b",
      textAlign: "left" as const,
      width: "100%",
    });

  return (
    <div className="neo-shadow neo-border p-6 md:p-10" style={cardStyle}>
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "1.2px", color: "#484739", textTransform: "uppercase" }}>
            Step {step + 1} of {totalSteps}
          </span>
          <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 12, color: "#484739" }}>
            {progress}%
          </span>
        </div>
        <div
          className="neo-border h-5"
          style={{ background: "#f4f4f2" }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Quiz progress"
        >
          <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: "#beeaf8" }} />
        </div>
      </div>

      {/* Step 0 — about you */}
      {step === 0 && (
        <div>
          <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: "clamp(24px,4vw,32px)", color: "#1a1c1b", margin: "0 0 24px", lineHeight: 1.2 }}>
            First, the basics.
          </h2>

          <label htmlFor="q-name" className="block mb-2" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1px", color: "#1a1c1b", textTransform: "uppercase" }}>
            Your name
          </label>
          <input
            id="q-name"
            type="text"
            value={name}
            maxLength={80}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
            className="neo-border px-4 py-4 w-full outline-none mb-6"
            style={{ background: "#f9f9f7", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 16, color: "#1a1c1b" }}
            placeholder="First name is fine"
          />

          <p className="mb-2" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1px", color: "#1a1c1b", textTransform: "uppercase" }}>
            Age range
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {AGE_BANDS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAgeBand(a)}
                aria-pressed={ageBand === a}
                className="neo-border px-4 py-3"
                style={optionButton(ageBand === a)}
              >
                {a}
              </button>
            ))}
          </div>

          <p className="mb-2" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "1px", color: "#1a1c1b", textTransform: "uppercase" }}>
            Gender
          </p>
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                aria-pressed={gender === g}
                className="neo-border px-4 py-3"
                style={optionButton(gender === g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Steps 1..N — the questions */}
      {step > 0 && step <= QUIZ_QUESTIONS.length && (
        <div>
          <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: "clamp(22px,3.5vw,30px)", color: "#1a1c1b", margin: "0 0 24px", lineHeight: 1.25 }}>
            {QUIZ_QUESTIONS[step - 1].question}
          </h2>
          <div className="flex flex-col gap-3">
            {QUIZ_QUESTIONS[step - 1].options.map((opt) => {
              const q = QUIZ_QUESTIONS[step - 1];
              const selected = answers[q.id] === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setAnswers((a) => ({ ...a, [q.id]: opt.value }));
                    // gentle auto-advance keeps momentum
                    setTimeout(() => setStep((s) => Math.min(s + 1, totalSteps - 1)), 180);
                  }}
                  className="neo-border px-5 py-4 transition-transform hover:-translate-y-0.5"
                  style={optionButton(selected)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Final step — allergies + submit */}
      {step === totalSteps - 1 && (
        <div>
          <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: "clamp(22px,3.5vw,30px)", color: "#1a1c1b", margin: "0 0 12px", lineHeight: 1.25 }}>
            Any allergies we should know about?
          </h2>
          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 15, color: "#484739", lineHeight: 1.6, margin: "0 0 16px" }}>
            Known reactions to skincare ingredients or botanicals. Leave blank
            if none. This is used to filter recommendations, not to give
            medical advice.
          </p>
          <label htmlFor="q-allergies" className="sr-only">Known allergies</label>
          <textarea
            id="q-allergies"
            value={allergies}
            maxLength={500}
            rows={4}
            onChange={(e) => setAllergies(e.target.value)}
            className="neo-border px-4 py-4 w-full outline-none"
            style={{ background: "#f9f9f7", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 16, color: "#1a1c1b" }}
            placeholder="e.g. fragrance, essential oils, nut oils..."
          />
          <p className="mt-1 text-right" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 12, color: "#484739" }}>
            {allergies.length}/500
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="neo-border px-4 py-3 mt-6"
          style={{ background: "#ffdad6", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 14, color: "#93000a" }}
        >
          {error}
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 mt-8">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
          className="neo-border px-6 py-3 disabled:opacity-30"
          style={{ background: "#f9f9f7", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.8px", color: "#1a1c1b" }}
        >
          BACK
        </button>

        {step < totalSteps - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(s + 1, totalSteps - 1))}
            disabled={!canAdvance}
            className="neo-shadow-sm neo-border px-8 py-3 disabled:opacity-40"
            style={{ background: "#e8e883", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: "0.8px", color: "#1a1c1b" }}
          >
            CONTINUE
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="neo-shadow neo-border px-8 py-4 disabled:opacity-60"
            style={{ background: "#e8e883", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.9px", color: "#1a1c1b" }}
          >
            {submitting ? "SAVING..." : "FINISH & LOCK MY SPOT"}
          </button>
        )}
      </div>
    </div>
  );
}
