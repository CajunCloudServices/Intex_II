#!/usr/bin/env python3
"""safehouse-operational-load-risk.ipynb → safehouse-load-dashboard-data.json"""
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
from sklearn.model_selection import GroupKFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from data_loader import load_table
from trend_insight_json import safe_round, share_top5_drivers

OUT = _ROOT / "json" / "safehouse-load-dashboard-data.json"


def enrich_group(sub: pd.DataFrame) -> pd.DataFrame:
    sub = sub.copy()
    for w in (3, 6):
        sub.loc[:, f"roll{w}_incident_sum"] = sub["incident_count"].rolling(w, min_periods=1).sum()
        sub.loc[:, f"roll{w}_process_sum"] = sub["process_recording_count"].rolling(w, min_periods=1).sum()
        sub.loc[:, f"roll{w}_visit_sum"] = sub["home_visitation_count"].rolling(w, min_periods=1).sum()
        sub.loc[:, f"roll{w}_res_mean"] = sub["active_residents"].rolling(w, min_periods=1).mean().replace(0, np.nan)
        sub.loc[:, f"roll{w}_rate"] = sub[f"roll{w}_incident_sum"] / sub[f"roll{w}_res_mean"]
        sub.loc[:, f"roll{w}_rate"] = sub[f"roll{w}_rate"].fillna(0)
    sub.loc[:, "lag1_incident_rate"] = sub["incident_rate"].shift(1).fillna(0)
    sub.loc[:, "lag1_proc_per_res"] = sub["proc_per_resident"].shift(1).fillna(0)
    sub.loc[:, "lag1_visit_per_res"] = sub["visit_per_resident"].shift(1).fillna(0)
    sub.loc[:, "mom_incident_rate"] = sub["incident_rate"].diff().fillna(0)
    sub.loc[:, "roll3_rate_lag1"] = sub["roll3_rate"].shift(1).fillna(0)
    sub.loc[:, "roll6_rate_lag1"] = sub["roll6_rate"].shift(1).fillna(0)
    r3 = sub["roll3_rate"]
    sub.loc[:, "roll3_median_prior"] = r3.expanding().median().shift(1)
    sub.loc[:, "above_roll3_median"] = ((r3 > sub["roll3_median_prior"]) & sub["roll3_median_prior"].notna()).astype(int)
    return sub


def main() -> None:
    m = load_table("safehouse_monthly_metrics").sort_values(["safehouse_id", "month_start"]).reset_index(drop=True).copy()
    m.loc[:, "incident_rate"] = (m["incident_count"] / m["active_residents"].replace(0, np.nan)).fillna(0)
    m.loc[:, "proc_per_resident"] = (m["process_recording_count"] / m["active_residents"].replace(0, np.nan)).fillna(0)
    m.loc[:, "visit_per_resident"] = (m["home_visitation_count"] / m["active_residents"].replace(0, np.nan)).fillna(0)
    m.loc[:, "month_num"] = m["month_start"].dt.month

    parts = [enrich_group(sub) for _, sub in m.groupby("safehouse_id", sort=False)]
    m = pd.concat(parts, ignore_index=True)

    m.loc[:, "target_log_rate"] = np.log1p(m["incident_rate"].clip(lower=0))

    y_cls = m["above_roll3_median"].copy()
    cls_name = "above_roll3_median"
    if y_cls.nunique() < 2:
        y_cls = (m["mom_incident_rate"] > 0).astype(int)
        cls_name = "mom_ir_positive"

    features = [
        "safehouse_id",
        "active_residents",
        "avg_education_progress",
        "avg_health_score",
        "process_recording_count",
        "home_visitation_count",
        "proc_per_resident",
        "visit_per_resident",
        "month_num",
        "roll3_rate_lag1",
        "roll6_rate_lag1",
        "lag1_incident_rate",
        "lag1_proc_per_res",
        "lag1_visit_per_res",
        "mom_incident_rate",
    ]
    X = m[features].copy()
    y_reg = m["target_log_rate"]
    groups = m["safehouse_id"].values

    houses = m["safehouse_id"].unique()
    rng = np.random.RandomState(42)
    rng.shuffle(houses)
    n_hold = max(1, int(0.2 * len(houses)))
    hold_set = set(houses[:n_hold])
    train_mask = ~m["safehouse_id"].isin(hold_set)
    test_mask = m["safehouse_id"].isin(hold_set)

    Xtr, Xte = X.loc[train_mask], X.loc[test_mask]
    ytr_reg, yte_reg = y_reg.loc[train_mask], y_reg.loc[test_mask]
    ytr_clf, yte_clf = y_cls.loc[train_mask], y_cls.loc[test_mask]

    cat_cols = ["safehouse_id"]
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

    lin = Pipeline([("prep", prep), ("model", LinearRegression())])
    lin.fit(Xtr, ytr_reg)
    pred_reg = lin.predict(Xte)
    r2 = r2_score(yte_reg, pred_reg)
    mae = mean_absolute_error(yte_reg, pred_reg)

    auc_rf = f1_rf = auc_b = 0.0
    cv_auc_m = cv_f1_m = 0.0
    drivers: list = []
    imp = pd.Series(dtype=float)

    n_splits = min(5, max(2, m["safehouse_id"].nunique()))
    gkf = GroupKFold(n_splits=n_splits)

    if y_cls.nunique() >= 2:
        baseline = Pipeline([("prep", prep), ("model", DummyClassifier(strategy="prior"))])
        rf = Pipeline(
            [
                ("prep", prep),
                (
                    "model",
                    RandomForestClassifier(
                        n_estimators=250,
                        random_state=42,
                        min_samples_leaf=3,
                        class_weight="balanced",
                    ),
                ),
            ]
        )
        baseline.fit(Xtr, ytr_clf)
        rf.fit(Xtr, ytr_clf)
        if yte_clf.nunique() >= 2:
            base_proba = baseline.predict_proba(Xte)[:, 1]
            rf_proba = rf.predict_proba(Xte)[:, 1]
            rf_pred = (rf_proba >= 0.5).astype(int)
            auc_b = roc_auc_score(yte_clf, base_proba)
            auc_rf = roc_auc_score(yte_clf, rf_proba)
            f1_rf = f1_score(yte_clf, rf_pred, zero_division=0)
            perm = permutation_importance(rf, Xte, yte_clf, n_repeats=8, random_state=42, scoring="roc_auc")
            imp = pd.Series(perm.importances_mean, index=X.columns).sort_values(ascending=False).head(10)
            drivers = share_top5_drivers(imp)

        cv = cross_validate(rf, X, y_cls, cv=gkf, scoring=["roc_auc", "f1"], groups=groups, n_jobs=-1)
        cv_auc_m = float(cv["test_roc_auc"].mean())
        cv_f1_m = float(cv["test_f1"].mean())

    rf_full = Pipeline(
        [
            ("prep", prep),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=250,
                    random_state=42,
                    min_samples_leaf=3,
                    class_weight="balanced",
                ),
            ),
        ]
    )
    if y_cls.nunique() >= 2:
        rf_full.fit(X, y_cls)
        proba_all = rf_full.predict_proba(X)[:, 1]
    else:
        proba_all = np.zeros(len(X))

    insights = {
        "eyebrow": "SAFEHOUSE LOAD VS INCIDENT RISK",
        "headline": "Months where rolling incident load clears the house baseline",
        "lede": f"Classification target: {cls_name}. Explanatory holdout R²={safe_round(r2, 3)} on log incident rate.",
        "prediction_cards": [
            {"kicker": "Predictive (holdout)", "label": "ROC-AUC elevated load", "value": safe_round(auc_rf, 3), "hint": f"F1: {safe_round(f1_rf, 3)}"},
            {"kicker": "GroupKFold CV", "label": "Mean ROC-AUC", "value": safe_round(cv_auc_m, 3), "hint": f"Mean F1: {safe_round(cv_f1_m, 3)}"},
            {"kicker": "Explanatory", "label": "R² log incident rate", "value": safe_round(r2, 3), "hint": f"MAE: {safe_round(mae, 3)}"},
        ],
        "cause_cards": [
            {
                "kicker": "Benchmark",
                "title": "House-specific rolling median",
                "body": "Elevated load compares this month to prior rolling signals—associations only.",
            }
        ],
        "model_drivers": drivers if drivers else [{"feature": "safehouse context", "importance": 1.0, "share_top5_pct": 100}],
        "calls_to_action": [],
    }

    rows = []
    for j, (_, r) in enumerate(m.iterrows()):
        rows.append(
            {
                "safehouse_id": int(r["safehouse_id"]),
                "month_start": str(r["month_start"].date()),
                "incident_rate": float(r["incident_rate"]),
                "active_residents": int(r["active_residents"]),
                "elevated_load_probability": float(proba_all[j]),
                "above_bench_actual": bool(int(y_cls.iloc[j])),
                "incident_count": int(r["incident_count"]),
            }
        )
    rows.sort(key=lambda x: -x["elevated_load_probability"])
    for c in rows[:3]:
        insights["calls_to_action"].append(
            f"Watch safehouse {c['safehouse_id']} — {c['month_start']} P(elevated load)={c['elevated_load_probability']:.0%}."
        )

    payload = {
        "generated_note": "safehouse-operational-load-risk.ipynb → generate_safehouse_load_dashboard_data.py",
        "insights": insights,
        "portfolio": {
            "n_rows": int(len(m)),
            "target": cls_name,
            "explanatory_r2": float(r2),
        },
        "rows": rows,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
