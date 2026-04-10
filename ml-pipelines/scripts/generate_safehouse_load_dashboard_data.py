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

FEATURE_PLAIN = {
    "roll3_rate_lag1": "recent three-month incident pace (compared with earlier months at the same house)",
    "mom_incident_rate": "change in incidents-per-resident vs the prior month",
    "lag1_incident_rate": "last month’s incidents per resident",
    "roll6_rate_lag1": "six-month incident pace leading into the month",
    "lag1_proc_per_res": "counseling sessions per resident last month",
    "lag1_visit_per_res": "home visits per resident last month",
    "proc_per_resident": "counseling sessions per resident this month",
    "visit_per_resident": "home visits per resident this month",
    "process_recording_count": "count of counseling sessions recorded",
    "home_visitation_count": "count of home visits",
    "active_residents": "number of active residents",
    "avg_education_progress": "average education progress score",
    "avg_health_score": "average health score",
    "month_num": "calendar month (seasonality)",
    "safehouse_id": "which safehouse (site identity)",
}


def _plain_signals(imp: pd.Series) -> list[str]:
    bullets: list[str] = []
    top = [(str(n), float(v)) for n, v in imp.head(5).items() if float(v) > 1e-9]
    if not top:
        return [
            "The view weighs recent incident activity and how it compares with each house’s own earlier months.",
        ]
    labels = [FEATURE_PLAIN.get(str(name), str(name).replace("_", " ")) for name, _ in top[:3]]
    bullets.append(
        "The tool pays the most attention to: "
        + ", ".join(labels)
        + ". Together that means recent workload and momentum matter more than a single raw number in isolation."
    )
    bullets.append(
        "Why this is not blame: a higher score can reflect tougher cases, staffing gaps, or reporting practices—not only performance. Use rankings to ask questions, not to label a site good or bad."
    )
    return bullets


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

        cv = cross_validate(rf, X, y_cls, cv=gkf, scoring=["roc_auc", "f1"], groups=groups, n_jobs=1)
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

    n_houses = int(m["safehouse_id"].nunique())
    target_plain = (
        "whether this month’s incident pattern is heavier than that house’s own recent usual (rolling benchmark), "
        "not a fixed cutoff for all sites."
        if cls_name == "above_roll3_median"
        else "whether incident load moved up vs the prior month (used when the main benchmark label is too uniform)."
    )

    plain_answers = {
        "ranking_bullets": [
            "Houses are sorted by average load pressure score over the months you select: lower usually means steadier, calmer months in the data; higher means more months looked hot or rising compared with each site’s own past.",
            "Use the list to decide where to dig in first—not as a final grade. Population, staffing, and data quality still belong in supervision.",
        ],
        "benchmark_bullets": [
            "A month marked “heavier than usual” means that site’s incident pattern that month was above its own rolling benchmark from earlier months—not “bad compared to other cities.”",
            "Load pressure score (0–100%) is how strongly this month’s signals resemble past months that were flagged heavy for that same house.",
        ],
        "signal_bullets": _plain_signals(imp) if len(imp) > 0 else _plain_signals(pd.Series([1.0], index=["roll3_rate_lag1"])),
        "method_note": (
            "Built from safehouse-month rows: incidents, residents, visits, sessions, and lagged rolling rates. "
            "Patterns are learned from your export; they show association in history, not proof that one factor caused another."
        ),
    }

    insights = {
        "eyebrow": "SAFEHOUSE OPERATIONS",
        "headline": "Which months looked heavier than usual for each house?",
        "lede": (
            f"{n_houses} safehouses and {len(m)} house-months in this export. "
            f"Each month is scored against that site’s own recent pattern: {target_plain.rstrip('.')}."
        ),
        "prediction_cards": [
            {
                "kicker": "Snapshot",
                "label": "Safehouses in file",
                "value": str(n_houses),
                "hint": f"{len(m)} house-month rows",
                "definition": "Distinct sites and monthly observations in this export.",
            },
            {
                "kicker": "Data check",
                "label": "How often the label fired",
                "value": f"{100 * float(y_cls.mean()):.0f}%",
                "hint": "Share of months marked heavier than house benchmark (or positive momentum target)",
                "definition": "Baseline rate of the outcome the score is trained to approximate.",
            },
            {
                "kicker": "Note",
                "label": "Technical quality",
                "value": "See notebook",
                "hint": "Holdout and grouped checks are in the notebook export.",
                "definition": "ROC-AUC / CV metrics are omitted here; open safehouse-operational-load-risk.ipynb if you need them.",
            },
        ],
        "cause_cards": [
            {
                "kicker": "Fair comparison",
                "title": "House vs its own history",
                "body": "Benchmarks roll within each safehouse so a busy site is not punished for being busier than a quiet one.",
                "definition": "Rolling medians and lags are computed per safehouse_id.",
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
            f"Review safehouse {c['safehouse_id']} — {c['month_start']} (load pressure score {c['elevated_load_probability']:.0%})."
        )

    payload = {
        "generated_note": "safehouse-operational-load-risk.ipynb → generate_safehouse_load_dashboard_data.py",
        "insights": insights,
        "plain_answers": plain_answers,
        "portfolio": {
            "n_rows": int(len(m)),
            "n_safehouses": n_houses,
            "target": cls_name,
            "explanatory_r2": float(r2),
        },
        "rows": rows,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
