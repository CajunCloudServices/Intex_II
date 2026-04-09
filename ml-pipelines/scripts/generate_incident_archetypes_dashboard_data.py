#!/usr/bin/env python3
"""incident-composition-archetypes.ipynb → incident-archetypes-dashboard-data.json"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LinearRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    r2_score,
    roc_auc_score,
)
from sklearn.model_selection import GroupShuffleSplit, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from data_loader import load_table
from trend_insight_json import safe_round, share_top5_drivers

OUT = _ROOT / "json" / "incident-archetypes-dashboard-data.json"


def shannon_entropy(counts: np.ndarray) -> float:
    p = counts[counts > 0] / counts.sum()
    return float(-(p * np.log(p + 1e-12)).sum()) if len(p) else 0.0


def enrich_resident_history(sub: pd.DataFrame) -> pd.DataFrame:
    sub = sub.sort_values("incident_date").copy()
    prior_30 = []
    prior_90 = []
    days_since = []
    prior_max_sev = []
    ent_90 = []
    for _, row in sub.iterrows():
        t = row["incident_date"]
        past = sub[sub["incident_date"] < t]
        p30 = past[past["incident_date"] >= t - pd.Timedelta(days=30)]
        p90 = past[past["incident_date"] >= t - pd.Timedelta(days=90)]
        prior_30.append(len(p30))
        prior_90.append(len(p90))
        if len(past):
            days_since.append((t - past["incident_date"].max()).days)
            prior_max_sev.append(float(past["severity_num"].max()))
            vc = p90["incident_type"].value_counts()
            ent_90.append(shannon_entropy(vc.values.astype(float)))
        else:
            days_since.append(365)
            prior_max_sev.append(1.0)
            ent_90.append(0.0)
    sub.loc[:, "prior_count_30d"] = prior_30
    sub.loc[:, "prior_count_90d"] = prior_90
    sub.loc[:, "days_since_last_inc"] = days_since
    sub.loc[:, "prior_max_severity"] = prior_max_sev
    sub.loc[:, "type_entropy_90d"] = ent_90
    return sub


def main() -> None:
    inc = load_table("incident_reports").sort_values("incident_date").copy()
    res = load_table("residents")[["resident_id", "current_risk_level", "case_category", "referral_source"]]
    df = inc.merge(res, on="resident_id", how="left")
    severity_map = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
    df.loc[:, "severity_num"] = df["severity"].map(severity_map).fillna(2)
    top_types = df["incident_type"].value_counts().head(4).index
    df.loc[:, "incident_bucket"] = np.where(df["incident_type"].isin(top_types), df["incident_type"], "Other")
    df.loc[:, "month"] = df["incident_date"].dt.month
    df.loc[:, "dayofweek"] = df["incident_date"].dt.dayofweek

    alpha = 1.0
    type_house = df.groupby(["safehouse_id", "incident_type"]).size().reset_index(name="tc")
    house_n = df.groupby("safehouse_id").size().reset_index(name="hn")
    n_types = df["incident_type"].nunique()
    type_house = type_house.merge(house_n, on="safehouse_id")
    type_house["smoothed_rate"] = (type_house["tc"] + alpha) / (type_house["hn"] + alpha * n_types)
    df = df.merge(
        type_house[["safehouse_id", "incident_type", "smoothed_rate"]],
        on=["safehouse_id", "incident_type"],
        how="left",
    )

    parts = [enrich_resident_history(g) for _, g in df.groupby("resident_id", sort=False)]
    df = pd.concat(parts, ignore_index=True)

    df.loc[:, "y_binary_high_sev"] = (df["severity_num"] >= 3).astype(int)

    features = [
        "safehouse_id",
        "resolved",
        "follow_up_required",
        "month",
        "dayofweek",
        "current_risk_level",
        "reported_by",
        "case_category",
        "referral_source",
        "prior_count_30d",
        "prior_count_90d",
        "days_since_last_inc",
        "prior_max_severity",
        "type_entropy_90d",
        "smoothed_rate",
    ]
    X = df[features].copy()
    y_reg = df["severity_num"]
    y_clf = df["incident_bucket"]
    y_bin = df["y_binary_high_sev"]

    cat_cols = [c for c in X.columns if X[c].dtype == "object" or str(X[c].dtype) == "bool"]
    num_cols = [c for c in X.columns if c not in cat_cols]
    for c in cat_cols:
        if X[c].dtype == "bool":
            X.loc[:, c] = X[c].astype(int)
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
    idx_tr, idx_te = next(gss.split(X, y_clf, groups=df["resident_id"]))
    Xtr, Xte = X.iloc[idx_tr], X.iloc[idx_te]
    ytr_reg, yte_reg = y_reg.iloc[idx_tr], y_reg.iloc[idx_te]
    ytrc, ytec = y_clf.iloc[idx_tr], y_clf.iloc[idx_te]
    ytrb, yteb = y_bin.iloc[idx_tr], y_bin.iloc[idx_te]

    lin = Pipeline([("prep", prep), ("model", LinearRegression())])
    lin.fit(Xtr, ytr_reg)
    pred_reg = lin.predict(Xte)
    r2 = r2_score(yte_reg, pred_reg)
    mae = mean_absolute_error(yte_reg, pred_reg)

    rf = Pipeline(
        [
            ("prep", prep),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=250,
                    random_state=42,
                    min_samples_leaf=3,
                    class_weight="balanced_subsample",
                ),
            ),
        ]
    )
    rf.fit(Xtr, ytrc)
    pred = rf.predict(Xte)
    acc = accuracy_score(ytec, pred)
    f1_macro = f1_score(ytec, pred, average="macro", zero_division=0)

    cv = cross_validate(rf, X, y_clf, cv=5, scoring=["accuracy", "f1_macro"], n_jobs=-1)
    cv_acc_m = float(cv["test_accuracy"].mean())

    rf_b = Pipeline(
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
    rf_b.fit(Xtr, ytrb)
    auc_bin = f1_bin = 0.0
    if yteb.nunique() >= 2:
        proba_b = rf_b.predict_proba(Xte)[:, 1]
        pred_b = (proba_b >= 0.5).astype(int)
        auc_bin = roc_auc_score(yteb, proba_b)
        f1_bin = f1_score(yteb, pred_b, zero_division=0)

    perm = permutation_importance(rf_b, Xte, yteb, n_repeats=8, random_state=42, scoring="roc_auc") if yteb.nunique() >= 2 else None
    if perm is not None:
        imp = pd.Series(perm.importances_mean, index=X.columns).sort_values(ascending=False).head(10)
        drivers = share_top5_drivers(imp)
    else:
        drivers = [{"feature": "incident context", "importance": 1.0, "share_top5_pct": 100}]

    rf_b_full = Pipeline(
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
    rf_b_full.fit(X, y_bin)
    proba_all = rf_b_full.predict_proba(X)[:, 1]

    rf_multi_full = Pipeline(
        [
            ("prep", prep),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=250,
                    random_state=42,
                    min_samples_leaf=3,
                    class_weight="balanced_subsample",
                ),
            ),
        ]
    )
    rf_multi_full.fit(X, y_clf)
    archetype_pred = rf_multi_full.predict(X)

    insights = {
        "eyebrow": "INCIDENT COMPOSITION ARCHETYPES",
        "headline": "High or critical severity risk from incident context and resident history",
        "lede": f"Multiclass accuracy (holdout) {safe_round(acc, 3)}; macro-F1 {safe_round(f1_macro, 3)}. Binary High/Critical AUC {safe_round(auc_bin, 3)}.",
        "prediction_cards": [
            {"kicker": "Archetype model", "label": "Holdout accuracy", "value": safe_round(acc, 3), "hint": f"Macro-F1: {safe_round(f1_macro, 3)}"},
            {"kicker": "Binary High/Critical", "label": "ROC-AUC", "value": safe_round(auc_bin, 3), "hint": f"F1: {safe_round(f1_bin, 3)}"},
            {"kicker": "Severity regression", "label": "R² severity_num", "value": safe_round(r2, 3), "hint": f"MAE: {safe_round(mae, 3)}"},
            {"kicker": "CV archetype", "label": "5-fold accuracy mean", "value": safe_round(cv_acc_m, 3), "hint": "Multiclass RandomForest"},
        ],
        "cause_cards": [
            {
                "kicker": "No future leakage",
                "title": "Prior-window features",
                "body": "Counts and entropy use only incidents before each row's date.",
            }
        ],
        "model_drivers": drivers,
        "calls_to_action": [],
    }

    rows = []
    for j, (_, r) in enumerate(df.iterrows()):
        ap = archetype_pred[j]
        rows.append(
            {
                "incident_id": int(r["incident_id"]),
                "resident_id": int(r["resident_id"]),
                "incident_date": str(r["incident_date"].date()),
                "incident_type": str(r.get("incident_type", "") or ""),
                "severity": str(r.get("severity", "") or ""),
                "high_critical_probability": float(proba_all[j]),
                "predicted_archetype": str(ap),
                "high_critical_actual": bool(int(r["y_binary_high_sev"])),
            }
        )
    rows.sort(key=lambda x: -x["high_critical_probability"])
    for c in rows[:3]:
        insights["calls_to_action"].append(
            f"Prevention focus: incident {c['incident_id']} — P(High/Critical)={c['high_critical_probability']:.0%}, archetype {c['predicted_archetype']}."
        )

    payload = {
        "generated_note": "incident-composition-archetypes.ipynb → generate_incident_archetypes_dashboard_data.py",
        "insights": insights,
        "portfolio": {
            "n_incidents": int(len(df)),
            "high_sev_rate": float(y_bin.mean()),
            "cv_accuracy_mean": cv_acc_m,
        },
        "rows": rows,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
