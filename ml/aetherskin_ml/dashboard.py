"""A self-contained HTML dashboard (no internet needed) showing:

  1. Data pipeline: how many real v3 quiz responses exist, the newest one,
     and whether each model has enough data to be trained / shown to users.
  2. What people answered: a bar chart per question.
  3. Model 1: accuracy (AUC), calibration, and one sample personal report.
  4. Model 2: each habit's effect on each skin score, with 95% intervals.

Every number comes from the files the pipeline just produced, so if the
dashboard shows N responses, the models were trained on those N responses.
"""

from __future__ import annotations

import html
import json
from datetime import datetime
from pathlib import Path

import pandas as pd

from .schema import CATEGORICAL, CONTINUOUS, GENDER_CODES, MEDICATION_CODES, ORDINAL, TARGETS

MIN_TRAIN = 300   # Model 1 release gate (predictor.MIN_TRAIN_ROWS)
MIN_HABITS = 100  # Model 2 gate (habit_impact.MIN_ROWS)

CSS = """
body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#fff6ec;color:#3a1c2e;margin:0;padding:32px;max-width:1100px;margin:auto}
h1{font-size:28px;margin:0 0 4px}h2{font-size:20px;margin:36px 0 12px;border-bottom:2px solid #3a1c2e22;padding-bottom:6px}
.sub{color:#6b4a5a;margin:0 0 20px}.banner{padding:14px 18px;border-radius:10px;margin:16px 0;font-weight:600}
.synthetic{background:#ffd166}.real{background:#cfe8d5}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.card{background:#fff;border:1px solid #3a1c2e22;border-radius:10px;padding:14px}.card b{display:block;font-size:26px}
.ok{color:#1d7a3a}.wait{color:#b0461f}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px}
table{border-collapse:collapse;width:100%;background:#fff}td,th{padding:6px 8px;border-bottom:1px solid #eee;text-align:left;font-size:14px}
.muted{color:#6b4a5a;font-size:13px}pre{background:#fff;padding:12px;border-radius:8px;overflow:auto;font-size:12px}
"""


def _bars(title: str, counts: dict, total: int) -> str:
    """Horizontal bar chart as inline SVG."""
    rows = list(counts.items())
    h = 22 * len(rows) + 30
    mx = max(counts.values()) or 1
    parts = [f'<svg width="100%" viewBox="0 0 320 {h}" role="img" aria-label="{html.escape(title)}">',
             f'<text x="0" y="14" font-size="13" font-weight="700" fill="#3a1c2e">{html.escape(title)}</text>']
    for i, (label, n) in enumerate(rows):
        y = 26 + i * 22
        w = 150 * n / mx
        pct = f"{100 * n / total:.0f}%" if total else "0%"
        parts.append(f'<text x="0" y="{y + 13}" font-size="11" fill="#3a1c2e">{html.escape(str(label))[:22]}</text>'
                     f'<rect x="130" y="{y + 2}" width="{w:.1f}" height="14" rx="3" fill="#ff6b5b"/>'
                     f'<text x="{134 + w:.1f}" y="{y + 13}" font-size="11" fill="#6b4a5a">{n} ({pct})</text>')
    return "".join(parts) + "</svg>"


def _effects_chart(target: str, rows: list[dict]) -> str:
    """Point + 95% interval per habit, on a shared axis centred at 0."""
    lo = min(min(r["ci95"][0] for r in rows), -0.1)
    hi = max(max(r["ci95"][1] for r in rows), 0.1)
    span = max(abs(lo), abs(hi))
    x = lambda v: 200 + 110 * v / span  # noqa: E731
    h = 24 * len(rows) + 50
    p = [f'<svg width="100%" viewBox="0 0 330 {h}" role="img" aria-label="Habit effects on {target}">',
         f'<text x="0" y="14" font-size="13" font-weight="700" fill="#3a1c2e">{html.escape(target.replace("_level", ""))}</text>',
         f'<line x1="200" y1="22" x2="200" y2="{h - 24}" stroke="#3a1c2e55"/>',
         f'<text x="{x(-span):.0f}" y="{h - 8}" font-size="10" fill="#1d7a3a">← improves</text>',
         f'<text x="{x(span) - 48:.0f}" y="{h - 8}" font-size="10" fill="#b0461f">worsens →</text>']
    for i, r in enumerate(rows):
        y = 34 + i * 24
        col = "#1d7a3a" if r["direction"] == "improves" else "#b0461f" if r["direction"] == "worsens" else "#999"
        p.append(f'<text x="0" y="{y + 4}" font-size="11" fill="#3a1c2e">{html.escape(r["habit"].replace("_", " "))}</text>'
                 f'<line x1="{x(r["ci95"][0]):.1f}" y1="{y}" x2="{x(r["ci95"][1]):.1f}" y2="{y}" stroke="{col}" stroke-width="2"/>'
                 f'<circle cx="{x(r["score_change_per_step"]):.1f}" cy="{y}" r="4" fill="{col}"/>')
    return "".join(p) + "</svg>"


ALLERGY_CODES = ["no", "yes", "unsure"]


def _col_counts(df: pd.DataFrame, col: str, codes: list[str]) -> dict:
    """Counts per code; rows from before the question existed show as 'not asked'."""
    s = df[col] if col in df.columns else pd.Series([None] * len(df))
    counts = {c: int((s == c).sum()) for c in codes}
    missing = int(s.isna().sum()) + int((s == "").sum())
    if missing:
        counts["not asked (old rows)"] = missing
    return counts


def _note_stats(df: pd.DataFrame, col: str) -> tuple[int, list[tuple[str, int]]]:
    if col not in df.columns:
        return 0, []
    s = df[col].dropna().astype(str).str.strip()
    s = s[s != ""]
    top = s.str.lower().value_counts().head(8)
    return int(len(s)), [(str(k)[:60], int(v)) for k, v in top.items()]


def _inputs_table(df: pd.DataFrame | None, predictor_meta: dict | None, habit_report: dict | None) -> str:
    """One row per question: which part of the pipeline uses it, and how much data it has."""
    n = 0 if df is None else len(df)

    def have(col: str) -> str:
        if df is None or col not in df.columns:
            return "0"
        s = df[col]
        return str(int((s.notna() & (s.astype(str).str.strip() != "")).sum()))

    n_feat = len(predictor_meta["feature_names"]) if predictor_meta and "feature_names" in predictor_meta else 33
    med = habit_report.get("medication_control") if habit_report else None
    on = int((df["medication_use"] == "yes").sum()) if df is not None and "medication_use" in df.columns else 0
    off = int((df["medication_use"] == "no").sum()) if df is not None and "medication_use" in df.columns else 0
    med_state = ("estimated (see section 5)" if med else
                 f"waiting: needs 30 on and 30 not on medication (have {on} / {off})")
    rows = [
        ("Gender", "gender", "Yes: 5 one-hot inputs (of %d)" % n_feat, "Yes: control variable", "No"),
        ("Medication yes/no", "medication_use", "No (by design)", "Yes: control. " + med_state, "Drives gentle-mode rules"),
        ("Medication details (typed)", "medication_details", "No", "No", "Yes: matched to your medication list, switches on gentle mode"),
        ("Allergy status", "allergy_status", "No (by design)", "No", "Yes: turns the allergy filter on"),
        ("Allergy details (typed)", "allergy_details", "No (by design)", "No", "Yes: matched to allergy + active-ingredient lists, allergens swapped out"),
    ]
    body = "".join(
        f"<tr><td>{html.escape(q)}</td><td>{have(c) if df is not None else 0} / {n}</td><td>{html.escape(m1)}</td>"
        f"<td>{html.escape(m2)}</td><td>{html.escape(sf)}</td></tr>"
        for q, c, m1, m2, sf in rows)
    return ("<p class=\"muted\">The three newest questions and what each one feeds. Allergy answers are deliberately "
            "kept out of the neural network and handled by a hard-coded safety filter instead.</p>"
            "<table><tr><th>Question</th><th>Answered</th><th>Model 1 (predictor)</th><th>Model 2 (habit impact)</th>"
            f"<th>Safety filter / routine</th></tr>{body}</table>")


def build(df: pd.DataFrame | None, *, predictor_meta: dict | None, habit_report: dict | None,
          sample_report: dict | None, out: Path, synthetic: bool, last_response: str | None = None) -> Path:
    n = 0 if df is None else len(df)
    banner = ('<div class="banner synthetic">SYNTHETIC DEMO: fake people with planted habit effects. '
              'Nothing here describes real AetherSkin members.</div>' if synthetic else
              f'<div class="banner real">Real data: {n} quiz v3 response(s) exported from Supabase.</div>')

    def gate(have: int, need: int) -> str:
        return (f'<span class="ok">Ready ({have} / {need})</span>' if have >= need
                else f'<span class="wait">Waiting ({have} / {need})</span>')

    m1_ready = bool(predictor_meta) and all(t.get("release_ready") for t in predictor_meta["metrics"]["targets"].values())
    cards = f"""<div class="cards">
      <div class="card">Quiz v3 responses<b>{n}</b><span class="muted">newest: {html.escape(last_response or "n/a")}</span></div>
      <div class="card">Model 1 data<b>{gate(n, MIN_TRAIN)}</b><span class="muted">trained: {"yes" if predictor_meta else "no"}; shown to users: {"allowed" if m1_ready else "not yet"}</span></div>
      <div class="card">Model 2 data<b>{gate(n, MIN_HABITS)}</b><span class="muted">report: {"yes" if habit_report else "no"}</span></div>
    </div>"""

    answers = ""
    if df is not None and n:
        charts = [
            _bars("gender", _col_counts(df, "gender", GENDER_CODES[:-1]), n),
            _bars("medication_use", _col_counts(df, "medication_use", MEDICATION_CODES), n),
            _bars("allergy_status", _col_counts(df, "allergy_status", ALLERGY_CODES), n),
        ]
        for col, codes in CATEGORICAL.items():
            charts.append(_bars(col, {c: int((df[col] == c).sum()) for c in codes}, n))
        for col, (lo, hi) in {**ORDINAL, **TARGETS}.items():
            charts.append(_bars(col, {v: int((df[col] == v).sum()) for v in range(lo, hi + 1)}, n))
        for col in CONTINUOUS:
            cuts = pd.cut(df[col], bins=6)
            charts.append(_bars(col, {f"{iv.left:.0f}-{iv.right:.0f}": int(c) for iv, c in cuts.value_counts(sort=False).items()}, n))
        answers = '<div class="grid">' + "".join(f'<div class="card">{c}</div>' for c in charts) + "</div>"
        notes = ""
        for label, col in (("Medication details", "medication_details"), ("Allergy details", "allergy_details")):
            cnt, top = _note_stats(df, col)
            lines = "".join(f"<tr><td>{html.escape(t)}</td><td>{c}</td></tr>" for t, c in top) or "<tr><td colspan=2>none yet</td></tr>"
            notes += (f'<div class="card"><b>{cnt}</b>{label} typed<table><tr><th>Most common</th><th>#</th></tr>{lines}</table></div>')
        answers += ('<h3>Typed notes</h3><p class="muted">Health data, shown only in this local file (never committed). '
                    'Included in the training CSV.</p><div class="grid">' + notes + "</div>")
    else:
        answers = '<p class="muted">No responses yet. Charts appear here after people complete the new quiz.</p>'

    m1 = '<p class="muted">Not trained yet (needs at least 20 responses to try, 300 to be trusted).</p>'
    if predictor_meta:
        rows = "".join(
            f"<tr><td>{t.replace('_level', '')}</td><td>{m['auc']:.2f}</td><td>{100 * m['prevalence_high']:.0f}%</td>"
            f"<td>{100 * m.get('mean_predicted', float('nan')):.0f}%</td><td>{'yes' if m['release_ready'] else 'no'}</td></tr>"
            for t, m in predictor_meta["metrics"]["targets"].items())
        m1 = (f'<p class="muted">Trained on {predictor_meta["metrics"]["n_train"]} rows, tested on '
              f'{predictor_meta["metrics"]["n_test"]} it never saw. AUC: 0.5 = coin flip, 1.0 = perfect; '
              'calibrated when "predicted" ≈ "actual".</p>'
              f"<table><tr><th>Concern</th><th>AUC</th><th>Actual high</th><th>Predicted high</th><th>Release ready</th></tr>{rows}</table>")
        if sample_report:
            m1 += "<h3>Sample personal report (first test person)</h3><pre>" + html.escape(json.dumps(sample_report, indent=2)) + "</pre>"

    m2 = f'<p class="muted">Needs at least {MIN_HABITS} responses.</p>'
    if habit_report:
        m2 = (f'<p class="muted">{html.escape(habit_report["method"])} {html.escape(habit_report["caveat"])} '
              'Dot = estimated change in the 0-4 score from a one-step healthier habit; line = 95% interval. '
              'Grey = no clear link.</p><div class="grid">'
              + "".join(f'<div class="card">{_effects_chart(t, r)}</div>' for t, r in habit_report["effects"].items())
              + "</div><ul>" + "".join(f"<li>{html.escape(h)}</li>" for h in habit_report["headlines"]) + "</ul>")

    if habit_report is not None:
        mc = habit_report.get("medication_control")
        if mc:
            m2 += ("<h3>Skin medication (control)</h3><p class=\"muted\">Change in each 0-4 score for people on skin medication vs not, "
                   f"holding habits fixed ({mc['n_on_medication']} on medication). Interval excluding 0 = clear link.</p><table>"
                   "<tr><th>Concern</th><th>Change</th><th>95% interval</th></tr>"
                   + "".join(f"<tr><td>{html.escape(k)}</td><td>{v:+.2f}</td><td>{mc['ci95'][k][0]:+.2f} to {mc['ci95'][k][1]:+.2f}</td></tr>"
                             for k, v in mc["score_change"].items()) + "</table>")
        else:
            m2 += '<p class="muted">Skin medication control: not reported yet (needs 30 people on and 30 not on medication).</p>'

    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>AetherSkin model dashboard</title>
<style>{CSS}</style></head><body>
<h1>AetherSkin model dashboard</h1><p class="sub">Generated {datetime.now():%d %b %Y %H:%M}</p>{banner}
<h2>1. Data pipeline</h2>{cards}
<h2>2. What the models use from each new question</h2>{_inputs_table(df, predictor_meta, habit_report)}
<h2>3. What people answered</h2>{answers}
<h2>4. Model 1: personal predictor</h2>{m1}
<h2>5. Model 2: habit impact (whole population)</h2>{m2}
</body></html>"""
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding="utf-8")
    return out
