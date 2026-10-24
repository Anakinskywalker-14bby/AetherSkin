"""Command line. Every file lives in a fixed folder under ml/; arguments are
plain file names, never paths, so nothing can be read or written elsewhere.

  ml/data/     exported CSVs and answer files (git-ignored)
  ml/models/   trained models and reports (git-ignored)

  python -m aetherskin_ml export  --csv quiz_v3.csv
  python -m aetherskin_ml train   --csv quiz_v3.csv
  python -m aetherskin_ml habits  --csv quiz_v3.csv [--with-model]
  python -m aetherskin_ml predict --answers answers.json
  python -m aetherskin_ml demo    (synthetic data, end to end; nothing real)
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import pandas as pd

from . import habit_impact
from .predictor import Predictor
from .synthetic import make_synthetic

ML_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ML_ROOT / "data"
MODELS_DIR = ML_ROOT / "models"
DEMO_DIR = ML_ROOT / "demo_output"
_NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,99}")


def data_file(name: str) -> Path:
    """A file name (no folders) inside ml/data."""
    if not _NAME.fullmatch(name) or ".." in name:
        raise SystemExit(f"expected a plain file name like quiz_v3.csv, got {name!r}")
    DATA_DIR.mkdir(exist_ok=True)
    return DATA_DIR / name


def main() -> None:
    ap = argparse.ArgumentParser(prog="aetherskin_ml")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("export").add_argument("--csv", default="quiz_v3.csv")
    sub.add_parser("train").add_argument("--csv", default="quiz_v3.csv")
    h = sub.add_parser("habits")
    h.add_argument("--csv", default="quiz_v3.csv")
    h.add_argument("--with-model", action="store_true", help="add Model 1 permutation importance")
    sub.add_parser("predict").add_argument("--answers", default="answers.json")
    sub.add_parser("demo")
    a = ap.parse_args()

    if a.cmd == "export":
        from .export import export
        out = data_file(a.csv)
        print(f"exported {export(out)} rows to {out}")
    elif a.cmd == "train":
        pred = Predictor.train(pd.read_csv(data_file(a.csv)), verbose=True)
        pred.save(MODELS_DIR)
        pred.export_weights(MODELS_DIR / "predictor_weights.json")
        print(json.dumps(pred.metrics, indent=2))
    elif a.cmd == "habits":
        model = Predictor.load(MODELS_DIR) if a.with_model else None
        report = habit_impact.analyse(pd.read_csv(data_file(a.csv)), predictor=model)
        MODELS_DIR.mkdir(exist_ok=True)
        habit_impact.save(report, MODELS_DIR / "habit_report.json")
        print("\n".join(report["headlines"]))
    elif a.cmd == "predict":
        answers = json.loads(data_file(a.answers).read_text())
        print(json.dumps(Predictor.load(MODELS_DIR).report(answers), indent=2))
    elif a.cmd == "demo":
        df = make_synthetic()
        pred = Predictor.train(df)
        pred.save(DEMO_DIR)
        pred.export_weights(DEMO_DIR / "predictor_weights.json")
        report = habit_impact.analyse(df, predictor=pred)
        habit_impact.save(report, DEMO_DIR / "habit_report.json")
        sample = df.drop(columns=["breakouts_level", "redness_level", "dryness_level"]).iloc[0].to_dict()
        (DEMO_DIR / "sample_user_report.json").write_text(json.dumps(pred.report(sample), indent=2, default=float))
        print(f"SYNTHETIC DEMO in {DEMO_DIR}: these numbers describe fake data with planted effects.")
        print(json.dumps(pred.metrics["targets"], indent=2))
        print("\n".join(report["headlines"]))


if __name__ == "__main__":
    main()
