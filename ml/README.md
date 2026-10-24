# AetherSkin skin-quiz models (PyTorch)

Two separate models trained on quiz v3 answers (`public.quiz_responses_v3`).

| | Model 1: Personal predictor | Model 2: Habit-impact analyzer |
| --- | --- | --- |
| Question | "How likely is *this person* to have moderate/severe breakouts, redness or dryness?" | "Across *everyone*, how much does each habit relate to each skin score?" |
| Looks at | One person's answers | The whole anonymised dataset, never one person |
| Method | Small multi-task neural network (PyTorch MLP, 28 inputs → 3 probabilities) | Joint linear model per skin score in PyTorch (`torch.linalg.lstsq`), adjusted for age, skin type and environment, with 500-sample bootstrap 95% intervals; cross-checked with Model 1 permutation importance |
| Output | Likelihoods, the 3 habit changes that would lower them most, and a 3-step routine (Cleanser → Target serum → Moisturiser, categories only) | Ranked habit effects in points on the 0–4 scale, with intervals, plus plain-English headlines |
| Code | `aetherskin_ml/predictor.py` | `aetherskin_ml/habit_impact.py` |

Inputs are Parts 1–4 of the quiz (habits, skin type, environment, age…).
Part 5 (breakouts, redness, dryness right now, 0–4) is only ever the **label**,
never an input. "High" means 3 or 4 (moderate or severe).

## Setup (once)

Python 3.10+:

```
cd ml
pip install -r requirements.txt
pytest            # 31 tests, ~1 min
```

## The one command you need

```
cd ml
python -m aetherskin_ml refresh
```

It reads your Supabase credentials from the site's `.env.local`, then:

1. exports every real quiz v3 response (answers only, no emails) to `ml/data/quiz_v3.csv`
2. trains Model 1 if there are at least 20 responses
3. runs Model 2 if there are at least 100
4. writes `ml/models/dashboard.html`: open it in your browser to see the
   response count and newest response, charts of what people answered, Model 1
   accuracy and calibration, and Model 2's habit effects with 95% intervals

Training does **not** happen automatically when someone finishes the quiz;
answers are saved instantly, and the models learn from them each time you run
`refresh`. Run it whenever you want an update (weekly is plenty).

The models and dashboard only ever use real quiz responses. (The automated
tests in `ml/tests/` use generated test data to check the maths; that data
never reaches `ml/models/` or the dashboard.)

## Using real data, step by step

All files live in fixed folders: `ml/data/` (CSVs, answer files) and
`ml/models/` (trained output). Commands take plain file names, not paths.

```
# 1. Export (trusted machine only; service-role key bypasses RLS)
set SUPABASE_URL=https://hazjyonpqungkgchqgro.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=...        # never commit this
python -m aetherskin_ml export            # -> ml/data/quiz_v3.csv

# 2. Model 1                               -> ml/models/
python -m aetherskin_ml train

# 3. Model 2 (+ Model 1 permutation cross-check) -> ml/models/habit_report.json
python -m aetherskin_ml habits --with-model

# 4. One person's report from ml/data/answers.json
python -m aetherskin_ml predict --answers answers.json
```

`data/` and `models/` are git-ignored. Delete the CSV once you're done.

`train` also writes `models/predictor_weights.json`: plain JSON weights so the
website can run Model 1 in TypeScript (three matrix multiplies) without any
Python server. A test proves the JSON reproduces the network exactly.

## When is it allowed to be shown to users?

Not yet. Each model has hard gates:

- **Model 1** is `release_ready` only with **≥ 300 training rows** and a test
  **AUC ≥ 0.65** for every concern, and its average prediction must match the
  real rate (calibration). The report says so in `release_ready`.
- **Model 2** refuses to run on **< 100 responses**: too noisy, and small
  groups risk singling people out.

Today there are 0 v3 responses. Until those thresholds are met, the sign-up
"report" must not use these models. Showing a confident-looking guess built on
a handful of rows would be exactly the kind of overclaiming the UX audit warned
about.

## How do we know it works without real data?

`aetherskin_ml/synthetic.py` generates fake people whose skin scores come from
**known, planted** habit effects (e.g. alcohol → redness, water → dryness,
nothing from water → breakouts). The tests then check:

- Model 1 ranks people well (AUC > 0.75), beats a "guess the average" baseline,
  is calibrated, and its what-if changes point the planted way.
- Model 2 finds **every** planted effect, in the right direction, with a 95%
  interval that excludes zero, and does **not** invent effects where none were
  planted.

That proves the method recovers the truth when the truth is in the data. It
says nothing about real people. The synthetic effect sizes are made up.

Current synthetic results: AUC 0.87 breakouts / 0.85 redness / 0.81 dryness;
mean predicted vs actual high rate within 3 points for each.

## Wording rules (legal and honesty)

These are baked into the report text and the tests:

- **Likelihood, not diagnosis.** "Higher likelihood of breakouts", never
  "you have acne". AetherSkin is cosmetic guidance, not a medical device.
- **Association, not cause.** Model 2 measures how habits *relate* to skin in
  self-reported data. Write "is associated with", never "causes" or "will fix".
  People who join a skincare waitlist aren't everyone, and genetics, hormones
  and the products people use aren't measured.
- **Categories, not brands, and no retinoids.** The quiz no longer asks about
  pregnancy or prescriptions, so it can't screen for them.
- **Severe, painful or changing → see a GP or dermatologist.**

Under Australian Consumer Law, a claim like "your habits are causing hidden
acne" would need evidence the data can't provide. The wording above is what it
can support.
