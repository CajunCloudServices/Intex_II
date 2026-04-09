#!/usr/bin/env python3
"""Incident composition archetypes (incident-composition-archetypes.ipynb) → incident-archetypes-dashboard-data.json."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent.parent
CSV = HERE / "lighthouse_csv_v7"
OUT = HERE / "json" / "incident-archetypes-dashboard-data.json"


def main() -> None:
    inc = pd.read_csv(CSV / "incident_reports.csv", parse_dates=["incident_date"])
    n = len(inc)
    by_type = (
        inc.groupby("incident_type", as_index=False)
        .size()
        .rename(columns={"size": "n"})
        .sort_values("n", ascending=False)
    )
    type_bars = [{"label": str(r.incident_type), "value": float(r.n)} for _, r in by_type.head(12).iterrows()]

    sev = inc.groupby("severity", as_index=False).size().rename(columns={"size": "n"})
    sev_bars = [{"label": str(r.severity), "value": float(r.n)} for _, r in sev.iterrows()]

    resolved_rate = float(inc["resolved"].astype(bool).mean()) if n else 0.0
    follow_up_rate = float(inc["follow_up_required"].astype(bool).mean()) if n else 0.0

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": (
            "Incident composition from Lighthouse reports: frequency by type and severity, "
            "plus resolution and follow-up rates for operational triage."
        ),
        "kpis": [
            {
                "label": "Total incidents",
                "value": f"{n:,}",
                "sub": "Rows in extract",
                "info": "Count of incident_reports rows after CSV load.",
            },
            {
                "label": "Resolved rate",
                "value": f"{100 * resolved_rate:.1f}%",
                "sub": "Share marked resolved",
                "info": "Mean of resolved flag in source data.",
            },
            {
                "label": "Follow-up flagged",
                "value": f"{100 * follow_up_rate:.1f}%",
                "sub": "When column present",
                "info": "Share of rows with follow_up_required true.",
            },
        ],
        "sections": [
            {"title": "Top incident types (count)", "bars": type_bars},
            {"title": "Incidents by severity", "bars": sev_bars},
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
