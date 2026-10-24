"""Export quiz v3 rows from Supabase to CSV for training.

Run on a trusted machine only. Needs the service-role key, which bypasses
row-level security: keep it in an environment variable, never in a file
that gets committed, and never in the browser.

  SUPABASE_URL=https://<project>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=...
  python -m aetherskin_ml export --out data/quiz_v3.csv

Only the 21 answer columns are exported: no ids, emails or timestamps, so the
CSV is not linked to anyone. Keep it out of git (ml/.gitignore) and delete it
once a model is trained.
"""

from __future__ import annotations

import csv
import json
import os
import urllib.parse
import urllib.request
from pathlib import Path

from .schema import ALL_COLUMNS

PAGE = 1000


def export(out: str | Path) -> int:
    url = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    if not url.startswith("https://"):
        raise ValueError("SUPABASE_URL must be an https:// URL")
    rows, offset = [], 0
    while True:
        query = urllib.parse.urlencode({"select": ",".join(ALL_COLUMNS), "quiz_version": "eq.3",
                                        "order": "id", "limit": PAGE, "offset": offset})
        req = urllib.request.Request(f"{url}/rest/v1/quiz_responses_v3?{query}",
                                     headers={"apikey": key, "Authorization": f"Bearer {key}"})
        with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310 (fixed https host from env)
            page = json.load(resp)
        rows.extend(page)
        if len(page) < PAGE:
            break
        offset += PAGE
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=ALL_COLUMNS)
        w.writeheader()
        w.writerows({c: r[c] for c in ALL_COLUMNS} for r in rows)
    return len(rows)
