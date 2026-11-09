import {
  CANDIDATES,
  CHEMICAL_FILTER_ALLERGENS,
  FALLBACK,
  GENTLE_MODE_MEDS,
  MINERAL_FILTER_ALLERGENS,
  MOST_INERT,
  NON_TOPICAL_ALLERGENS,
  OIL_BLOCKING_ALLERGENS,
  PHOTOSENSITIVE_MEDS,
  SERUMS,
  STEP_ACTIVES,
  VERY_DRYING_MEDS,
  ALLERGY_BLOCKS_ACTIVE,
  layerOrder,
  type Concern,
  type SerumDef,
} from "./catalogue";
import { matchAllergyNote, matchMedicationNote } from "./match";
import { displayName } from "./reference";

/**
 * Builds a member's morning and night routine from their quiz answers.
 *
 * Rule-based on purpose: it reads the answers the person gave (including how
 * their skin looks now) and applies fixed, reviewable safety rules. No brands,
 * only ingredients, so allergy swapping only has to match an active.
 *
 * Safety rules (see test/routine.test.ts):
 *  - an allergen the member named is NEVER in the routine; it is swapped for
 *    the next-best gentle ingredient, or dropped if nothing safe is left
 *  - a note we cannot read is treated as a possible allergen: the routine falls
 *    back to one inert serum and the member is told to reply
 *  - prescription retinoids and other strong actives switch the routine to
 *    "gentle mode" (no resurfacing acids, no strong vitamin C)
 *  - retinol and other retinoids are never suggested (the quiz does not ask
 *    about pregnancy)
 */

export interface RoutineInput {
  gender?: string | null;
  medication_use?: string | null;
  medication_details?: string | null;
  allergy_status?: string | null;
  allergy_details?: string | null;
  primary_goal: string;
  skin_type: string;
  environment: string;
  texture_preference: string;
  sunscreen_frequency: number;
  routine_complexity: number;
  age: number;
  breakouts_level: number;
  redness_level: number;
  dryness_level: number;
}

export type StepKey =
  | "cleanser" | "double_cleanse" | "toner" | "serum" | "moisturiser" | "night_cream" | "sunscreen" | "face_oil";

export interface RoutineStep {
  key: StepKey;
  title: string;
  nickname: string;
  /** What to use, as an ingredient/category, never a brand. */
  pick: string;
  what: string;
  /** The personal part: why this step, for THIS person. */
  why: string;
  tip?: string;
}

export interface Swap {
  /** The first-choice ingredient that was ruled out. */
  from: string;
  /** What replaced it, or null if nothing safe was left. */
  to: string | null;
  because: string;
}

export interface Routine {
  morning: RoutineStep[];
  night: RoutineStep[];
  focus: { concern: Concern; phrase: string }[];
  /** Allergens we recognised, by name. */
  allergens: string[];
  swaps: Swap[];
  /** Ingredients to look out for on the label of every other product. */
  labelAvoid: string[];
  /** Medication classes we recognised, e.g. "oral retinoid". */
  medications: string[];
  gentleMode: boolean;
  /** Allergy text we could not read: routine fell back to the simplest serum. */
  conservative: boolean;
  unrecognisedAllergy: string[];
  unrecognisedMedication: string[];
  /** A person should look at this before it is sent. */
  needsReview: boolean;
  notes: string[];
}

const LEVEL_WORD = ["no", "very mild", "mild", "moderate", "severe"];
const GOAL_CONCERN: Record<string, Concern> = {
  hydration: "dryness",
  anti_aging: "aging",
  acne_control: "breakouts",
  brightening: "tone",
  calming: "redness",
};
const TIE_ORDER: Concern[] = ["breakouts", "redness", "dryness", "tone", "aging"];

const clampLevel = (n: number) => (Number.isFinite(n) ? Math.min(4, Math.max(0, Math.round(n))) : 0);
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const className = (cls: string) => cls.replace(/\s*\(.*?\)\s*/g, " ").trim().toLowerCase();

function phrases(i: RoutineInput): Record<Concern, string> {
  const b = clampLevel(i.breakouts_level), r = clampLevel(i.redness_level), d = clampLevel(i.dryness_level);
  return {
    breakouts: b >= 1 ? `you rated your breakouts as ${LEVEL_WORD[b]}` : "you want to keep your skin clear",
    redness: r >= 1 ? `you told us you have ${LEVEL_WORD[r]} redness` : "you want to keep your skin calm",
    dryness: d >= 1 ? `you described ${LEVEL_WORD[d]} dryness or tightness` : "you want your skin to stay hydrated",
    tone: "you want a brighter, more even tone",
    aging: "you want to smooth fine lines and protect your skin for the long run",
  };
}

export function buildRoutine(input: RoutineInput): Routine {
  const b = clampLevel(input.breakouts_level), r = clampLevel(input.redness_level), d = clampLevel(input.dryness_level);
  const skin = input.skin_type;
  const phrase = phrases(input);

  // ── what the member told us about allergies and medication ───────────
  const allergy = matchAllergyNote(input.allergy_status === "yes" ? input.allergy_details : null);
  const medNote = input.medication_use === "yes" ? matchMedicationNote(input.medication_details) : null;

  const allergenCodes = new Set(allergy.entries.map((e) => e.code));
  const blockedActives = new Set<string>();
  for (const e of allergy.entries) {
    if (e.code.startsWith("active_")) blockedActives.add(e.code);
    for (const a of ALLERGY_BLOCKS_ACTIVE[e.code] ?? []) blockedActives.add(a);
  }
  const allergenNames = allergy.entries.map(displayName);
  const labelAvoid = allergy.entries.filter((e) => !NON_TOPICAL_ALLERGENS.has(e.code)).map(displayName);
  const chemBlocked = [...allergenCodes].some((c) => CHEMICAL_FILTER_ALLERGENS.has(c));
  const mineralBlocked = [...allergenCodes].some((c) => MINERAL_FILTER_ALLERGENS.has(c));
  const oilBlocked =
    [...allergenCodes].some((c) => OIL_BLOCKING_ALLERGENS.has(c)) || blockedActives.has(STEP_ACTIVES.faceOil);

  // Text we could not read, or "yes" with nothing usable, is treated as a
  // possible allergen: simplest routine, flagged for a person to look at.
  const conservative =
    allergy.unrecognised.length > 0 || (input.allergy_status === "yes" && allergy.entries.length === 0);

  const medCodes = new Set((medNote?.entries ?? []).map((e) => e.code));
  const unrecognisedMedication = medNote?.unrecognised ?? [];
  const gentleMode =
    [...medCodes].some((c) => GENTLE_MODE_MEDS.has(c)) ||
    unrecognisedMedication.length > 0 ||
    (input.medication_use === "yes" && medCodes.size === 0);
  const veryDrying = [...medCodes].some((c) => VERY_DRYING_MEDS.has(c));
  const photosensitive = [...medCodes].some((c) => PHOTOSENSITIVE_MEDS.has(c));
  const medicationNames = [...new Set((medNote?.entries ?? []).map((e) => className(e.cls ?? "")))].filter(Boolean);

  const sensitive = skin === "highly_sensitive" || r >= 3;
  const drySkin = skin === "dry" || d >= 3;

  // ── which concerns to treat ───────────────────────────────────────────
  const goal = GOAL_CONCERN[input.primary_goal] ?? "dryness";
  const score: Record<Concern, number> = {
    breakouts: b, redness: r, dryness: d, tone: 0, aging: input.age >= 35 ? 1 : 0,
  };
  score[goal] += 2;
  const ranked = TIE_ORDER.filter((c) => score[c] >= 2).sort(
    (x, y) => score[y] - score[x] || (x === goal ? -1 : y === goal ? 1 : 0)
  );
  if (ranked.length === 0) ranked.push(goal);

  const maxSerums = conservative ? 1 : input.routine_complexity <= 0 ? 2 : 3;

  // ── choose serums, with the allergy interception ──────────────────────
  const picks: { def: SerumDef; concern: Concern }[] = [];
  const swaps: Swap[] = [];

  const skipped = (def: SerumDef): boolean =>
    (!def.gentle && sensitive) ||
    (!!def.harsh && (gentleMode || conservative || sensitive)) ||
    (!!def.exfoliant && (gentleMode || conservative)) ||
    (!!def.exfoliant && picks.some((p) => p.def.exfoliant)) ||
    (!!def.drying && drySkin) ||
    (conservative && !MOST_INERT.includes(def.code)) ||
    (gentleMode && def.code === "active_bakuchiol");

  const allergenFor = (def: SerumDef): string => {
    const hit = allergy.entries.find(
      (e) => e.code === def.code || (ALLERGY_BLOCKS_ACTIVE[e.code] ?? []).includes(def.code)
    );
    return hit ? displayName(hit) : "an ingredient you told us about";
  };

  function pickFor(concern: Concern): boolean {
    const usable = CANDIDATES[concern].map((c) => SERUMS[c]).filter((def) => def && !skipped(def));
    const ideal = usable[0];
    const chosen = usable.find((def) => !blockedActives.has(def.code) && !picks.some((p) => p.def.code === def.code));
    if (ideal && blockedActives.has(ideal.code) && !swaps.some((s) => s.from === ideal.label)) {
      swaps.push({ from: ideal.label, to: chosen?.label ?? null, because: allergenFor(ideal) });
    }
    if (!chosen) return false;
    picks.push({ def: chosen, concern });
    return true;
  }

  for (const c of ranked) {
    if (picks.length >= maxSerums) break;
    pickFor(c);
  }
  // A severe concern earns a second serum while there is room.
  for (const c of ranked) {
    if (picks.length >= maxSerums) break;
    if (score[c] >= 3) pickFor(c);
  }
  // Every routine gets at least one serum, if any safe one exists.
  const ensure = (time: "am" | "pm") => {
    if (picks.some((p) => p.def.time === "both" || p.def.time === time)) return;
    const def = (conservative ? MOST_INERT : FALLBACK)
      .map((c) => SERUMS[c])
      .find((s) => s && !skipped(s) && !blockedActives.has(s.code) && (s.time === "both" || s.time === time));
    if (def) picks.push({ def, concern: ranked[0] });
  };
  ensure("am");
  ensure("pm");

  const serumsFor = (time: "am" | "pm") =>
    layerOrder(picks.filter((p) => p.def.time === "both" || p.def.time === time).map((p) => ({ ...p, ...p.def }))).slice(0, 3);

  // ── the other steps ───────────────────────────────────────────────────

  const cleanserPick = sensitive
    ? "Fragrance-free cream or milk cleanser"
    : drySkin
      ? "Non-foaming cream or balm cleanser"
      : skin === "oily" || b >= 3
        ? "Gentle gel cleanser"
        : "Gentle pH-balanced cleanser";
  const doubleCleanse =
    input.sunscreen_frequency >= 2 || input.environment === "urban_pollution" || input.environment === "outdoors";

  const tonerPick =
    sensitive || drySkin ? "Alcohol-free hydrating toner or essence" : skin === "oily" || b >= 2 ? "Alcohol-free balancing toner" : "Alcohol-free hydrating toner";

  const texture = input.texture_preference;
  const moistPick = (night: boolean): string => {
    if (sensitive) return night ? "Fragrance-free barrier night cream" : "Fragrance-free barrier moisturiser";
    if (drySkin || veryDrying || texture === "rich_cream") return night ? "Rich ceramide night cream" : "Barrier cream with ceramides";
    if (texture === "oil_balm") return night ? "Nourishing balm night cream" : "Nourishing balm moisturiser";
    if (skin === "oily" || b >= 3 || texture === "gel_fluid") return night ? "Light gel night cream" : "Oil-free gel moisturiser";
    return night ? "Comforting night cream" : "Lightweight lotion moisturiser";
  };
  const moistKeys = STEP_ACTIVES.moisturiser.filter((c) => !blockedActives.has(c));
  const moistTip = [
    moistKeys.length ? `Handy ingredients to look for: ${moistKeys.map((c) => c.replace("active_", "").replace(/_/g, " ")).join(", ")}.` : undefined,
  ].filter(Boolean).join(" ") || undefined;

  let sunPick: string;
  let needsReview = conservative || unrecognisedMedication.length > 0;
  if (chemBlocked && mineralBlocked) {
    sunPick = "A fragrance-free SPF 30+ chosen with your pharmacist";
    needsReview = true;
  } else if (chemBlocked) {
    sunPick = "Mineral (zinc oxide or titanium dioxide) SPF 30+";
  } else if (mineralBlocked) {
    sunPick = "Chemical-filter SPF 30+ with no zinc or titanium";
  } else if (sensitive) {
    sunPick = "Gentle mineral SPF 30+";
  } else if (skin === "oily" || b >= 2) {
    sunPick = "Lightweight fluid or gel SPF 30+";
  } else if (drySkin) {
    sunPick = "Hydrating cream SPF 30+";
  } else {
    sunPick = "Broad-spectrum SPF 30+";
  }
  if (input.environment === "outdoors" && !sunPick.includes("pharmacist")) sunPick += " (SPF 50 for long outdoor days)";

  const oilOk =
    !oilBlocked &&
    (veryDrying || ((skin === "dry" || d >= 2 || texture === "oil_balm") && skin !== "oily" && b < 3));

  // ── assemble the two routines ─────────────────────────────────────────
  const serumStep = (p: ReturnType<typeof serumsFor>[number], night: boolean): RoutineStep => ({
    key: "serum",
    title: "ACTIVE SERUM",
    nickname: night ? "The Nighttime Rebuilder" : "Your Targeted Corrector",
    pick: p.label,
    what: p.what,
    why: sentence(`because ${phrase[p.concern]}, ${p.why[p.concern] ?? p.what.toLowerCase()}`),
  });

  const morning: RoutineStep[] = [
    {
      key: "cleanser", title: "CLEANSER", nickname: "The Clean Slate", pick: cleanserPick,
      what: "Sweeps away overnight oil and dead cells without stripping your barrier.",
      why:
        skin === "oily" || b >= 2
          ? "Your breakouts start with oil and congestion, so a clean, balanced canvas matters: it lets your treatments reach your skin instead of sitting on excess oil."
          : drySkin || d >= 2
            ? "Your skin tells us it runs dry, so this clears the night away without taking the moisture you have."
            : "A calm, clean start means every step after it works properly.",
    },
    {
      key: "toner", title: "TONER", nickname: "The Prep Step", pick: tonerPick,
      what: "A light splash that balances your skin's pH and floods it with first-layer hydration.",
      why: "Damp skin takes up your serums far better than bone-dry skin, so this one step makes the rest work harder.",
    },
    ...serumsFor("am").map((p) => serumStep(p, false)),
    {
      key: "moisturiser", title: "MOISTURISER", nickname: "The Guard Rail", pick: moistPick(false),
      what: "Seals in your serums and locks down structural hydration.",
      why: d >= 2
        ? "You told us your skin feels dry or tight. This cushions your outer barrier so the moisture stays in through a busy day."
        : "It cushions your outer barrier so moisture does not evaporate through the day.",
      tip: moistTip,
    },
    {
      key: "sunscreen", title: "SUNSCREEN (SPF 30+)", nickname: "The Ultimate Insurance Policy", pick: sunPick,
      what: "Defends your skin cells against the ageing, damaging rays of the sun.",
      why: photosensitive
        ? "Your medication makes skin burn more easily, so this is non-negotiable: apply generously and reapply every two hours outdoors."
        : `Skip this and every other step works against you, especially since ${phrase[ranked[0]]}. Sun undoes progress faster than any serum builds it.`,
    },
  ];

  const night: RoutineStep[] = [
    doubleCleanse
      ? {
          key: "double_cleanse", title: "DOUBLE CLEANSE", nickname: "The Deep Reset",
          pick: `Oil or balm cleanser first, then ${cleanserPick.charAt(0).toLowerCase()}${cleanserPick.slice(1)}`,
          what: "An oil-based cleanser breaks down SPF, pollution and stubborn debris, then your water-based wash lifts the rest.",
          why: input.environment === "urban_pollution"
            ? "You spend your days in high-pollution air that clings to skin. Clearing it fully each night keeps pores empty while you sleep."
            : "Sunscreen and a day outside leave stubborn residue. A first oil-based cleanse dissolves it so nothing is left sitting in your pores overnight.",
        }
      : {
          key: "cleanser", title: "CLEANSER", nickname: "The Reset", pick: cleanserPick,
          what: "Removes the day's oil, dirt and sunscreen so your skin can repair overnight.",
          why: "Your skin does its repair work while you sleep, and it can only do it on a clean surface.",
        },
    {
      key: "toner", title: "TONER", nickname: "The Midnight Hydrator", pick: tonerPick,
      what: "Calms skin after cleansing and brings moisture back to the right level.",
      why: "It resets your skin after cleansing so your night serums sink in instead of sitting on tight, stripped skin.",
    },
    ...serumsFor("pm").map((p) => serumStep(p, true)),
    {
      key: "night_cream", title: "MOISTURISER / NIGHT CREAM", nickname: "The Sleep Mask", pick: moistPick(true),
      what: "A richer, nourishing layer that works overnight to restore your skin barrier.",
      why: d >= 2 || veryDrying
        ? "Skin loses the most water overnight. This is your answer to the dryness you described: it repairs while you sleep."
        : "Overnight is when skin repairs. This keeps the barrier strong and comfortable until morning.",
      tip: moistTip,
    },
  ];
  if (oilOk) {
    night.push({
      key: "face_oil", title: "FACE OIL (OPTIONAL)", nickname: "The Ultimate Seal", pick: "Squalane face oil (light, non-greasy)",
      what: "A final emollient layer that seals in every layer of hydration underneath.",
      why: veryDrying
        ? "Your medication dries skin and lips out. Pressing a few drops over your night cream stops that moisture escaping."
        : "Your skin loses moisture quickly overnight. This blanket of oil seals the whole routine in, so you wake up soft and plump.",
    });
  }

  const notes = [
    "Patch-test every new product on your inner arm for 24 hours before using it on your face, and introduce one new product at a time.",
    "This is cosmetic skincare guidance based on your quiz answers, not a diagnosis or medical advice. If a skin concern is severe, painful or changing, see a GP or dermatologist.",
  ];
  if (input.medication_use === "yes") {
    notes.push("Because you take medication for your skin, check this routine with your prescriber or pharmacist before you start.");
  }
  if (input.allergy_status === "unsure") {
    notes.push("You weren't sure about allergies, so patch-testing matters more for you: if anything stings, swells or reddens, stop using it.");
  }

  return {
    morning,
    night,
    focus: ranked.map((concern) => ({ concern, phrase: phrase[concern] })),
    allergens: allergenNames,
    swaps,
    labelAvoid,
    medications: medicationNames,
    gentleMode,
    conservative,
    unrecognisedAllergy: allergy.unrecognised,
    unrecognisedMedication,
    needsReview,
    notes,
  };
}
