#!/usr/bin/env python3
"""resident-trajectory-archetypes.ipynb → resident-trajectory-dashboard-data.json"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LinearRegression
from sklearn.metrics import f1_score, mean_absolute_error, r2_score, roc_auc_score
from sklearn.model_selection import GroupKFold, GroupShuffleSplit, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from data_loader import load_table
from trend_insight_json import safe_round, share_top5_drivers

OUT = _ROOT / "json" / "resident-trajectory-dashboard-data.json"

FEATURE_LABELS = {
    "visits": "Home visits on file",
    "attendance_mean": "Average school attendance",
    "progress_mean": "Average education progress",
    "referral_source": "Referral source (at intake)",
    "process_count": "Counseling / process sessions",
    "health_mean": "Average recorded health score",
    "sleep_mean": "Average sleep quality score",
    "edu_records": "Count of education records",
    "health_records": "Count of health records",
    "concerns_rate": "Share of sessions with concerns flagged",
    "progress_rate": "Share of sessions with progress noted",
    "followup_rate": "Share of visits needing follow-up",
    "safehouse_id": "Safehouse location",
    "case_category": "Case category",
}


def _humanize_feature(name: str) -> str:
    return FEATURE_LABELS.get(name, name.replace("_", " "))


def main() -> None:
    res = load_table("residents").copy()
    edu = load_table("education_records").copy()
    health = load_table("health_wellbeing_records").copy()
    proc = load_table("process_recordings").copy()
    vis = load_table("home_visitations").copy()

    edu_agg = edu.groupby("resident_id").agg(
        attendance_mean=("attendance_rate", "mean"),
        progress_mean=("progress_percent", "mean"),
        edu_records=("education_record_id", "count"),
    )
    health_agg = health.groupby("resident_id").agg(
        health_mean=("general_health_score", "mean"),
        sleep_mean=("sleep_quality_score", "mean"),
        health_records=("health_record_id", "count"),
    )
    proc_agg = proc.groupby("resident_id").agg(
        process_count=("recording_id", "count"),
        concerns_rate=("concerns_flagged", "mean"),
        progress_rate=("progress_noted", "mean"),
    )
    vis_agg = vis.groupby("resident_id").agg(
        visits=("visitation_id", "count"),
        followup_rate=("follow_up_needed", "mean"),
    )

    risk_order = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
    res.loc[:, "initial_risk_num"] = res["initial_risk_level"].map(risk_order)
    res.loc[:, "current_risk_num"] = res["current_risk_level"].map(risk_order)
    res.loc[:, "risk_improved"] = (res["current_risk_num"] < res["initial_risk_num"]).astype(int)
    res.loc[:, "reint_positive"] = res["reintegration_status"].isin(["Completed", "In Progress"]).astype(int)
    res.loc[:, "positive_trajectory"] = ((res["risk_improved"] == 1) | (res["reint_positive"] == 1)).astype(int)

    master = (
        res[
            [
                "resident_id",
                "safehouse_id",
                "case_category",
                "referral_source",
                "current_risk_num",
                "positive_trajectory",
            ]
        ]
        .merge(edu_agg, on="resident_id", how="left")
        .merge(health_agg, on="resident_id", how="left")
        .merge(proc_agg, on="resident_id", how="left")
        .merge(vis_agg, on="resident_id", how="left")
    )

    features = [
        "safehouse_id",
        "case_category",
        "referral_source",
        "attendance_mean",
        "progress_mean",
        "edu_records",
        "health_mean",
        "sleep_mean",
        "health_records",
        "process_count",
        "concerns_rate",
        "progress_rate",
        "visits",
        "followup_rate",
    ]
    num_cols = [
        "attendance_mean",
        "progress_mean",
        "edu_records",
        "health_mean",
        "sleep_mean",
        "health_records",
        "process_count",
        "concerns_rate",
        "progress_rate",
        "visits",
        "followup_rate",
    ]
    cat_cols = ["safehouse_id", "case_category", "referral_source"]

    X = master[features].copy()
    for c in num_cols:
        X[c] = pd.to_numeric(X[c], errors="coerce")
    for c in cat_cols:
        X[c] = X[c].astype("string").fillna("Unknown")

    y_reg = master["current_risk_num"]
    y_clf = master["positive_trajectory"]
    groups = master["resident_id"].values

    prep = ColumnTransformer(
        [
            (
                "num",
                Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]),
                num_cols,
            ),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                cat_cols,
            ),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
        n_jobs=1,
    )

    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    idx_tr, idx_te = next(gss.split(X, y_clf, groups=groups))
    Xtr, Xte = X.iloc[idx_tr], X.iloc[idx_te]
    ytr_reg, yte_reg = y_reg.iloc[idx_tr], y_reg.iloc[idx_te]
    ytrc, ytec = y_clf.iloc[idx_tr], y_clf.iloc[idx_te]

    lin = Pipeline([("prep", prep), ("model", LinearRegression())])
    lin.fit(Xtr, ytr_reg)
    pred_reg = lin.predict(Xte)
    r2 = r2_score(yte_reg, pred_reg)
    mae = mean_absolute_error(yte_reg, pred_reg)

    baseline = Pipeline([("prep", prep), ("model", DummyClassifier(strategy="prior"))])
    rf = Pipeline(
        [
            ("prep", prep),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=300,
                    random_state=42,
                    min_samples_leaf=3,
                    class_weight="balanced_subsample",
                ),
            ),
        ]
    )
    baseline.fit(Xtr, ytrc)
    rf.fit(Xtr, ytrc)
    base_proba = baseline.predict_proba(Xte)[:, 1]
    rf_proba = rf.predict_proba(Xte)[:, 1]
    rf_pred = (rf_proba >= 0.5).astype(int)
    auc_b = roc_auc_score(ytec, base_proba)
    auc_rf = roc_auc_score(ytec, rf_proba)
    f1_rf = f1_score(ytec, rf_pred, zero_division=0)

    gkf = GroupKFold(n_splits=min(5, master["resident_id"].nunique()))
    cv = cross_validate(
        rf,
        X,
        y_clf,
        cv=gkf,
        scoring=["roc_auc", "f1"],
        groups=groups,
        n_jobs=1,
    )
    cv_auc_m = float(cv["test_roc_auc"].mean())

    perm = permutation_importance(
        rf,
        Xte,
        ytec,
        n_repeats=8,
        random_state=42,
        scoring="roc_auc",
        n_jobs=1,
    )
    imp = pd.Series(perm.importances_mean, index=X.columns).sort_values(ascending=False).head(10)
    drivers = share_top5_drivers(imp)

    rf_full = Pipeline(
        [
            ("prep", prep),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=300,
                    random_state=42,
                    min_samples_leaf=3,
                    class_weight="balanced_subsample",
                ),
            ),
        ]
    )
    rf_full.fit(X, y_clf)
    proba_all = rf_full.predict_proba(X)[:, 1]

    pos_rate = float(y_clf.mean())
    n_res = int(len(master))
    median_p = float(np.median(proba_all))

    # Residents worth a closer look: low model score but record still "not positive" (optional contrast)
    review_threshold = 0.42
    rows_preview = []
    for j, (_, r) in enumerate(master.iterrows()):
        p = float(proba_all[j])
        act = bool(int(r["positive_trajectory"]))
        rows_preview.append((int(r["resident_id"]), p, act))
    n_low_score = sum(1 for _, p, _ in rows_preview if p < review_threshold)
    n_low_and_not_pos = sum(1 for _, p, a in rows_preview if p < review_threshold and not a)

    top_human = [_humanize_feature(str(name)) for name, val in imp.head(5).items() if float(val) > 0.001]
    if not top_human:
        top_human = ["Cross-domain activity in education, health, visits, and sessions"]

    signal_bullets = [
        f"The tool leans most on: {', '.join(top_human[:3])}." if len(top_human) >= 3 else f"Signals include: {', '.join(top_human)}.",
        "Higher visit and attendance counts often line up with stronger recorded progress—this can reflect support or a heavier case load; use judgment alongside the case file.",
    ]

    trajectory_bullets = [
        f"About {100 * pos_rate:.0f}% of residents in this export are recorded as on a positive path (risk improved since intake and/or reintegration marked in progress or completed).",
        f"The typical (median) likelihood score in this file is about {100 * median_p:.0f}%—that is how similar residents’ activity looks, on average, to past cases that were later marked on a positive path; use it to rank conversations, not to predict the future.",
        "Current risk level is intentionally not fed into the score so the view focuses on education, health, counseling activity, and visits.",
    ]

    review_bullets = [
        f"{n_low_score} resident(s) score under {100 * review_threshold:.0f}% on the tool’s likelihood—good candidates to review in supervision (not a diagnosis).",
        f"Of those, {n_low_and_not_pos} also show “not positive” on the case record today—prioritize those check-ins first when time is limited.",
    ]

    plain_answers = {
        "trajectory_bullets": trajectory_bullets,
        "signal_bullets": signal_bullets,
        "review_bullets": review_bullets,
        "method_note": (
            "Scores come from a random forest trained on grouped residents (no person split across train and test in checks). "
            "They summarize patterns in your data, not proof that one program caused an outcome."
        ),
        "review_threshold": review_threshold,
    }

    # Plain-language insight cards (optional legacy / other consumers)
    insights = {
        "eyebrow": "RESIDENT PROGRESS",
        "headline": "Who is moving forward, and who may need a closer look?",
        "lede": (
            f"{n_res} residents in file. About {100 * pos_rate:.0f}% are on a positive path in the case record. "
            f"Typical likelihood score {100 * median_p:.0f}%."
        ),
        "prediction_cards": [
            {
                "kicker": "Census",
                "label": "Residents in this export",
                "value": str(n_res),
                "hint": f"Median likelihood score {100 * median_p:.0f}%",
                "definition": "Everyone in the table below; scores are comparable across the file.",
            },
            {
                "kicker": "Case record",
                "label": "On a positive path today",
                "value": f"{100 * pos_rate:.0f}%",
                "hint": "Risk improved and/or reintegration in progress or completed",
                "definition": "Matches how the notebook labels positive trajectory from intake risk and reintegration status.",
            },
            {
                "kicker": "Suggested reviews",
                "label": f"Scores under {100 * review_threshold:.0f}%",
                "value": str(n_low_score),
                "hint": f"{n_low_and_not_pos} also not positive on record",
                "definition": "Use as a triage cue for supervision—not a replacement for clinical judgment.",
            },
        ],
        "cause_cards": [
            {
                "kicker": "What the tool notices",
                "title": "Strongest signals in the data",
                "body": "; ".join(top_human[:5]) + ".",
                "definition": "Derived from permutation checks on the holdout group; shows what the model relied on most, not causal drivers.",
            },
            {
                "kicker": "Fair use",
                "title": "Current risk is not an input",
                "body": "Likelihood is built from safehouse, case category, referral, and history in education, health, sessions, and visits only.",
                "definition": "Avoids double-counting today’s risk level when estimating trajectory.",
            },
        ],
        "model_drivers": drivers,
        "calls_to_action": [],
    }

    rows = []
    for j, (_, r) in enumerate(master.iterrows()):
        rows.append(
            {
                "resident_id": int(r["resident_id"]),
                "safehouse_id": int(r["safehouse_id"]),
                "case_category": str(r.get("case_category", "") or ""),
                "positive_trajectory_probability": float(proba_all[j]),
                "positive_trajectory_actual": bool(int(r["positive_trajectory"])),
                "process_count": float(r["process_count"]),
                "health_mean": float(r["health_mean"]),
            }
        )
    rows.sort(key=lambda x: -x["positive_trajectory_probability"])
    for c in rows[:3]:
        insights["calls_to_action"].append(
            f"Discuss resident {c['resident_id']} (likelihood {c['positive_trajectory_probability']:.0%}) in case conference if workload allows."
        )

    payload = {
        "generated_note": "resident-trajectory-archetypes.ipynb → generate_resident_trajectory_dashboard_data.py",
        "insights": insights,
        "plain_answers": plain_answers,
        "portfolio": {
            "n_residents": n_res,
            "positive_trajectory_rate": pos_rate,
            "median_likelihood": median_p,
            "n_low_likelihood": n_low_score,
            "n_low_likelihood_not_positive_record": n_low_and_not_pos,
            "review_threshold": review_threshold,
            "holdout_auc": safe_round(auc_rf, 3),
            "cv_auc_mean": safe_round(cv_auc_m, 3),
            "regression_r2_holdout": safe_round(r2, 2),
        },
        "rows": rows,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
