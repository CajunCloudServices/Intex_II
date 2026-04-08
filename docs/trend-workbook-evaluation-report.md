# Trend Workbook Evaluation Report

Execution date: 2026-04-08  
Scope: six deep-trend workbooks executed top-to-bottom with persisted outputs.

## Scoring Method

- **Fit quality grade (A-F):** model signal quality from holdout/CV metrics and explanatory coherence.
- **Rubric grade (0-20):** weighted by framing, prep/EDA, modeling/feature selection, evaluation discipline, and deployment integration evidence.

## Workbook Results


| Workbook                                | Key fit metrics observed                                                  | Fit quality | Rubric grade (/20) | Deployment readiness                             |
| --------------------------------------- | ------------------------------------------------------------------------- | ----------- | ------------------ | ------------------------------------------------ |
| `social-content-mix-efficiency.ipynb`   | R2=0.70, MAE=2.128, AUC=0.986, F1=0.861, CV AUC=0.974                     | A           | 18.5               | Pass                                             |
| `campaign-timing-seasonality.ipynb`     | R2=0.843, MAE=0.518, AUC=0.789, F1=0.577, CV AUC=0.721                    | B+          | 17.0               | Pass                                             |
| `safehouse-operational-load-risk.ipynb` | R2=-0.091, MAE=0.055, predictive path skipped (one-class target snapshot) | C           | 14.0               | Conditional pass (needs target rebalance window) |
| `intervention-mix-effectiveness.ipynb`  | R2=0.53, MAE=0.578, AUC=0.475, F1=0.035, CV AUC=0.504                     | D+          | 13.0               | Conditional pass (explanatory-first recommended) |
| `incident-composition-archetypes.ipynb` | R2=0.067, MAE=0.591, accuracy=0.35, macro-F1=0.187, CV acc=0.35           | D           | 12.5               | Conditional pass (needs stronger features)       |
| `resident-trajectory-archetypes.ipynb`  | R2=-2.49, MAE=1.049, AUC=1.00 holdout, F1=0.909, CV AUC=0.816             | C+          | 15.0               | Pass with leakage/drift watch                    |


## Data and Output Validation Checks

- All six notebooks executed with clean kernels and persisted outputs.
- Table loads and joins were successful for all notebooks after path correction.
- Safehouse pipeline correctly detects one-class target edge case and avoids runtime failure.
- Output narratives include business recommendations and top feature impacts.

## Cross-Pipeline Observations

- Strongest operational candidate: **social content mix efficiency**.
- Moderate candidate with practical value: **campaign timing seasonality**.
- Explanatory-first candidates (weak predictive reliability): **intervention mix**, **incident archetypes**, **safehouse load**.
- Potential overfit risk to monitor: **resident trajectory archetypes** (high holdout vs lower CV stability).

## Priority Improvement Backlog

1. Add temporal rolling windows and class balancing for low-variance targets (safehouse, incident).
2. Expand feature engineering for intervention and incident models (history windows, lag signals, safehouse interaction terms).
3. Add calibration curves and threshold tables to all predictive tracks.
4. Add bootstrap confidence intervals for explanatory coefficients in all six workbooks.
5. Introduce fairness slices by safehouse, case category, and referral channel.

