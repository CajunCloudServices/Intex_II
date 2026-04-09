#!/usr/bin/env python3
"""intervention-mix-effectiveness.ipynb → intervention-mix-dashboard-data.json"""
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

OUT = _ROOT / "json" / "intervention-mix-dashboard-data.json"


def enrich_history(sub: pd.DataFrame) -> pd.DataFrame:
    sub = sub.sort_values("session_date").copy()
    prior_n = []
    prior_concern = []
    prior_dur = []
    lag1_emo = []
    for _, row in sub.iterrows():
        t = row["session_date"]
        past = sub[sub["session_date"] < t]
        prior_n.append(len(past))
        prior_concern.append(float(past["concerns_flagged"].astype(int).mean()) if len(past) else 0.0)
        prior_dur.append(
            float(past["session_duration_minutes"].mean()) if len(past) else float(row["session_duration_minutes"])
        )
        lag1_emo.append(float(past["emo_start"].iloc[-1]) if len(past) else 3.0)
    sub.loc[:, "prior_session_count"] = prior_n
    sub.loc[:, "prior_mean_concern"] = prior_concern
    sub.loc[:, "prior_mean_duration"] = prior_dur
    sub.loc[:, "lag1_emo_start"] = lag1_emo
    return sub


def main() -> None:
    p = load_table("process_recordings").sort_values("session_date").copy()
    res = load_table("residents")[
        ["resident_id", "safehouse_id", "case_category", "referral_source", "current_risk_level"]
    ]
    p = p.merge(res, on="resident_id", how="left")

    emotion_map = {"Distressed": 1, "Withdrawn": 2, "Sad": 2, "Anxious": 2, "Angry": 2, "Calm": 4, "Hopeful": 5, "Happy": 5}
    p.loc[:, "emo_start"] = p["emotional_state_observed"].map(emotion_map).fillna(3)
    p.loc[:, "emo_end"] = p["emotional_state_end"].map(emotion_map).fillna(3)
    p.loc[:, "emo_delta"] = (p["emo_end"] - p["emo_start"]).clip(-3, 3)
    p.loc[:, "intervention_count"] = p["interventions_applied"].fillna("").str.count(",") + 1
    p.loc[p["interventions_applied"].fillna("") == "", "intervention_count"] = 0
    p.loc[:, "high_concern"] = p["concerns_flagged"].astype(int)
    p.loc[:, "is_individual"] = (p["session_type"] == "Individual").astype(int)
    p.loc[:, "is_group"] = (p["session_type"] == "Group").astype(int)
    p.loc[:, "group_x_intervention_ct"] = p["is_group"] * p["intervention_count"]

    tok_series = p["interventions_applied"].fillna("").str.split(",").apply(lambda xs: [t.strip() for t in xs if t.strip()])
    all_toks = [t for row in tok_series for t in row]
    top_toks = list(pd.Series(all_toks).value_counts().head(6).index)
    for i, t in enumerate(top_toks):
        p.loc[:, f"tok_w{i}"] = p["interventions_applied"].fillna("").str.contains(t, regex=False).astype(int)

    parts = [enrich_history(g) for _, g in p.groupby("resident_id", sort=False)]
    p = pd.concat(parts, ignore_index=True)

    base_feats = [
        "session_duration_minutes",
        "is_individual",
        "is_group",
        "emo_start",
        "intervention_count",
        "group_x_intervention_ct",
        "social_worker",
        "safehouse_id",
        "case_category",
        "referral_source",
        "current_risk_level",
        "prior_session_count",
        "prior_mean_concern",
        "prior_mean_duration",
        "lag1_emo_start",
    ]
    tok_cols = [c for c in p.columns if c.startswith("tok_w")]
    features = base_feats + tok_cols
    X = p[features].copy()
    y_reg = p["emo_delta"]
    y_clf = p["high_concern"]

    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    idx_tr, idx_te = next(gss.split(X, y_clf, groups=p["resident_id"]))
    Xtr, Xte = X.iloc[idx_tr], X.iloc[idx_te]
    ytr_reg, yte_reg = y_reg.iloc[idx_tr], y_reg.iloc[idx_te]
    ytr_clf, yte_clf = y_clf.iloc[idx_tr], y_clf.iloc[idx_te]

    cat_cols = [c for c in X.columns if X[c].dtype == "object" or str(X[c].dtype) == "bool"]
    num_cols = [c for c in X.columns if c not in cat_cols]
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
    rf = Pipeline(
        [
            ("prep", prep),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=280,
                    random_state=42,
                    min_samples_leaf=4,
                    class_weight="balanced_subsample",
                ),
            ),
        ]
    )
    baseline.fit(Xtr, ytr_clf)
    rf.fit(Xtr, ytr_clf)
    base_proba = baseline.predict_proba(Xte)[:, 1]
    rf_proba = rf.predict_proba(Xte)[:, 1]
    rf_pred = (rf_proba >= 0.5).astype(int)
    auc_b = roc_auc_score(yte_clf, base_proba)
    auc_rf = roc_auc_score(yte_clf, rf_proba)
    f1_rf = f1_score(yte_clf, rf_pred, zero_division=0)

    gkf = GroupKFold(n_splits=min(5, p["resident_id"].nunique()))
    cv = cross_validate(rf, X, y_clf, cv=gkf, scoring=["roc_auc", "f1"], groups=p["resident_id"].values, n_jobs=-1)
    cv_auc_m = float(cv["test_roc_auc"].mean())

    perm = permutation_importance(rf, Xte, yte_clf, n_repeats=8, random_state=42, scoring="roc_auc")
    imp = pd.Series(perm.importances_mean, index=X.columns).sort_values(ascending=False).head(12)
    drivers = share_top5_drivers(imp)

    rf_full = Pipeline(
        [
            ("prep", prep),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=280,
                    random_state=42,
                    min_samples_leaf=4,
                    class_weight="balanced_subsample",
                ),
            ),
        ]
    )
    rf_full.fit(X, y_clf)
    proba_all = rf_full.predict_proba(X)[:, 1]

    insights = {
        "eyebrow": "INTERVENTION MIX EFFECTIVENESS",
        "headline": "Which sessions look likely to need concern follow-up (pre-session features only)?",
        "lede": f"Holdout ROC-AUC {safe_round(auc_rf, 3)} vs baseline {safe_round(auc_b, 3)}. Emotional delta R²={safe_round(r2, 3)}.",
        "prediction_cards": [
            {"kicker": "Predictive", "label": "ROC-AUC concern flagged", "value": safe_round(auc_rf, 3), "hint": f"F1: {safe_round(f1_rf, 3)}"},
            {"kicker": "Explanatory", "label": "R² emotional delta", "value": safe_round(r2, 3), "hint": f"MAE: {safe_round(mae, 3)}"},
            {"kicker": "CV", "label": "GroupKFold ROC-AUC mean", "value": safe_round(cv_auc_m, 3), "hint": "Grouped by resident"},
        ],
        "cause_cards": [
            {
                "kicker": "History policy",
                "title": "Prior sessions only",
                "body": "Features use recordings strictly before each session date—mirrors the notebook leakage guard.",
            }
        ],
        "model_drivers": drivers,
        "calls_to_action": [],
    }

    rows = []
    for j, (_, r) in enumerate(p.iterrows()):
        rows.append(
            {
                "recording_id": int(r["recording_id"]),
                "resident_id": int(r["resident_id"]),
                "session_date": str(r["session_date"].date()),
                "session_type": str(r.get("session_type", "") or ""),
                "concern_probability": float(proba_all[j]),
                "concern_actual": bool(int(r["high_concern"])),
                "emo_delta": float(r["emo_delta"]),
                "intervention_count": int(r["intervention_count"]),
            }
        )
    rows.sort(key=lambda x: -x["concern_probability"])
    for c in rows[:3]:
        insights["calls_to_action"].append(
            f"Supervisor review: session {c['recording_id']} (resident {c['resident_id']}) — P(concern)={c['concern_probability']:.0%}."
        )

    payload = {
        "generated_note": "intervention-mix-effectiveness.ipynb → generate_intervention_mix_dashboard_data.py",
        "insights": insights,
        "portfolio": {"n_sessions": int(len(p)), "concern_rate": float(p["high_concern"].mean())},
        "rows": rows,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
