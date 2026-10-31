"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  QUIZ_QUESTIONS,
  parseNumber,
  type QuizQuestion,
} from "@/lib/validation/quiz";

type Answer = string | number;

const QUESTIONS = QUIZ_QUESTIONS as readonly QuizQuestion[];

/** Pause between answering and moving on, so a mis-tap can be changed. */
const ADVANCE_DELAY_MS = 2000;

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
 * Seventeen questions, one per step, and no free text: every answer is a fixed
 * code, a ranked integer or a number (see lib/validation/quiz.ts).
 *
 * There is no Continue button. Answering starts a 2-second buffer, shown as
 * a filling bar, after which the quiz moves on by itself; changing the
 * answer restarts it, Back cancels it. For number questions the buffer starts
 * once a valid number has been left alone for 2 seconds, and Enter skips the
 * wait. The last answer submits the same way.
 */
export function QuizForm({ token }: { token: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  // Raw text of number fields, so a half-typed "7." isn't lost on re-render.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = QUESTIONS.length;
  const q = QUESTIONS[step];
  const isLast = step === total - 1;
  const progress = Math.round(((step + 1) / total) * 100);

  const draft = q.kind === "continuous" ? drafts[q.id] ?? "" : "";
  const fieldError = q.kind === "continuous" ? continuousError(q, draft) : null;

  function cancelPending() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPending(false);
  }

  // Never fire a stale advance after the component has gone.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function go(next: number) {
    cancelPending();
    setError(null);
    setStep(Math.max(0, Math.min(total - 1, next)));
    // Move focus to the new question for keyboard and screen-reader users.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  async function submit(finalAnswers: Record<string, Answer>) {
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

  /** Record the answer, then move on (or submit) after the buffer. */
  function answer(value: Answer, delay = ADVANCE_DELAY_MS) {
    const nextAnswers = { ...answers, [q.id]: value };
    setAnswers(nextAnswers);
    setError(null);
    cancelPending();
    setPending(true);
    const from = step;
    timer.current = setTimeout(() => {
      timer.current = null;
      setPending(false);
      if (from === total - 1) void submit(nextAnswers);
      else go(from + 1);
    }, delay);
  }

  function onNumberChange(raw: string) {
    if (q.kind !== "continuous") return;
    setDrafts((d) => ({ ...d, [q.id]: raw }));
    cancelPending();
    if (raw.trim() !== "" && continuousError(q, raw) === null) {
      answer(parseNumber(raw) as number);
    }
  }

  // Styling lives in app/globals.css under .qz-* (the site's lilac/peach
  // palette and hero type), so the quiz matches the rest of AetherSkin.
  const options =
    q.kind === "categorical"
      ? q.options.map((o) => ({ key: o.code, value: o.code as Answer, label: o.label }))
      : q.kind === "ordinal"
        ? q.options.map((o) => ({ key: String(o.value), value: o.value as Answer, label: o.label }))
        : [];

  return (
    <div className="qz-card">
      {/* Progress */}
      <div className="qz-progress">
        <div className="qz-progress-row">
          <span className="qz-eyebrow">Question {step + 1} of {total}</span>
          <span className="qz-eyebrow">{progress}%</span>
        </div>
        <div
          className="qz-track"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Quiz progress"
        >
          <div className="qz-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <h2 ref={headingRef} tabIndex={-1} id={`q-${q.id}-label`} className="qz-question">
        {q.question}
      </h2>

      {q.kind !== "continuous" && (
        <div className="qz-options" role="group" aria-labelledby={`q-${q.id}-label`}>
          {options.map((opt) => {
            const selected = answers[q.id] === opt.value;
            return (
              <button
                key={opt.key}
                type="button"
                disabled={submitting}
                aria-pressed={selected}
                onClick={() => answer(opt.value)}
                className={selected ? "qz-option is-selected" : "qz-option"}
              >
                <span className="qz-dot" aria-hidden="true" />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {q.kind === "continuous" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Enter skips the wait, but only for a valid number.
            if (draft.trim() !== "" && fieldError === null) answer(parseNumber(draft) as number, 0);
          }}
        >
          <label htmlFor={`q-${q.id}`} className="sr-only">
            {q.question}
          </label>
          <div className="qz-number-row">
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
              disabled={submitting}
              placeholder={q.placeholder}
              aria-invalid={fieldError !== null}
              aria-describedby={fieldError ? `q-${q.id}-error` : undefined}
              onChange={(e) => onNumberChange(e.target.value)}
              className="qz-input"
            />
            <span className="qz-unit">{q.unit}</span>
          </div>
          {fieldError && (
            <p id={`q-${q.id}-error`} className="qz-field-error">
              {fieldError}
            </p>
          )}
        </form>
      )}

      {/* The 2-second buffer, made visible: a bar that fills, then moves on. */}
      <div className="qz-advance" aria-live="polite">
        {pending && !submitting && (
          <div className="qz-advance-row">
            <div className="qz-advance-track" aria-hidden="true">
              <div key={`${step}-${String(answers[q.id])}`} className="quiz-advance-fill qz-advance-fill" />
            </div>
            <span className="qz-status">{isLast ? "Saving your answers…" : "Next question…"}</span>
          </div>
        )}
        {submitting && <span className="qz-status">Saving your answers…</span>}
      </div>

      {error && (
        <div role="alert" className="qz-error">
          <span>{error}</span>
          {/* Only shown after a failed save: a retry, not a "next" button. */}
          {isLast && answers[q.id] !== undefined && !submitting && (
            <button type="button" onClick={() => void submit(answers)} className="qz-btn qz-btn--small">
              Try again
            </button>
          )}
        </div>
      )}

      {/* Controls: Back only. Moving forward happens by answering. */}
      <div className="qz-controls">
        <button type="button" onClick={() => go(step - 1)} disabled={step === 0 || submitting} className="qz-btn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          Back
        </button>
      </div>
    </div>
  );
}
