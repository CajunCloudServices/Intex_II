#!/usr/bin/env python3
"""Social media conversion pipeline (social-media-conversion.ipynb) → social-dashboard-data.json."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.api as sm
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

HERE = Path(__file__).resolve().parent.parent
CSV = HERE / "lighthouse_csv_v7"
OUT = HERE / "json" / "social-dashboard-data.json"

PRE_POST_CAT = [
    "platform",
    "post_type",
    "media_type",
    "content_topic",
    "sentiment_tone",
    "day_of_week",
]
PRE_POST_NUM = [
    "post_hour",
    "num_hashtags",
    "mentions_count",
    "caption_length",
    "has_call_to_action",
    "features_resident_story",
    "is_boosted",
    "boost_budget_php",
    "has_campaign",
    "is_weekend",
    "is_evening",
    "is_morning",
]
TARGET = "log_donation_value"


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["post_hour"] = df["post_hour"].astype(int)
    df["is_weekend"] = df["day_of_week"].isin(["Saturday", "Sunday"]).astype(int)
    df["is_evening"] = ((df["post_hour"] >= 17) & (df["post_hour"] <= 21)).astype(int)
    df["is_morning"] = ((df["post_hour"] >= 7) & (df["post_hour"] <= 11)).astype(int)
    df["has_call_to_action"] = df["has_call_to_action"].astype(int)
    df["features_resident_story"] = df["features_resident_story"].astype(int)
    df["is_boosted"] = df["is_boosted"].astype(int)
    df["boost_budget_php"] = df["boost_budget_php"].fillna(0)
    df["has_campaign"] = df["campaign_name"].notna().astype(int)
    df[TARGET] = np.log1p(df["estimated_donation_value_php"])
    return df


def main() -> None:
    posts = pd.read_csv(CSV / "social_media_posts.csv", parse_dates=["created_at"])
    posts_eng = engineer_features(posts)

    posts_ols = posts_eng.dropna(subset=[TARGET]).copy()
    ols_dummies = pd.get_dummies(
        posts_ols[PRE_POST_CAT + PRE_POST_NUM + [TARGET]],
        columns=PRE_POST_CAT,
        drop_first=True,
    )
    X_ols = ols_dummies.drop(columns=[TARGET])
    y_ols = ols_dummies[TARGET]
    X_ols_const = sm.add_constant(X_ols.astype(float))
    ols_model = sm.OLS(y_ols, X_ols_const).fit()
    coef_df = pd.DataFrame(
        {
            "feature": ols_model.params.index,
            "coefficient": ols_model.params.values,
            "p_value": ols_model.pvalues.values,
        }
    ).query("feature != 'const'")
    coef_df["_abs"] = coef_df["coefficient"].abs()
    coef_df = coef_df.sort_values("_abs", ascending=False).drop(columns="_abs")
    sig = coef_df[coef_df["p_value"] < 0.10].copy()
    causal_out = [
        {
            "feature": str(r.feature),
            "coefficient": float(r.coefficient),
            "p_value": float(r.p_value),
        }
        for r in sig.itertuples()
    ]

    posts_model = posts_eng.dropna(subset=[TARGET]).copy()
    X = posts_model[PRE_POST_CAT + PRE_POST_NUM]
    y = posts_model[TARGET]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    num_pipe = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    cat_pipe = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )
    preprocessor = ColumnTransformer(
        [
            ("num", num_pipe, PRE_POST_NUM),
            ("cat", cat_pipe, PRE_POST_CAT),
        ]
    )

    best_pipe = Pipeline(
        [
            ("prep", preprocessor),
            (
                "model",
                GradientBoostingRegressor(
                    n_estimators=150,
                    learning_rate=0.05,
                    max_depth=4,
                    random_state=42,
                ),
            ),
        ]
    )
    best_pipe.fit(X_train, y_train)
    y_pred_log = best_pipe.predict(X_test)
    r2 = float(r2_score(y_test, y_pred_log))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_log)))
    mae = float(mean_absolute_error(y_test, y_pred_log))

    gb_model = best_pipe.named_steps["model"]
    ct = best_pipe.named_steps["prep"]
    ohe_features = ct.named_transformers_["cat"].named_steps["ohe"].get_feature_names_out(
        PRE_POST_CAT
    )
    all_features = PRE_POST_NUM + list(ohe_features)
    fi = [
        {"feature": all_features[i], "importance": float(gb_model.feature_importances_[i])}
        for i in range(len(all_features))
    ]
    fi.sort(key=lambda x: -x["importance"])

    pred_log = best_pipe.predict(X)
    posts_model = posts_model.assign(
        predicted_log_donation=pred_log,
        predicted_donation_php=np.expm1(pred_log),
    )

    posts_out = []
    for _, r in posts_model.sort_values("created_at", ascending=False).iterrows():
        posts_out.append(
            {
                "post_id": int(r["post_id"]),
                "created_at": str(r["created_at"].date()),
                "platform": str(r["platform"]),
                "post_type": str(r["post_type"]),
                "content_topic": str(r["content_topic"]),
                "sentiment_tone": str(r["sentiment_tone"]),
                "actual_donation_php": float(np.expm1(r[TARGET])),
                "predicted_donation_php": float(r["predicted_donation_php"]),
            }
        )

    top_gb = fi[0]
    top_ols = max(causal_out, key=lambda x: abs(x["coefficient"])) if causal_out else None
    med_act = float(np.median(posts_model["estimated_donation_value_php"]))
    under_pred = posts_model[
        posts_model["predicted_donation_php"] > posts_model["estimated_donation_value_php"] * 1.25
    ]
    over_performers = len(under_pred)

    def _short_feat(s: str) -> str:
        return s.replace("_", " ")[:55]

    insights = {
        "eyebrow": "WHICH POSTS BRING IN MORE DONATIONS",
        "headline": (
            "This page estimates which posts are likely to bring higher donation amounts."
            if r2 > 0.15
            else "Donation amounts vary a lot, but this page still shows what usually helps."
        ),
        "lede": (
            f"Typical gift in this file is about PHP {med_act:,.0f}. "
            f"{over_performers} posts raised much less than expected. Review those posts for timing, message, and channel."
        ),
        "prediction_cards": [
            {
                "label": "How reliable this estimate is",
                "value": f"{r2:.2f}",
                "hint": "Higher is better",
                "definition": "R² for predicted vs actual donation amount on holdout posts (higher = more variance explained).",
            },
            {
                "label": "Typical miss size",
                "value": f"{rmse:.3f}",
                "hint": "Lower is better",
                "definition": "Root mean squared error of predictions on the holdout set (same units as the target).",
            },
            {
                "label": "Biggest post signal",
                "value": _short_feat(top_gb["feature"]),
                "hint": "This mattered most in the ranking",
                "definition": "Gradient boosting feature with highest importance for ranking predicted donation amounts.",
            },
        ],
        "cause_cards": (
            [
                {
                    "title": f"One strong pattern: {_short_feat(top_ols['feature'])}",
                    "body": "This factor shows a clear link with higher or lower donation amounts in the data.",
                    "definition": "OLS-style association in historical posts—helpful for themes, not a guarantee for the next post.",
                }
            ]
            if top_ols
            else []
        )
        + [
            {
                "title": "Uses only info you know before posting",
                "body": "This keeps the guidance useful during planning, not after results are in.",
                "definition": "Features are limited to what staff would know when scheduling or drafting a post.",
            },
            {
                "title": "How to use this page",
                "body": "Use top cards for planning. Use tables below for post-by-post review.",
                "definition": "Hero metrics summarize the model; tables and detail panels are for individual post decisions.",
            },
        ],
        "model_drivers": [
            {
                "feature": _short_feat(x["feature"]),
                "importance": x["importance"],
                "share_top5_pct": round(
                    100 * x["importance"] / sum(y["importance"] for y in fi[:5])
                ),
            }
            for x in fi[:5]
        ],
        "calls_to_action": [
            f"Review Post #{int(r['post_id'])} ({r['platform']}/{r['post_type']}). It raised less than expected."
            for r in sorted(
                posts_out,
                key=lambda x: x["predicted_donation_php"] - x["actual_donation_php"],
                reverse=True,
            )[:3]
        ],
    }

    payload = {
        "generated_note": "Social media conversion — social-media-conversion.ipynb",
        "insights": insights,
        "portfolio": {
            "n_posts": int(len(posts_model)),
            "test_r2_log": r2,
            "test_rmse_log": rmse,
            "test_mae_log": mae,
            "mean_actual_php": float(np.expm1(y).mean()),
        },
        "ols_significant_coefficients": causal_out,
        "gradient_boosting_importances": fi[:25],
        "posts": posts_out,
    }

    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(posts_out)} posts)")


if __name__ == "__main__":
    main()
