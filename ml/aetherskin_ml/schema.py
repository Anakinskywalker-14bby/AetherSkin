"""Quiz v3 schema, mirrored from lib/validation/quiz.ts and the CHECK
constraints in supabase/migrations/20261021000002_quiz_v3.sql.

tests/test_schema.py fails if this file and the migration ever disagree.
Never renumber or rename a code: rows already collected would silently
change meaning. Add an option, or a new quiz version.
"""

QUIZ_VERSION = 3

# Part 1: categorical, one-hot encoded against these FIXED lists (never
# against whatever happens to appear in a batch).
CATEGORICAL = {
    "primary_goal": ["hydration", "anti_aging", "acne_control", "brightening", "calming"],
    "skin_type": ["oily", "dry", "combination", "normal", "highly_sensitive"],
    "environment": ["climate_controlled_indoor", "outdoors", "urban_pollution", "balanced_indoor"],
    "texture_preference": ["gel_fluid", "rich_cream", "oil_balm", "no_preference"],
}

# Parts 2 and 4: ordinal, (min, max). Used as ranked numbers.
ORDINAL = {
    "sunscreen_frequency": (0, 3),
    "stress_level": (1, 5),
    "routine_complexity": (-1, 2),  # -1 = no routine yet (added Nov 2026)
    "sugar_intake": (0, 4),
    "dairy_intake": (0, 4),
    "fruit_veg_intake": (0, 4),
    "alcohol_intake": (0, 4),
}

# Part 3: continuous, (min, max). Standard-scaled with train-split statistics.
CONTINUOUS = {
    "age": (18, 100),
    "sleep_hours": (0, 24),
    "water_glasses": (0, 30),
}

# Part 5: how the skin looks now, 0 (none) to 4 (severe). Self-reported.
# These are the TRAINING LABELS, never inputs.
TARGETS = {
    "breakouts_level": (0, 4),
    "redness_level": (0, 4),
    "dryness_level": (0, 4),
}

# "High" = moderate (3) or severe (4). Model 1 predicts P(level >= 3).
HIGH_THRESHOLD = 3

# Habits a person can change, with the direction generally considered
# healthier and a realistic one-step improvement. Used for what-if
# explanations (Model 1) and the population analysis (Model 2). Age, skin
# type and environment are controls, not habits.
MODIFIABLE_HABITS = {
    "sleep_hours": (+1, 1.0),
    "water_glasses": (+1, 2.0),
    "stress_level": (-1, 1.0),
    "sunscreen_frequency": (+1, 1.0),
    "sugar_intake": (-1, 1.0),
    "dairy_intake": (-1, 1.0),
    "fruit_veg_intake": (+1, 1.0),
    "alcohol_intake": (-1, 1.0),
}

INPUT_COLUMNS = list(CATEGORICAL) + list(ORDINAL) + list(CONTINUOUS)
ALL_COLUMNS = INPUT_COLUMNS + list(TARGETS)

# Added 4 Nov 2026 (still quiz v3). Written to the training CSV for every row
# but NOT part of the 28-column feature vector, so the current models ignore
# them until a feature is deliberately built from them. Rows collected before
# that date have them empty. The two *_details columns are short free text
# typed by the member (health information): treat the CSV as sensitive.
EXTRA_COLUMNS = [
    "gender",
    "medication_use",
    "medication_details",
    "allergy_status",
    "allergy_details",
]
EXPORT_COLUMNS = ALL_COLUMNS + EXTRA_COLUMNS

# ── Added as MODEL INPUTS (still quiz v3) ───────────────────────────────
# gender: one-hot in Model 1 AND Model 2. "unknown" stands in for every row
# collected before 4 Nov 2026 (and any blank), so older responses still train.
# It is a real level of its own, never silently treated as one of the others.
GENDER_CODES = ["female", "male", "non_binary_other", "prefer_not_to_say", "unknown"]

# medication_use: a 0/1 CONTROL in Model 2 only (on skin medication = 1;
# "no" or unknown = 0). Medication changes breakouts and dryness (for
# example isotretinoin), which would otherwise be credited to lifestyle
# habits. Model 1 does not use it.
MEDICATION_CODES = ["no", "yes"]

# NOT a model input, on purpose: allergy_status and allergy_details. A typed
# allergy list is not something to learn from; it is a hard safety filter
# applied to the routine after the model (see lib/routine/ in the site).
