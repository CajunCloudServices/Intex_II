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

_NUM_LABELS: dict[str, str] = {
    "session_duration_minutes": "session length (minutes)",
    "is_individual": "one-on-one vs other formats (individual)",
    "is_group": "group vs other formats",
    "emo_start": "mood level at the start of the session (simple score)",
    "intervention_count": "how many interventions were listed for the session",
    "group_x_intervention_ct": "group sessions with more interventions bundled together",
    "safehouse_id": "which safehouse the resident is tied to",
    "prior_session_count": "how many prior counseling sessions this resident had",
    "prior_mean_concern": "how often past sessions were concern-flagged for this resident",
    "prior_mean_duration": "typical length of past sessions for this resident",
    "lag1_emo_start": "mood at the previous session start",
}


def _sklearn_name_to_plain(sk: str, top_toks: list[str]) -> str:
    if sk.startswith("num__tok_w"):
        idx_s = sk[len("num__tok_w") :]
        try:
            idx = int(idx_s)
            if 0 <= idx < len(top_toks):
                return f'whether the session included “{top_toks[idx]}”'
        except ValueError:
            pass
        return "an intervention mix indicator"
    if sk.startswith("num__"):
        key = sk[5:]
        return _NUM_LABELS.get(key, key.replace("_", " "))
    if sk.startswith("cat__"):
        body = sk[5:]
        mapping = [
            ("social_worker_", "staff recording as "),
            ("case_category_", "case category "),
            ("referral_source_", "referral source "),
            ("current_risk_level_", "risk level listed as "),
        ]
        for prefix, title in mapping:
            if body.startswith(prefix):
                return title + body[len(prefix) :].replace("_", " ")
        return body.replace("_", " ")
    return sk


def build_emotion_trend_bullets(lin: Pipeline, top_toks: list[str], top_k: int = 5) -> list[str]:
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
        plain = _sklearn_name_to_plain(str(raw_name), top_toks)
        direction = "stronger positive mood movement" if coef > 0 else "weaker positive movement (or more negative)"
        out.append(
            f"Patterns tied to {plain} line up with {direction} on average in past records. "
            "That is association only—staff choose interventions for harder cases too."
        )
    return out


def humanize_driver_feature(col: str, top_toks: list[str]) -> str:
    if col.startswith("tok_w"):
        try:
            idx = int(col.replace("tok_w", ""))
            if 0 <= idx < len(top_toks):
                return f'Sessions that included “{top_toks[idx]}”'
        except ValueError:
            pass
    drivers_plain = {
        "current_risk_level": "Risk level on file for the resident",
        "prior_session_count": "Residents with more prior counseling visits",
        "prior_mean_concern": "Residents whose earlier sessions were often concern-flagged",
        "emo_start": "Starting mood score for the visit",
        "intervention_count": "Visits with more interventions listed",
        "session_duration_minutes": "Longer or shorter session length",
        "prior_mean_duration": "Typical length of the resident’s past sessions",
        "lag1_emo_start": "Mood level going into this visit (vs. last time)",
        "social_worker": "Which staff member recorded the session",
        "safehouse_id": "Safehouse assignment",
        "case_category": "Case category on file",
        "referral_source": "Referral source on file",
        "is_individual": "One-on-one session format",
        "is_group": "Group session format",
        "group_x_intervention_ct": "Group sessions with a heavier intervention count",
    }
    return drivers_plain.get(col, _NUM_LABELS.get(col, col.replace("_", " ")))


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

    num_cols = [
        "session_duration_minutes",
        "is_individual",
        "is_group",
        "emo_start",
        "intervention_count",
        "group_x_intervention_ct",
        "safehouse_id",
        "prior_session_count",
        "prior_mean_concern",
        "prior_mean_duration",
        "lag1_emo_start",
    ] + tok_cols
    cat_cols = ["social_worker", "case_category", "referral_source", "current_risk_level"]
    X[num_cols] = X[num_cols].apply(pd.to_numeric, errors="coerce")
    for c in cat_cols:
        X[c] = X[c].astype("string").fillna("Unknown")

    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    idx_tr, idx_te = next(gss.split(X, y_clf, groups=p["resident_id"]))
    Xtr, Xte = X.iloc[idx_tr], X.iloc[idx_te]
    ytr_reg, yte_reg = y_reg.iloc[idx_tr], y_reg.iloc[idx_te]
    ytr_clf, yte_clf = y_clf.iloc[idx_tr], y_clf.iloc[idx_te]

    prep = ColumnTransformer(
        [
            ("num", Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]), num_cols),
            ("cat", Pipeline([("oh", OneHotEncoder(handle_unknown="ignore"))]), cat_cols),
        ],
        n_jobs=1,
    )

    lin = Pipeline([("prep", prep), ("model", LinearRegression())])
    lin.fit(Xtr, ytr_reg)
    pred_reg = lin.predict(Xte)
    r2 = r2_score(yte_reg, pred_reg)
    mae = mean_absolute_error(yte_reg, pred_reg)
    emotion_trend_bullets = build_emotion_trend_bullets(lin, [str(t) for t in top_toks], top_k=5)

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
    cv = cross_validate(rf, X, y_clf, cv=gkf, scoring=["roc_auc", "f1"], groups=p["resident_id"].values, n_jobs=1)
    cv_auc_m = float(cv["test_roc_auc"].mean())

    perm = permutation_importance(rf, Xte, yte_clf, n_repeats=8, random_state=42, scoring="roc_auc")
    imp_full = pd.Series(perm.importances_mean, index=X.columns).sort_values(ascending=False)
    imp = imp_full.head(12)
    drivers = share_top5_drivers(imp)
    tok_list = [str(t) for t in top_toks]
    concern_review_cues: list[str] = []
    for feat, _ in imp_full.head(5).items():
        label = humanize_driver_feature(str(feat), tok_list)
        concern_review_cues.append(
            f"{label} — in similar past records this tended to line up with a concern flag more often. "
            "Use that as a review cue, not proof that it caused the flag."
        )

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
        "eyebrow": "COUNSELING & INTERVENTION MIX",
        "headline": "Mood movement, concern follow-up, and what the data keeps echoing",
        "lede": f"Across {len(p)} sessions, about {100 * float(p['high_concern'].mean()):.0f}% were concern-flagged. "
        "Estimates use only past sessions and the current session’s setup—nothing after the visit.",
        "prediction_cards": [
            {
                "kicker": "Concern triage",
                "label": "Holdout separation score",
                "value": safe_round(auc_rf, 3),
                "hint": f"Compared with a naive baseline {safe_round(auc_b, 3)}",
                "definition": "Technical check on held-back residents: how well higher-risk sessions sort toward actual concern flags.",
            },
            {
                "kicker": "Mood movement",
                "label": "Trend fit on held-back data",
                "value": safe_round(r2, 3),
                "hint": f"Typical gap on the mood scale: {safe_round(mae, 3)}",
                "definition": "How well a simple summary line matches mood change scores on data the model did not train on.",
            },
            {
                "kicker": "Stability",
                "label": "Repeated data slices",
                "value": safe_round(cv_auc_m, 3),
                "hint": "Same resident stays on one side of the split",
                "definition": "Concern-triage score when the calendar is sliced different ways while keeping each resident in one slice only.",
            },
        ],
        "cause_cards": [
            {
                "kicker": "Fair timeline",
                "title": "History is only earlier sessions",
                "body": "Prior counts, prior concern rate, and past mood use recordings before this session’s date.",
                "definition": "Future sessions never feed into the history fields for an earlier row.",
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
            f"Consider a supervisor pass on session {c['recording_id']} (resident {c['resident_id']}) — "
            f"estimated concern likelihood {c['concern_probability']:.0%}."
        )

    plain_answers = {
        "top_intervention_tokens": tok_list,
        "emotion_trend_bullets": emotion_trend_bullets,
        "concern_review_cues": concern_review_cues,
        "method_note": (
            "Mood change uses a simple start→end score (not a diagnosis). Concern likelihood is a triage aid. "
            "Patterns reflect past records, not proof that one intervention caused an outcome."
        ),
    }

    payload = {
        "generated_note": "intervention-mix-effectiveness.ipynb → generate_intervention_mix_dashboard_data.py",
        "insights": insights,
        "plain_answers": plain_answers,
        "portfolio": {"n_sessions": int(len(p)), "concern_rate": float(p["high_concern"].mean())},
        "rows": rows,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
