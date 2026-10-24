"""Model tests on SYNTHETIC data with planted effects (aetherskin_ml.synthetic).

These prove the method: the models must find the habits that were planted,
in the right direction, and must NOT invent effects where none were planted.
They say nothing about real people.
"""

import json
import re
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from aetherskin_ml import habit_impact
from aetherskin_ml.data import Encoder, feature_names, validate
from aetherskin_ml.predictor import Predictor, regimen
from aetherskin_ml.schema import CATEGORICAL, CONTINUOUS, ORDINAL, TARGETS
from aetherskin_ml.synthetic import PLANTED, make_synthetic

REPO = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="module")
def df():
    return make_synthetic(n=4000, seed=7)


@pytest.fixture(scope="module")
def predictor(df):
    return Predictor.train(df, seed=0)


# ── schema ──────────────────────────────────────────────────────────────
def test_schema_matches_the_database_migration():
    sql = (REPO / "supabase/migrations/20261021000002_quiz_v3.sql").read_text()
    for col, codes in CATEGORICAL.items():
        block = re.search(rf"{col}\s+text not null check \({col} in\s*\(([^)]*)\)", sql)
        assert block, col
        assert [c.strip().strip("'") for c in block.group(1).split(",")] == codes
    for col, (lo, hi) in {**ORDINAL, **TARGETS}.items():
        assert f"{col} between {lo} and {hi}" in sql, col
    for col, (lo, hi) in CONTINUOUS.items():
        assert re.search(rf"{col}\s+\S+.*check \({col} between {lo} and {hi}", sql), col


def test_feature_vector_has_28_columns(df):
    X = Encoder().fit(df).transform(validate(df))
    assert X.shape == (len(df), 28) == (len(df), len(feature_names()))
    assert np.isfinite(X).all()


def test_validate_rejects_bad_rows(df):
    bad = df.head(3).copy()
    bad.loc[0, "skin_type"] = "Oily"
    with pytest.raises(ValueError):
        validate(bad)
    bad = df.head(3).copy()
    bad.loc[0, "redness_level"] = 5
    with pytest.raises(ValueError):
        validate(bad)


# ── Model 1 ─────────────────────────────────────────────────────────────
def test_model1_ranks_people_well_above_chance(predictor):
    for target, m in predictor.metrics["targets"].items():
        assert m["auc"] > 0.75, (target, m)
        assert m["brier"] < m["brier_baseline"], (target, m)  # beats "everyone gets the average"
        assert m["release_ready"], target


def test_model1_probabilities_are_calibrated(predictor):
    # Shown to people as a likelihood, so on average it must match reality.
    for target, m in predictor.metrics["targets"].items():
        assert abs(m["mean_predicted"] - m["prevalence_high"]) < 0.06, (target, m)


def test_model1_gives_habit_tips_to_the_people_most_at_risk(df, predictor):
    rows = df.drop(columns=list(TARGETS)).to_dict("records")
    risky = sorted(rows, key=lambda r: -max(predictor.risks(r).values()))[:20]
    with_tips = [r for r in risky if predictor.report(r)["habit_insights"]]
    assert len(with_tips) >= 15  # most high-risk profiles get actionable tips


def test_model1_never_sees_the_answers_it_predicts(df, predictor):
    row = df.drop(columns=list(TARGETS)).iloc[0].to_dict()
    assert set(predictor.risks(row)) == set(TARGETS)  # works without Part 5


def test_model1_what_if_points_the_planted_way(df, predictor):
    # Averaged over many people, cutting alcohol lowers estimated redness
    # risk (planted), and more water lowers dryness risk (planted).
    rows = df.drop(columns=list(TARGETS)).head(300).to_dict("records")
    alcohol, water = [], []
    for r in rows:
        for c in predictor.what_if(r):
            if c["habit"] == "alcohol_intake":
                alcohol.append(c["change"]["redness_level"])
            if c["habit"] == "water_glasses":
                water.append(c["change"]["dryness_level"])
    assert np.mean(alcohol) < -0.01
    assert np.mean(water) < -0.01


def test_model1_report_shape_and_wording(df, predictor):
    rep = predictor.report(df.drop(columns=list(TARGETS)).iloc[0].to_dict())
    assert [s["role"] for s in rep["routine"]] == ["Cleanser", "Target serum", "Moisturiser"]
    assert set(rep["likelihood"]) == {"breakouts", "redness", "dryness"}
    text = json.dumps(rep).lower()
    assert "retin" not in text  # never suggested: the quiz can't screen for pregnancy
    assert "not a diagnosis" in text


def test_regimen_follows_the_risks():
    base = {"skin_type": "normal", "primary_goal": "hydration", "texture_preference": "no_preference"}
    acne = regimen(base, {"breakouts_level": 0.8, "redness_level": 0.1, "dryness_level": 0.1})
    red = regimen({**base, "skin_type": "highly_sensitive"}, {"breakouts_level": 0.1, "redness_level": 0.8, "dryness_level": 0.1})
    dry = regimen(base, {"breakouts_level": 0.1, "redness_level": 0.1, "dryness_level": 0.8})
    assert "Niacinamide" in acne[1]["category"] and "salicylic" in acne[0]["category"].lower()
    assert "Fragrance-free" in red[0]["category"] and "redness" in red[1]["why"]
    assert "hyaluronic" in dry[1]["category"] and "ceramides" in dry[2]["category"]


def test_model1_save_load_and_export_roundtrip(df, predictor, tmp_path):
    predictor.save(tmp_path)
    predictor.export_weights(tmp_path / "w.json")
    again = Predictor.load(tmp_path)
    sample = df.drop(columns=list(TARGETS)).head(20)
    assert np.allclose(predictor.predict_proba(sample), again.predict_proba(sample), atol=1e-6)

    # The exported JSON reproduces the network with plain numpy (what the
    # site will do in TypeScript).
    w = json.loads((tmp_path / "w.json").read_text())
    x = predictor.encoder.transform(validate(sample, require_targets=False))
    h = x
    for layer, act in zip(w["layers"], w["activations"]):
        h = h @ np.array(layer["weight"]).T + np.array(layer["bias"])
        h = np.maximum(h, 0) if act == "relu" else 1 / (1 + np.exp(-h))
    assert np.allclose(h, predictor.predict_proba(sample), atol=1e-5)


# ── Model 2 ─────────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def report(df, predictor):
    return habit_impact.analyse(df, n_boot=200, predictor=predictor)


def _effect(report, target, habit):
    return next(r for r in report["effects"][target] if r["habit"] == habit)


@pytest.mark.parametrize("target,habit", [(t, h) for t, eff in PLANTED.items() for h in eff])
def test_model2_finds_every_planted_effect_in_the_right_direction(report, target, habit):
    sign = PLANTED[target][habit]
    r = _effect(report, target, habit)
    assert r["clear_association"], r
    # A healthier step should improve the score exactly when the planted
    # effect of the habit runs against the healthy direction.
    from aetherskin_ml.schema import MODIFIABLE_HABITS
    healthy = MODIFIABLE_HABITS[habit][0]
    assert (r["score_change_per_step"] < 0) == (sign * healthy < 0), r


@pytest.mark.parametrize("target,habit", [
    ("breakouts_level", "water_glasses"),
    ("redness_level", "dairy_intake"),
    ("dryness_level", "dairy_intake"),
    ("dryness_level", "sugar_intake"),
])
def test_model2_does_not_invent_effects(report, target, habit):
    r = _effect(report, target, habit)
    assert abs(r["score_change_per_step"]) < 0.05, r


def test_model2_refuses_tiny_datasets(df):
    with pytest.raises(ValueError):
        habit_impact.analyse(df.head(50))


def test_model2_headlines_are_associational(report):
    assert report["headlines"]
    for line in report["headlines"]:
        assert "associated with" in line and "cause" not in line
    assert "not proof of cause" in report["caveat"]
