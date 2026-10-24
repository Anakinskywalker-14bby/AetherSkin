from aetherskin_ml import dashboard, habit_impact
from aetherskin_ml.predictor import Predictor
from synthetic import make_synthetic


def test_dashboard_with_no_real_data_says_waiting(tmp_path):
    page = dashboard.build(None, predictor_meta=None, habit_report=None, sample_report=None,
                           out=tmp_path / "d.html", synthetic=False).read_text(encoding="utf-8")
    assert "Waiting (0 / 300)" in page and "Waiting (0 / 100)" in page
    assert "SYNTHETIC" not in page


def test_dashboard_with_trained_models_shows_everything(tmp_path):
    df = make_synthetic(n=1500, seed=3)
    pred = Predictor.train(df)
    report = habit_impact.analyse(df, n_boot=50)
    page = dashboard.build(df, predictor_meta={"metrics": pred.metrics}, habit_report=report,
                           sample_report=pred.report(df.iloc[0].to_dict()), out=tmp_path / "d.html",
                           synthetic=True).read_text(encoding="utf-8")
    assert "SYNTHETIC DEMO" in page            # fake data is always labelled
    assert "<b>1500</b>" in page               # the row count the models used
    assert page.count("<svg") >= 20            # answer charts + 3 habit charts
    assert "nan" not in page.lower()
