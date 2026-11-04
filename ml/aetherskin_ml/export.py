"""Export quiz v3 rows from Supabase to CSV for training.

Run on a trusted machine only. Credentials come from environment variables,
or, if those aren't set, from the site's own .env.local at the repo root
(git-ignored), using NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
The service-role key bypasses row-level security: never commit it, never
put it in the browser.

Only answer columns are written (the 17 coded answers plus gender, medication
and allergy answers and their two typed notes): no ids, emails or timestamps,
so the CSV is not linked to anyone. The typed notes are health information,
so keep the file on this machine only. It lands in ml/data/ (git-ignored).
"""

from __future__ import annotations

import csv
import json
import os
import urllib.parse
import urllib.request
from pathlib import Path

from .schema import EXPORT_COLUMNS

PAGE = 1000
REPO_ROOT = Path(__file__).resolve().parents[2]


def _credentials() -> tuple[str, str]:
    env = dict(os.environ)
    dotenv = REPO_ROOT / ".env.local"
    if dotenv.exists():
        for line in dotenv.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    url = env.get("SUPABASE_URL") or env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit("Missing Supabase credentials: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, "
                         "or keep them in the repo's .env.local.")
    url = url.rstrip("/")
    if not url.startswith("https://"):
        raise SystemExit("Supabase URL must start with https://")
    return url, key


_FORMULA_START = ("=", "+", "-", "@", "\t", "\r", "\n")


def safe_cell(value) -> str:
    """Blank for None; a leading ' on text a spreadsheet would run as a formula.

    The typed notes are member-supplied. Without this, a note such as
    =HYPERLINK(...) would be a live formula if the CSV is opened in Excel.
    """
    if value is None:
        return ""
    s = str(value)
    return "'" + s if s.startswith(_FORMULA_START) else s


def _get(url: str, key: str, params: dict) -> list:
    req = urllib.request.Request(f"{url}/rest/v1/quiz_responses_v3?{urllib.parse.urlencode(params)}",
                                 headers={"apikey": key, "Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310 (fixed https host from config)
        return json.load(resp)


def export(out: str | Path) -> tuple[int, str | None]:
    """Write all v3 rows to `out`. Returns (row count, newest response time)."""
    url, key = _credentials()
    rows, offset = [], 0
    while True:
        page = _get(url, key, {"select": ",".join(EXPORT_COLUMNS), "quiz_version": "eq.3",
                               "order": "id", "limit": PAGE, "offset": offset})
        rows.extend(page)
        if len(page) < PAGE:
            break
        offset += PAGE
    newest = _get(url, key, {"select": "created_at", "order": "created_at.desc", "limit": 1})
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=EXPORT_COLUMNS)
        w.writeheader()
        # Older rows have no value for the 4 Nov 2026 columns: written empty.
        # Text cells (only the two typed notes can start with a formula
        # character) go through safe_cell; numbers pass untouched.
        w.writerows({c: (safe_cell(r.get(c)) if isinstance(r.get(c), str) or r.get(c) is None
                         else r[c]) for c in EXPORT_COLUMNS} for r in rows)
    return len(rows), (newest[0]["created_at"][:16].replace("T", " ") + " UTC") if newest else None
