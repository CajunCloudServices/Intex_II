# Deep Trend Pipeline Registry

This registry tracks business ownership, modeling goal, validation discipline, and deployment mapping for the six new trend workbooks.

| Pipeline key | Notebook | Business owner | Goal type | Primary validation protocol | Deployed endpoint | UI surface | Monitoring KPI |
|---|---|---|---|---|---|---|---|
| social-content-mix-efficiency | `ml-pipelines/social-content-mix-efficiency.ipynb` | Outreach lead | Explanation + Prediction | Holdout + 5-fold CV + baseline AUC/F1 | `GET /api/reports/trend-deployments` | Reports analytics trend scorecards | Avg referrals per ImpactStory post |
| campaign-timing-seasonality | `ml-pipelines/campaign-timing-seasonality.ipynb` | Fundraising lead | Explanation + Prediction | Temporal split + 5-fold CV + baseline AUC | `GET /api/reports/trend-deployments` | Reports analytics trend scorecards | Share of donation amount in Q4 |
| safehouse-operational-load-risk | `ml-pipelines/safehouse-operational-load-risk.ipynb` | Operations lead | Explanation + Prediction (guarded) | Regression holdout + class-guarded classification path | `GET /api/reports/trend-deployments` | Reports analytics trend scorecards | Incidents per resident-month |
| intervention-mix-effectiveness | `ml-pipelines/intervention-mix-effectiveness.ipynb` | Counseling supervisor | Explanation + Prediction | Temporal split + CV + baseline AUC/F1 | `GET /api/reports/trend-deployments` | Reports analytics trend scorecards | Counseling concern flag rate |
| incident-composition-archetypes | `ml-pipelines/incident-composition-archetypes.ipynb` | Safety coordinator | Explanation + Prediction | Holdout + CV with macro-F1/accuracy | `GET /api/reports/trend-deployments` | Reports analytics trend scorecards | High-severity incident rate |
| resident-trajectory-archetypes | `ml-pipelines/resident-trajectory-archetypes.ipynb` | Case management lead | Explanation + Prediction | Holdout + CV + baseline AUC/F1 | `GET /api/reports/trend-deployments` | Reports analytics trend scorecards | Positive trajectory rate |

## API and Contract Files

- Backend DTOs: `backend/Intex.Api/DTOs/ReportDtos.cs`
- Backend endpoint: `backend/Intex.Api/Controllers/ReportsController.cs`
- Frontend types: `frontend/src/api/types.ts`
- Frontend API module: `frontend/src/api/modules/reports.ts`
- Frontend render surface: `frontend/src/pages/portal/ReportsAnalyticsPage.tsx`
