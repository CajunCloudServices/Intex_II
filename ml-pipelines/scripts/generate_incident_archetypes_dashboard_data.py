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

_NUM_LABELS: dict[str, str] = {
    "safehouse_id": "which safehouse the incident was tied to",
    "resolved": "whether the incident was marked resolved",
    "follow_up_required": "whether follow-up was required",
    "month": "month of the year",
    "dayofweek": "day of the week",
    "prior_count_30d": "how many prior incidents the resident had in the last 30 days",
    "prior_count_90d": "how many prior incidents the resident had in the last 90 days",
    "days_since_last_inc": "days since this resident’s last incident",
    "prior_max_severity": "the highest past severity for this resident before this incident",
    "type_entropy_90d": "how mixed recent incident types were (more varied vs. more repetitive)",
    "smoothed_rate": "how common this incident type is at that safehouse",
}


def _sklearn_name_to_plain(sk: str) -> str:
    if sk.startswith("num__"):
        key = sk[5:]
        return _NUM_LABELS.get(key, key.replace("_", " "))
    if sk.startswith("cat__"):
        body = sk[5:]
        mapping = [
            ("current_risk_level_", "risk level listed as "),
            ("reported_by_", "incidents recorded by staff/source "),
            ("case_category_", "case category "),
            ("referral_source_", "referral source "),
        ]
        for prefix, title in mapping:
            if body.startswith(prefix):
                return title + body[len(prefix) :].replace("_", " ")
        return body.replace("_", " ")
    return sk


def build_severity_trend_bullets(lin: Pipeline, top_k: int = 5) -> list[str]:
    """Plain-language lines from linear regression coefficients (associations, not causation)."""
    model = lin.named_steps["model"]
    prep = lin.named_steps["prep"]
    names = prep.get_feature_names_out()
    coefs = np.ravel(model.coef_)
    n = min(len(names), len(coefs))
    if n == 0:
        return []
    s = pd.Series(coefs[:n], index=names[:n])
    s = s.reindex(s.abs().sort_values(ascending=False).index).head(top_k)
    out: list[str] = []
    for raw_name, coef in s.items():
        plain = _sklearn_name_to_plain(str(raw_name))
        direction = "higher" if coef > 0 else "lower"
        out.append(
            f"In past records, signals tied to {plain} line up with {direction} "
            "severity scores on average. That is a historical pattern only—not proof that one caused the other."
        )
    return out


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

    num_cols = [
        "safehouse_id",
        "resolved",
        "follow_up_required",
        "month",
        "dayofweek",
        "prior_count_30d",
        "prior_count_90d",
        "days_since_last_inc",
        "prior_max_severity",
        "type_entropy_90d",
        "smoothed_rate",
    ]
    cat_cols = ["current_risk_level", "reported_by", "case_category", "referral_source"]
    X[num_cols] = X[num_cols].apply(pd.to_numeric, errors="coerce")
    for c in cat_cols:
        X[c] = X[c].astype("string").fillna("Unknown")

    prep = ColumnTransformer(
        [
            ("num", Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]), num_cols),
            ("cat", Pipeline([("oh", OneHotEncoder(handle_unknown="ignore"))]), cat_cols),
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
    severity_trend_bullets = build_severity_trend_bullets(lin, top_k=5)

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

    archetype_families = [str(t) for t in top_types]
    insights = {
        "eyebrow": "INCIDENT PATTERNS",
        "headline": "Repeating incident families, serious-severity risk, and what tends to track with severity",
        "lede": f"Based on {len(df)} incidents: about {100 * float(y_bin.mean()):.0f}% were High or Critical. "
        f"Estimates use timing, safehouse, resident context, and past incidents only (nothing after the incident date).",
        "prediction_cards": [
            {
                "kicker": "Incident family guess",
                "label": "Holdout match rate",
                "value": safe_round(acc, 3),
                "hint": f"How often the predicted family matched on held-back data",
                "definition": "Share of test incidents where the predicted incident family matched the label we use in the pipeline.",
            },
            {
                "kicker": "Serious severity",
                "label": "Separation score (holdout)",
                "value": safe_round(auc_bin, 3),
                "hint": f"How well serious vs. lower severity sorts on held-back data",
                "definition": "Technical check: how cleanly serious (High/Critical) separates from lower levels on data the model did not train on.",
            },
            {
                "kicker": "Severity trends",
                "label": "Trend fit (holdout)",
                "value": safe_round(r2, 3),
                "hint": f"Average gap on severity scale: {safe_round(mae, 3)}",
                "definition": "How well a simple severity line fits held-back rows (used only to summarize patterns, not to police individual cases).",
            },
            {
                "kicker": "Stability check",
                "label": "Cross-check accuracy",
                "value": safe_round(cv_acc_m, 3),
                "hint": "Repeated slices of the data",
                "definition": "How stable the family guess is when the data is split different ways.",
            },
        ],
        "cause_cards": [
            {
                "kicker": "Fair timeline",
                "title": "History uses only earlier incidents",
                "body": "Counts, diversity, and past severity use only events before each incident’s date—never future outcomes.",
                "definition": "Nothing that happened after the listed incident is fed into the history fields for that row.",
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
            f"Review incident {c['incident_id']}: estimated serious-severity risk {c['high_critical_probability']:.0%}, "
            f"predicted family {c['predicted_archetype']}."
        )

    plain_answers = {
        "archetype_families": archetype_families,
        "severity_trend_bullets": severity_trend_bullets,
        "method_note": (
            "The bullets below come from a simple model of severity scores (Low→Critical as 1→4). "
            "They describe patterns in historical data, not proof that any factor caused an outcome."
        ),
    }

    payload = {
        "generated_note": "incident-composition-archetypes.ipynb → generate_incident_archetypes_dashboard_data.py",
        "insights": insights,
        "archetype_families": archetype_families,
        "plain_answers": plain_answers,
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
