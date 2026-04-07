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
def _human_feature(name: str) -> str:
    m = {
        "session_duration_minutes": "How long the session was",
        "session_type_individual": "One-on-one vs group session",
        "emotion_start_num": "How the resident seemed at the start",
        "intv_healing": "Healing support was used",
        "intv_teaching": "Teaching support was used",
        "intv_legal_services": "Legal help was used",
        "intv_caring": "Caring support was used",
        "n_interventions": "How many types of support were used",
        "session_count_prior": "How many past sessions with this resident",
        "initial_risk_num": "Risk level when the case opened",
        "sub_cat_trafficked": "Trafficking noted in case file",
        "sub_cat_sexual_abuse": "Sexual abuse noted in case file",
        "has_special_needs": "Special needs noted in case file",
        "total_incidents": "Total incident reports (lifetime)",
        "month": "Month of year",
        "day_of_week": "Day of the week",
    }
    return m.get(name, name.replace("_", " "))


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
    resident_feats["current_risk_rank"] = resident_feats["current_risk_level"].map(risk_map)

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
                    "current_risk_rank",
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
        irn = row0.get("initial_risk_num")
        crr = row0.get("current_risk_rank")
        res_summaries.append(
            {
                "resident_id": int(rid),
                "case_control_no": str(row0.get("case_control_no", "") or ""),
                "case_category": str(row0.get("case_category", "") or ""),
                "case_status": str(row0.get("case_status", "") or ""),
                "initial_risk_level": str(row0.get("initial_risk_level", "") or ""),
                "initial_risk_rank": int(irn) if pd.notna(irn) else 0,
                "current_risk_level": str(row0.get("current_risk_level", "") or ""),
                "current_risk_rank": int(crr) if pd.notna(crr) else 0,
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

    gb = pipe.named_steps["m"]
    imp_raw = list(zip(PRED_FEATURES, gb.feature_importances_.tolist()))
    imp_raw.sort(key=lambda x: -x[1])
    imp_sum5 = sum(w for _, w in imp_raw[:5]) or 1.0
    top_drivers = [
        {"feature": _human_feature(n), "importance": float(w), "share_top5_pct": round(100 * w / imp_sum5)}
        for n, w in imp_raw[:5]
    ]

    n_s = len(model_df)
    n_alert = int(model_df["supervisor_alert"].sum())
    n_flag = int(model_df["concerns_flagged"].sum())
    caught = int((model_df["supervisor_alert"] & model_df["concerns_flagged"]).sum())
    recall_flagged = caught / n_flag if n_flag else 0.0
    unflagged = int((~model_df["concerns_flagged"]).sum())
    false_on_calm = int(
        (model_df["supervisor_alert"] & ~model_df["concerns_flagged"]).sum()
    )
    noise_rate = false_on_calm / unflagged if unflagged else 0.0

    by_emotion = (
        model_df.groupby("emotional_state_observed")["concerns_flagged"]
        .agg(["mean", "count"])
        .sort_values("mean", ascending=False)
    )
    worst_em = str(by_emotion.index[0])
    worst_em_rate = float(by_emotion.iloc[0]["mean"])
    by_type = model_df.groupby("session_type")["concerns_flagged"].mean()
    riskier_type = (
        str(by_type.idxmax())
        if len(by_type)
        else "Individual"
    )
    riskier_rate = float(by_type.max()) if len(by_type) else 0.0
    safer_type = str(by_type.idxmin()) if len(by_type) else ""
    safer_rate = float(by_type.min()) if len(by_type) else 0.0

    top3_res = sorted(res_summaries, key=lambda x: -x["max_concern_probability"])[:3]
    calls = [
        f"Resident {r['resident_id']} ({r.get('case_control_no') or 'case'}): highest concern score "
        f"{100 * r['max_concern_probability']:.0f}% — skim their recent sessions."
        for r in top3_res
    ]

    insights = {
        "eyebrow": "AUTOMATED SESSION REVIEW · CONCERN RISK SCORES",
        "headline": (
            f"The system highlights {n_alert} sessions as worth a closer look ({100 * n_alert / n_s:.0f}% of all)—"
            f"and it overlaps with {100 * recall_flagged:.0f}% of sessions where a concern was actually recorded."
        ),
        "lede": (
            f"The score uses {len(PRED_FEATURES)} pieces of information you already have before the session ends. "
            f"We treat {portfolio['alert_threshold']:.0%} and above as “raise this with a supervisor.” "
            f"To cast a wide net, some sessions get flagged even when no concern was later recorded—about {100 * noise_rate:.0f}% of “no concern” sessions still show an alert."
        ),
        "prediction_cards": [
            {
                "label": "Sessions scoring above the alert line",
                "value": str(n_alert),
                "hint": f"{100 * n_alert / n_s:.1f}% of sessions scored at {portfolio['alert_threshold']:.0%} or higher on “chance of a concern”",
            },
            {
                "label": "Recorded concerns the alert overlapped with",
                "value": f"{100 * recall_flagged:.0f}%",
                "hint": f"{caught} out of {n_flag} sessions that truly had a concern also had an alert",
            },
            {
                "label": "Average shift in how residents seemed",
                "value": f"+{portfolio['mean_emotion_shift']:.2f}",
                "hint": "Simple before-and-after mood score across all sessions (higher usually means they seemed better at the end)",
            },
        ],
        "cause_cards": [
            {
                "title": f"When someone arrives feeling «{worst_em}», outcomes are toughest",
                "body": f"In the data, {100 * worst_em_rate:.0f}% of those sessions later had a concern noted—the highest rate by starting mood.",
            },
            {
                "title": f"{riskier_type} sessions show more concerns than {safer_type}",
                "body": f"Roughly {100 * riskier_rate:.0f}% vs {100 * safer_rate:.0f}% of sessions had a concern flag in the records.",
            },
            {
                "title": "Correlation is not causation",
                "body": "The bars below show what the scoring tool leaned on—not proof that those items “caused” a concern. Your clinical judgment still comes first.",
            },
        ],
        "model_drivers": top_drivers,
        "calls_to_action": calls,
    }

    payload = {
        "generated_note": "Counseling effectiveness pipeline — data from generate_counseling_dashboard_data.py",
        "insights": insights,
        "portfolio": portfolio,
        "residents": res_summaries,
        "sessions": sessions_out,
    }

    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(res_summaries)} residents, {len(sessions_out)} sessions scored)")


if __name__ == "__main__":
    main()
