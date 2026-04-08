"""Shared evaluation artifacts for trend workbooks: calibration bins, threshold scan, bootstrap CIs, fairness slices."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score


def print_calibration_bins(y_true, y_proba, n_bins: int = 10) -> None:
    y_true = np.asarray(y_true).astype(int)
    y_proba = np.asarray(y_proba, dtype=float)
    bins = np.linspace(0, 1, n_bins + 1)
    for i in range(n_bins):
        lo, hi = bins[i], bins[i + 1]
        m = (y_proba >= lo) & (y_proba < hi) if i < n_bins - 1 else (y_proba >= lo) & (y_proba <= hi)
        if m.sum() == 0:
            continue
        mean_p = float(y_proba[m].mean())
        rate = float(y_true[m].mean())
        print(f"  bin [{lo:.2f},{hi:.2f}): n={int(m.sum())} mean_pred={mean_p:.3f} rate_pos={rate:.3f}")


def print_threshold_scan(y_true, y_proba) -> None:
    y_true = np.asarray(y_true).astype(int)
    y_proba = np.asarray(y_proba, dtype=float)
    print("  thr  prec   rec    F1")
    for thr in np.arange(0.1, 1.0, 0.1):
        thr = round(float(thr), 2)
        pred = (y_proba >= thr).astype(int)
        print(
            f"  {thr:.1f}  {precision_score(y_true, pred, zero_division=0):.3f}  "
            f"{recall_score(y_true, pred, zero_division=0):.3f}  {f1_score(y_true, pred, zero_division=0):.3f}"
        )


def bootstrap_linear_coefs(lin_pipeline, X_train, y_train, n_boot: int = 500, top_k: int = 8, random_state: int = 42) -> None:
    """Resample rows and refit the sklearn Pipeline whose final step is LinearRegression."""
    from sklearn.base import clone

    rng = np.random.RandomState(random_state)
    X_tr = X_train.reset_index(drop=True)
    y_tr = y_train.reset_index(drop=True)
    n = len(X_tr)
    coefs = []
    names = lin_pipeline.named_steps["prep"].get_feature_names_out()
    ref_len = len(np.ravel(lin_pipeline.named_steps["model"].coef_))
    for _ in range(n_boot):
        idx = rng.randint(0, n, size=n)
        Xb = X_tr.iloc[idx]
        yb = y_tr.iloc[idx]
        pipe = clone(lin_pipeline)
        try:
            pipe.fit(Xb, yb)
        except Exception:
            continue
        coef = np.ravel(pipe.named_steps["model"].coef_)
        if len(coef) != ref_len:
            continue
        coefs.append(coef)
    if not coefs:
        print("  bootstrap: no successful fits")
        return
    coefs = np.vstack(coefs)
    usable = min(coefs.shape[1], len(names))
    med = np.median(coefs[:, :usable], axis=0)
    lo = np.percentile(coefs[:, :usable], 2.5, axis=0)
    hi = np.percentile(coefs[:, :usable], 97.5, axis=0)
    order = np.argsort(-np.abs(med))[:top_k]
    print("  feature  median  p2.5  p97.5")
    for j in order:
        print(f"  {names[j][:48]:48s}  {med[j]:+.4f}  {lo[j]:+.4f}  {hi[j]:+.4f}")


def _slice_auc(y_true, proba, min_n: int) -> float | None:
    y_true = np.asarray(y_true).astype(int)
    proba = np.asarray(proba, dtype=float)
    if len(y_true) < min_n or np.unique(y_true).size < 2:
        return None
    return float(roc_auc_score(y_true, proba))


def fairness_binary(clf_pipeline, X_te, y_te, meta: pd.DataFrame | None, group_cols: list[str], min_n: int = 15) -> None:
    """Slice ROC-AUC for binary classifier by categorical columns in meta (aligned index with X_te)."""
    if meta is None or not group_cols:
        return
    proba = clf_pipeline.predict_proba(X_te)[:, 1]
    idx = X_te.index
    meta = meta.loc[idx]
    y_arr = np.asarray(y_te)
    print("\n--- Fairness-style slices (AUC), min_n=%d ---" % min_n)
    for col in group_cols:
        if col not in meta.columns:
            continue
        for g in meta[col].dropna().unique():
            s = (meta[col] == g).values
            if s.sum() < min_n:
                print(f"  {col}={g}: n={int(s.sum())} (skip n<min_n)")
                continue
            auc = _slice_auc(y_arr[s], proba[s], min_n=1)
            if auc is None:
                print(f"  {col}={g}: n={int(s.sum())} AUC=n/a")
            else:
                print(f"  {col}={g}: n={int(s.sum())} AUC={round(auc, 3)}")


def fairness_regression_mae(lin_pipeline, X_te, y_te, meta: pd.DataFrame | None, group_cols: list[str], min_n: int = 15) -> None:
    from sklearn.metrics import mean_absolute_error

    if meta is None:
        return
    pred = lin_pipeline.predict(X_te)
    y_te = np.asarray(y_te)
    meta = meta.loc[X_te.index]
    print("\n--- Slice MAE (regression) ---")
    for col in group_cols:
        if col not in meta.columns:
            continue
        for g in meta[col].dropna().unique():
            s = meta[col] == g
            if s.sum() < min_n:
                print(f"  {col}={g}: n={int(s.sum())} (skip)")
                continue
            mae = mean_absolute_error(y_te[s.values], pred[s.values])
            print(f"  {col}={g}: n={int(s.sum())} MAE={round(float(mae), 3)}")
