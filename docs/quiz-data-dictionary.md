# Skin quiz v2: data dictionary

Table: `public.quiz_responses_v2` (one row per waitlist member, `waitlist_id` unique).
Source of truth for the values: `lib/validation/quiz.ts`. The database enforces the
same values with CHECK constraints, and `test/quiz.test.ts` fails if the code, the
migration and the frozen encodings below ever disagree.

**Never renumber or rename a code.** Rows already collected would silently change
meaning. To change the quiz, add an option or ship a new `quiz_version`.

Rows carry no email or name. Join to `waitlist` on `waitlist_id` only when you
genuinely need contact details, and never inside a training set.

## Part 1: categorical (one-hot encode, one 0/1 column per code)

| Column | Codes, in order |
| --- | --- |
| `primary_goal` | `hydration`, `anti_aging`, `acne_control`, `brightening`, `calming` |
| `skin_type` | `oily`, `dry`, `combination`, `normal`, `highly_sensitive` |
| `environment` | `climate_controlled_indoor`, `outdoors`, `urban_pollution`, `balanced_indoor` |
| `texture_preference` | `gel_fluid`, `rich_cream`, `oil_balm`, `no_preference` |

18 one-hot columns in total. Encode against this fixed list, not against the codes
that happen to appear in a batch, or a missing category will shift every column
after it.

## Part 2: ordinal (use the integer as-is)

| Column | Values |
| --- | --- |
| `sunscreen_frequency` | 0 Never · 1 Rarely / only when sunny · 2 Once a day in the morning · 3 Multiple times a day |
| `stress_level` | 1 Very low · 2 Low · 3 Moderate · 4 High · 5 Extremely high |
| `routine_complexity` | 0 Minimalist · 1 Standard · 2 Advanced |

## Part 3: continuous (standard-scale)

| Column | Type | Range | Notes |
| --- | --- | --- | --- |
| `age` | smallint | 18–100 | whole years; under-18s are rejected |
| `sleep_hours` | numeric(3,1) | 0–24 | half-hour steps (7, 7.5) |
| `water_glasses` | smallint | 0–30 | 250 ml glasses per day |

Fit the scaler on the training split only, then apply it to validation and test.

## Feature vector

18 one-hot + 3 ordinal + 3 continuous = **24 features** per person.

```python
CATEGORICAL = {
    "primary_goal": ["hydration", "anti_aging", "acne_control", "brightening", "calming"],
    "skin_type": ["oily", "dry", "combination", "normal", "highly_sensitive"],
    "environment": ["climate_controlled_indoor", "outdoors", "urban_pollution", "balanced_indoor"],
    "texture_preference": ["gel_fluid", "rich_cream", "oil_balm", "no_preference"],
}
ORDINAL = ["sunscreen_frequency", "stress_level", "routine_complexity"]
CONTINUOUS = ["age", "sleep_hours", "water_glasses"]

import pandas as pd, torch
from sklearn.preprocessing import StandardScaler

def encode(df: pd.DataFrame, scaler: StandardScaler) -> torch.Tensor:
    parts = [
        pd.get_dummies(pd.Categorical(df[col], categories=codes)).astype("float32")
        for col, codes in CATEGORICAL.items()
    ]
    parts.append(df[ORDINAL].astype("float32"))
    parts.append(pd.DataFrame(scaler.transform(df[CONTINUOUS].astype("float32"))))
    return torch.tensor(pd.concat(parts, axis=1).to_numpy(), dtype=torch.float32)
```

## Exporting

Export with the service role from a trusted machine, never from the browser:

```sql
select primary_goal, skin_type, environment, texture_preference,
       sunscreen_frequency, stress_level, routine_complexity,
       age, sleep_hours, water_glasses
from public.quiz_responses_v2
where quiz_version = 2;
```

## Privacy obligations

- The Privacy Policy (21 Oct 2026) tells people their answers are used to train
  AetherSkin's own recommendation models. Train only on rows collected under that
  notice: `quiz_responses_v2` rows qualify; v1 rows in `quiz_responses` do not.
- A deletion request must remove the person's row before the next training run.
  Models already trained can't easily un-learn one row, so retrain on schedule.
- Don't share the raw table or a trained model's training data with third parties.
