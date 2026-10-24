"""Model 2: the population habit-impact analyzer.

Looks at the whole anonymised dataset at once (never one person) and
estimates how each modifiable habit relates to each skin score.

Method: for each skin score (0-4), a linear model on all habits at once,
adjusted for age, skin type and environment, fitted with torch.linalg.lstsq.
Fitting everything together means each habit's effect is measured holding the
others fixed, so a habit isn't credited for something a correlated habit does
(e.g. stress and poor sleep). 95% intervals come from a bootstrap: refit on
resampled datasets and read the middle 95% of the estimates.

The result is the average association in this population. It is NOT proof of
cause: answers are self-reported, the people who join a skincare waitlist are
not everyone, and unmeasured things (genetics, hormones, products used) are
not adjusted for. Say "is associated with", never "causes".
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import torch

from .data import high_labels, validate
from .schema import CATEGORICAL, MODIFIABLE_HABITS, QUIZ_VERSION, TARGETS

# Aggregates over fewer people are too noisy to publish, and risk singling
# individuals out.
MIN_ROWS = 100

LABEL = {
    "sleep_hours": "sleeping {step:g} hour more a night",
    "water_glasses": "drinking {step:g} more glasses of water a day",
    "stress_level": "one step lower stress",
    "sunscreen_frequency": "one step more frequent sunscreen",
    "sugar_intake": "one step less sugar",
    "dairy_intake": "one step less dairy",
    "fruit_veg_intake": "one step more fruit and veg",
    "alcohol_intake": "one step less alcohol",
}
CONCERN = {"breakouts_level": "breakouts", "redness_level": "redness", "dryness_level": "dryness"}


def _design(df: pd.DataFrame) -> tuple[torch.Tensor, list[str]]:
    """Intercept + habits in natural units + controls (age, skin type and
    environment as one-hot minus a reference level)."""
    cols, names = [np.ones(len(df))], ["intercept"]
    for h in MODIFIABLE_HABITS:
        cols.append(df[h].to_numpy(dtype=float))
        names.append(h)
    cols.append(df["age"].to_numpy(dtype=float))
    names.append("age")
    for col in ("skin_type", "environment"):
        for code in CATEGORICAL[col][1:]:  # first code is the reference level
            cols.append((df[col] == code).to_numpy(dtype=float))
            names.append(f"{col}={code}")
    return torch.tensor(np.column_stack(cols), dtype=torch.float64), names


def _fit(X: torch.Tensor, Y: torch.Tensor) -> torch.Tensor:
    return torch.linalg.lstsq(X, Y, driver="gelsd").solution  # (features, targets)


def analyse(df: pd.DataFrame, n_boot: int = 500, seed: int = 0, predictor=None) -> dict:
    df = validate(df)
    if len(df) < MIN_ROWS:
        raise ValueError(f"need at least {MIN_ROWS} responses for population analysis, have {len(df)}")

    X, names = _design(df)
    Y = torch.tensor(df[list(TARGETS)].to_numpy(dtype=float), dtype=torch.float64)
    coef = _fit(X, Y)

    gen = torch.Generator().manual_seed(seed)
    boots = torch.stack([
        _fit(X[idx], Y[idx]) for idx in (torch.randint(0, len(df), (len(df),), generator=gen) for _ in range(n_boot))
    ])  # (boot, features, targets)
    lo, hi = torch.quantile(boots, 0.025, dim=0), torch.quantile(boots, 0.975, dim=0)

    importance = permutation_importance(predictor, df, seed) if predictor is not None else None

    results = {}
    for j, target in enumerate(TARGETS):
        rows = []
        for habit, (direction, step) in MODIFIABLE_HABITS.items():
            i = names.index(habit)
            # Expected change in the 0-4 score from a realistic healthier step.
            per_step = float(coef[i, j]) * direction * step
            ci = sorted((float(lo[i, j]) * direction * step, float(hi[i, j]) * direction * step))
            clear = ci[0] > 0 or ci[1] < 0  # interval excludes zero
            rows.append({
                "habit": habit,
                "change": LABEL[habit].format(step=step),
                "score_change_per_step": round(per_step, 3),
                "ci95": [round(ci[0], 3), round(ci[1], 3)],
                "clear_association": clear,
                "direction": ("improves" if per_step < 0 else "worsens") if clear else "no clear link",
                "permutation_importance": None if importance is None else importance[target].get(habit),
            })
        rows.sort(key=lambda r: r["score_change_per_step"])
        results[target] = rows

    return {
        "quiz_version": QUIZ_VERSION,
        "n": len(df),
        "method": "Linear model per skin score (0-4) on all habits jointly, adjusted for age, skin type "
                  f"and environment; {n_boot}-sample bootstrap 95% intervals.",
        "caveat": "Associations in self-reported data from AetherSkin members, not proof of cause.",
        "share_high": {CONCERN[t]: round(float(v), 3) for t, v in zip(TARGETS, high_labels(df).mean(0))},
        "effects": results,
        "headlines": headlines(results, len(df)),
    }


def permutation_importance(predictor, df: pd.DataFrame, seed: int = 0) -> dict:
    """How much Model 1's ranking (AUC) drops when one habit is shuffled
    across people: a model-based cross-check on the linear estimates."""
    from .predictor import TARGET_NAMES, auc

    rng = np.random.default_rng(seed)
    y = high_labels(df)
    base = predictor.predict_proba(df)
    base_auc = [auc(y[:, i], base[:, i]) for i in range(len(TARGET_NAMES))]
    out = {t: {} for t in TARGET_NAMES}
    for habit in MODIFIABLE_HABITS:
        shuffled = df.copy()
        shuffled[habit] = rng.permutation(shuffled[habit].to_numpy())
        p = predictor.predict_proba(shuffled)
        for i, t in enumerate(TARGET_NAMES):
            out[t][habit] = round(base_auc[i] - auc(y[:, i], p[:, i]), 4)
    return out


def headlines(results: dict, n: int) -> list[str]:
    """Plain-English findings, strongest first. Only clear associations."""
    lines = []
    for target, rows in results.items():
        for r in rows:
            if r["direction"] == "improves" and r["score_change_per_step"] <= -0.05:
                lines.append((r["score_change_per_step"],
                              f"Across {n:,} members, {r['change']} is associated with "
                              f"{abs(r['score_change_per_step']):.2f} points less {CONCERN[target]} on the 0-4 scale "
                              f"(95% interval {abs(r['ci95'][1]):.2f} to {abs(r['ci95'][0]):.2f})."))
    return [text for _, text in sorted(lines)]


def save(report: dict, path: str | Path) -> None:
    Path(path).write_text(json.dumps(report, indent=2))
