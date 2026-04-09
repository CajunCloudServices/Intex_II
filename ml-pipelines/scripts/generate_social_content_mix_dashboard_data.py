#!/usr/bin/env python3
"""social-content-mix-efficiency.ipynb → social-content-mix-dashboard-data.json"""
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
from sklearn.model_selection import cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from data_loader import load_table
from trend_insight_json import safe_round, share_top5_drivers

OUT = _ROOT / "json" / "social-content-mix-dashboard-data.json"


def main() -> None:
    posts = load_table("social_media_posts")
    donations = load_table("donations")
    donations = donations[donations["referral_post_id"].notna()].copy()
    donations.loc[:, "referral_post_id"] = donations["referral_post_id"].astype(int)
    donation_rollup = donations.groupby("referral_post_id").agg(
        referred_count=("donation_id", "count"),
        referred_amount=("amount", "sum"),
    ).reset_index()
    df = posts.merge(donation_rollup, left_on="post_id", right_on="referral_post_id", how="left")
    df[["referred_count", "referred_amount"]] = df[["referred_count", "referred_amount"]].fillna(0)
    df.loc[:, "target_value"] = np.log1p(df["estimated_donation_value_php"].clip(lower=0))
    df.loc[:, "high_referral"] = (df["donation_referrals"] >= df["donation_referrals"].quantile(0.75)).astype(int)

    feature_cols = [
        "platform",
        "post_type",
        "media_type",
        "sentiment_tone",
        "content_topic",
        "has_call_to_action",
        "features_resident_story",
        "is_boosted",
        "post_hour",
        "num_hashtags",
        "caption_length",
        "engagement_rate",
        "impressions",
        "reach",
    ]
    X = df[feature_cols].copy()
    for c in X.columns:
        if X[c].dtype == "bool":
            X.loc[:, c] = X[c].astype(int)
    y_reg = df["target_value"]
    y_clf = df["high_referral"]

    cat_cols = [c for c in feature_cols if X[c].dtype == "object"]
    num_cols = [c for c in feature_cols if c not in cat_cols]
    prep = ColumnTransformer(
        [
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scale", StandardScaler())]), num_cols),
            (
                "cat",
                Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("oh", OneHotEncoder(handle_unknown="ignore"))]),
                cat_cols,
            ),
        ]
    )

    Xtr, Xte, ytr_reg, yte_reg = train_test_split(X, y_reg, test_size=0.2, random_state=42)
    lin = Pipeline([("prep", prep), ("model", LinearRegression())])
    lin.fit(Xtr, ytr_reg)
    pred_reg = lin.predict(Xte)
    r2 = r2_score(yte_reg, pred_reg)
    mae = mean_absolute_error(yte_reg, pred_reg)

    Xtrc, Xtec, ytrc, ytec = train_test_split(X, y_clf, test_size=0.2, random_state=42, stratify=y_clf)
    prep_c = ColumnTransformer(
        [
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scale", StandardScaler())]), num_cols),
            (
                "cat",
                Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("oh", OneHotEncoder(handle_unknown="ignore"))]),
                cat_cols,
            ),
        ]
    )
    baseline = Pipeline([("prep", prep_c), ("model", DummyClassifier(strategy="prior"))])
    rf = Pipeline(
        [
            ("prep", prep_c),
            ("model", RandomForestClassifier(n_estimators=300, random_state=42, min_samples_leaf=4)),
        ]
    )
    baseline.fit(Xtrc, ytrc)
    rf.fit(Xtrc, ytrc)
    proba_base = baseline.predict_proba(Xtec)[:, 1]
    proba_rf = rf.predict_proba(Xtec)[:, 1]
    pred_rf = (proba_rf >= 0.5).astype(int)
    auc_base = roc_auc_score(ytec, proba_base)
    auc_rf = roc_auc_score(ytec, proba_rf)
    f1_rf = f1_score(ytec, pred_rf)

    cv = cross_validate(rf, X, y_clf, cv=5, scoring=["roc_auc", "f1"])
    cv_auc_mean = float(cv["test_roc_auc"].mean())
    cv_auc_std = float(cv["test_roc_auc"].std())

    rf_full = Pipeline(
        [
            ("prep", prep_c),
            ("model", RandomForestClassifier(n_estimators=300, random_state=42, min_samples_leaf=4)),
        ]
    )
    rf_full.fit(X, y_clf)
    top_ref_share = float(y_clf.mean())

    perm = permutation_importance(rf, Xtec, ytec, n_repeats=8, random_state=42, scoring="roc_auc")
    imp = pd.Series(perm.importances_mean, index=X.columns).sort_values(ascending=False).head(10)
    drivers = share_top5_drivers(imp)

    top_feat = str(imp.index[0]) if len(imp) else "content mix"

    insights = {
        "eyebrow": "REFERRAL VALUE PER POST",
        "headline": "Which content mixes land in the top referral tier before you publish?",
        "lede": (
            f"About {100 * top_ref_share:.0f}% of posts sit in the top referral quartile by donation_referrals. "
            f"Holdout ROC-AUC is {safe_round(auc_rf, 3)} (baseline {safe_round(auc_base, 3)}); 5-fold CV AUC ≈ {safe_round(cv_auc_mean, 3)}."
        ),
        "prediction_cards": [
            {
                "kicker": "Predictive model (holdout)",
                "label": "ROC-AUC — top referral quartile",
                "value": safe_round(auc_rf, 3),
                "hint": f"F1 at 0.5 threshold: {safe_round(f1_rf, 3)}",
            },
            {
                "kicker": "Explanatory model (holdout)",
                "label": "R² on log donation value",
                "value": safe_round(r2, 3),
                "hint": f"MAE on log scale: {safe_round(mae, 3)}",
            },
            {
                "kicker": "Portfolio",
                "label": "Share of posts in top referral quartile",
                "value": f"{100 * top_ref_share:.1f}%",
                "hint": "Based on donation_referrals distribution",
            },
            {
                "kicker": "Top signal",
                "label": "Strongest driver in permutation test",
                "value": top_feat.replace("_", " "),
                "hint": "See table for per-post probabilities",
            },
        ],
        "cause_cards": [
            {
                "kicker": "Association",
                "title": "Content mix links to referrals and value",
                "body": "Coefficients and importances describe patterns in historical posts—not guarantees for the next post.",
            },
            {
                "kicker": "How to use",
                "title": "Plan before publish",
                "body": "Use predicted top-quartile probability to prioritize review of mixes that look like past high-referral posts.",
            },
        ],
        "model_drivers": drivers,
        "calls_to_action": [],
    }

    proba_all = rf_full.predict_proba(X)[:, 1]
    rows = []
    for j, (_, r) in enumerate(df.iterrows()):
        rows.append(
            {
                "post_id": int(r["post_id"]),
                "platform": str(r["platform"]),
                "post_type": str(r["post_type"]),
                "content_topic": str(r.get("content_topic", "") or ""),
                "donation_referrals": int(r["donation_referrals"]),
                "high_referral_actual": bool(int(r["high_referral"])),
                "top_quartile_probability": float(proba_all[j]),
            }
        )
    rows.sort(key=lambda x: -x["top_quartile_probability"])
    for c in rows[:3]:
        insights["calls_to_action"].append(
            f"Review post #{c['post_id']} ({c['platform']}/{c['post_type']}) — top-quartile probability {c['top_quartile_probability']:.0%}."
        )

    payload = {
        "generated_note": "social-content-mix-efficiency.ipynb → generate_social_content_mix_dashboard_data.py",
        "insights": insights,
        "portfolio": {
            "n_posts": int(len(df)),
            "holdout_roc_auc": float(auc_rf),
            "cv_roc_auc_mean": cv_auc_mean,
            "explanatory_r2": float(r2),
            "top_quartile_rate": top_ref_share,
        },
        "rows": rows,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
