"""Command line. Every file lives in a fixed folder under ml/; arguments are
plain file names, never paths, so nothing can be read or written elsewhere.

  ml/data/     exported CSVs and answer files (git-ignored)
  ml/models/   trained models and reports (git-ignored)

  python -m aetherskin_ml refresh   (export + train + dashboard, real data)
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

from . import dashboard, habit_impact
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
    sub.add_parser("refresh", help="export real data, train what the data allows, build the dashboard")
    a = ap.parse_args()

    if a.cmd == "refresh":
        refresh()
    elif a.cmd == "export":
        from .export import export
        out = data_file(a.csv)
        count, newest = export(out)
        print(f"exported {count} rows to {out} (newest: {newest})")
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
        sample_report = pred.report(sample)
        (DEMO_DIR / "sample_user_report.json").write_text(json.dumps(sample_report, indent=2, default=float))
        page = dashboard.build(df, predictor_meta={"metrics": pred.metrics}, habit_report=report,
                               sample_report=sample_report, out=DEMO_DIR / "dashboard.html", synthetic=True)
        print(f"SYNTHETIC DEMO: fake data with planted effects. Dashboard: {page}")


# Below this, training is pointless (too few rows to split into train/test).
MIN_TO_TRAIN = 20


def refresh() -> None:
    """The whole pipeline in one go, on REAL data:
    export -> train Model 1 (if >= 20 rows) -> Model 2 (if >= 100) -> dashboard."""
    from .export import export
    from .predictor import TARGET_NAMES

    csv_path = data_file("quiz_v3.csv")
    count, newest = export(csv_path)
    print(f"1/4 exported {count} real quiz v3 responses (newest: {newest})")
    df = pd.read_csv(csv_path) if count else None

    meta = sample = None
    if count >= MIN_TO_TRAIN:
        pred = Predictor.train(df)
        pred.save(MODELS_DIR)
        pred.export_weights(MODELS_DIR / "predictor_weights.json")
        meta = {"metrics": pred.metrics}
        sample = pred.report(df.drop(columns=TARGET_NAMES).iloc[0].to_dict())
        print(f"2/4 Model 1 trained on {pred.metrics['n_train']} rows, tested on {pred.metrics['n_test']}")
    else:
        print(f"2/4 Model 1 skipped: {count} responses, needs {MIN_TO_TRAIN} to train (300 to be trusted)")

    report = None
    if count >= habit_impact.MIN_ROWS:
        report = habit_impact.analyse(df, predictor=Predictor.load(MODELS_DIR) if meta else None)
        habit_impact.save(report, MODELS_DIR / "habit_report.json")
        print("3/4 Model 2 habit report written")
    else:
        print(f"3/4 Model 2 skipped: {count} responses, needs {habit_impact.MIN_ROWS}")

    page = dashboard.build(df, predictor_meta=meta, habit_report=report, sample_report=sample,
                           out=MODELS_DIR / "dashboard.html", synthetic=False, last_response=newest)
    print(f"4/4 dashboard: {page}")


if __name__ == "__main__":
    main()
