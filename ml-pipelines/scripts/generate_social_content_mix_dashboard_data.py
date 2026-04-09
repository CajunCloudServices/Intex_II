#!/usr/bin/env python3
"""Social content mix efficiency (social-content-mix-efficiency.ipynb) → social-content-mix-dashboard-data.json."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent.parent
CSV = HERE / "lighthouse_csv_v7"
OUT = HERE / "json" / "social-content-mix-dashboard-data.json"


def main() -> None:
    posts = pd.read_csv(CSV / "social_media_posts.csv", parse_dates=["created_at"])
    posts["est"] = pd.to_numeric(posts["estimated_donation_value_php"], errors="coerce").fillna(0)

    by_type = (
        posts.groupby("post_type", as_index=False)
        .agg(n=("post_id", "count"), avg_est_php=("est", "mean"))
        .sort_values("avg_est_php", ascending=False)
    )
    type_bars = [{"label": str(r.post_type), "value": float(max(r.avg_est_php, 0))} for _, r in by_type.iterrows()]

    by_topic = (
        posts.groupby("content_topic", as_index=False)
        .agg(n=("post_id", "count"), avg_est_php=("est", "mean"))
        .sort_values("avg_est_php", ascending=False)
    )
    topic_bars = [{"label": str(r.content_topic), "value": float(max(r.avg_est_php, 0))} for _, r in by_topic.head(15).iterrows()]

    top_type = by_type.iloc[0]["post_type"] if len(by_type) else "—"
    overall = float(posts["est"].mean()) if len(posts) else 0.0

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": (
            "Content mix vs modeled donation linkage: average estimated PHP by post type and topic "
            "to prioritize formats that align with stronger donation signals."
        ),
        "kpis": [
            {
                "label": "Posts analyzed",
                "value": f"{len(posts):,}",
                "sub": "Social media rows",
                "info": "Rows in social_media_posts extract.",
            },
            {
                "label": "Avg estimated PHP / post",
                "value": f"₱{overall:,.0f}",
                "sub": "Mean of estimated_donation_value_php",
                "info": "Average of modeled donation value field across posts.",
            },
            {
                "label": "Highest-avg format",
                "value": str(top_type),
                "sub": "By mean estimated PHP",
                "info": "Post type with highest mean estimated_donation_value_php.",
            },
        ],
        "sections": [
            {"title": "Mean estimated PHP by post type", "bars": type_bars},
            {"title": "Mean estimated PHP by content topic (top 15)", "bars": topic_bars},
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
