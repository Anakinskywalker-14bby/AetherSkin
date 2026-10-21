"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  QUIZ_QUESTIONS,
  parseNumber,
  type QuizQuestion,
} from "@/lib/validation/quiz";

type Answer = string | number;

const QUESTIONS = QUIZ_QUESTIONS as readonly QuizQuestion[];

/** The client-side twin of the server's continuous-field check. */
function continuousError(q: Extract<QuizQuestion, { kind: "continuous" }>, raw: string) {
  const n = parseNumber(raw);
  if (n === null) return raw.trim() === "" ? null : "Please enter a number.";
  const k = n / q.step;
  if (n < q.min || n > q.max || Math.abs(k - Math.round(k)) > 1e-9) return q.rangeMessage;
  return null;
}

/**
 * The skin quiz. Reachable only from the emailed verification link, so the
 * token travels with the submission and acts as authorization.
 *
 * Ten questions, one per step, and no free text: every answer is a fixed
 * code, a ranked integer or a number (see lib/validation/quiz.ts).
 */
export function QuizForm({ token }: { token: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  // Raw text of number fields, so a half-typed "7." isn't lost on re-render.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const total = QUESTIONS.length;
  const q = QUESTIONS[step];
  const isLast = step === total - 1;
  const progress = Math.round(((step + 1) / total) * 100);

  const draft = q.kind === "continuous" ? drafts[q.id] ?? "" : "";
  const fieldError = q.kind === "continuous" ? continuousError(q, draft) : null;
  const answered =
    q.kind === "continuous"
      ? draft.trim() !== "" && fieldError === null
      : answers[q.id] !== undefined;

  function go(next: number) {
    setError(null);
    setStep(Math.max(0, Math.min(total - 1, next)));
    // Move focus to the new question for keyboard and screen-reader users.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function choose(value: Answer) {
    setAnswers((a) => ({ ...a, [q.id]: value }));
    // Gentle auto-advance keeps momentum on tap-to-answer questions.
    if (!isLast) setTimeout(() => go(step + 1), 180);
  }

  function commitNumber(): boolean {
    if (q.kind !== "continuous" || !answered) return false;
    setAnswers((a) => ({ ...a, [q.id]: parseNumber(draft) as number }));
    return true;
  }

  async function submit() {
    if (!commitNumber() && q.kind === "continuous") return;
    const finalAnswers =
      q.kind === "continuous" ? { ...answers, [q.id]: parseNumber(draft) as number } : answers;

    const missing = QUESTIONS.findIndex((x) => finalAnswers[x.id] === undefined);
    if (missing !== -1) {
      go(missing);
      setError("Please answer this question before finishing.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...finalAnswers }),
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

  function next() {
    if (q.kind === "continuous" && !commitNumber()) return;
    if (isLast) void submit();
    else go(step + 1);
  }

  const label = { fontFamily: "'DM Sans', system-ui, sans-serif" } as const;

  const optionButton = (selected: boolean) => ({
    background: selected ? "#e8e883" : "#f9f9f7",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontWeight: selected ? 700 : 400,
    fontSize: 16,
    color: "#1a1c1b",
    textAlign: "left" as const,
    width: "100%",
  });

  return (
    <div className="neo-shadow neo-border p-6 md:p-10" style={{ background: "#f9f9f7", ...label }}>
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span style={{ ...label, fontWeight: 700, fontSize: 12, letterSpacing: "1.2px", color: "#484739", textTransform: "uppercase" }}>
            Question {step + 1} of {total}
          </span>
          <span style={{ ...label, fontWeight: 700, fontSize: 12, color: "#484739" }}>{progress}%</span>
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

      <h2
        ref={headingRef}
        tabIndex={-1}
        id={`q-${q.id}-label`}
        className="outline-none"
        style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: "clamp(22px,3.5vw,30px)", color: "#1a1c1b", margin: "0 0 24px", lineHeight: 1.25 }}
      >
        {q.question}
      </h2>

      {q.kind !== "continuous" && (
        <div className="flex flex-col gap-3" role="group" aria-labelledby={`q-${q.id}-label`}>
          {q.kind === "categorical"
            ? q.options.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  aria-pressed={answers[q.id] === opt.code}
                  onClick={() => choose(opt.code)}
                  className="neo-border px-5 py-4 transition-transform hover:-translate-y-0.5"
                  style={optionButton(answers[q.id] === opt.code)}
                >
                  {opt.label}
                </button>
              ))
            : q.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={answers[q.id] === opt.value}
                  onClick={() => choose(opt.value)}
                  className="neo-border px-5 py-4 transition-transform hover:-translate-y-0.5"
                  style={optionButton(answers[q.id] === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
        </div>
      )}

      {q.kind === "continuous" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          <label htmlFor={`q-${q.id}`} className="sr-only">
            {q.question}
          </label>
          <div className="flex items-center gap-3">
            <input
              key={q.id}
              id={`q-${q.id}`}
              type="number"
              inputMode={q.step < 1 ? "decimal" : "numeric"}
              min={q.min}
              max={q.max}
              step={q.step}
              value={draft}
              autoFocus
              placeholder={q.placeholder}
              aria-invalid={fieldError !== null}
              aria-describedby={fieldError ? `q-${q.id}-error` : undefined}
              onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
              className="neo-border px-4 py-4 outline-none"
              style={{ background: "#f9f9f7", ...label, fontSize: 20, color: "#1a1c1b", width: 160 }}
            />
            <span style={{ ...label, fontSize: 16, color: "#484739" }}>{q.unit}</span>
          </div>
          {fieldError && (
            <p id={`q-${q.id}-error`} className="mt-3" style={{ ...label, fontSize: 14, fontWeight: 700, color: "#93000a" }}>
              {fieldError}
            </p>
          )}
        </form>
      )}

      {error && (
        <p
          role="alert"
          className="neo-border px-4 py-3 mt-6"
          style={{ background: "#ffdad6", ...label, fontWeight: 700, fontSize: 14, color: "#93000a" }}
        >
          {error}
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 mt-8">
        <button
          type="button"
          onClick={() => go(step - 1)}
          disabled={step === 0 || submitting}
          className="neo-border px-6 py-3 disabled:opacity-30"
          style={{ background: "#f9f9f7", ...label, fontWeight: 700, fontSize: 14, letterSpacing: "0.8px", color: "#1a1c1b" }}
        >
          BACK
        </button>

        <button
          type="button"
          onClick={next}
          disabled={!answered || submitting}
          className={`${isLast ? "neo-shadow" : "neo-shadow-sm"} neo-border px-8 py-3 disabled:opacity-40`}
          style={{ background: "#e8e883", ...label, fontWeight: 700, fontSize: isLast ? 16 : 15, letterSpacing: "0.8px", color: "#1a1c1b" }}
        >
          {isLast ? (submitting ? "SAVING..." : "FINISH & LOCK MY SPOT") : "CONTINUE"}
        </button>
      </div>
    </div>
  );
}
