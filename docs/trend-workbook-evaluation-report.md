# ML Workbook Evaluation Report (full `ml-pipelines` corpus)

Execution date: 2026-04-08  

Scope: **All eleven** notebooks under `ml-pipelines/notebooks/`, grouped into **Deep trend** (six shipped trend workbooks), **Original program pipelines** (four), and **Additional** (one). Metrics below reflect a fresh run of the six deep-trend books (code cells executed sequentially per notebook with a shared namespace) unless noted.

Shared helpers: `ml-pipelines/trend_eval_helpers.py` (binned calibration, threshold scan, bootstrap percentile CIs on linear coefficients, slice AUC / slice MAE). Deep-trend books append a final **Evaluation artifacts** code cell that calls these helpers.

Batch runner: `ml-pipelines/scripts/run_all_notebooks.py` executes every `.ipynb` in order; **`counseling-effectiveness.ipynb` and `reintegration-readiness.ipynb` are skipped by default** (long bootstrap / heavy cells)—run those in Jupyter when you need refreshed numbers. `donation-impact-predictor.ipynb` resolves CSV paths relative to `ml-pipelines/lighthouse_csv_v7/` so it runs from the `ml-pipelines` working directory.

## Scoring method

- **Fit quality grade (A–F):** holdout and cross-validation signal, stability, and whether metrics are credible for the sample (flags tiny holdouts and perfect scores).
- **Rubric grade (0–20):** framing, prep, modeling, **evaluation discipline** (now including calibration / thresholds / bootstrap / slices where applicable), and deployment narrative.

---

## A) Deep trend workbooks (six)

| Workbook | Key fit metrics observed | Fit quality | Rubric (/20) | Deployment readiness |
|----------|---------------------------|-------------|----------------|------------------------|
| `social-content-mix-efficiency.ipynb` | Explanatory R²≈0.70, MAE≈2.13; RF holdout AUC≈0.99, F1≈0.86; CV AUC≈0.97; + calibration bins, threshold table, bootstrap CIs, channel slices | A | 19.0 | Pass — strongest end-to-end story; monitor for overfit on referral class |
| `campaign-timing-seasonality.ipynb` | Explanatory R²≈0.84, MAE≈0.52; GB AUC≈0.79, F1≈0.58; CV AUC≈0.72; + eval artifacts | B+ | 17.5 | Pass |
| `safehouse-operational-load-risk.ipynb` | Rolling/lag features; target `above_roll3_median` (house baseline) or MoM fallback; **GroupKFold** CV; balanced RF; explanatory R²≈0.97, MAE≈0.006; RF AUC≈0.98, CV AUC≈0.97; + eval artifacts | A− | 17.5 | Pass — predictive path restored; very high explanatory R²: treat as **associational** and re-check on new months |
| `intervention-mix-effectiveness.ipynb` | Resident join + prior-session history + token flags + `is_group×intervention_count`; **GroupKFold** CV by resident; explanatory R²≈0.47, MAE≈0.60; RF AUC≈0.51, CV AUC≈0.52; + eval artifacts | D+ | 14.0 | Conditional pass — **explanatory-first**; predictive AUC still ~random |
| `incident-composition-archetypes.ipynb` | Prior-window resident history + smoothed house–type rate; **GroupShuffleSplit** by resident; multiclass acc≈0.50, macro-F1≈0.38; **binary** High/Critical auxiliary AUC≈1.0 on small holdout; + eval on binary track | D | 13.5 | Conditional pass — multiclass weak; binary track for screening only |
| `resident-trajectory-archetypes.ipynb` | Leakage markdown; **`current_risk_num` removed** from X; **GroupShuffleSplit** holdout + **GroupKFold** CV; explanatory R²≈−2.49, MAE≈1.05; RF holdout AUC≈1.0, CV AUC≈0.84; + eval artifacts | C | 16.0 | Pass with caveats — tiny resident holdout can show AUC 1.0; trust **CV** and slice skips |

---

## B) Original program pipelines (four)

Metrics summarized from **persisted notebook outputs** and documented methodology (not all re-executed in the 2026-04-08 batch).

| Workbook | Key fit metrics / evidence | Fit quality | Rubric (/20) | Deployment readiness |
|----------|----------------------------|-------------|----------------|------------------------|
| `social-media-conversion.ipynb` | Conversion modeling with multiple model families, segment analysis, uplift-style comparisons (see notebook outputs for latest AUC/accuracy) | B | 16.5 | Pass — tied to Post advisor / social flows |
| `donor-churn-prediction.ipynb` | Random Forest holdout ROC-AUC ≈ **0.91** on n≈12 test rows; strong tree/RF comparison; RFM feature engineering; class imbalance called out in prose | B− | 16.0 | Pass — **small absolute test n**; use for triage not automation |
| `reintegration-readiness.ipynb` | Stratified CV tables; persisted test ROC-AUC **1.0** with bootstrap CI [1,1] on small holdout; explicit small-*n* warnings in markdown | C+ | 16.0 | Conditional pass — rely on CV + uncertainty, not point holdout |
| `counseling-effectiveness.ipynb` | Multi-block evaluation (including bootstrap CIs on operational metrics); explanatory-first positioning | B− | 16.5 | Pass — run notebook directly when refreshing (skipped in `scripts/run_all_notebooks.py`) |

---

## C) Additional workbook

| Workbook | Role | Fit quality | Rubric (/20) | Notes |
|----------|------|-------------|----------------|-------|
| `donation-impact-predictor.ipynb` | Donor-facing impact storytelling (OLS + boosted / ridge tracks, grid-capable) | B− | 15.5 | Explanatory coefficients + predictive RMSE for UI copy; optional heavy tuning cells—run selectively |

---

## Data and output validation

- Deep-trend notebooks: imports resolve via existing `data_loader.py` path bootstrap; second code cell on each trend book runs **`trend_eval_helpers`** without extra dependencies.
- Safehouse: classification no longer blocked by global one-class `high_incident`; features exclude same-window `roll3_rate` to avoid trivial label leakage.
- Incident / intervention / resident: group-aware splits documented in code comments or markdown.
- `scripts/run_all_notebooks.py`: use for regression testing; extend `SKIP` if other notebooks gain long-running cells.

## Cross-pipeline observations

- Strongest **predictive** banners: social content mix, campaign seasonality, safehouse (after reframing), donor churn (with sample-size humility).
- **Explanatory-first** until data grows: intervention mix, incident multiclass, reintegration/counseling small-*n* holdouts.
- **Trust gaps to monitor:** any holdout AUC ≈ 1.0 with *n* &lt; 20; prefer GroupKFold / GroupShuffleSplit metrics and slice tables.

## Priority improvement backlog (updated)

1. Expand resident and incident holdout *n* (more data or pooled time) before operational thresholds.
2. Intervention: richer text featurization or outcome reframing if concern flag stays non-predictable.
3. Optional: migrate calibration from bins to `CalibrationDisplay` when matplotlib is acceptable in all environments.
4. Re-enable full batch run for `counseling-effectiveness.ipynb` after lowering default bootstrap iterations for CI, or execute manually pre-release.
