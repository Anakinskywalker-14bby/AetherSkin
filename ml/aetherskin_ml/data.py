"""Loading, validating and encoding quiz v3 data.

Feature vector for Model 1 (33 columns, fixed order):
  18 one-hot    primary_goal(5) skin_type(5) environment(4) texture_preference(4)
   7 ordinal    rescaled to 0..1 by their fixed ranges (order preserved)
   3 continuous standard-scaled with statistics from the TRAINING split only
   5 one-hot    gender (female, male, non_binary_other, prefer_not_to_say, unknown)

Model 2 additionally controls for `on_medication` (0/1), which is not in the
Model 1 vector. Allergy answers are in neither: they are a safety filter.
Rows that predate gender/medication get gender="unknown", on_medication=0.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from .schema import (
    ALL_COLUMNS, CATEGORICAL, CONTINUOUS, GENDER_CODES, HIGH_THRESHOLD, MEDICATION_CODES, ORDINAL, TARGETS,
)


def _optional_codes(df: pd.DataFrame, col: str, codes: list[str], fill: str) -> pd.Series:
    """A column that may be absent or blank (rows from before 4 Nov 2026)."""
    if col not in df.columns:
        return pd.Series([fill] * len(df), index=df.index)
    s = df[col].astype("object").where(df[col].notna(), fill)
    s = s.replace("", fill)
    bad = ~s.isin(codes)
    if bad.any():
        raise ValueError(f"{col}: unknown codes {sorted(map(str, s[bad].unique()))}")
    return s


def validate(df: pd.DataFrame, require_targets: bool = True) -> pd.DataFrame:
    """Reject rows the database would have rejected. Raises on bad data.

    Also adds the two optional model inputs: `gender` (a code, "unknown" when
    missing) and `on_medication` (1.0 only for medication_use == "yes").
    """
    needed = ALL_COLUMNS if require_targets else [c for c in ALL_COLUMNS if c not in TARGETS]
    missing = [c for c in needed if c not in df.columns]
    if missing:
        raise ValueError(f"missing columns: {missing}")
    gender = _optional_codes(df, "gender", GENDER_CODES, "unknown")
    if "medication_use" not in df.columns and "on_medication" in df.columns:
        on_medication = pd.to_numeric(df["on_medication"], errors="raise").fillna(0).clip(0, 1).to_numpy(dtype=float)
    else:  # raw rows (or none): derive it
        on_medication = (_optional_codes(df, "medication_use", MEDICATION_CODES, "no") == "yes").to_numpy(dtype=float)
    df = df[needed].copy()
    df["gender"] = gender.to_numpy()
    df["on_medication"] = on_medication
    for col, codes in CATEGORICAL.items():
        bad = ~df[col].isin(codes)
        if bad.any():
            raise ValueError(f"{col}: unknown codes {sorted(map(str, df.loc[bad, col].unique()))}")
    ranges = {**ORDINAL, **CONTINUOUS, **(TARGETS if require_targets else {})}
    for col, (lo, hi) in ranges.items():
        df[col] = pd.to_numeric(df[col], errors="raise").astype(float)
        if ((df[col] < lo) | (df[col] > hi)).any():
            raise ValueError(f"{col}: values outside {lo}..{hi}")
    return df.reset_index(drop=True)


def feature_names() -> list[str]:
    names = [f"{col}={code}" for col, codes in CATEGORICAL.items() for code in codes]
    return names + list(ORDINAL) + list(CONTINUOUS) + [f"gender={code}" for code in GENDER_CODES]


@dataclass
class Encoder:
    """Turns validated rows into a float32 matrix. Fit on the training split."""

    mean: dict[str, float] = field(default_factory=dict)
    std: dict[str, float] = field(default_factory=dict)

    def fit(self, df: pd.DataFrame) -> "Encoder":
        for col in CONTINUOUS:
            self.mean[col] = float(df[col].mean())
            s = float(df[col].std(ddof=0))
            self.std[col] = s if s > 1e-9 else 1.0
        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        parts = []
        for col, codes in CATEGORICAL.items():
            parts.append((df[col].to_numpy()[:, None] == np.array(codes)[None, :]).astype(np.float32))
        for col, (lo, hi) in ORDINAL.items():
            parts.append(((df[col].to_numpy(dtype=np.float32) - lo) / (hi - lo))[:, None])
        for col in CONTINUOUS:
            parts.append(((df[col].to_numpy(dtype=np.float32) - self.mean[col]) / self.std[col])[:, None])
        parts.append((df["gender"].to_numpy()[:, None] == np.array(GENDER_CODES)[None, :]).astype(np.float32))
        return np.concatenate(parts, axis=1).astype(np.float32)

    def to_dict(self) -> dict:
        return {"mean": self.mean, "std": self.std}

    @classmethod
    def from_dict(cls, d: dict) -> "Encoder":
        return cls(mean=dict(d["mean"]), std=dict(d["std"]))


def high_labels(df: pd.DataFrame) -> np.ndarray:
    """1 where a skin score is moderate or severe (>= 3), one column per target."""
    return (df[list(TARGETS)].to_numpy() >= HIGH_THRESHOLD).astype(np.float32)


def split(df: pd.DataFrame, test_frac: float = 0.2, seed: int = 0):
    rng = np.random.default_rng(seed)
    idx = rng.permutation(len(df))
    n_test = max(1, int(round(len(df) * test_frac)))
    return df.iloc[idx[n_test:]].reset_index(drop=True), df.iloc[idx[:n_test]].reset_index(drop=True)
