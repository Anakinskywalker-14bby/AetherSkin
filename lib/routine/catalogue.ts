/**
 * What the routine can recommend, and the safety rules around it.
 *
 * Ingredients only, never brands (pre-MVP): allergy swapping then only has to
 * match an active ingredient. Every `code` here must exist in the reference
 * lists; test/routine.test.ts fails if one does not.
 *
 * Deliberately NOT recommended: retinol and other retinoids. The quiz does not
 * ask about pregnancy, so it cannot screen for them. Bakuchiol is the
 * night-time anti-ageing option instead.
 */

export type Concern = "breakouts" | "redness" | "dryness" | "tone" | "aging";

export interface SerumDef {
  /** active_* code in the active-ingredient reference list */
  code: string;
  label: string;
  /** Approximate formula pH: used to order layers when viscosity ties. */
  ph: number;
  /** 1 = water-thin ... 5 = thick cream-gel. Layer thin to thick. */
  viscosity: 1 | 2 | 3 | 4 | 5;
  time: "am" | "pm" | "both";
  /** Fine for highly sensitive or red skin. */
  gentle: boolean;
  /** A class C resurfacing acid: at most one per routine. */
  exfoliant?: boolean;
  /** Strong acid or high-potency form: never for sensitive skin or "gentle mode". */
  harsh?: boolean;
  /** Skip for dry skin or severe dryness. */
  drying?: boolean;
  what: string;
  /** Sentence continuing "Because <their concern>, ..." */
  why: Partial<Record<Concern, string>>;
}

export const SERUMS: Record<string, SerumDef> = {
  active_niacinamide: {
    code: "active_niacinamide", label: "Niacinamide serum", ph: 6.0, viscosity: 2, time: "both", gentle: true,
    what: "Helps balance oil, tighten the look of pores and calm irritated skin.",
    why: {
      breakouts: "this works on the oil and congestion behind your spots without stinging.",
      redness: "it quietly settles the flare-ups while it strengthens your barrier.",
      tone: "it softens the look of uneven patches over a few weeks.",
      aging: "it supports a smoother, stronger-looking surface day after day.",
      dryness: "it helps your skin hold on to the water you give it.",
    },
  },
  active_hyaluronic_acid: {
    code: "active_hyaluronic_acid", label: "Hyaluronic acid serum", ph: 5.5, viscosity: 1, time: "both", gentle: true,
    what: "A water-magnet that plumps skin with surface hydration.",
    why: {
      dryness: "this pulls water into the parts of your skin that feel tight and keeps it there.",
      aging: "plump, hydrated skin makes fine lines look softer, fast.",
      breakouts: "hydrated skin is calmer skin, and it keeps oil production from overcompensating.",
      redness: "well-hydrated skin reacts less, so you flush less.",
      tone: "hydrated skin reflects light evenly, so your tone looks fresher.",
    },
  },
  active_panthenol: {
    code: "active_panthenol", label: "Panthenol (vitamin B5) serum", ph: 5.5, viscosity: 2, time: "both", gentle: true,
    what: "Soothes, hydrates and helps repair a stressed skin barrier.",
    why: {
      dryness: "it rebuilds the barrier that is letting your moisture escape.",
      redness: "it takes the heat out of irritated, reactive skin.",
      breakouts: "it calms angry spots without drying you out.",
      tone: "a repaired barrier heals marks faster.",
      aging: "a strong barrier is the base of smooth-looking skin.",
    },
  },
  active_centella_asiatica: {
    code: "active_centella_asiatica", label: "Centella (cica) serum", ph: 5.5, viscosity: 2, time: "both", gentle: true,
    what: "A calming plant extract that soothes redness and supports healing.",
    why: {
      redness: "this is the one to reach for when skin flushes: it soothes while it repairs.",
      breakouts: "it settles the inflamed, red look around spots.",
      dryness: "it comforts tight, stressed skin.",
      tone: "it helps blemish marks fade by supporting healing.",
      aging: "it supports skin repair so you look rested.",
    },
  },
  active_beta_glucan: {
    code: "active_beta_glucan", label: "Beta-glucan serum", ph: 5.5, viscosity: 2, time: "both", gentle: true,
    what: "A calming hydrator that comforts reactive skin.",
    why: {
      dryness: "it adds a soothing layer of hydration that lasts.",
      redness: "it calms reactive skin while it hydrates.",
      breakouts: "it comforts irritated skin without adding oil.",
      tone: "calm skin heals evenly.",
      aging: "comfortable, hydrated skin looks smoother.",
    },
  },
  active_polyglutamic_acid: {
    code: "active_polyglutamic_acid", label: "Polyglutamic acid serum", ph: 5.5, viscosity: 1, time: "both", gentle: true,
    what: "A hydrator that holds water on the skin's surface.",
    why: {
      dryness: "it layers extra, lasting hydration over the tightness you described.",
      aging: "it plumps the look of fine lines.",
      redness: "it hydrates without a single irritant.",
      breakouts: "it hydrates without any grease.",
      tone: "it keeps skin looking even and fresh.",
    },
  },
  active_azelaic_acid: {
    code: "active_azelaic_acid", label: "Azelaic acid serum", ph: 4.5, viscosity: 4, time: "pm", gentle: true, exfoliant: true,
    what: "A gentle acid that calms redness, clears pores and fades marks.",
    why: {
      redness: "it is one of the few actives that calms redness and clears congestion together.",
      breakouts: "it clears pores and fades the red marks spots leave behind.",
      tone: "it fades dark marks and evens tone, gently.",
      aging: "it refines texture and tone.",
      dryness: "it smooths rough patches without the sting of stronger acids.",
    },
  },
  active_bha_salicylic: {
    code: "active_bha_salicylic", label: "Salicylic acid (BHA) serum", ph: 3.5, viscosity: 1, time: "pm", gentle: false,
    exfoliant: true, harsh: true, drying: true,
    what: "An oil-soluble acid that goes inside pores to clear them.",
    why: {
      breakouts: "it dives into pores to dissolve the clogs that become your spots.",
      tone: "it clears congestion that dulls your skin.",
      redness: "it clears the clogs that inflame skin.",
      aging: "it smooths rough texture.",
      dryness: "it lifts dead, flaky skin.",
    },
  },
  active_aha_lactic: {
    code: "active_aha_lactic", label: "Lactic acid (AHA) serum", ph: 3.8, viscosity: 2, time: "pm", gentle: false,
    exfoliant: true, harsh: true,
    what: "A mild exfoliating acid that also hydrates.",
    why: {
      tone: "it lifts the dull top layer so brighter skin shows through.",
      aging: "it smooths rough texture and the look of fine lines.",
      dryness: "it sloughs flakes while it holds water in.",
      breakouts: "it keeps the surface from building up and clogging.",
      redness: "it smooths the surface, once your skin tolerates it.",
    },
  },
  active_aha_mandelic: {
    code: "active_aha_mandelic", label: "Mandelic acid serum", ph: 3.8, viscosity: 2, time: "pm", gentle: true, exfoliant: true,
    what: "A larger, gentler exfoliating acid that is kind to sensitive skin.",
    why: {
      breakouts: "it clears the surface without the harshness of stronger acids.",
      tone: "it fades marks and evens tone with little irritation.",
      redness: "it exfoliates gently so redness-prone skin stays comfortable.",
      aging: "it smooths texture gently.",
      dryness: "it smooths flakes gently.",
    },
  },
  active_pha_gluconolactone: {
    code: "active_pha_gluconolactone", label: "Gluconolactone (PHA) serum", ph: 4.0, viscosity: 2, time: "pm", gentle: true,
    exfoliant: true,
    what: "The gentlest exfoliating acid: smooths texture and hydrates.",
    why: {
      tone: "it brightens dull skin with almost no sting.",
      aging: "it smooths texture and fine lines gently.",
      dryness: "it exfoliates while it hydrates, so tight skin is not made worse.",
      redness: "it is gentle enough for skin that flushes easily.",
      breakouts: "it keeps pores clear without drying you out.",
    },
  },
  active_vitamin_c_pure: {
    code: "active_vitamin_c_pure", label: "Vitamin C (L-ascorbic acid) serum", ph: 3.0, viscosity: 1, time: "am", gentle: false,
    harsh: true,
    what: "A potent antioxidant that shields skin from pollution and fades dark spots.",
    why: {
      tone: "it fades dark spots and gives you that lit-from-within look.",
      aging: "it neutralises the daily damage that shows up as lines and dullness.",
      breakouts: "it helps fade the marks your spots leave.",
      redness: "it protects the skin barrier from daily stress.",
      dryness: "it protects your skin from the damage that dries it out.",
    },
  },
  active_vitamin_c_derivative: {
    code: "active_vitamin_c_derivative", label: "Gentle vitamin C (ascorbyl) serum", ph: 5.5, viscosity: 2, time: "am",
    gentle: true,
    what: "A stable, gentle form of vitamin C that brightens and protects.",
    why: {
      tone: "it brightens and fades dark spots without the sting of stronger forms.",
      aging: "it shields skin from daily damage that shows up as lines and dullness.",
      breakouts: "it helps fade the marks spots leave behind.",
      redness: "it protects without irritating.",
      dryness: "it protects your skin from daily damage.",
    },
  },
  active_tranexamic_acid: {
    code: "active_tranexamic_acid", label: "Tranexamic acid serum", ph: 5.0, viscosity: 1, time: "both", gentle: true,
    what: "A brightening ingredient that targets stubborn dark patches.",
    why: {
      tone: "it goes straight at stubborn patches and uneven tone.",
      breakouts: "it fades the dark marks spots leave behind.",
      redness: "it evens out post-inflammation marks.",
      aging: "it fades sun and age spots.",
      dryness: "it brightens without any dryness.",
    },
  },
  active_licorice_root: {
    code: "active_licorice_root", label: "Licorice root serum", ph: 5.5, viscosity: 2, time: "both", gentle: true,
    what: "A soothing plant extract that gently brightens.",
    why: {
      tone: "it softens uneven tone with next to no irritation.",
      redness: "it soothes while it brightens.",
      breakouts: "it calms and fades post-spot marks.",
      aging: "it brightens a tired complexion.",
      dryness: "it soothes without drying.",
    },
  },
  active_bakuchiol: {
    code: "active_bakuchiol", label: "Bakuchiol serum", ph: 5.5, viscosity: 3, time: "pm", gentle: true,
    what: "A plant-derived, gentler alternative to retinol that supports smoother-looking skin.",
    why: {
      aging: "it works with your night-time repair cycle to smooth the look of fine lines, with far less irritation than retinol.",
      tone: "it helps even tone while you sleep.",
      breakouts: "it supports clearer-looking skin gently.",
      redness: "it is kind to reactive skin.",
      dryness: "it smooths without drying.",
    },
  },
  active_peptides: {
    code: "active_peptides", label: "Peptide serum", ph: 5.5, viscosity: 2, time: "both", gentle: true,
    what: "Small signalling proteins that help skin look firmer and smoother.",
    why: {
      aging: "they tell your skin to keep building its structure, so lines look softer.",
      dryness: "they strengthen the barrier that holds moisture in.",
      redness: "they support repair gently.",
      breakouts: "they support healing gently.",
      tone: "they support even, healthy renewal.",
    },
  },
  active_adenosine: {
    code: "active_adenosine", label: "Adenosine serum", ph: 5.5, viscosity: 2, time: "both", gentle: true,
    what: "A calming anti-ageing ingredient that supports smoother-looking skin.",
    why: {
      aging: "it smooths the look of fine lines and calms skin while it does.",
      redness: "it is calming and gentle.",
      dryness: "it supports a comfortable barrier.",
      breakouts: "it is gentle on skin that is already inflamed.",
      tone: "it supports even, healthy skin.",
    },
  },
};

/** Candidates for each concern, best first. The first usable one is chosen. */
export const CANDIDATES: Record<Concern, string[]> = {
  breakouts: [
    "active_bha_salicylic", "active_azelaic_acid", "active_aha_mandelic", "active_niacinamide",
    "active_centella_asiatica", "active_panthenol", "active_hyaluronic_acid",
  ],
  redness: [
    "active_centella_asiatica", "active_niacinamide", "active_azelaic_acid", "active_panthenol",
    "active_beta_glucan", "active_hyaluronic_acid",
  ],
  dryness: [
    "active_hyaluronic_acid", "active_panthenol", "active_beta_glucan", "active_polyglutamic_acid",
    "active_peptides", "active_pha_gluconolactone",
  ],
  tone: [
    "active_vitamin_c_pure", "active_vitamin_c_derivative", "active_tranexamic_acid", "active_niacinamide",
    "active_licorice_root", "active_azelaic_acid",
  ],
  aging: [
    "active_vitamin_c_pure", "active_vitamin_c_derivative", "active_bakuchiol", "active_peptides",
    "active_adenosine", "active_niacinamide", "active_hyaluronic_acid",
  ],
};

/** Used only when a routine would otherwise have no serum at all. */
export const FALLBACK: string[] = [
  "active_hyaluronic_acid", "active_panthenol", "active_niacinamide", "active_beta_glucan",
  "active_polyglutamic_acid", "active_centella_asiatica",
];

/** The single most inert option, used when we cannot read an allergy note. */
export const MOST_INERT: string[] = ["active_hyaluronic_acid", "active_panthenol", "active_polyglutamic_acid"];

/** Layer thin to thick, then lower pH first. */
export function layerOrder<T extends { viscosity: number; ph: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.viscosity - b.viscosity || a.ph - b.ph);
}

// ── medications ──────────────────────────────────────────────────────────

/**
 * Prescription actives that already exfoliate, dry or sensitise the skin.
 * While on one, the routine stays "gentle": no resurfacing acids, no strong
 * vitamin C, no bakuchiol.
 */
export const GENTLE_MODE_MEDS = new Set([
  "med_isotretinoin", "med_oral_acitretin", "med_oral_alitretinoin",
  "med_topical_tretinoin", "med_topical_adapalene", "med_topical_tazarotene", "med_topical_trifarotene",
  "med_topical_adapalene_bpo", "med_topical_tretinoin_bpo", "med_topical_clindamycin_tret",
  "med_topical_benzoyl_peroxide", "med_topical_azelaic_rx", "med_topical_hydroquinone",
  "med_topical_triple_combination", "med_topical_mequinol", "med_topical_fluorouracil",
  "med_topical_imiquimod", "med_topical_tirbanibulin", "med_topical_ruxolitinib",
]);

/** Oral retinoids leave skin and lips very dry: add richer moisture and an oil. */
export const VERY_DRYING_MEDS = new Set(["med_isotretinoin", "med_oral_acitretin", "med_oral_alitretinoin"]);

/** Medicines that make skin burn more easily: sunscreen is stressed harder. */
export const PHOTOSENSITIVE_MEDS = new Set([
  "med_doxycycline", "med_minocycline", "med_lymecycline", "med_oral_sarecycline", "med_isotretinoin",
  "med_oral_acitretin", "med_oral_alitretinoin", "med_methotrexate", "med_topical_tretinoin",
  "med_topical_adapalene", "med_topical_tazarotene", "med_topical_trifarotene", "med_topical_adapalene_bpo",
  "med_topical_tretinoin_bpo", "med_topical_clindamycin_tret", "med_topical_fluorouracil",
  "med_topical_imiquimod", "med_oral_voriconazole", "med_oral_hydroxychloroquine",
]);

// ── allergies ────────────────────────────────────────────────────────────

/**
 * Allergen codes that cannot reach skin care (food, air-borne, latex, hair
 * dye, rubber, jewellery metals, nail products). Everything else on the allergy
 * list is treated as a possible skin-care ingredient, so a NEW code added to
 * the list is safe by default (it goes on the "check labels" list).
 */
export const NON_TOPICAL_ALLERGENS = new Set([
  "allergy_food_fish", "allergy_food_shellfish", "allergy_food_egg", "allergy_food_dairy",
  "allergy_inhalant_dust_mites", "allergy_inhalant_pet_dander", "allergy_inhalant_cockroach",
  "allergy_inhalant_molds", "allergy_inhalant_pollen", "allergy_latex", "allergy_ppd_hair_dye",
  "allergy_hair_dye_toluene", "allergy_rubber_thiuram", "allergy_rubber_carbamates", "allergy_rubber_mbt",
  "allergy_rubber_black", "allergy_gold", "allergy_nickel", "allergy_metal_cobalt", "allergy_metal_chromium",
  "allergy_metal_palladium", "allergy_disperse_dyes", "allergy_acrylates", "allergy_antibiotic_neomycin",
  "allergy_antibiotic_bacitracin", "allergy_antibiotic_polymyxin_b",
]);

/** Allergens that also rule out a catalogue serum (beyond naming it directly). */
export const ALLERGY_BLOCKS_ACTIVE: Record<string, string[]> = {
  allergy_snail_mucin: ["active_snail_mucin"],
  allergy_coenzyme_q10: ["active_coenzyme_q10"],
  allergy_bee_products: ["active_honey"],
  allergy_food_oat: ["active_beta_glucan"],
  allergy_soy: ["active_genistein"],
  allergy_food_soy: ["active_genistein"],
  allergy_coal_tar: ["active_coal_tar_exfoliant"],
  allergy_propylene_glycol: ["active_pentylene_glycol"],
  allergy_butylene_glycol: ["active_pentylene_glycol"],
};

/** Sunscreen filter families. */
export const CHEMICAL_FILTER_ALLERGENS = new Set([
  "allergy_chemical_sunscreen_generic", "allergy_uv_avobenzone", "allergy_uv_oxybenzone", "allergy_uv_octinoxate",
  "allergy_uv_octocrylene", "allergy_uv_homosalate", "allergy_uv_octisalate", "allergy_uv_tinosorb",
  "allergy_uv_mexoryl", "allergy_uv_paba",
]);
export const MINERAL_FILTER_ALLERGENS = new Set([
  "allergy_mineral_sunscreen_generic", "allergy_zinc_oxide", "allergy_titanium_dioxide",
]);

/** Oils that rule out a face oil (nut, coconut, peanut, soy and essential oils). */
export const OIL_BLOCKING_ALLERGENS = new Set([
  "allergy_coconut_oil", "allergy_almond_oil", "allergy_peanut_oil", "allergy_food_peanuts",
  "allergy_food_tree_nuts", "allergy_soy", "allergy_food_soy", "allergy_essential_oils",
]);

/** Active codes used in non-serum steps. */
export const STEP_ACTIVES = {
  moisturiser: ["active_ceramides", "active_glycerin", "active_panthenol"],
  faceOil: "active_squalane",
} as const;
