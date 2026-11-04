"""The training CSV must not turn member-typed notes into spreadsheet formulas."""

from aetherskin_ml.export import safe_cell
from aetherskin_ml.schema import ALL_COLUMNS, EXPORT_COLUMNS, EXTRA_COLUMNS, INPUT_COLUMNS


def test_formula_text_is_neutralised():
    for bad in ['=HYPERLINK("http://x","y")', "+cmd|x", "-2+3", "@SUM(A1)", "\t=1", "\r=1"]:
        assert safe_cell(bad).startswith("'")


def test_plain_text_and_empty_pass_through():
    assert safe_cell("retinol serum") == "retinol serum"
    assert safe_cell(None) == ""
    assert safe_cell("yes") == "yes"


def test_export_has_new_columns_but_models_do_not_use_them():
    assert set(EXTRA_COLUMNS) <= set(EXPORT_COLUMNS)
    assert not set(EXTRA_COLUMNS) & set(INPUT_COLUMNS)
    assert EXPORT_COLUMNS[: len(ALL_COLUMNS)] == ALL_COLUMNS
