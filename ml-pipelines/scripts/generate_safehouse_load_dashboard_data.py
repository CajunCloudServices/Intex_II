#!/usr/bin/env python3
"""Safehouse operational load risk (safehouse-operational-load-risk.ipynb) → safehouse-load-dashboard-data.json."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent.parent
CSV = HERE / "lighthouse_csv_v7"
OUT = HERE / "json" / "safehouse-load-dashboard-data.json"


def main() -> None:
    m = pd.read_csv(CSV / "safehouse_monthly_metrics.csv", parse_dates=["month_start", "month_end"])
    m["load_proxy"] = (
        pd.to_numeric(m["active_residents"], errors="coerce").fillna(0)
        + pd.to_numeric(m["incident_count"], errors="coerce").fillna(0)
        + 0.1 * pd.to_numeric(m["home_visitation_count"], errors="coerce").fillna(0)
    )

    by_house = (
        m.groupby("safehouse_id", as_index=False)
        .agg(
            mean_res=("active_residents", "mean"),
            mean_inc=("incident_count", "mean"),
            mean_load=("load_proxy", "mean"),
        )
        .sort_values("mean_load", ascending=False)
    )
    load_bars = [{"label": f"Safehouse {int(r.safehouse_id)}", "value": float(r.mean_load)} for _, r in by_house.iterrows()]

    monthly = (
        m.assign(ym=m["month_start"].dt.to_period("M").astype(str))
        .groupby("ym", as_index=False)
        .agg(incidents=("incident_count", "sum"), residents=("active_residents", "mean"))
        .sort_values("ym")
    )
    trend_bars = [{"label": r.ym, "value": float(r.incidents)} for _, r in monthly.tail(18).iterrows()]

    avg_inc = float(m["incident_count"].mean()) if len(m) else 0.0
    avg_res = float(m["active_residents"].mean()) if len(m) else 0.0

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": (
            "Operational load proxy: residents + incidents (+ light weight on home visits) by safehouse "
            "and incident trend over recent months."
        ),
        "kpis": [
            {
                "label": "Avg active residents",
                "value": f"{avg_res:.1f}",
                "sub": "Per monthly metric row",
                "info": "Mean of active_residents across safehouse_monthly_metrics.",
            },
            {
                "label": "Avg incidents / row",
                "value": f"{avg_inc:.2f}",
                "sub": "Per monthly metric row",
                "info": "Mean of incident_count in operational metrics extract.",
            },
            {
                "label": "Highest-load site",
                "value": f"ID {int(by_house.iloc[0].safehouse_id)}" if len(by_house) else "—",
                "sub": "By load proxy mean",
                "info": "Safehouse with highest average load_proxy (residents + incidents + 0.1×visits).",
            },
        ],
        "sections": [
            {"title": "Load proxy by safehouse (higher = more pressure)", "bars": load_bars},
            {"title": "Monthly incident totals (recent periods)", "bars": trend_bars},
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
