import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  QUIZ_QUESTIONS,
  QUIZ_VERSION,
  parseNumber,
  sanitizeText,
  validateQuiz,
  type QuizQuestion,
} from "@/lib/validation/quiz";

const QUESTIONS = QUIZ_QUESTIONS as readonly QuizQuestion[];

/** A submission that should always pass, built from the real definitions. */
function validPayload(overrides: Record<string, unknown> = {}) {
  const answers: Record<string, string | number> = {};
  for (const q of QUESTIONS) {
    if (q.kind === "categorical" || q.kind === "conditional") answers[q.id] = q.options[0].code;
    else if (q.kind === "ordinal") answers[q.id] = q.options[0].value;
    else answers[q.id] = q.min;
  }
  return { ...answers, ...overrides };
}

/** Every migration that touches the v3 table, concatenated. */
function v3Migrations() {
  return [
    "supabase/migrations/20261021000002_quiz_v3.sql",
    "supabase/migrations/20261104000001_quiz_v3_about_you.sql",
  ]
    .map((f) => readFileSync(join(process.cwd(), f), "utf8"))
    .join("\n");
}

describe("quiz definition (the dataset schema)", () => {
  it("asks personal questions first, then skin questions", () => {
    expect(QUESTIONS.map((q) => q.id)).toEqual([
      // About you
      "gender",
      "age",
      "medication_use",
      "allergy_status",
      "environment",
      "sleep_hours",
      "water_glasses",
      "stress_level",
      "sugar_intake",
      "dairy_intake",
      "fruit_veg_intake",
      "alcohol_intake",
      // Your skin
      "primary_goal",
      "skin_type",
      "texture_preference",
      "sunscreen_frequency",
      "routine_complexity",
      "breakouts_level",
      "redness_level",
      "dryness_level",
    ]);
    const sections = QUESTIONS.map((q) => q.section);
    const firstSkin = sections.indexOf("your_skin");
    expect(sections.slice(0, firstSkin).every((s) => s === "about_you")).toBe(true);
    expect(sections.slice(firstSkin).every((s) => s === "your_skin")).toBe(true);
  });

  it("keeps every question the earlier v3 quiz asked (nothing dropped)", () => {
    const ids = QUESTIONS.map((q) => q.id);
    for (const old of [
      "primary_goal", "skin_type", "environment", "texture_preference",
      "sunscreen_frequency", "stress_level", "routine_complexity",
      "age", "sleep_hours", "water_glasses",
      "sugar_intake", "dairy_intake", "fruit_veg_intake", "alcohol_intake",
      "breakouts_level", "redness_level", "dryness_level",
    ]) {
      expect(ids).toContain(old);
    }
    expect(QUIZ_VERSION).toBe(3);
  });

  it("has typed text only in the two conditional notes", () => {
    for (const q of QUESTIONS) {
      expect(["categorical", "ordinal", "continuous", "conditional"]).toContain(q.kind);
    }
    expect(
      QUESTIONS.filter((q) => q.kind === "conditional").map((q) => (q as { detailsId: string }).detailsId)
    ).toEqual(["medication_details", "allergy_details"]);
  });

  // Freezing the encodings: if one of these changes, rows already collected
  // would silently mean something else. Add an option or bump QUIZ_VERSION.
  it("keeps the categorical codes stable", () => {
    const codes = Object.fromEntries(
      QUESTIONS.filter((q) => q.kind === "categorical" || q.kind === "conditional").map((q) => [
        q.id,
        (q as Extract<QuizQuestion, { kind: "categorical" }>).options.map((o) => o.code),
      ])
    );
    expect(codes).toEqual({
      gender: ["female", "male", "non_binary_other", "prefer_not_to_say"],
      medication_use: ["no", "yes"],
      allergy_status: ["no", "yes", "unsure"],
      primary_goal: ["hydration", "anti_aging", "acne_control", "brightening", "calming"],
      skin_type: ["oily", "dry", "combination", "normal", "highly_sensitive"],
      environment: ["climate_controlled_indoor", "outdoors", "urban_pollution", "balanced_indoor"],
      texture_preference: ["gel_fluid", "rich_cream", "oil_balm", "no_preference"],
    });
  });

  it("keeps the ordinal scales stable and ordered", () => {
    const scales = Object.fromEntries(
      QUESTIONS.filter((q) => q.kind === "ordinal").map((q) => [
        q.id,
        (q as Extract<QuizQuestion, { kind: "ordinal" }>).options.map((o) => o.value),
      ])
    );
    expect(scales).toEqual({
      sunscreen_frequency: [0, 1, 2, 3],
      stress_level: [1, 2, 3, 4, 5],
      routine_complexity: [0, 1, 2],
      sugar_intake: [0, 1, 2, 3, 4],
      dairy_intake: [0, 1, 2, 3, 4],
      fruit_veg_intake: [0, 1, 2, 3, 4],
      alcohol_intake: [0, 1, 2, 3, 4],
      breakouts_level: [0, 1, 2, 3, 4],
      redness_level: [0, 1, 2, 3, 4],
      dryness_level: [0, 1, 2, 3, 4],
    });
  });

  it("matches the database CHECK constraints in the migration", () => {
    const sql = v3Migrations();
    for (const q of QUESTIONS) {
      expect(sql).toContain(q.id);
      if (q.kind === "categorical" || q.kind === "conditional") {
        for (const o of q.options) expect(sql).toContain(`'${o.code}'`);
      }
      if (q.kind === "conditional") {
        expect(sql).toContain(q.detailsId);
        expect(sql).toContain(`char_length(${q.detailsId}) between 1 and ${q.detailsMaxLength}`);
      }
      if (q.kind === "ordinal") {
        const vals = q.options.map((o) => o.value);
        expect(sql).toContain(`${q.id} between ${Math.min(...vals)} and ${Math.max(...vals)}`);
      }
      if (q.kind === "continuous") expect(sql).toContain(`between ${q.min} and ${q.max}`);
    }
    expect(sql).toContain(`quiz_version = ${QUIZ_VERSION}`);
  });
});

describe("validateQuiz", () => {
  it("accepts a complete, valid submission and returns typed values", () => {
    const r = validateQuiz(
      validPayload({ age: 28, sleep_hours: 7.5, water_glasses: 6, stress_level: 3 })
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({ age: 28, sleep_hours: 7.5, water_glasses: 6, stress_level: 3 });
      expect(typeof r.data.age).toBe("number");
      expect(typeof r.data.primary_goal).toBe("string");
    }
  });

  it("accepts numbers sent as strings (form inputs) and stores numbers", () => {
    const r = validateQuiz(validPayload({ age: "34", sleep_hours: "6.5", stress_level: "4" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toMatchObject({ age: 34, sleep_hours: 6.5, stress_level: 4 });
  });

  it("drops every field that isn't a question (no stray free text gets through)", () => {
    const r = validateQuiz(
      validPayload({ full_name: "Jane", allergies: "nuts", email: "a@b.co", pregnancy_status: "Yes" })
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.data).sort()).toEqual(
        [...QUESTIONS.map((q) => q.id), "medication_details", "allergy_details"].sort()
      );
    }
  });

  it("stores no medication or allergy note unless the answer is yes", () => {
    const r = validateQuiz(
      validPayload({ medication_use: "no", medication_details: "x", allergy_status: "unsure", allergy_details: "y" })
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.medication_details).toBeNull();
      expect(r.data.allergy_details).toBeNull();
    }
  });

  it("requires the note when the answer is yes, and cleans it", () => {
    for (const [use, note] of [["medication_use", "medication_details"], ["allergy_status", "allergy_details"]]) {
      expect(validateQuiz(validPayload({ [use]: "yes" })).ok).toBe(false);
      expect(validateQuiz(validPayload({ [use]: "yes", [note]: "   " })).ok).toBe(false);
      const r = validateQuiz(validPayload({ [use]: "yes", [note]: "  retinol\u0000 \n serum  " }));
      expect(r.ok).toBe(true);
      if (r.ok) expect((r.data as unknown as Record<string, unknown>)[note]).toBe("retinol serum");
    }
  });

  it("caps notes at 200 characters and rejects non-string notes", () => {
    const r = validateQuiz(validPayload({ medication_use: "yes", medication_details: "a".repeat(500) }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.medication_details).toHaveLength(200);
    expect(validateQuiz(validPayload({ allergy_status: "yes", allergy_details: { a: 1 } })).ok).toBe(false);
  });

  it("rejects unknown gender, medication and allergy codes", () => {
    expect(validateQuiz(validPayload({ gender: "other" })).ok).toBe(false);
    expect(validateQuiz(validPayload({ medication_use: "unsure" })).ok).toBe(false);
    expect(validateQuiz(validPayload({ allergy_status: "maybe" })).ok).toBe(false);
  });

  it("exports the new answers and both notes to the training CSV, but not as model inputs", () => {
    const py = readFileSync(join(process.cwd(), "ml/aetherskin_ml/schema.py"), "utf8");
    const extra = py.slice(py.indexOf("EXTRA_COLUMNS = ["), py.indexOf("EXPORT_COLUMNS ="));
    for (const col of ["gender", "medication_use", "medication_details", "allergy_status", "allergy_details"]) {
      expect(extra).toContain(`"${col}"`);
    }
    // The model feature lists (everything before EXTRA_COLUMNS) must not use them.
    const features = py.slice(0, py.indexOf("# Added 4 Nov 2026"));
    expect(features).not.toContain("medication_details");
    expect(features).not.toContain("allergy_details");
  });

  it.each([null, undefined, "x", 42, [], [1, 2]])("rejects a non-object body: %s", (bad) => {
    expect(validateQuiz(bad).ok).toBe(false);
  });

  it.each(QUESTIONS.map((q) => q.id))("rejects a submission missing %s", (id) => {
    const body = validPayload();
    delete (body as Record<string, unknown>)[id];
    expect(validateQuiz(body).ok).toBe(false);
  });

  it("rejects an unknown categorical code", () => {
    expect(validateQuiz(validPayload({ primary_goal: "glow" })).ok).toBe(false);
    expect(validateQuiz(validPayload({ skin_type: "Oily" })).ok).toBe(false); // codes are exact
  });

  it("rejects ordinal values outside the scale or between steps", () => {
    for (const bad of [-1, 4, 1.5, "2a", "", true]) {
      expect(validateQuiz(validPayload({ sunscreen_frequency: bad })).ok).toBe(false);
    }
    expect(validateQuiz(validPayload({ stress_level: 0 })).ok).toBe(false);
    expect(validateQuiz(validPayload({ stress_level: 6 })).ok).toBe(false);
  });

  it("enforces the 18+ age requirement and whole years", () => {
    const r = validateQuiz(validPayload({ age: 17 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/18/);
    expect(validateQuiz(validPayload({ age: 28.5 })).ok).toBe(false);
    expect(validateQuiz(validPayload({ age: 101 })).ok).toBe(false);
    expect(validateQuiz(validPayload({ age: 18 })).ok).toBe(true);
  });

  it("accepts sleep in half hours only, from 0 to 24", () => {
    for (const ok of [0, 6, 7.5, 24]) expect(validateQuiz(validPayload({ sleep_hours: ok })).ok).toBe(true);
    for (const bad of [-1, 7.25, 24.5]) expect(validateQuiz(validPayload({ sleep_hours: bad })).ok).toBe(false);
  });

  it("accepts whole glasses of water from 0 to 30", () => {
    expect(validateQuiz(validPayload({ water_glasses: 0 })).ok).toBe(true);
    for (const bad of [-1, 2.5, 31]) expect(validateQuiz(validPayload({ water_glasses: bad })).ok).toBe(false);
  });
});

describe("parseNumber", () => {
  it("parses plain decimals", () => {
    expect(parseNumber(7)).toBe(7);
    expect(parseNumber("7")).toBe(7);
    expect(parseNumber(" 7.5 ")).toBe(7.5);
  });

  it.each(["", " ", "7.", ".5", "1e2", "0x10", "Infinity", "NaN", "7 hours", "5,5"])(
    "rejects %j",
    (bad) => expect(parseNumber(bad)).toBeNull()
  );

  it("rejects non-finite numbers and other types", () => {
    for (const bad of [NaN, Infinity, null, undefined, {}, [], true]) expect(parseNumber(bad)).toBeNull();
  });
});

describe("sanitizeText (still used for token and email inputs)", () => {
  it("returns an empty string for non-strings", () => {
    for (const bad of [null, undefined, 42, {}, [], true]) expect(sanitizeText(bad, 50)).toBe("");
  });

  it("never leaves a lone surrogate or splits an emoji when capping", () => {
    expect(sanitizeText("a\uD83Db", 50)).toBe("a�b");
    expect(sanitizeText("😀😀😀", 2)).toBe("😀😀");
    expect(sanitizeText("x\uDE00", 50)).toBe("x�");
  });

  it("strips control characters, collapses whitespace and caps length", () => {
    expect(sanitizeText("a\u0000b\n\tc   d", 50)).toBe("a b c d");
    expect(sanitizeText("x".repeat(100), 10)).toHaveLength(10);
  });
});
