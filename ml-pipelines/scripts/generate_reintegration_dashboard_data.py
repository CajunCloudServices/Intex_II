#!/usr/bin/env python3
"""Reintegration readiness pipeline (reintegration-readiness.ipynb) → reintegration-dashboard-data.json."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

HERE = Path(__file__).resolve().parent.parent
CSV = HERE / "lighthouse_csv_v7"
OUT = HERE / "json" / "reintegration-dashboard-data.json"

EXPLAIN_FEATURES = [
    "avg_health_score",
    "health_trend",
    "avg_progress_percent",
    "edu_trend",
    "avg_emotion_shift",
    "pct_progress_noted",
    "pct_concerns_flagged",
    "n_sessions",
    "avg_session_duration",
    "n_incidents",
    "n_high_severity",
    "initial_risk_num",
    "sub_cat_trafficked",
    "sub_cat_sexual_abuse",
    "has_special_needs",
    "n_psych_checkups",
    "n_healing_sessions",
]


def build_master() -> tuple[pd.DataFrame, list[str]]:
    residents = pd.read_csv(
        CSV / "residents.csv",
        parse_dates=["date_of_admission", "date_closed", "date_of_birth"],
    )
    health = pd.read_csv(CSV / "health_wellbeing_records.csv", parse_dates=["record_date"])
    education = pd.read_csv(CSV / "education_records.csv", parse_dates=["record_date"])
    process = pd.read_csv(CSV / "process_recordings.csv", parse_dates=["session_date"])
    incidents = pd.read_csv(CSV / "incident_reports.csv", parse_dates=["incident_date"])

    risk_order = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
    residents["initial_risk_num"] = residents["initial_risk_level"].map(risk_order)
    residents["current_risk_num"] = residents["current_risk_level"].map(risk_order)
    residents["risk_improved"] = (
        residents["current_risk_num"] < residents["initial_risk_num"]
    ).astype(int)
    reint_positive = {"Completed": 1, "In Progress": 1, "On Hold": 0, "Not Started": 0}
    residents["reint_positive"] = (
        residents["reintegration_status"].map(reint_positive).fillna(0).astype(int)
    )
    residents["positive_trajectory"] = (
        (residents["risk_improved"] == 1) | (residents["reint_positive"] == 1)
    ).astype(int)

    health_agg = health.sort_values(["resident_id", "record_date"]).groupby("resident_id").agg(
        avg_health_score=("general_health_score", "mean"),
        latest_health_score=("general_health_score", "last"),
        health_trend=(
            "general_health_score",
            lambda x: x.iloc[-1] - x.iloc[0] if len(x) > 1 else 0,
        ),
        avg_nutrition=("nutrition_score", "mean"),
        avg_sleep=("sleep_quality_score", "mean"),
        avg_energy=("energy_level_score", "mean"),
        avg_bmi=("bmi", "mean"),
        n_medical_checkups=("medical_checkup_done", "sum"),
        n_psych_checkups=("psychological_checkup_done", "sum"),
        n_health_records=("health_record_id", "count"),
    ).reset_index()

    education_agg = education.sort_values(["resident_id", "record_date"]).groupby(
        "resident_id"
    ).agg(
        avg_attendance_rate=("attendance_rate", "mean"),
        avg_progress_percent=("progress_percent", "mean"),
        latest_progress=("progress_percent", "last"),
        edu_trend=(
            "progress_percent",
            lambda x: x.iloc[-1] - x.iloc[0] if len(x) > 1 else 0,
        ),
        n_completed_courses=(
            "completion_status",
            lambda x: (x == "Completed").sum(),
        ),
        n_education_records=("education_record_id", "count"),
    ).reset_index()

    emotion_map = {
        "Distressed": 1,
        "Angry": 2,
        "Sad": 3,
        "Withdrawn": 4,
        "Anxious": 5,
        "Calm": 6,
        "Hopeful": 7,
        "Happy": 8,
    }
    process["emotion_start_num"] = process["emotional_state_observed"].map(emotion_map)
    process["emotion_end_num"] = process["emotional_state_end"].map(emotion_map)
    process["emotion_shift"] = process["emotion_end_num"] - process["emotion_start_num"]
    process["has_healing"] = process["interventions_applied"].str.contains(
        "Healing", na=False
    ).astype(int)
    process["has_teaching"] = process["interventions_applied"].str.contains(
        "Teaching", na=False
    ).astype(int)
    process["has_legal"] = process["interventions_applied"].str.contains(
        "Legal", na=False
    ).astype(int)
    process["has_caring"] = process["interventions_applied"].str.contains(
        "Caring", na=False
    ).astype(int)

    process_agg = process.groupby("resident_id").agg(
        n_sessions=("recording_id", "count"),
        avg_session_duration=("session_duration_minutes", "mean"),
        avg_emotion_shift=("emotion_shift", "mean"),
        pct_progress_noted=("progress_noted", "mean"),
        pct_concerns_flagged=("concerns_flagged", "mean"),
        pct_referral_made=("referral_made", "mean"),
        n_individual_sessions=(
            "session_type",
            lambda x: (x == "Individual").sum(),
        ),
        n_group_sessions=("session_type", lambda x: (x == "Group").sum()),
        n_healing_sessions=("has_healing", "sum"),
        n_teaching_sessions=("has_teaching", "sum"),
        n_legal_sessions=("has_legal", "sum"),
        n_caring_sessions=("has_caring", "sum"),
        latest_emotion_end=("emotion_end_num", "last"),
    ).reset_index()

    severity_map = {"Low": 1, "Medium": 2, "High": 3}
    incidents["severity_num"] = incidents["severity"].map(severity_map)
    incident_agg = incidents.groupby("resident_id").agg(
        n_incidents=("incident_id", "count"),
        n_high_severity=("severity_num", lambda x: (x == 3).sum()),
        n_selfharm=("incident_type", lambda x: (x == "SelfHarm").sum()),
        n_runaway=("incident_type", lambda x: (x == "RunawayAttempt").sum()),
        avg_severity=("severity_num", "mean"),
        pct_unresolved=("resolved", lambda x: (~x.astype(bool)).mean()),
    ).reset_index()

    all_resident_ids = pd.DataFrame({"resident_id": residents["resident_id"]})
    incident_agg = all_resident_ids.merge(incident_agg, on="resident_id", how="left").fillna(
        0
    )

    resident_features = residents[
        [
            "resident_id",
            "positive_trajectory",
            "case_control_no",
            "case_category",
            "case_status",
            "initial_risk_level",
            "current_risk_level",
            "sub_cat_trafficked",
            "sub_cat_physical_abuse",
            "sub_cat_sexual_abuse",
            "sub_cat_at_risk",
            "is_pwd",
            "has_special_needs",
            "family_is_4ps",
            "family_solo_parent",
            "family_informal_settler",
            "initial_risk_num",
            "referral_source",
        ]
    ].copy()

    bool_cols = [
        "sub_cat_trafficked",
        "sub_cat_physical_abuse",
        "sub_cat_sexual_abuse",
        "sub_cat_at_risk",
        "is_pwd",
        "has_special_needs",
        "family_is_4ps",
        "family_solo_parent",
        "family_informal_settler",
    ]
    for c in bool_cols:
        resident_features[c] = resident_features[c].astype(str).str.lower().isin(
            ["true", "1"]
        ).astype(int)

    master = (
        resident_features.merge(health_agg, on="resident_id", how="left")
        .merge(education_agg, on="resident_id", how="left")
        .merge(process_agg, on="resident_id", how="left")
        .merge(incident_agg, on="resident_id", how="left")
    )

    num_cols = master.select_dtypes(include=[np.number]).columns.tolist()
    num_cols = [c for c in num_cols if c not in ["resident_id", "positive_trajectory"]]
    imputer = SimpleImputer(strategy="median")
    master[num_cols] = imputer.fit_transform(master[num_cols])

    pred_features = [
        c
        for c in num_cols
        if c != "positive_trajectory"
        and c not in ["initial_risk_num", "current_risk_num", "risk_improved", "reint_positive"]
    ]
    return master, pred_features


def main() -> None:
    master, pred_features = build_master()

    X_exp = master[EXPLAIN_FEATURES].copy()
    y_exp = master["positive_trajectory"]
    scaler_exp = StandardScaler()
    X_exp_scaled = scaler_exp.fit_transform(X_exp)
    lr_exp = LogisticRegression(penalty="l2", C=1.0, max_iter=500, random_state=42)
    lr_exp.fit(X_exp_scaled, y_exp)
    causal = [
        {"feature": EXPLAIN_FEATURES[i], "coefficient": float(lr_exp.coef_[0][i])}
        for i in range(len(EXPLAIN_FEATURES))
    ]
    causal.sort(key=lambda x: -abs(x["coefficient"]))

    X_pred = master[pred_features].copy()
    y_pred = master["positive_trajectory"]

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    pred_models = {
        "Logistic Regression": Pipeline(
            [
                ("sc", StandardScaler()),
                ("m", LogisticRegression(max_iter=500, random_state=42)),
            ]
        ),
        "Random Forest": Pipeline(
            [
                ("sc", StandardScaler()),
                ("m", RandomForestClassifier(n_estimators=100, random_state=42)),
            ]
        ),
    }
    cv_rows = {}
    for name, pipe in pred_models.items():
        cv = cross_validate(
            pipe,
            X_pred,
            y_pred,
            cv=skf,
            scoring=["roc_auc", "f1", "accuracy"],
            return_train_score=False,
        )
        cv_rows[name] = {
            "ROC-AUC": float(cv["test_roc_auc"].mean()),
            "F1": float(cv["test_f1"].mean()),
            "Accuracy": float(cv["test_accuracy"].mean()),
        }

    X_train2, X_test2, y_train2, y_test2 = train_test_split(
        X_pred, y_pred, test_size=0.2, stratify=y_pred, random_state=42
    )
    best_pipe = pred_models["Random Forest"]
    best_pipe.fit(X_train2, y_train2)
    auc = float(roc_auc_score(y_test2, best_pipe.predict_proba(X_test2)[:, 1]))

    rf_model = best_pipe.named_steps["m"]
    fi = [
        {"feature": pred_features[i], "importance": float(rf_model.feature_importances_[i])}
        for i in range(len(pred_features))
    ]
    fi.sort(key=lambda x: -x["importance"])

    probs = best_pipe.predict_proba(X_pred)[:, 1]
    master = master.assign(trajectory_probability=probs)

    risk_map = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
    residents_out = []
    for _, r in master.sort_values("trajectory_probability", ascending=False).iterrows():
        ir = r.get("initial_risk_level")
        irank = risk_map.get(str(ir), 0) if pd.notna(ir) else 0
        residents_out.append(
            {
                "resident_id": int(r["resident_id"]),
                "case_control_no": str(r.get("case_control_no") or ""),
                "case_category": str(r.get("case_category") or ""),
                "case_status": str(r.get("case_status") or ""),
                "initial_risk_level": str(r.get("initial_risk_level") or ""),
                "initial_risk_rank": int(irank),
                "current_risk_level": str(r.get("current_risk_level") or ""),
                "positive_trajectory_actual": bool(r["positive_trajectory"]),
                "trajectory_probability": float(r["trajectory_probability"]),
            }
        )

    top_fi = fi[0]
    top_prot = max(causal, key=lambda x: x["coefficient"])
    top_risk = min(causal, key=lambda x: x["coefficient"])
    mean_prob_pos = float(master.loc[master["positive_trajectory"] == 1, "trajectory_probability"].mean())
    mean_prob_neg = float(master.loc[master["positive_trajectory"] == 0, "trajectory_probability"].mean())
    gap = mean_prob_pos - mean_prob_neg
    top3_low = sorted(
        [x for x in residents_out if not x["positive_trajectory_actual"]],
        key=lambda x: x["trajectory_probability"],
    )[:3]

    _feat_plain = {
        "avg_health_score": "Average health check-in score",
        "health_trend": "Change in health scores over time",
        "avg_progress_percent": "Average school or training progress",
        "edu_trend": "Change in education progress over time",
        "avg_emotion_shift": "Average mood improvement per counseling session",
        "pct_progress_noted": "Share of sessions with progress noted",
        "pct_concerns_flagged": "Share of sessions with a concern flagged",
        "n_sessions": "Number of counseling sessions",
        "avg_session_duration": "Average session length",
        "n_incidents": "Number of incident reports",
        "n_high_severity": "Number of high-severity incidents",
        "n_psych_checkups": "Psychological check-ups completed",
        "n_healing_sessions": "Sessions that included healing support",
        "initial_risk_num": "Risk level when the case opened",
        "sub_cat_trafficked": "Trafficking noted in case file",
        "sub_cat_sexual_abuse": "Sexual abuse noted in case file",
        "has_special_needs": "Special needs noted in case file",
    }

    def _pf(s: str) -> str:
        return _feat_plain.get(s, s.replace("_", " "))

    insights = {
        "eyebrow": "WHO NEEDS EXTRA CASE SUPPORT",
        "headline": (
            f"Residents on a stronger path average {100 * mean_prob_pos:.0f}%. "
            f"Residents still struggling average {100 * mean_prob_neg:.0f}%."
        ),
        "lede": (
            f"{100 * float(y_pred.mean()):.0f}% of residents in this file are currently on a positive path. "
            f"Use this page to focus case conferences and follow-up time."
        ),
        "prediction_cards": [
            {
                "label": "Gap between stronger and harder cases",
                "value": f"+{100 * gap:.0f} points",
                "hint": "Bigger gap means clearer separation",
            },
            {
                "label": "Biggest case signal",
                "value": _pf(top_fi["feature"])[:40],
                "hint": "This showed up most in the ranking",
            },
            {
                "label": "Reliability check",
                "value": f"{cv_rows['Random Forest']['ROC-AUC']:.2f}",
                "hint": "Higher is better",
            },
        ],
        "cause_cards": [
            {
                "title": f"Better outcomes are linked with: {_pf(top_prot['feature'])}",
                "body": "This pattern appears more in residents on a positive path.",
            },
            {
                "title": f"Harder outcomes are linked with: {_pf(top_risk['feature'])}",
                "body": "This pattern appears more in residents needing extra support.",
            },
            {
                "title": "How to use this screen",
                "body": "Top cards give a quick planning summary. Open the fold below for resident-by-resident detail.",
            },
        ],
        "model_drivers": [
            {
                "feature": _pf(x["feature"])[:55],
                "importance": x["importance"],
                "share_top5_pct": round(
                    100 * x["importance"] / sum(y["importance"] for y in fi[:5])
                ),
            }
            for x in fi[:5]
        ],
        "calls_to_action": [
            f"Review Resident {r['resident_id']} at next case meeting (high support need)."
            for r in top3_low
        ],
    }

    payload = {
        "generated_note": "Reintegration readiness — reintegration-readiness.ipynb",
        "insights": insights,
        "portfolio": {
            "n_residents": int(len(master)),
            "positive_trajectory_rate": float(y_pred.mean()),
            "test_roc_auc_rf": auc,
            "cv_by_model": cv_rows,
        },
        "causal_ridge_logistic_coefficients": causal,
        "random_forest_importances": fi[:20],
        "residents": residents_out,
    }

    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(residents_out)} residents)")


if __name__ == "__main__":
    main()
