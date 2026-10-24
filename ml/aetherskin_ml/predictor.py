"""Model 1: the personalised prediction engine.

From one person's quiz answers (habits, skin type, environment, age; never
their Part 5 skin scores), estimate how likely they are to report moderate or
severe breakouts, redness and dryness, explain which habit changes would lower
that estimate most, and map the result to a 3-step product-category routine:
Cleanser -> Target serum -> Moisturiser.

Wording rules for anything shown to users (see report()):
  * These are likelihoods learned from people with similar answers, not a
    diagnosis, and habit effects are associations, not proven causes.
  * Categories only, never brands, and no retinoids: the quiz doesn't ask
    about pregnancy or prescriptions, so it can't screen for them.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from torch import nn

from .data import Encoder, feature_names, high_labels, split, validate
from .schema import MODIFIABLE_HABITS, ORDINAL, CONTINUOUS, QUIZ_VERSION, TARGETS

TARGET_NAMES = list(TARGETS)
CONCERN = {"breakouts_level": "breakouts", "redness_level": "redness", "dryness_level": "dryness"}

# A model is only "release ready" (allowed to be shown to users) with enough
# real rows and a test-set AUC that beats chance by a clear margin.
MIN_TRAIN_ROWS = 300
MIN_AUC = 0.65


class VulnerabilityNet(nn.Module):
    """Small multi-task MLP: one shared body, one logit per skin concern."""

    def __init__(self, n_features: int, n_targets: int = len(TARGET_NAMES)):
        super().__init__()
        self.body = nn.Sequential(
            nn.Linear(n_features, 32), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(32, 16), nn.ReLU(),
        )
        self.head = nn.Linear(16, n_targets)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.head(self.body(x))


def auc(y: np.ndarray, p: np.ndarray) -> float:
    """ROC AUC via the rank-sum formula (ties averaged). NaN if one class."""
    pos, neg = y == 1, y == 0
    if pos.sum() == 0 or neg.sum() == 0:
        return float("nan")
    ranks = pd.Series(p).rank().to_numpy()
    return float((ranks[pos].sum() - pos.sum() * (pos.sum() + 1) / 2) / (pos.sum() * neg.sum()))


@dataclass
class Predictor:
    encoder: Encoder
    model: VulnerabilityNet
    metrics: dict = field(default_factory=dict)

    # ── training ────────────────────────────────────────────────────────
    @classmethod
    def train(cls, df: pd.DataFrame, seed: int = 0, max_epochs: int = 400, verbose: bool = False) -> "Predictor":
        torch.manual_seed(seed)
        df = validate(df)
        train_df, test_df = split(df, 0.2, seed)
        fit_df, val_df = split(train_df, 0.15, seed + 1)

        enc = Encoder().fit(fit_df)
        Xf, Yf = torch.tensor(enc.transform(fit_df)), torch.tensor(high_labels(fit_df))
        Xv, Yv = torch.tensor(enc.transform(val_df)), torch.tensor(high_labels(val_df))

        model = VulnerabilityNet(Xf.shape[1])
        # Plain (unweighted) BCE on purpose: the output is shown to people as
        # a likelihood, so it has to stay calibrated. Class weighting would
        # inflate every probability (it did: 98% for an ordinary profile).
        loss_fn = nn.BCEWithLogitsLoss()
        opt = torch.optim.AdamW(model.parameters(), lr=3e-3, weight_decay=1e-3)

        best, best_state, patience = float("inf"), None, 0
        for epoch in range(max_epochs):
            model.train()
            for idx in torch.randperm(len(Xf)).split(128):
                opt.zero_grad()
                loss_fn(model(Xf[idx]), Yf[idx]).backward()
                opt.step()
            model.eval()
            with torch.no_grad():
                v = loss_fn(model(Xv), Yv).item()
            if v < best - 1e-4:
                best, best_state, patience = v, {k: t.clone() for k, t in model.state_dict().items()}, 0
            else:
                patience += 1
                if patience >= 25:
                    break
            if verbose and epoch % 20 == 0:
                print(f"epoch {epoch} val_loss {v:.4f}")
        model.load_state_dict(best_state)
        model.eval()

        pred = cls(enc, model)
        pred.metrics = pred.evaluate(test_df, n_train=len(train_df))
        return pred

    def evaluate(self, test_df: pd.DataFrame, n_train: int) -> dict:
        p = self.predict_proba(test_df)
        y = high_labels(test_df)
        out = {"quiz_version": QUIZ_VERSION, "n_train": n_train, "n_test": len(test_df), "targets": {}}
        for i, t in enumerate(TARGET_NAMES):
            prev = float(y[:, i].mean())
            a = auc(y[:, i], p[:, i])
            out["targets"][t] = {
                "auc": a,
                "brier": float(np.mean((p[:, i] - y[:, i]) ** 2)),
                "brier_baseline": float(np.mean((prev - y[:, i]) ** 2)),
                "prevalence_high": prev,
                # Calibration check: should be close to prevalence_high.
                "mean_predicted": float(p[:, i].mean()),
                "release_ready": bool(n_train >= MIN_TRAIN_ROWS and a == a and a >= MIN_AUC),
            }
        return out

    # ── inference ───────────────────────────────────────────────────────
    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        X = torch.tensor(self.encoder.transform(validate(df, require_targets=False)))
        with torch.no_grad():
            return torch.sigmoid(self.model(X)).numpy()

    def risks(self, answers: dict) -> dict[str, float]:
        p = self.predict_proba(pd.DataFrame([answers]))[0]
        return {t: float(p[i]) for i, t in enumerate(TARGET_NAMES)}

    def what_if(self, answers: dict) -> list[dict]:
        """Each modifiable habit moved one realistic step in the healthier
        direction (within its range), and the resulting change in each risk."""
        base = self.risks(answers)
        bounds = {**ORDINAL, **CONTINUOUS}
        out = []
        for habit, (direction, step) in MODIFIABLE_HABITS.items():
            lo, hi = bounds[habit]
            new = min(hi, max(lo, answers[habit] + direction * step))
            if new == answers[habit]:
                continue  # already at the healthier end
            after = self.risks({**answers, habit: new})
            out.append({
                "habit": habit, "from": answers[habit], "to": new,
                "change": {t: after[t] - base[t] for t in TARGET_NAMES},
            })
        return out

    # ── the user-facing result ──────────────────────────────────────────
    def report(self, answers: dict) -> dict:
        risks = self.risks(answers)
        ready = {t: self.metrics.get("targets", {}).get(t, {}).get("release_ready", False) for t in TARGET_NAMES}
        top = max(TARGET_NAMES, key=lambda t: risks[t])
        # Rank habit changes by their effect on the concerns that are
        # actually elevated (or the top one if none are), each reported
        # against the concern it helps most.
        elevated = [t for t in TARGET_NAMES if risks[t] >= 0.35] or [top]
        helpful = []
        for c in self.what_if(answers):
            best = min(elevated, key=lambda t: c["change"][t])
            helpful.append({"habit": c["habit"], "from": c["from"], "to": c["to"],
                            "concern": CONCERN[best], "risk_change": round(c["change"][best], 3)})
        helpful.sort(key=lambda c: c["risk_change"])
        return {
            "release_ready": all(ready.values()),
            "likelihood": {CONCERN[t]: {"probability": round(risks[t], 3), "band": band(risks[t])} for t in TARGET_NAMES},
            "focus_concern": CONCERN[top] if risks[top] >= 0.35 else None,
            # Up to three habits whose change lowers an estimate by >= 1 point.
            "habit_insights": [h for h in helpful if h["risk_change"] <= -0.01][:3],
            "routine": regimen(answers, risks),
            "notes": [
                "These are likelihoods learned from people with answers like yours, not a diagnosis.",
                "Habit links are associations seen across members, not proof that a habit causes a concern.",
                "If a skin concern is severe, painful or changing, see a GP or dermatologist.",
            ],
        }

    # ── persistence ─────────────────────────────────────────────────────
    def save(self, directory: str | Path) -> None:
        d = Path(directory)
        d.mkdir(parents=True, exist_ok=True)
        torch.save(self.model.state_dict(), d / "predictor.pt")
        meta = {"encoder": self.encoder.to_dict(), "metrics": self.metrics, "feature_names": feature_names()}
        (d / "predictor.json").write_text(json.dumps(meta, indent=2))

    @classmethod
    def load(cls, directory: str | Path) -> "Predictor":
        d = Path(directory)
        meta = json.loads((d / "predictor.json").read_text())
        model = VulnerabilityNet(len(meta["feature_names"]))
        model.load_state_dict(torch.load(d / "predictor.pt", weights_only=True))
        model.eval()
        return cls(Encoder.from_dict(meta["encoder"]), model, meta["metrics"])

    def export_weights(self, path: str | Path) -> None:
        """Plain-JSON weights, so the site can run the forward pass in
        TypeScript (three small matrix multiplies) without Python."""
        layers = [self.model.body[0], self.model.body[3], self.model.head]
        payload = {
            "quiz_version": QUIZ_VERSION,
            "feature_names": feature_names(),
            "targets": TARGET_NAMES,
            "encoder": self.encoder.to_dict(),
            "activations": ["relu", "relu", "sigmoid"],
            "layers": [{"weight": l.weight.detach().tolist(), "bias": l.bias.detach().tolist()} for l in layers],
            "metrics": self.metrics,
        }
        Path(path).write_text(json.dumps(payload))


def band(p: float) -> str:
    return "higher" if p >= 0.6 else "moderate" if p >= 0.35 else "lower"


def regimen(answers: dict, risks: dict[str, float]) -> list[dict]:
    """Three product CATEGORIES, chosen from the estimated risks plus the
    person's skin type, goal and texture preference. No brands, no retinoids."""
    skin, goal, texture = answers["skin_type"], answers["primary_goal"], answers["texture_preference"]
    br, rd, dr = risks["breakouts_level"], risks["redness_level"], risks["dryness_level"]
    sensitive = skin == "highly_sensitive" or rd >= 0.5

    # 1. Cleanser
    if sensitive:
        cleanser = ("Fragrance-free cream or milk cleanser", "gentle on skin that flushes or reacts easily")
    elif skin == "dry" or dr >= 0.5:
        cleanser = ("Non-foaming cream or balm cleanser", "cleans without stripping moisture")
    elif br >= 0.5:
        cleanser = ("Gentle salicylic acid (BHA) cleanser", "helps keep pores clear on breakout-prone skin")
    elif skin in ("oily", "combination"):
        cleanser = ("Gentle gel cleanser", "lifts excess oil without over-drying")
    else:
        cleanser = ("Gentle pH-balanced cleanser", "an everyday cleanse that keeps the skin barrier comfortable")

    # 2. Target serum: the highest-risk concern, or the stated goal if all are low.
    focus = max(risks, key=risks.get)
    if risks[focus] >= 0.35:
        serum = {
            "breakouts_level": ("Niacinamide serum", "helps balance oil and the look of blemishes"),
            "redness_level": ("Soothing serum with centella (cica) or azelaic acid", "helps calm the look of redness"),
            "dryness_level": ("Hydrating serum with hyaluronic acid and glycerin", "draws water into the skin"),
        }[focus]
    else:
        serum = {
            "hydration": ("Hydrating serum with hyaluronic acid", "keeps skin plump and comfortable"),
            "anti_aging": ("Antioxidant vitamin C serum", "helps protect against daily environmental stress"),
            "acne_control": ("Niacinamide serum", "helps balance oil and the look of blemishes"),
            "brightening": ("Vitamin C serum", "helps even out the look of skin tone"),
            "calming": ("Soothing serum with centella (cica)", "helps calm the look of redness"),
        }[goal]

    # 3. Moisturiser
    if dr >= 0.5 or skin == "dry" or texture == "rich_cream":
        moist = ("Barrier cream with ceramides", "locks in moisture and supports the skin barrier")
    elif texture == "oil_balm":
        moist = ("Nourishing balm moisturiser", "a richer seal for skin that likes oils")
    elif sensitive:
        moist = ("Fragrance-free barrier moisturiser", "fewer potential irritants, more barrier support")
    elif br >= 0.5 or skin == "oily" or texture == "gel_fluid":
        moist = ("Oil-free gel moisturiser", "light hydration that won't feel heavy")
    else:
        moist = ("Lightweight lotion moisturiser", "everyday hydration")

    steps = [("Cleanser",) + cleanser, ("Target serum",) + serum, ("Moisturiser",) + moist]
    return [{"step": i + 1, "role": r, "category": c, "why": w} for i, (r, c, w) in enumerate(steps)]
