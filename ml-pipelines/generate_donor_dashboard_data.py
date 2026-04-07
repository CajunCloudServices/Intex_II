#!/usr/bin/env python3
"""Donor churn pipeline (donor-churn-prediction.ipynb) → donor-dashboard-data.json."""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

HERE = Path(__file__).resolve().parent
CSV = HERE / "lighthouse_csv_v7"
OUT = HERE / "donor-dashboard-data.json"

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
        supporters.groupby("acquisition_channel")["is_churned"]
        .agg(["mean", "count"])
        .reset_index()
    )
    churn_by_channel.columns = ["channel", "churn_rate", "n"]
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
        "eyebrow": "DONOR LAPSE RISK · COMPUTER SCORE + STATISTICAL READ",
        "headline": (
            f"{high_risk_active} supporters who still look “active” score at 50% or higher on lapsing—"
            f"those are people to thank, call, or visit before they drift away."
        ),
        "lede": (
            f"In this file, about {100 * supporters['is_churned'].mean():.0f}% of supporters are already marked as lapsed. "
            f"On a hidden test sample, the lapse score separated who lapsed vs who stayed better than guessing "
            f"(quality index {auc:.2f} on a 0–1 scale where 0.5 is random and 1.0 is perfect ranking). "
            f"The cards pair “who the computer worries about” with “what tends to show up alongside lapse in a simple read of the data.”"
        ),
        "prediction_cards": [
            {
                "label": "Active supporters with a 50%+ lapse score",
                "value": str(high_risk_active),
                "hint": "Still marked active but the tool thinks lapse is as likely as not",
            },
            {
                "label": "Single strongest clue in the lapse scorer",
                "value": _pretty_coef_feat(top_fi["feature"])[:42],
                "hint": "The automated tool leaned on this measure most often when sorting people",
            },
            {
                "label": "Quality of the lapse ranking (test sample)",
                "value": f"{auc:.2f}",
                "hint": "Runs from 0.5 (random) to 1.0 (perfect). Higher means the score lines up better with who actually lapsed.",
            },
        ],
        "cause_cards": [
            {
                "title": f"Channel with the most lapse: {worst_ch['channel']}",
                "body": f"About {100 * float(worst_ch['churn_rate']):.0f}% lapsed among {int(worst_ch['n'])} people from that channel. "
                f"The calmest channel in this export is {best_ch['channel']} at {100 * float(best_ch['churn_rate']):.0f}%.",
            },
            {
                "title": f"When «{_pretty_coef_feat(top_pos_c['feature'])[:50]}» is higher, lapse looks less likely",
                "body": f"In a simple statistical model, that factor lines up with staying (direction +{top_pos_c['coefficient']:.2f}). "
                f"It does not prove that changing it will fix lapse.",
            },
            {
                "title": f"When «{_pretty_coef_feat(top_neg_c['feature'])[:50]}» is higher, lapse looks more likely",
                "body": f"The same kind of model links this factor with drifting away (direction {top_neg_c['coefficient']:.2f}). "
                f"Again: pattern in the data, not a guarantee of cause.",
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
            f"Reach out: {r['display_name'][:40]} — lapse risk score {100 * float(r['churn_probability']):.0f}%"
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
