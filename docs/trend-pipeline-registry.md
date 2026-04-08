# Deep Trend Pipeline Registry

This registry tracks business ownership, modeling goal, validation discipline, and deployment mapping for the six new trend workbooks.

| Pipeline key | Notebook | Business owner | Goal type | Primary validation protocol | Deployed endpoint | UI surface | Monitoring KPI |
|---|---|---|---|---|---|---|---|
| social-content-mix-efficiency | `ml-pipelines/notebooks/social-content-mix-efficiency.ipynb` | Outreach lead | Explanation + Prediction | Holdout + 5-fold CV + baseline AUC/F1 | `GET /api/reports/trend-deployments` | Reports analytics trend scorecards | Avg referrals per ImpactStory post |
| campaign-timing-seasonality | `ml-pipelines/notebooks/campaign-timing-seasonality.ipynb` | Fundraising lead | Explanation + Prediction | Temporal split + 5-fold CV + baseline AUC | `GET /api/reports/trend-deployments` | Reports analytics trend scorecards | Share of donation amount in Q4 |
| safehouse-operational-load-risk | `ml-pipelines/notebooks/safehouse-operational-load-risk.ipynb` | Operations lead | Explanation + Prediction | Rolling/lag features; house-level **GroupKFold**; reframed binary target vs house median | `GET /api/reports/trend-deployments` | Reports analytics trend scorecards | Incidents per resident-month |
| intervention-mix-effectiveness | `ml-pipelines/notebooks/intervention-mix-effectiveness.ipynb` | Counseling supervisor | Explanation + Prediction | Resident **GroupKFold** + holdout by resident; prior-session features only | `GET /api/reports/trend-deployments` | Reports analytics trend scorecards | Counseling concern flag rate |
| incident-composition-archetypes | `ml-pipelines/notebooks/incident-composition-archetypes.ipynb` | Safety coordinator | Explanation + Prediction | **GroupShuffleSplit** by resident; multiclass + binary High/Critical auxiliary | `GET /api/reports/trend-deployments` | Reports analytics trend scorecards | High-severity incident rate |
| resident-trajectory-archetypes | `ml-pipelines/notebooks/resident-trajectory-archetypes.ipynb` | Case management lead | Explanation + Prediction | **GroupShuffleSplit** + **GroupKFold**; `current_risk_num` excluded from X (leakage control) | `GET /api/reports/trend-deployments` | Reports analytics trend scorecards | Positive trajectory rate |

All six notebooks include a final evaluation cell (calibration bins, threshold scan, bootstrap linear CIs, slice diagnostics) via `ml-pipelines/trend_eval_helpers.py`.

## API and Contract Files

- Backend DTOs: `backend/Intex.Api/DTOs/ReportDtos.cs`
- Backend endpoint: `backend/Intex.Api/Controllers/ReportsController.cs`
- Frontend types: `frontend/src/api/types.ts`
- Frontend API module: `frontend/src/api/modules/reports.ts`
- Frontend render surface: `frontend/src/pages/portal/ReportsAnalyticsPage.tsx`
