#!/usr/bin/env python3
"""Build counseling-dashboard-data.json for counseling-admin-dashboard.html (same logic as notebook + saved model)."""
from __future__ import annotations

import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
CSV = HERE / "lighthouse_csv_v7"
PKL = HERE / "p4_counseling_model.pkl"
OUT = HERE / "counseling-dashboard-data.json"

EMOTION_MAP = {
    "Distressed": 1,
    "Angry": 2,
    "Sad": 3,
    "Withdrawn": 4,
    "Anxious": 5,
    "Calm": 6,
    "Hopeful": 7,
    "Happy": 8,
}

INTERVENTIONS = ["Healing", "Teaching", "Legal Services", "Caring"]
PRED_FEATURES = [
    "session_duration_minutes",
    "session_type_individual",
    "emotion_start_num",
    "intv_healing",
    "intv_teaching",
    "intv_legal_services",
    "intv_caring",
    "n_interventions",
    "session_count_prior",
    "initial_risk_num",
    "sub_cat_trafficked",
    "sub_cat_sexual_abuse",
    "has_special_needs",
    "total_incidents",
    "month",
    "day_of_week",
]


def main() -> None:
    process = pd.read_csv(CSV / "process_recordings.csv", parse_dates=["session_date"])
    residents = pd.read_csv(CSV / "residents.csv")
    incidents = pd.read_csv(CSV / "incident_reports.csv", parse_dates=["incident_date"])

    process["emotion_start_num"] = process["emotional_state_observed"].map(EMOTION_MAP)
    process["emotion_end_num"] = process["emotional_state_end"].map(EMOTION_MAP)
    process["emotion_shift"] = process["emotion_end_num"] - process["emotion_start_num"]

    for intv in INTERVENTIONS:
        col = "intv_" + intv.replace(" ", "_").lower()
        process[col] = process["interventions_applied"].str.contains(intv, na=False).astype(int)
    process["n_interventions"] = process[
        [f"intv_{i.replace(' ', '_').lower()}" for i in INTERVENTIONS]
    ].sum(axis=1)
    process["month"] = process["session_date"].dt.month
    process["day_of_week"] = process["session_date"].dt.dayofweek
    process["session_type_individual"] = (process["session_type"] == "Individual").astype(int)

    resident_feats = residents[
        [
            "resident_id",
            "case_control_no",
            "initial_risk_level",
            "case_category",
            "case_status",
            "current_risk_level",
            "present_age",
            "assigned_social_worker",
            "sub_cat_trafficked",
            "sub_cat_sexual_abuse",
            "has_special_needs",
        ]
    ].copy()
    risk_map = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
    resident_feats["initial_risk_num"] = resident_feats["initial_risk_level"].map(risk_map)

    process_sorted = process.sort_values(["resident_id", "session_date"]).copy()
    process_sorted["session_count_prior"] = process_sorted.groupby("resident_id").cumcount()
    incident_counts = incidents.groupby("resident_id").size().reset_index(name="total_incidents")

    process_full = (
        process_sorted.merge(
            resident_feats[
                [
                    "resident_id",
                    "case_control_no",
                    "initial_risk_level",
                    "case_category",
                    "case_status",
                    "current_risk_level",
                    "present_age",
                    "assigned_social_worker",
                    "initial_risk_num",
                    "sub_cat_trafficked",
                    "sub_cat_sexual_abuse",
                    "has_special_needs",
                ]
            ],
            on="resident_id",
            how="left",
        ).merge(incident_counts, on="resident_id", how="left")
    )
    process_full["total_incidents"] = process_full["total_incidents"].fillna(0)
    for c in ["sub_cat_trafficked", "sub_cat_sexual_abuse", "has_special_needs"]:
        process_full[c] = process_full[c].astype(str).str.lower().isin(["true", "1"]).astype(int)

    model_df = process_full.dropna(subset=PRED_FEATURES + ["concerns_flagged"]).copy()
    with open(PKL, "rb") as f:
        bundle = pickle.load(f)
    pipe = bundle["model"]

    X = model_df[PRED_FEATURES]
    model_df = model_df.assign(
        concern_probability=pipe.predict_proba(X)[:, 1],
        supervisor_alert=(pipe.predict_proba(X)[:, 1] >= 0.35),
    )

    # Portfolio stats
    portfolio = {
        "total_sessions": int(len(process)),
        "sessions_scored": int(len(model_df)),
        "progress_rate": float(process["progress_noted"].mean()),
        "concern_rate": float(process["concerns_flagged"].mean()),
        "referral_rate": float(process["referral_made"].mean()),
        "mean_emotion_shift": float(process["emotion_shift"].mean()),
        "alert_threshold": 0.35,
    }

    res_summaries = []
    for rid, g in model_df.groupby("resident_id"):
        row0 = g.iloc[0]
        alerts = int(g["supervisor_alert"].sum())
        res_summaries.append(
            {
                "resident_id": int(rid),
                "case_control_no": str(row0.get("case_control_no", "") or ""),
                "case_category": str(row0.get("case_category", "") or ""),
                "case_status": str(row0.get("case_status", "") or ""),
                "initial_risk_level": str(row0.get("initial_risk_level", "") or ""),
                "current_risk_level": str(row0.get("current_risk_level", "") or ""),
                "present_age": str(row0.get("present_age", "") or ""),
                "assigned_social_worker": str(row0.get("assigned_social_worker", "") or ""),
                "session_count": int(len(g)),
                "mean_emotion_shift": float(g["emotion_shift"].mean()),
                "concern_sessions": int(g["concerns_flagged"].sum()),
                "alert_recommended_count": alerts,
                "max_concern_probability": float(g["concern_probability"].max()),
                "mean_concern_probability": float(g["concern_probability"].mean()),
                "last_session_date": str(g["session_date"].max().date()),
            }
        )
    res_summaries.sort(key=lambda x: -x["max_concern_probability"])

    sessions_out = []
    for _, r in model_df.sort_values("session_date", ascending=False).iterrows():
        sessions_out.append(
            {
                "recording_id": int(r["recording_id"]),
                "resident_id": int(r["resident_id"]),
                "session_date": str(r["session_date"].date()),
                "social_worker": str(r["social_worker"]),
                "session_type": str(r["session_type"]),
                "session_duration_minutes": int(r["session_duration_minutes"]),
                "emotional_state_observed": str(r["emotional_state_observed"]),
                "emotional_state_end": str(r["emotional_state_end"]),
                "emotion_shift": float(r["emotion_shift"]),
                "interventions_applied": str(r["interventions_applied"]),
                "progress_noted": bool(r["progress_noted"]),
                "concerns_flagged": bool(r["concerns_flagged"]),
                "referral_made": bool(r["referral_made"]),
                "concern_probability": float(r["concern_probability"]),
                "supervisor_alert": bool(r["supervisor_alert"]),
            }
        )

    payload = {
        "generated_note": "Counseling effectiveness pipeline — data from generate_counseling_dashboard_data.py",
        "portfolio": portfolio,
        "residents": res_summaries,
        "sessions": sessions_out,
    }

    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(res_summaries)} residents, {len(sessions_out)} sessions scored)")


if __name__ == "__main__":
    main()
