import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { buildRoutine, type RoutineInput } from "@/lib/routine/build";
import {
  ALLERGY_BLOCKS_ACTIVE, CANDIDATES, CHEMICAL_FILTER_ALLERGENS, FALLBACK, GENTLE_MODE_MEDS,
  MINERAL_FILTER_ALLERGENS, MOST_INERT, NON_TOPICAL_ALLERGENS, OIL_BLOCKING_ALLERGENS,
  PHOTOSENSITIVE_MEDS, SERUMS, STEP_ACTIVES, VERY_DRYING_MEDS, layerOrder,
} from "@/lib/routine/catalogue";
import { matchAllergyNote, matchMedicationNote, normaliseNote } from "@/lib/routine/match";
import { ACTIVES, ALLERGIES, MEDICATIONS, entryByCode } from "@/lib/routine/reference";
import { renderRoutineEmail, renderRoutineHtml, renderRoutineText } from "@/lib/routine/email";

const BASE: RoutineInput = {
  gender: "female", medication_use: "no", medication_details: null, allergy_status: "no", allergy_details: null,
  primary_goal: "acne_control", skin_type: "oily", environment: "balanced_indoor", texture_preference: "gel_fluid",
  sunscreen_frequency: 1, routine_complexity: 2, age: 28, breakouts_level: 3, redness_level: 1, dryness_level: 1,
};
const make = (o: Partial<RoutineInput> = {}): RoutineInput => ({ ...BASE, ...o });
const withAllergy = (note: string, o: Partial<RoutineInput> = {}) =>
  make({ allergy_status: "yes", allergy_details: note, ...o });
const withMed = (note: string, o: Partial<RoutineInput> = {}) =>
  make({ medication_use: "yes", medication_details: note, ...o });

const serumLabels = (r: ReturnType<typeof buildRoutine>) =>
  [...r.morning, ...r.night].filter((s) => s.key === "serum").map((s) => s.pick);

describe("reference lists", () => {
  it("the generated JSON matches the CSVs in ml/", () => {
    execFileSync(process.execPath, [join(process.cwd(), "scripts/build-routine-reference.mjs"), "--check"], {
      stdio: "pipe",
    });
  });

  it("loads all three lists", () => {
    expect(MEDICATIONS.length).toBeGreaterThan(100);
    expect(ALLERGIES.length).toBeGreaterThan(100);
    expect(ACTIVES.length).toBeGreaterThan(100);
  });

  it("every code the catalogue and safety rules mention exists in the lists", () => {
    const codes = [
      ...Object.keys(SERUMS), ...Object.values(CANDIDATES).flat(), ...FALLBACK, ...MOST_INERT,
      ...GENTLE_MODE_MEDS, ...VERY_DRYING_MEDS, ...PHOTOSENSITIVE_MEDS, ...NON_TOPICAL_ALLERGENS,
      ...Object.keys(ALLERGY_BLOCKS_ACTIVE), ...Object.values(ALLERGY_BLOCKS_ACTIVE).flat(),
      ...CHEMICAL_FILTER_ALLERGENS, ...MINERAL_FILTER_ALLERGENS, ...OIL_BLOCKING_ALLERGENS,
      ...STEP_ACTIVES.moisturiser, STEP_ACTIVES.faceOil,
    ];
    for (const c of new Set(codes)) expect(entryByCode(c), c).toBeDefined();
    for (const [key, def] of Object.entries(SERUMS)) expect(def.code).toBe(key);
  });
});

describe("note matching", () => {
  it("reads brand, generic and slang spellings of a medication", () => {
    for (const note of ["Accutane", "roaccutane 20mg daily", "I take isotretinoin", "isotret"]) {
      expect(matchMedicationNote(note).entries.map((e) => e.code), note).toContain("med_isotretinoin");
    }
    expect(matchMedicationNote("tretinoin and adapalene").entries.map((e) => e.code)).toEqual(
      expect.arrayContaining(["med_topical_tretinoin", "med_topical_adapalene"])
    );
  });

  it("reads allergens AND product ingredients in an allergy note", () => {
    const codes = matchAllergyNote("fragrance, Niacinamide; and essential oils").entries.map((e) => e.code);
    expect(codes).toEqual(expect.arrayContaining(["allergy_fragrance_generic", "active_niacinamide", "allergy_essential_oils"]));
  });

  it("never lets one recognised misspelling hide another (audit F1)", () => {
    // every word must end up matched or reported, none silently dropped
    for (const note of ["salicylik acid fragance", "niacinamyde hyaluronik", "fragance niacinamyde"]) {
      const m = matchAllergyNote(note);
      const words = note.split(" ").length;
      expect(m.entries.length + m.unrecognised.length, note).toBeGreaterThanOrEqual(2);
      expect(words).toBeGreaterThan(1);
    }
    expect(matchAllergyNote("salicylik acid fragance").entries.map((e) => e.code)).toContain("allergy_fragrance_generic");
    const med = matchMedicationNote("minocyclin tretinoyn");
    expect(med.entries.map((e) => e.code)).toContain("med_topical_tretinoin");
  });

  it("matches whole words only", () => {
    expect(matchAllergyNote("vitamin").entries.map((e) => e.code)).not.toContain("allergy_methylisothiazolinone");
  });

  it("uses the longest spelling first (cetyl alcohol is not drying alcohol)", () => {
    const codes = matchAllergyNote("cetyl alcohol").entries.map((e) => e.code);
    expect(codes).toContain("allergy_fatty_alcohols");
    expect(codes).not.toContain("allergy_drying_alcohols");
  });

  it("returns every entry that shares a spelling (safer for an allergy filter)", () => {
    expect(matchAllergyNote("soy").entries.map((e) => e.code)).toEqual(
      expect.arrayContaining(["allergy_soy", "allergy_food_soy"])
    );
  });

  it("forgives a one-letter typo", () => {
    expect(matchAllergyNote("salicilic acid").entries.map((e) => e.code)).toContain("active_bha_salicylic");
  });

  it("reports text it cannot read instead of ignoring it", () => {
    const m = matchAllergyNote("my cousin's homemade xyzzyfoam");
    expect(m.entries).toEqual([]);
    expect(m.unrecognised.join(" ")).toContain("xyzzyfoam");
  });

  it("treats no/none/empty as nothing", () => {
    for (const n of ["", "none", "N/A", "no", "unsure", null, undefined]) {
      expect(matchAllergyNote(n as string)).toEqual({ entries: [], unrecognised: [] });
    }
  });

  it("is bounded for huge or hostile input", () => {
    const t = Date.now();
    matchAllergyNote("a".repeat(100000) + " " + "(".repeat(5000) + "niacinamide");
    expect(Date.now() - t).toBeLessThan(2000);
    expect(normaliseNote("x".repeat(5000)).length).toBeLessThanOrEqual(400);
  });
});

describe("buildRoutine: shape", () => {
  it("has the agreed morning and night order", () => {
    const r = buildRoutine(make());
    const am = r.morning.map((s) => s.key);
    expect(am[0]).toBe("cleanser");
    expect(am[1]).toBe("toner");
    expect(am.at(-2)).toBe("moisturiser");
    expect(am.at(-1)).toBe("sunscreen");
    expect(am.filter((k) => k === "serum").length).toBeGreaterThanOrEqual(1);
    const pm = r.night.map((s) => s.key);
    expect(["cleanser", "double_cleanse"]).toContain(pm[0]);
    expect(pm[1]).toBe("toner");
    expect(pm).toContain("night_cream");
    expect(pm).not.toContain("sunscreen");
  });

  it("gives 1 to 3 serums in each routine, and never more than 2 to a minimalist", () => {
    for (const goal of ["hydration", "anti_aging", "acne_control", "brightening", "calming"]) {
      for (const level of [0, 2, 4]) {
        const r = buildRoutine(make({ primary_goal: goal, breakouts_level: level, redness_level: level, dryness_level: level }));
        for (const part of [r.morning, r.night]) {
          const n = part.filter((s) => s.key === "serum").length;
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(3);
        }
        const min = buildRoutine(make({ primary_goal: goal, routine_complexity: 0, breakouts_level: level, redness_level: level, dryness_level: level }));
        expect(min.morning.filter((s) => s.key === "serum").length).toBeLessThanOrEqual(2);
        expect(min.night.filter((s) => s.key === "serum").length).toBeLessThanOrEqual(2);
      }
    }
  });

  it("orders serums thin to thick, then by pH", () => {
    const sorted = layerOrder([SERUMS.active_azelaic_acid, SERUMS.active_hyaluronic_acid, SERUMS.active_vitamin_c_pure, SERUMS.active_niacinamide]);
    expect(sorted.map((s) => s.code)).toEqual([
      "active_vitamin_c_pure", "active_hyaluronic_acid", "active_niacinamide", "active_azelaic_acid",
    ]);
    const r = buildRoutine(make({ primary_goal: "brightening", breakouts_level: 3, redness_level: 3, dryness_level: 3, skin_type: "normal" }));
    for (const part of [r.morning, r.night]) {
      const v = part.filter((s) => s.key === "serum").map((s) => Object.values(SERUMS).find((d) => d.label === s.pick)!);
      expect(v.map((x) => x.viscosity)).toEqual([...v.map((x) => x.viscosity)].sort((a, b) => a - b));
    }
  });

  it("explains every step and ties the serums to the member's own answers", () => {
    const r = buildRoutine(make({ breakouts_level: 3 }));
    for (const s of [...r.morning, ...r.night]) {
      expect(s.what.length).toBeGreaterThan(10);
      expect(s.why.length).toBeGreaterThan(10);
    }
    expect(r.morning.concat(r.night).filter((s) => s.key === "serum").every((s) => s.why.startsWith("Because "))).toBe(true);
    expect(r.morning.concat(r.night).some((s) => s.why.includes("moderate"))).toBe(true);
  });

  it("never suggests a retinoid or a brand", () => {
    for (const skin of ["oily", "dry", "combination", "normal", "highly_sensitive"]) {
      for (const goal of ["hydration", "anti_aging", "acne_control", "brightening", "calming"]) {
        const r = buildRoutine(make({ skin_type: skin, primary_goal: goal, age: 45 }));
        for (const s of [...r.morning, ...r.night]) expect(s.pick.toLowerCase()).not.toMatch(/retin/);
      }
    }
  });

  it("keeps sensitive skin off strong acids and strong vitamin C", () => {
    const r = buildRoutine(make({ skin_type: "highly_sensitive", redness_level: 3, primary_goal: "brightening", breakouts_level: 3 }));
    for (const label of serumLabels(r)) {
      expect(label).not.toMatch(/Salicylic|L-ascorbic|Lactic/);
    }
  });
});

describe("allergy interception", () => {
  it("never puts an ingredient the member is allergic to in any serum", () => {
    // Every active the catalogue can recommend, named by every spelling people type.
    for (const def of Object.values(SERUMS)) {
      const entry = entryByCode(def.code)!;
      for (const alias of entry.aliases) {
        for (const goal of ["hydration", "anti_aging", "acne_control", "brightening", "calming"]) {
          const r = buildRoutine(withAllergy(alias, { primary_goal: goal, breakouts_level: 3, redness_level: 2, dryness_level: 2, age: 40 }));
          expect(serumLabels(r), `${alias}/${goal}`).not.toContain(def.label);
        }
      }
    }
  });

  it("swaps the first choice for a gentle alternative and says so", () => {
    const base = buildRoutine(make());
    const first = serumLabels(base)[0];
    const entryCode = Object.values(SERUMS).find((d) => d.label === first)!.code;
    const alias = entryByCode(entryCode)!.aliases[0];
    const r = buildRoutine(withAllergy(alias));
    expect(r.swaps.length).toBeGreaterThan(0);
    expect(r.swaps[0].from).toBe(first);
    expect(r.swaps[0].to).not.toBe(first);
    expect(r.allergens.length).toBeGreaterThan(0);
  });

  it("an allergy to salicylic acid on breakout-prone skin swaps in a different serum", () => {
    const r = buildRoutine(withAllergy("salicylic acid"));
    expect(serumLabels(r).join()).not.toMatch(/Salicylic/);
    expect(r.swaps.some((s) => /Salicylic/.test(s.from) && s.to)).toBe(true);
  });

  it("links an allergen to the actives it rules out (oats -> beta-glucan, honey products -> honey)", () => {
    for (const goal of ["dryness", "hydration"]) {
      const r = buildRoutine(withAllergy("oat", { primary_goal: "hydration", dryness_level: goal === "dryness" ? 4 : 2, skin_type: "dry" }));
      expect(serumLabels(r)).not.toContain(SERUMS.active_beta_glucan.label);
    }
  });

  it("falls back to ONE inert serum and flags it when the allergy text can't be read", () => {
    const r = buildRoutine(withAllergy("some xyzzyfoam stuff", { breakouts_level: 4 }));
    expect(r.conservative).toBe(true);
    expect(r.needsReview).toBe(true);
    expect(r.unrecognisedAllergy.length).toBeGreaterThan(0);
    const am = r.morning.filter((s) => s.key === "serum");
    const pm = r.night.filter((s) => s.key === "serum");
    expect(am.length + pm.length).toBeLessThanOrEqual(2);
    for (const s of [...am, ...pm]) {
      expect(["Hyaluronic acid serum", "Panthenol (vitamin B5) serum", "Polyglutamic acid serum"]).toContain(s.pick);
    }
  });

  it("a recognised allergy plus an unreadable one still fails safe", () => {
    expect(buildRoutine(withAllergy("fragrance, qwertyzzz")).conservative).toBe(true);
  });

  it("every allergen on the reference list builds a routine without it", () => {
    for (const e of [...ALLERGIES, ...ACTIVES]) {
      const r = buildRoutine(withAllergy(e.aliases[0], { breakouts_level: 3, dryness_level: 3, age: 40 }));
      expect(r.morning.length).toBeGreaterThan(3);
      if (e.code.startsWith("active_") && SERUMS[e.code]) expect(serumLabels(r)).not.toContain(SERUMS[e.code].label);
      if (e.code.startsWith("allergy_") && !NON_TOPICAL_ALLERGENS.has(e.code)) expect(r.labelAvoid.length).toBeGreaterThan(0);
    }
  });

  it("picks the sunscreen family around a filter allergy", () => {
    const sun = (note: string) => buildRoutine(withAllergy(note)).morning.at(-1)!.pick;
    expect(sun("oxybenzone")).toMatch(/Mineral/);
    expect(sun("zinc oxide")).toMatch(/Chemical-filter/);
    const both = buildRoutine(withAllergy("avobenzone, zinc oxide"));
    expect(both.morning.at(-1)!.pick).toMatch(/pharmacist/);
    expect(both.needsReview).toBe(true);
  });

  it("skips the face oil for nut, coconut and peanut allergies", () => {
    const dry = { skin_type: "dry", dryness_level: 4, primary_goal: "hydration", breakouts_level: 0 };
    expect(buildRoutine(make(dry)).night.map((s) => s.key)).toContain("face_oil");
    for (const n of ["coconut oil", "almond oil", "peanuts", "tree nuts", "squalane"]) {
      expect(buildRoutine(withAllergy(n, dry)).night.map((s) => s.key), n).not.toContain("face_oil");
    }
  });

  it("an 'unsure' answer adds a patch-test note without changing the serums", () => {
    const r = buildRoutine(make({ allergy_status: "unsure" }));
    expect(r.notes.join(" ")).toMatch(/patch-test/i);
    expect(serumLabels(r)).toEqual(serumLabels(buildRoutine(make())));
  });
});

describe("medication safety", () => {
  it("oral isotretinoin: gentle mode, no acids, richer moisture, face oil, stronger sunscreen line", () => {
    const r = buildRoutine(withMed("Accutane", { breakouts_level: 4 }));
    expect(r.gentleMode).toBe(true);
    expect(r.medications).toContain("oral retinoid");
    for (const l of serumLabels(r)) expect(l).not.toMatch(/Salicylic|Azelaic|Lactic|Mandelic|Gluconolactone|L-ascorbic|Bakuchiol/);
    expect(r.night.map((s) => s.key)).toContain("face_oil");
    expect(r.morning.at(-1)!.why).toMatch(/burn more easily/);
    expect(r.notes.join(" ")).toMatch(/prescriber/);
  });

  it("topical retinoids and benzoyl peroxide also switch to gentle mode", () => {
    for (const n of ["tretinoin", "differin", "benzoyl peroxide", "epiduo"]) {
      expect(buildRoutine(withMed(n)).gentleMode, n).toBe(true);
    }
  });

  it("a medication we don't recognise is treated gently and flagged", () => {
    const r = buildRoutine(withMed("zorblaxin"));
    expect(r.gentleMode).toBe(true);
    expect(r.unrecognisedMedication.length).toBeGreaterThan(0);
    expect(r.needsReview).toBe(true);
  });

  it("no medication leaves the routine unrestricted", () => {
    expect(buildRoutine(make()).gentleMode).toBe(false);
    expect(buildRoutine(make({ medication_use: "no" })).medications).toEqual([]);
  });

  it("a medication that isn't a skin-actives conflict doesn't restrict the routine", () => {
    expect(buildRoutine(withMed("spironolactone")).gentleMode).toBe(false);
  });
});

describe("email", () => {
  it("renders subject, text and HTML for a typical member", () => {
    const m = renderRoutineEmail(buildRoutine(make()));
    expect(m.subject).toContain("Skin Lab Report");
    for (const part of ["THE MORNING ROUTINE", "THE NIGHT ROUTINE", "Why it's for you", "What it does", "ACTIVE SERUMS"]) {
      expect(m.text).toContain(part);
    }
    expect(m.html).toContain("Why it's for you");
    expect(m.text).not.toMatch(/\bAI\b/);
    expect(m.text).not.toMatch(/model/i);
  });

  it("tells the member about the swap in plain words", () => {
    const text = renderRoutineText(buildRoutine(withAllergy("salicylic acid")));
    expect(text).toMatch(/because of your .* allergy, we replaced Salicylic acid \(BHA\) serum with/i);
  });

  it("escapes everything a member typed before it reaches the HTML", () => {
    const html = renderRoutineHtml(buildRoutine(withAllergy('<script>alert(1)</script> "><img src=x onerror=alert(1)>')));
    expect(html).not.toContain("<script>");
    // the only image is our own logo
    expect(html.match(/<img/g)?.length).toBe(1);
    expect(html).toContain("/brand/lockup-aetherskin.png");
    expect(html).not.toMatch(/onerror\s*=/);
    // Unreadable text is also normalised first, so angle brackets never survive to be escaped.
    expect(html).toMatch(/We didn&#39;t recognise|We didn't recognise/);
  });

  it("asks the member to reply when text was unreadable", () => {
    expect(renderRoutineText(buildRoutine(withAllergy("xyzzyfoam")))).toMatch(/Reply with the ingredient name/);
  });
});
