/**
 * Skin quiz, version 2: every answer is a number or a fixed code.
 *
 * Built to be fed straight into a model, so there is no free text anywhere:
 *
 *   categorical  stored as a stable code, one-hot encoded downstream
 *                (one 0/1 column per option)
 *   ordinal      stored as the integer printed next to each option; the
 *                order is meaningful, so it is used as-is
 *   continuous   stored as the raw number; standard-scaled downstream
 *
 * Codes and integers are part of the dataset's schema. Changing one silently
 * changes what earlier rows mean, so never renumber or rename: add a new
 * option, or bump QUIZ_VERSION. The database enforces the same values with
 * CHECK constraints (supabase/migrations/20261021000001_quiz_v2.sql), and
 * docs/quiz-data-dictionary.md documents them for the training pipeline.
 *
 * Every answer is validated server-side against these definitions, so
 * nothing the client sends reaches the database unless it is on the list.
 */

export const QUIZ_VERSION = 2;

export interface CategoricalQuestion {
  kind: "categorical";
  id: string;
  question: string;
  options: readonly { code: string; label: string }[];
}

export interface OrdinalQuestion {
  kind: "ordinal";
  id: string;
  question: string;
  options: readonly { value: number; label: string }[];
}

export interface ContinuousQuestion {
  kind: "continuous";
  id: string;
  question: string;
  unit: string;
  placeholder: string;
  min: number;
  max: number;
  /** Smallest increment accepted: 1 means whole numbers only. */
  step: number;
  /** Shown when the answer is outside [min, max]. */
  rangeMessage: string;
}

export type QuizQuestion = CategoricalQuestion | OrdinalQuestion | ContinuousQuestion;

export const QUIZ_QUESTIONS = [
  // ── Part 1: categorical (one-hot) ───────────────────────────────────
  {
    kind: "categorical",
    id: "primary_goal",
    question: "What is your primary skin goal?",
    options: [
      { code: "hydration", label: "Hydration / Moisture" },
      { code: "anti_aging", label: "Anti-aging / Fine lines" },
      { code: "acne_control", label: "Acne control / Blemish clearing" },
      { code: "brightening", label: "Brightening / Uneven skin tone" },
      { code: "calming", label: "Calming / Redness reduction" },
    ],
  },
  {
    kind: "categorical",
    id: "skin_type",
    question: "How would you describe your current skin type?",
    options: [
      { code: "oily", label: "Oily" },
      { code: "dry", label: "Dry" },
      { code: "combination", label: "Combination" },
      { code: "normal", label: "Normal" },
      { code: "highly_sensitive", label: "Highly Sensitive" },
    ],
  },
  {
    kind: "categorical",
    id: "environment",
    question: "What environment do you spend most of your day in?",
    options: [
      { code: "climate_controlled_indoor", label: "Air-conditioned / heated indoor office" },
      { code: "outdoors", label: "Outdoors / exposed to weather" },
      { code: "urban_pollution", label: "High-pollution urban areas" },
      { code: "balanced_indoor", label: "Balanced / moderate indoor environment" },
    ],
  },
  {
    kind: "categorical",
    id: "texture_preference",
    question: "What is your preferred texture for skincare products?",
    options: [
      { code: "gel_fluid", label: "Lightweight gels or fluids" },
      { code: "rich_cream", label: "Rich, thick creams" },
      { code: "oil_balm", label: "Oils or heavy balms" },
      { code: "no_preference", label: "I have no preference" },
    ],
  },

  // ── Part 2: ordinal (ranked) ────────────────────────────────────────
  {
    kind: "ordinal",
    id: "sunscreen_frequency",
    question: "How often do you apply sunscreen during the day?",
    options: [
      { value: 0, label: "Never" },
      { value: 1, label: "Rarely / Only when sunny" },
      { value: 2, label: "Once a day in the morning" },
      { value: 3, label: "Multiple times a day / Reapply frequently" },
    ],
  },
  {
    kind: "ordinal",
    id: "stress_level",
    question: "Rate your average daily stress level over the past month:",
    options: [
      { value: 1, label: "Very low stress" },
      { value: 2, label: "Low stress" },
      { value: 3, label: "Moderate stress" },
      { value: 4, label: "High stress" },
      { value: 5, label: "Extremely high stress" },
    ],
  },
  {
    kind: "ordinal",
    id: "routine_complexity",
    question: "How complex is your current daily skincare routine?",
    options: [
      { value: 0, label: "Minimalist (just cleanser, or cleanser + moisturizer)" },
      { value: 1, label: "Standard (cleanser, moisturizer, plus 1 active serum)" },
      { value: 2, label: "Advanced (cleanser, toner, multiple serums, moisturizer, eye cream)" },
    ],
  },

  // ── Part 3: continuous (raw numbers) ────────────────────────────────
  {
    kind: "continuous",
    id: "age",
    question: "What is your age?",
    unit: "years",
    placeholder: "e.g. 28",
    min: 18,
    max: 100,
    step: 1,
    // The Terms require members to be 18+.
    rangeMessage: "AetherSkin is for adults: please enter an age from 18 to 100.",
  },
  {
    kind: "continuous",
    id: "sleep_hours",
    question: "On average, how many hours of sleep do you get per night?",
    unit: "hours",
    placeholder: "e.g. 7",
    min: 0,
    max: 24,
    step: 0.5,
    rangeMessage: "Please enter between 0 and 24 hours (half hours are fine).",
  },
  {
    kind: "continuous",
    id: "water_glasses",
    question: "Roughly how many glasses of water (250ml) do you drink a day?",
    unit: "glasses",
    placeholder: "e.g. 6",
    min: 0,
    max: 30,
    step: 1,
    rangeMessage: "Please enter a whole number of glasses from 0 to 30.",
  },
] as const satisfies readonly QuizQuestion[];

export type QuizQuestionId = (typeof QUIZ_QUESTIONS)[number]["id"];

export interface QuizPayload {
  primary_goal: string;
  skin_type: string;
  environment: string;
  texture_preference: string;
  sunscreen_frequency: number;
  stress_level: number;
  routine_complexity: number;
  age: number;
  sleep_hours: number;
  water_glasses: number;
}

export type ValidationResult =
  | { ok: true; data: QuizPayload }
  | { ok: false; error: string };

const CONTROL_CHARS = new RegExp("[\\u0000-\\u001F\\u007F]", "g");

/**
 * Strip control chars, collapse whitespace, hard-cap length. No longer used
 * by the quiz itself (it has no text fields); kept for the token and email
 * inputs in the API routes.
 */
export function sanitizeText(input: unknown, maxLength: number): string {
  if (typeof input !== "string") return "";
  return input
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Parse a number the client sent. Accepts a JSON number or a numeric string
 * (form inputs produce strings). Rejects anything else, including "", NaN,
 * Infinity, hex, exponents and stray characters.
 */
export function parseNumber(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;
  const s = input.trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** True if n is a whole multiple of step (tolerant of float error). */
function onStep(n: number, step: number): boolean {
  const k = n / step;
  return Math.abs(k - Math.round(k)) < 1e-9;
}

/** Validate an untrusted quiz submission against the definitions above. */
export function validateQuiz(raw: unknown): ValidationResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "Invalid submission." };
  }
  const body = raw as Record<string, unknown>;
  const data: Record<string, string | number> = {};

  for (const q of QUIZ_QUESTIONS as readonly QuizQuestion[]) {
    const value = body[q.id];

    if (q.kind === "categorical") {
      const code = typeof value === "string" ? value : "";
      if (!q.options.some((o) => o.code === code)) {
        return { ok: false, error: `Please answer: ${q.question}` };
      }
      data[q.id] = code;
      continue;
    }

    const n = parseNumber(value);

    if (q.kind === "ordinal") {
      if (n === null || !q.options.some((o) => o.value === n)) {
        return { ok: false, error: `Please answer: ${q.question}` };
      }
      data[q.id] = n;
      continue;
    }

    // continuous
    if (n === null) {
      return { ok: false, error: `Please enter a number for: ${q.question}` };
    }
    if (n < q.min || n > q.max || !onStep(n, q.step)) {
      return { ok: false, error: q.rangeMessage };
    }
    data[q.id] = n;
  }

  return { ok: true, data: data as unknown as QuizPayload };
}
