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
    master = master.fillna(0)

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
    X = master[features].copy()
    y_reg = master["current_risk_num"]
    y_clf = master["positive_trajectory"]
    groups = master["resident_id"].values

    cat_cols = [c for c in features if X[c].dtype == "object" or str(X[c].dtype) == "bool"]
    num_cols = [c for c in features if c not in cat_cols]
    prep = ColumnTransformer(
        [
            ("num", Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]), num_cols),
            (
                "cat",
                Pipeline([("impute", SimpleImputer(strategy="most_frequent")), ("oh", OneHotEncoder(handle_unknown="ignore"))]),
                cat_cols,
            ),
        ]
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
    cv = cross_validate(rf, X, y_clf, cv=gkf, scoring=["roc_auc", "f1"], groups=groups, n_jobs=-1)
    cv_auc_m = float(cv["test_roc_auc"].mean())

    perm = permutation_importance(rf, Xte, ytec, n_repeats=8, random_state=42, scoring="roc_auc")
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

    insights = {
        "eyebrow": "RESIDENT TRAJECTORY ARCHETYPES",
        "headline": "Who shows positive trajectory signals without peeking at current risk?",
        "lede": f"Positive trajectory rate {100 * pos_rate:.0f}% in file. Holdout ROC-AUC {safe_round(auc_rf, 3)} (baseline {safe_round(auc_b, 3)}).",
        "prediction_cards": [
            {
                "kicker": "Predictive",
                "label": "ROC-AUC positive trajectory",
                "value": safe_round(auc_rf, 3),
                "hint": f"F1: {safe_round(f1_rf, 3)}",
                "definition": "Holdout discrimination for the positive-trajectory label using only allowed features.",
            },
            {
                "kicker": "Explanatory proxy",
                "label": "R² on current risk_num",
                "value": safe_round(r2, 3),
                "hint": f"MAE: {safe_round(mae, 3)} (leakage-controlled label excluded from X)",
                "definition": "Secondary fit metric on risk level; label for trajectory is kept separate from features to limit leakage.",
            },
            {
                "kicker": "Grouped CV",
                "label": "Mean ROC-AUC",
                "value": safe_round(cv_auc_m, 3),
                "hint": "GroupKFold by resident",
                "definition": "Cross-validation with residents kept whole across folds.",
            },
        ],
        "cause_cards": [
            {
                "kicker": "Leakage control",
                "title": "current_risk_num not in features",
                "body": "Trajectory label uses improvement/reintegration status; cross-domain aggregates only in X.",
                "definition": "Explains which outcomes are modeled and what is excluded from predictors by design.",
            }
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
            f"Case conference candidate: resident {c['resident_id']} — P(positive trajectory)={c['positive_trajectory_probability']:.0%}."
        )

    payload = {
        "generated_note": "resident-trajectory-archetypes.ipynb → generate_resident_trajectory_dashboard_data.py",
        "insights": insights,
        "portfolio": {"n_residents": int(len(master)), "positive_trajectory_rate": pos_rate},
        "rows": rows,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
