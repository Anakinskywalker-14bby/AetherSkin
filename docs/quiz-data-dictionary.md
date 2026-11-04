# Skin quiz v3: data dictionary

Table: `public.quiz_responses_v3` (one row per waitlist member, `waitlist_id` unique).
Source of truth for the values: `lib/validation/quiz.ts`. The database enforces the
same values with CHECK constraints (`supabase/migrations/20261021000002_quiz_v3.sql`).
`test/quiz.test.ts` (site) and `ml/tests/test_models.py` (models) fail if the code,
the migration and the encodings below ever disagree.

**Never renumber or rename a code.** Rows already collected would silently change
meaning. To change the quiz, add an option or ship a new `quiz_version`.

Rows carry no email or name. The earlier `quiz_responses` (v1) and
`quiz_responses_v2` tables have been removed from the database (recorded in
migration `20261031220546_quiz_link_expiry_reminders.sql`); only v3 exists.

## Update 4 Nov 2026: "About you" questions and new order (still v3)

The quiz now runs in two phases: **About you** (gender, age, medication, allergies,
environment, sleep, water, stress, then the four lifestyle habits) followed by **Your
skin** (goal, skin type, texture, sunscreen, routine, then the three skin-state
labels). Order is presentation only: answers are stored by column name, so earlier
rows and the models are unaffected. This stays quiz version 3 on purpose; the new
columns are nullable additions to `quiz_responses_v3` (migration
`20261104000001_quiz_v3_about_you.sql`), so every earlier row is kept and rows
before this date simply have `NULL` in them.

| Column | Type | Values |
| --- | --- | --- |
| `gender` | text | `female`, `male`, `non_binary_other`, `prefer_not_to_say` |
| `medication_use` | text | `no`, `yes` (on medication to treat skin concerns) |
| `medication_details` | text, ≤200 | short typed list; only when `medication_use = 'yes'` |
| `allergy_status` | text | `no`, `yes`, `unsure` (allergic to specific active ingredients) |
| `allergy_details` | text, ≤200 | short typed list; only when `allergy_status = 'yes'` |

These five columns are written to the training CSV by `python -m aetherskin_ml export`
(`EXTRA_COLUMNS` in `ml/aetherskin_ml/schema.py`; the owner has confirmed they may be
used for training). They are **not** yet model features: the feature vector stays 28
columns and the current models ignore them. Rows before 4 Nov 2026 have them empty.
To use them in a model, build features deliberately (one-hot the three codes with an
"unknown" level for old rows; the free-text notes need their own handling, for example
a reviewed list of ingredient/medication names). The two notes are free text and are
health information that could contain identifying detail: keep the CSV on a trusted
machine, out of git, and delete it after training.

## Part 1: categorical (one-hot, one 0/1 column per code)

| Column | Codes, in order |
| --- | --- |
| `primary_goal` | `hydration`, `anti_aging`, `acne_control`, `brightening`, `calming` |
| `skin_type` | `oily`, `dry`, `combination`, `normal`, `highly_sensitive` |
| `environment` | `climate_controlled_indoor`, `outdoors`, `urban_pollution`, `balanced_indoor` |
| `texture_preference` | `gel_fluid`, `rich_cream`, `oil_balm`, `no_preference` |

## Part 2: ordinal (use the integer as-is)

| Column | Values |
| --- | --- |
| `sunscreen_frequency` | 0 Never · 1 Rarely / only when sunny · 2 Once a day · 3 Multiple times a day |
| `stress_level` | 1 Very low · 2 Low · 3 Moderate · 4 High · 5 Extremely high |
| `routine_complexity` | 0 Minimalist · 1 Standard · 2 Advanced |

## Part 3: continuous (standard-scale with training-split statistics)

| Column | Type | Range | Notes |
| --- | --- | --- | --- |
| `age` | smallint | 18–100 | whole years; under-18s rejected |
| `sleep_hours` | numeric(3,1) | 0–24 | half-hour steps |
| `water_glasses` | smallint | 0–30 | 250 ml glasses per day |

## Part 4: lifestyle habits (ordinal 0–4, higher = more of it)

| Column | 0 | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- | --- |
| `sugar_intake` | Rarely/never | ~weekly | A few times a week | ~daily | Several times a day |
| `dairy_intake` | Rarely/never | ~weekly | A few times a week | ~daily | Several times a day |
| `fruit_veg_intake` | None | 1–2 serves/day | 3–4 | 5–6 | 7+ |
| `alcohol_intake` | None | 1–3 drinks/week | 4–7 | 8–14 | 15+ |

## Part 5: how the skin looks now (ordinal 0–4): TRAINING LABELS

`breakouts_level`, `redness_level`, `dryness_level`: 0 None · 1 Very mild · 2 Mild ·
3 Moderate · 4 Severe. Self-reported. These are the models' targets and are never
used as inputs. Model 1's "high" means 3 or 4.

## Feature vector (inputs only)

18 one-hot + 7 ordinal (Parts 2 and 4, rescaled to 0–1 by their fixed ranges) +
3 continuous = **28 features**. Implemented in `ml/aetherskin_ml/data.py`.

## Models (ml/)

See `ml/README.md`. In short:

- **Model 1, personalised predictor:** a small PyTorch network that estimates one
  person's likelihood of moderate/severe breakouts, redness and dryness from their
  habits, says which habit changes would lower it most, and maps them to a 3-step
  product-category routine.
- **Model 2, habit-impact analyzer:** a whole-population analysis (no individuals)
  of how each habit relates to each skin score, adjusted for age, skin type and
  environment, with bootstrap 95% intervals.

## Privacy obligations

- The Privacy Policy (21 Oct 2026) tells members their answers train AetherSkin's
  own models, describes both models, and treats diet, alcohol, stress, sleep and
  skin condition as sensitive. Train only on `quiz_responses_v3` rows.
- Export with `python -m aetherskin_ml export` (answer columns only, no ids), keep
  the CSV out of git, delete it after training.
- A deletion request removes the row before the next training run; retrain on a
  schedule so deleted answers leave the model too.
- Model 2 refuses to run on fewer than 100 rows; never publish its output for small
  subgroups.
