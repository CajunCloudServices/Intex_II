#!/usr/bin/env python3
"""Donor churn pipeline (donor-churn-prediction.ipynb) → donor-dashboard-data.json."""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

HERE = Path(__file__).resolve().parent.parent
CSV = HERE / "lighthouse_csv_v7"
OUT = HERE / "json" / "donor-dashboard-data.json"

DATASET_CUTOFF = pd.Timestamp("2026-01-01")
CHURN_WINDOW_DAYS = 180

EXPLAIN_FEATURES3 = [
    "recency",
    "frequency",
    "total_value",
    "pct_recurring",
    "tenure_days",
    "n_campaigns",
    "n_monetary",
    "n_inkind",
    "n_time",
]


def main() -> None:
    supporters = pd.read_csv(
        CSV / "supporters.csv", parse_dates=["created_at", "first_donation_date"]
    )
    donations = pd.read_csv(CSV / "donations.csv", parse_dates=["donation_date"])

    last_donation = donations.groupby("supporter_id")["donation_date"].max().reset_index()
    last_donation.columns = ["supporter_id", "last_donation_date"]
    supporters = supporters.merge(last_donation, on="supporter_id", how="left")
    supporters["days_since_last_donation"] = (
        DATASET_CUTOFF - supporters["last_donation_date"]
    ).dt.days
    supporters["is_churned"] = (
        (supporters["status"] == "Inactive")
        | (supporters["days_since_last_donation"] > CHURN_WINDOW_DAYS)
    ).astype(int)

    rfm = donations.groupby("supporter_id").agg(
        frequency=("donation_id", "count"),
        total_value=("estimated_value", "sum"),
        avg_value=("estimated_value", "mean"),
        max_value=("estimated_value", "max"),
        n_recurring=("is_recurring", "sum"),
        pct_recurring=("is_recurring", "mean"),
        n_monetary=("donation_type", lambda x: (x == "Monetary").sum()),
        n_inkind=("donation_type", lambda x: (x == "InKind").sum()),
        n_time=("donation_type", lambda x: (x == "Time").sum()),
        n_campaigns=("campaign_name", "nunique"),
        donation_span_days=("donation_date", lambda x: (x.max() - x.min()).days),
    ).reset_index()
    supporters = supporters.merge(rfm, on="supporter_id", how="left")
    supporters["recency"] = supporters["days_since_last_donation"].fillna(999)
    supporters["tenure_days"] = (
        DATASET_CUTOFF - supporters["first_donation_date"]
    ).dt.days.fillna(0)

    supp_ols = pd.get_dummies(
        supporters, columns=["acquisition_channel", "supporter_type"], drop_first=True
    )
    cat_dummies = [
        c
        for c in supp_ols.columns
        if "acquisition_channel_" in c or "supporter_type_" in c
    ]
    ols_features = EXPLAIN_FEATURES3 + cat_dummies
    supp_ols_clean = supp_ols[ols_features + ["is_churned"] + ["supporter_id", "status"]].dropna()

    X_ols3 = supp_ols_clean[ols_features]
    y_ols3 = supp_ols_clean["is_churned"]
    from sklearn.preprocessing import StandardScaler

    scaler3 = StandardScaler()
    X_ols3_scaled = scaler3.fit_transform(X_ols3)

    lr3 = LogisticRegression(penalty="l2", C=0.5, max_iter=500, random_state=42)
    lr3.fit(X_ols3_scaled, y_ols3.values)
    causal_coef = [
        {"feature": ols_features[i], "coefficient": float(lr3.coef_[0][i])}
        for i in range(len(ols_features))
    ]
    causal_coef.sort(key=lambda x: -abs(x["coefficient"]))

    PRED_FEATURES3 = ols_features
    X_pred3 = supp_ols_clean[PRED_FEATURES3]
    y_pred3 = supp_ols_clean["is_churned"]
    X_tr3, X_te3, y_tr3, y_te3 = train_test_split(
        X_pred3, y_pred3, test_size=0.2, stratify=y_pred3, random_state=42
    )
    rf3 = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    rf3.fit(X_tr3, y_tr3)

    from sklearn.metrics import roc_auc_score

    auc = float(roc_auc_score(y_te3, rf3.predict_proba(X_te3)[:, 1]))
    fi = [
        {"feature": PRED_FEATURES3[i], "importance": float(rf3.feature_importances_[i])}
        for i in range(len(PRED_FEATURES3))
    ]
    fi.sort(key=lambda x: -x["importance"])

    active = supp_ols_clean[supp_ols_clean["is_churned"] == 0].copy()
    active_ids = set(active["supporter_id"])
    churn_probs = rf3.predict_proba(supp_ols_clean[PRED_FEATURES3])[:, 1]
    supp_ols_clean = supp_ols_clean.assign(churn_probability=churn_probs)

    # Merge display fields from original supporters
    disp = supporters[
        [
            "supporter_id",
            "display_name",
            "email",
            "phone",
            "supporter_type",
            "acquisition_channel",
            "status",
            "total_value",
            "frequency",
            "recency",
            "pct_recurring",
            "is_churned",
        ]
    ].copy()
    merged = disp.merge(
        supp_ols_clean[["supporter_id", "churn_probability"]],
        on="supporter_id",
        how="inner",
    )

    supporters_out = []
    for _, r in merged.sort_values("churn_probability", ascending=False).iterrows():
        supporters_out.append(
            {
                "supporter_id": int(r["supporter_id"]),
                "display_name": str(r.get("display_name") or "")[:80],
                "email": str(r.get("email") or "").strip(),
                "phone": str(r.get("phone") or "").strip(),
                "supporter_type": str(r.get("supporter_type") or ""),
                "acquisition_channel": str(r.get("acquisition_channel") or ""),
                "status": str(r.get("status") or ""),
                "is_churned": bool(r["is_churned"]),
                "total_value": float(r["total_value"] or 0),
                "frequency": int(r["frequency"] or 0),
                "recency": float(r["recency"] or 0),
                "pct_recurring": float(r["pct_recurring"] or 0),
                "churn_probability": float(r["churn_probability"]),
                "is_active": int(r["supporter_id"]) in active_ids,
            }
        )

    churn_by_channel = (
        supporters.groupby("acquisition_channel", as_index=False)["is_churned"]
        .agg(churn_rate="mean", n="count", n_churned="sum")
        .rename(columns={"acquisition_channel": "channel"})
    )
    churn_by_channel["n_churned"] = churn_by_channel["n_churned"].astype(int)
    churn_by_type = (
        supporters.groupby("supporter_type")["is_churned"].agg(["mean", "count"]).reset_index()
    )
    churn_by_type.columns = ["supporter_type", "churn_rate", "n"]

    top_fi = fi[0]
    top_pos_c = max(causal_coef, key=lambda x: x["coefficient"])
    top_neg_c = min(causal_coef, key=lambda x: x["coefficient"])
    active_df = merged[merged["supporter_id"].isin(active_ids)]
    high_risk_active = int((active_df["churn_probability"] >= 0.5).sum())
    worst_ch = churn_by_channel.sort_values("churn_rate", ascending=False).iloc[0]
    best_ch = churn_by_channel.sort_values("churn_rate", ascending=True).iloc[0]

    def _pretty_coef_feat(s: str) -> str:
        if "acquisition_channel_" in s:
            return "Channel: " + s.replace("acquisition_channel_", "").replace("_", " ")
        if "supporter_type_" in s:
            return "Type: " + s.replace("supporter_type_", "").replace("_", " ")
        return s.replace("_", " ")

    insights = {
        "eyebrow": "DONORS MOST LIKELY TO STOP GIVING",
        "headline": (
            f"{high_risk_active} active supporters are high follow-up priority right now."
        ),
        "lede": (
            f"About {100 * supporters['is_churned'].mean():.0f}% of supporters on file have already lapsed. "
            f"Use this page to decide who to call first this week."
        ),
        "prediction_cards": [
            {
                "label": "Active supporters who need outreach now",
                "value": str(high_risk_active),
                "hint": "High chance of lapsing without follow-up",
                "definition": "Count of non-churned supporters whose churn probability exceeds the high-risk threshold used on this page.",
            },
            {
                "label": "Biggest warning sign",
                "value": _pretty_coef_feat(top_fi["feature"])[:42],
                "hint": "People with this pattern were more likely to lapse",
                "definition": "Random forest split that mattered most for churn ranking in this export.",
            },
            {
                "label": "How reliable this ranking is",
                "value": f"{auc:.2f}",
                "hint": "Higher is better",
                "definition": "ROC-AUC for the churn model on held-out supporters (0.5 = random, 1 = perfect).",
            },
        ],
        "cause_cards": [
            {
                "title": f"Most at-risk donor source: {worst_ch['channel']}",
                "body": f"About {100 * float(worst_ch['churn_rate']):.0f}% lapsed among {int(worst_ch['n'])} people from that channel. "
                f"The calmest channel in this export is {best_ch['channel']} at {100 * float(best_ch['churn_rate']):.0f}%.",
                "definition": "Historical lapse rate by acquisition channel in this file—use for prioritization, not guarantees.",
            },
            {
                "title": f"Lower lapse is linked with: {_pretty_coef_feat(top_pos_c['feature'])[:50]}",
                "body": "This pattern appears more in supporters who keep giving.",
                "definition": "Coefficient direction from the explanatory model: values associated with lower churn risk.",
            },
            {
                "title": f"Higher lapse is linked with: {_pretty_coef_feat(top_neg_c['feature'])[:50]}",
                "body": "This pattern appears more in supporters who drift away.",
                "definition": "Coefficient direction from the explanatory model: values associated with higher churn risk.",
            },
        ],
        "model_drivers": [
            {
                "feature": _pretty_coef_feat(x["feature"])[:60],
                "importance": x["importance"],
                "share_top5_pct": round(
                    100 * x["importance"] / sum(y["importance"] for y in fi[:5])
                ),
            }
            for x in fi[:5]
        ],
        "calls_to_action": [
            f"Call {r['display_name'][:40]} this week — lapse risk is {100 * float(r['churn_probability']):.0f}%."
            for _, r in active_df.nlargest(3, "churn_probability").iterrows()
        ],
    }

    payload = {
        "generated_note": "Donor churn — donor-churn-prediction.ipynb (RF + ridge logistic causal)",
        "insights": insights,
        "portfolio": {
            "n_supporters": int(len(supporters)),
            "churn_rate": float(supporters["is_churned"].mean()),
            "n_scored": int(len(supp_ols_clean)),
            "n_active_retained": int(len(active)),
            "test_roc_auc_rf": auc,
        },
        "causal_logistic_coefficients": causal_coef,
        "random_forest_importances": fi[:20],
        "churn_by_channel": churn_by_channel.to_dict("records"),
        "churn_by_supporter_type": churn_by_type.to_dict("records"),
        "supporters": supporters_out,
    }

    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(supporters_out)} supporters)")


if __name__ == "__main__":
    main()
