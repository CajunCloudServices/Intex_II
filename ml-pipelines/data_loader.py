from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "lighthouse_csv_v7"


TABLE_CONFIG: dict[str, dict[str, Any]] = {
    "supporters": {"file": "supporters.csv", "parse_dates": ["created_at", "first_donation_date"]},
    "donations": {"file": "donations.csv", "parse_dates": ["donation_date"]},
    "donation_allocations": {"file": "donation_allocations.csv", "parse_dates": ["allocation_date"]},
    "safehouse_monthly_metrics": {"file": "safehouse_monthly_metrics.csv", "parse_dates": ["month_start", "month_end"]},
    "education_records": {"file": "education_records.csv", "parse_dates": ["record_date"]},
    "health_wellbeing_records": {"file": "health_wellbeing_records.csv", "parse_dates": ["record_date"]},
    "public_impact_snapshots": {"file": "public_impact_snapshots.csv", "parse_dates": ["snapshot_date", "published_at"]},
    "incident_reports": {"file": "incident_reports.csv", "parse_dates": ["incident_date"]},
    "safehouses": {"file": "safehouses.csv", "parse_dates": ["open_date"]},
    "residents": {
        "file": "residents.csv",
        "parse_dates": [
            "date_of_birth",
            "date_of_admission",
            "date_colb_registered",
            "date_colb_obtained",
            "date_case_study_prepared",
            "date_enrolled",
            "date_closed",
            "created_at",
        ],
    },
    "partners": {"file": "partners.csv", "parse_dates": ["start_date", "end_date"]},
    "partner_assignments": {"file": "partner_assignments.csv", "parse_dates": ["assignment_start", "assignment_end"]},
    "in_kind_donation_items": {"file": "in_kind_donation_items.csv", "parse_dates": []},
    "home_visitations": {"file": "home_visitations.csv", "parse_dates": ["visit_date"]},
    "social_media_posts": {"file": "social_media_posts.csv", "parse_dates": ["created_at"]},
    "process_recordings": {"file": "process_recordings.csv", "parse_dates": ["session_date"]},
    "intervention_plans": {
        "file": "intervention_plans.csv",
        "parse_dates": ["target_date", "case_conference_date", "created_at", "updated_at"],
    },
}


def available_tables() -> list[str]:
    return sorted(TABLE_CONFIG.keys())


def csv_path(table_name: str) -> Path:
    config = TABLE_CONFIG.get(table_name)
    if config is None:
        raise KeyError(f"Unknown table '{table_name}'. Available tables: {', '.join(available_tables())}")
    return DATA_DIR / config["file"]


def load_table(
    table_name: str,
    source: str = "csv",
    conn: Any | None = None,
    query: str | None = None,
) -> pd.DataFrame:
    config = TABLE_CONFIG.get(table_name)
    if config is None:
        raise KeyError(f"Unknown table '{table_name}'. Available tables: {', '.join(available_tables())}")

    if source == "csv":
        path = DATA_DIR / config["file"]
        return pd.read_csv(path, parse_dates=config.get("parse_dates") or None)

    if source == "db":
        if conn is None:
            raise ValueError("Database connection/engine is required when source='db'.")
        sql = query or f"SELECT * FROM {table_name}"
        return pd.read_sql_query(sql, conn)

    raise ValueError("source must be 'csv' or 'db'")
