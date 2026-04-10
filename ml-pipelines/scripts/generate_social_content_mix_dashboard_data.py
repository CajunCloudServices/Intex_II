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

DRIVER_PLAIN = {
    "post type": "post format (carousel, story, reel, etc.)",
    "platform": "which social platform",
    "media type": "image, video, or other media type",
    "sentiment tone": "tone of the caption",
    "content topic": "topic tag on the post",
    "has call to action": "whether the post asks the audience to do something",
    "features resident story": "whether the post highlights a resident story",
    "is boosted": "paid boost or not",
    "post hour": "time of day posted",
    "num hashtags": "number of hashtags",
    "caption length": "how long the caption is",
    "engagement rate": "engagement rate on the post",
    "impressions": "impressions",
    "reach": "reach",
}


def _humanize_driver(name: str) -> str:
    key = str(name).strip().lower().replace("_", " ")
    return DRIVER_PLAIN.get(key, key)


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

    cv = cross_validate(rf, X, y_clf, cv=5, scoring=["roc_auc", "f1"], n_jobs=1)
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

    proba_all = rf_full.predict_proba(X)[:, 1]
    df_scored = df.reset_index(drop=True).copy()
    df_scored.loc[:, "_strong_score"] = proba_all

    mix = (
        df_scored.groupby(["platform", "post_type"], as_index=False)
        .agg(
            posts=("post_id", "count"),
            avg_referrals=("donation_referrals", "mean"),
            median_referrals=("donation_referrals", "median"),
            total_referrals=("donation_referrals", "sum"),
            avg_strong_score=("_strong_score", "mean"),
        )
        .sort_values(["avg_referrals", "posts"], ascending=[False, False])
    )
    platform_type_performance: list[dict] = []
    for _, r in mix.iterrows():
        platform_type_performance.append(
            {
                "platform": str(r["platform"]),
                "post_type": str(r["post_type"]),
                "posts": int(r["posts"]),
                "avg_referrals": float(r["avg_referrals"]),
                "median_referrals": float(r["median_referrals"]),
                "total_referrals": int(r["total_referrals"]),
                "avg_strong_referral_score": float(r["avg_strong_score"]),
            }
        )

    min_n = 3
    by_type = (
        df_scored.groupby("post_type", as_index=False)
        .agg(posts=("post_id", "count"), avg_referrals=("donation_referrals", "mean"))
        .query(f"posts >= {min_n}")
        .sort_values("avg_referrals", ascending=False)
    )
    top_post_types: list[dict] = []
    for _, r in by_type.head(8).iterrows():
        top_post_types.append(
            {
                "post_type": str(r["post_type"]),
                "posts": int(r["posts"]),
                "avg_referrals": float(r["avg_referrals"]),
            }
        )

    driver_lines = []
    for i, row in enumerate(drivers[:5] if drivers else []):
        label = _humanize_driver(str(row["feature"]))
        pct = int(row["share_top5_pct"])
        if i == 0:
            driver_lines.append(
                f"The strong-referral score leans most on {label} (about {pct}% of how it separates posts in this export)."
            )
        else:
            driver_lines.append(f"It also weighs {label} (about {pct}% of that mix).")
    if not driver_lines:
        driver_lines = ["Post format and platform mix show the clearest differences in past referral counts."]

    impact_bullets: list[str] = []
    if top_post_types:
        impact_bullets.append(
            "By average referrals, the strongest post formats here are: "
            + ", ".join(
                f"{x['post_type']} (~{x['avg_referrals']:.1f} referrals/post, n={x['posts']})" for x in top_post_types[:5]
            )
            + "."
        )
    else:
        impact_bullets.append(
            "Not enough posts per format to rank formats; use the combo table once you have more volume."
        )
    impact_bullets.extend(driver_lines[:2])

    plain_answers = {
        "intro_bullets": [
            "The main grid compares every platform × post type combo: how many posts you ran, typical referral counts, and totals.",
            "“Strong referrals” means the top quarter of posts in this file by number of donation referrals—not a guarantee for the next post.",
        ],
        "impact_bullets": impact_bullets,
        "method_note": (
            "Strong-referral scores are from patterns in your historical posts (platform, format, topic, engagement, timing, and more). "
            "They help prioritize what to review before publishing—they do not replace judgment or prove cause."
        ),
    }

    insights = {
        "eyebrow": "SOCIAL CONTENT",
        "headline": "Which platform and post formats drove the most referrals in this file?",
        "lede": (
            f"{len(df)} posts. About {100 * top_ref_share:.0f}% landed in the top quarter for donation referrals. "
            f"Use the combo table for platform × format performance; technical model checks stay in the notebook."
        ),
        "prediction_cards": [
            {
                "kicker": "File snapshot",
                "label": "Posts analyzed",
                "value": str(len(df)),
                "hint": f"~{100 * top_ref_share:.0f}% in top referral quarter",
                "definition": "All posts in this export with referral counts.",
            },
            {
                "kicker": "Impact",
                "label": "What mattered most in this run",
                "value": top_feat.replace("_", " "),
                "hint": "See dashboard card for plain-language drivers",
                "definition": "Strongest input the model leaned on when ranking posts—associations only.",
            },
            {
                "kicker": "Notebook",
                "label": "Deeper metrics",
                "value": "Open notebook",
                "hint": "Holdout checks and CV if you need them",
                "definition": "ROC-AUC, R², and related diagnostics live in social-content-mix-efficiency.ipynb.",
            },
        ],
        "cause_cards": [
            {
                "kicker": "Fair use",
                "title": "Past performance ≠ next post",
                "body": "Averages and scores describe history. Audiences and algorithms change—treat this as planning input.",
                "definition": "Historical association only.",
            },
        ],
        "model_drivers": drivers,
        "calls_to_action": [],
    }

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
            f"Review post #{c['post_id']} ({c['platform']}/{c['post_type']}) — strong-referral score {c['top_quartile_probability']:.0%}."
        )

    payload = {
        "generated_note": "social-content-mix-efficiency.ipynb → generate_social_content_mix_dashboard_data.py",
        "insights": insights,
        "plain_answers": plain_answers,
        "platform_type_performance": platform_type_performance,
        "top_post_types": top_post_types,
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
