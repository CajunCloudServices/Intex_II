#!/usr/bin/env python3
"""campaign-timing-seasonality.ipynb → campaign-timing-dashboard-data.json"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LinearRegression
from sklearn.metrics import f1_score, mean_absolute_error, r2_score, roc_auc_score
from sklearn.model_selection import cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from data_loader import load_table
from trend_insight_json import safe_round, share_top5_drivers

OUT = _ROOT / "json" / "campaign-timing-dashboard-data.json"


def main() -> None:
    don = load_table("donations").sort_values("donation_date").copy()
    don.loc[:, "amount_effective"] = don["amount"].fillna(don["estimated_value"]).clip(lower=0)
    don.loc[:, "month"] = don["donation_date"].dt.month
    don.loc[:, "quarter"] = don["donation_date"].dt.quarter.astype(str)
    don.loc[:, "year"] = don["donation_date"].dt.year
    don.loc[:, "is_year_end"] = don["month"].isin([10, 11, 12]).astype(int)
    don.loc[:, "campaign_present"] = don["campaign_name"].notna().astype(int)
    don.loc[:, "target_log_amount"] = np.log1p(don["amount_effective"])
    don.loc[:, "high_value"] = (don["amount_effective"] >= don["amount_effective"].quantile(0.75)).astype(int)

    features = [
        "month",
        "quarter",
        "year",
        "is_year_end",
        "campaign_present",
        "campaign_name",
        "channel_source",
        "is_recurring",
        "donation_type",
    ]
    X = don[features].copy()
    for c in ["is_recurring", "campaign_present", "is_year_end"]:
        if c in X.columns and X[c].dtype == "bool":
            X[c] = X[c].astype(int)
    y_reg = don["target_log_amount"]
    y_clf = don["high_value"]

    split = int(len(don) * 0.8)
    Xtr, Xte = X.iloc[:split], X.iloc[split:]
    ytr_reg, yte_reg = y_reg.iloc[:split], y_reg.iloc[split:]
    ytr_clf, yte_clf = y_clf.iloc[:split], y_clf.iloc[split:]

    cat_cols = [c for c in features if X[c].dtype == "object"]
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

    baseline = Pipeline([("prep", prep), ("model", DummyClassifier(strategy="prior"))])
    gb = Pipeline([("prep", prep), ("model", GradientBoostingClassifier(random_state=42))])
    baseline.fit(Xtr, ytr_clf)
    gb.fit(Xtr, ytr_clf)
    base_proba = baseline.predict_proba(Xte)[:, 1]
    gb_proba = gb.predict_proba(Xte)[:, 1]
    gb_pred = (gb_proba >= 0.5).astype(int)
    auc_b = roc_auc_score(yte_clf, base_proba)
    auc_g = roc_auc_score(yte_clf, gb_proba)
    f1_g = f1_score(yte_clf, gb_pred)

    cv = cross_validate(gb, X, y_clf, cv=5, scoring=["roc_auc", "f1"])
    cv_auc_m = float(cv["test_roc_auc"].mean())

    gb_full = Pipeline([("prep", prep), ("model", GradientBoostingClassifier(random_state=42))])
    gb_full.fit(X, y_clf)
    proba_all = gb_full.predict_proba(X)[:, 1]

    perm = permutation_importance(gb, Xte, yte_clf, n_repeats=8, random_state=42, scoring="roc_auc")
    imp = pd.Series(perm.importances_mean, index=X.columns).sort_values(ascending=False).head(10)
    drivers = share_top5_drivers(imp)

    q4_share = float(don["month"].isin([10, 11, 12]).mean())
    insights = {
        "eyebrow": "CAMPAIGN TIMING AND SEASONALITY",
        "headline": "When do high-value gifts tend to land?",
        "lede": (
            f"Temporal holdout: GB ROC-AUC {safe_round(auc_g, 3)} vs baseline {safe_round(auc_b, 3)}. "
            f"About {100 * float(y_clf.mean()):.0f}% of rows are top-quartile by amount."
        ),
        "prediction_cards": [
            {"kicker": "Predictive (holdout)", "label": "ROC-AUC — high value", "value": safe_round(auc_g, 3), "hint": f"F1: {safe_round(f1_g, 3)}"},
            {"kicker": "Explanatory (holdout)", "label": "R² log amount", "value": safe_round(r2, 3), "hint": f"MAE log: {safe_round(mae, 3)}"},
            {"kicker": "Seasonality snapshot", "label": "Share of donations in Oct–Dec", "value": f"{100 * q4_share:.1f}%", "hint": "Calendar month from donation_date"},
            {"kicker": "CV signal", "label": "5-fold ROC-AUC mean", "value": safe_round(cv_auc_m, 3), "hint": "Gradient boosting classifier"},
        ],
        "cause_cards": [
            {
                "kicker": "Association",
                "title": "Quarter and channel patterns",
                "body": "Coefficients reflect historical correlations—use for planning windows, not causal guarantees.",
            }
        ],
        "model_drivers": drivers,
        "calls_to_action": [],
    }

    rows = []
    for j, (_, r) in enumerate(don.iterrows()):
        rows.append(
            {
                "donation_id": int(r["donation_id"]),
                "donation_date": str(r["donation_date"].date()),
                "month": int(r["month"]),
                "quarter": str(r["quarter"]),
                "amount_php": float(r["amount_effective"]),
                "high_value_actual": bool(int(r["high_value"])),
                "high_value_probability": float(proba_all[j]),
                "donation_type": str(r.get("donation_type", "") or ""),
                "channel_source": str(r.get("channel_source", "") or ""),
            }
        )
    rows.sort(key=lambda x: -x["high_value_probability"])
    for c in rows[:3]:
        insights["calls_to_action"].append(
            f"Review donation #{c['donation_id']} on {c['donation_date']} — P(high value)={c['high_value_probability']:.0%}."
        )

    payload = {
        "generated_note": "campaign-timing-seasonality.ipynb → generate_campaign_timing_dashboard_data.py",
        "insights": insights,
        "portfolio": {"n_donations": int(len(don)), "q4_month_share": q4_share, "high_value_rate": float(y_clf.mean())},
        "rows": rows,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
