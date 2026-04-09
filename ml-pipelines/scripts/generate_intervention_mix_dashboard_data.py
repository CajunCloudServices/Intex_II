#!/usr/bin/env python3
"""Intervention mix effectiveness (intervention-mix-effectiveness.ipynb) → intervention-mix-dashboard-data.json."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent.parent
CSV = HERE / "lighthouse_csv_v7"
OUT = HERE / "json" / "intervention-mix-dashboard-data.json"


def main() -> None:
    plans = pd.read_csv(CSV / "intervention_plans.csv", parse_dates=["created_at"])
    n = len(plans)

    by_cat = (
        plans.groupby("plan_category", as_index=False)
        .size()
        .rename(columns={"size": "n"})
        .sort_values("n", ascending=False)
    )
    cat_bars = [{"label": str(r.plan_category), "value": float(r.n)} for _, r in by_cat.iterrows()]

    status = plans.groupby("status", as_index=False).size().rename(columns={"size": "n"})
    status_bars = [{"label": str(r.status), "value": float(r.n)} for _, r in status.iterrows()]

    in_progress_share = float(
        (plans["status"].astype(str).str.strip().str.lower() == "in progress").mean()
    ) if n else 0.0

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": (
            "Intervention plan mix: how services cluster by category and where cases sit in workflow status."
        ),
        "kpis": [
            {
                "label": "In progress",
                "value": f"{100 * in_progress_share:.1f}%",
                "sub": "Share status = In Progress",
                "info": "Share of intervention plans currently marked In Progress.",
            },
            {
                "label": "Plan categories",
                "value": f"{by_cat.shape[0]}",
                "sub": "Distinct plan_category values",
                "info": "Cardinality of plan_category in extract.",
            },
            {
                "label": "Total plans",
                "value": f"{n:,}",
                "sub": "Rows loaded",
                "info": "Count of intervention_plans rows.",
            },
        ],
        "sections": [
            {"title": "Plans by category", "bars": cat_bars},
            {"title": "Plans by status", "bars": status_bars},
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
