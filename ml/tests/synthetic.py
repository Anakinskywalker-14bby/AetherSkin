"""SYNTHETIC data for tests and demos only. Never train a released model on it.

There is no real labelled data yet, so the pipeline is proven on fake people
whose skin scores were generated from KNOWN, planted habit effects. The tests
then check the models recover those effects: the right habits, the right
direction, and nothing where nothing was planted. That validates the method,
not any real-world claim; the planted effects below are illustrative only.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from aetherskin_ml.schema import CATEGORICAL

# Planted effects on each skin score's latent severity (per unit of the
# standardised habit). Habits absent from a target have NO planted effect;
# e.g. water has no effect on breakouts, dairy none on redness or dryness.
PLANTED = {
    "breakouts_level": {"stress_level": 0.55, "sugar_intake": 0.50, "dairy_intake": 0.35,
                        "fruit_veg_intake": -0.30, "sleep_hours": -0.25},
    "redness_level": {"stress_level": 0.45, "alcohol_intake": 0.55, "sunscreen_frequency": -0.40,
                      "sleep_hours": -0.30},
    "dryness_level": {"water_glasses": -0.50, "alcohol_intake": 0.25, "sleep_hours": -0.20},
}


def make_synthetic(n: int = 4000, seed: int = 7) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    df = pd.DataFrame({col: rng.choice(codes, size=n) for col, codes in CATEGORICAL.items()})
    df["sunscreen_frequency"] = rng.integers(0, 4, n)
    df["stress_level"] = rng.integers(1, 6, n)
    df["routine_complexity"] = rng.integers(0, 3, n)
    df["sugar_intake"] = rng.integers(0, 5, n)
    df["dairy_intake"] = rng.integers(0, 5, n)
    df["fruit_veg_intake"] = rng.integers(0, 5, n)
    df["alcohol_intake"] = rng.integers(0, 5, n)
    df["age"] = np.clip(rng.normal(32, 9, n).round(), 18, 100)
    df["sleep_hours"] = np.clip((rng.normal(7, 1.3, n) * 2).round() / 2, 3, 11)
    df["water_glasses"] = np.clip(rng.normal(6, 2.5, n).round(), 0, 20)

    def z(col: str) -> np.ndarray:
        x = df[col].to_numpy(dtype=float)
        return (x - x.mean()) / x.std()

    base = {
        "breakouts_level": 0.6 * (df["skin_type"] == "oily") - 0.25 * z("age"),
        "redness_level": 0.6 * (df["skin_type"] == "highly_sensitive") + 0.3 * (df["environment"] == "outdoors"),
        "dryness_level": 0.7 * (df["skin_type"] == "dry") + 0.4 * (df["environment"] == "climate_controlled_indoor"),
    }
    for target, effects in PLANTED.items():
        latent = base[target].to_numpy(dtype=float) + rng.normal(0, 0.8, n)
        for habit, coef in effects.items():
            latent += coef * z(habit)
        # Cut the latent into the 0..4 scale; roughly 25-30% land on 3 or 4.
        df[target] = np.digitize(latent, [-0.6, 0.0, 0.55, 1.2])
    return df
