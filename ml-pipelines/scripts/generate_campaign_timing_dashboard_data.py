#!/usr/bin/env python3
"""Campaign timing & seasonality (campaign-timing-seasonality.ipynb) → campaign-timing-dashboard-data.json."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent.parent
CSV = HERE / "lighthouse_csv_v7"
OUT = HERE / "json" / "campaign-timing-dashboard-data.json"


def main() -> None:
    don = pd.read_csv(CSV / "donations.csv", parse_dates=["donation_date"])
    don["amount_effective"] = don["amount"].fillna(don["estimated_value"]).clip(lower=0)
    don["month"] = don["donation_date"].dt.month
    don["quarter"] = don["donation_date"].dt.quarter
    don["year"] = don["donation_date"].dt.year
    don["is_year_end"] = don["month"].isin([10, 11, 12]).astype(int)
    don["campaign_present"] = don["campaign_name"].notna().astype(int)

    monthly = (
        don.groupby("month", as_index=False)
        .agg(
            n_donations=("donation_id", "count"),
            total_php=("amount_effective", "sum"),
            mean_php=("amount_effective", "mean"),
        )
        .sort_values("month")
    )
    overall_mean = float(don["amount_effective"].mean()) or 1.0
    seasonal_index = [
        {
            "month": int(r.month),
            "label": pd.Timestamp(2000, int(r.month), 1).strftime("%b"),
            "mean_php": float(r.mean_php),
            "index_vs_avg": float(r.mean_php / overall_mean),
            "n": int(r.n_donations),
            "total_php": float(r.total_php),
        }
        for _, r in monthly.iterrows()
    ]

    quarterly = (
        don.groupby("quarter", as_index=False)
        .agg(n=("donation_id", "count"), total_php=("amount_effective", "sum"))
        .sort_values("quarter")
    )
    quarter_bars = [
        {"label": f"Q{int(r.quarter)}", "value": float(r.total_php)}
        for _, r in quarterly.iterrows()
    ]

    cmp_on = don[don["campaign_present"] == 1]["amount_effective"]
    cmp_off = don[don["campaign_present"] == 0]["amount_effective"]
    lift = float(cmp_on.mean() / cmp_off.mean()) if len(cmp_off) and cmp_off.mean() > 0 else 1.0

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": (
            "Donation timing effects estimated from historical gifts: monthly means, quarterly totals, "
            "and simple campaign-attributed lift vs non-campaign gifts."
        ),
        "kpis": [
            {
                "label": "Mean gift (PHP)",
                "value": f"₱{overall_mean:,.0f}",
                "sub": "All donations in extract",
                "info": "Mean of effective amount (amount filled from estimated_value when missing).",
            },
            {
                "label": "Campaign gift lift",
                "value": f"{lift:.2f}×",
                "sub": "Mean with campaign name vs without",
                "info": "Ratio of mean amount when campaign_name is present vs absent.",
            },
            {
                "label": "Peak month (by total PHP)",
                "value": max(seasonal_index, key=lambda x: x["total_php"])["label"]
                if seasonal_index
                else "—",
                "sub": "Largest month by total volume",
                "info": "Month with highest sum of effective donation amounts.",
            },
        ],
        "sections": [
            {
                "title": "Seasonal index by month (mean PHP vs dataset average)",
                "bars": [
                    {"label": x["label"], "value": max(0.01, x["index_vs_avg"])}
                    for x in seasonal_index
                ],
            },
            {"title": "Total donation volume by quarter (PHP)", "bars": quarter_bars},
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
