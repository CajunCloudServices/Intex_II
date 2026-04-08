# ML Rubric Evidence Checklist

This checklist maps rubric expectations to concrete notebook and app evidence.

## Pipeline 1: Social Media Conversion

- Notebook: `ml-pipelines/social-media-conversion.ipynb`
  - Problem framing, prediction vs explanation, causal limits
  - Standardized evaluation block (baseline, CV, threshold, calibration notes)
  - Deployment section aligned to shipped API/UI
- Backend deployment evidence:
  - `backend/Intex.Api/Controllers/ReportsController.cs`
  - Endpoint: `POST /api/reports/social-post-advisor`
- Frontend deployment evidence:
  - `frontend/src/pages/portal/ReportsAnalyticsPage.tsx`
  - `frontend/src/api/modules/reports.ts`
  - UI: "Post advisor (deployed prediction)" card under Reports & analytics

## Pipeline 2: Reintegration Readiness

- Notebook: `ml-pipelines/reintegration-readiness.ipynb`
  - Added temporal split / calibrated baseline / threshold policy discussion
  - Explicit predictive reliability and uncertainty limits
- Backend deployment evidence:
  - `backend/Intex.Api/Controllers/MlController.cs`
  - Endpoints:
    - `GET /api/ml/reintegration-risk/{residentId}`
    - `GET /api/ml/reintegration-risk-summary`
  - `backend/Intex.Api/Services/ReintegrationFeatureBuilder.cs`
- Frontend deployment evidence:
  - `frontend/src/pages/portal/ReportsAnalyticsPage.tsx`
  - `frontend/src/api/modules/reports.ts`
  - UI: reintegration risk watchlist table

## Pipeline 3: Donor Churn

- Notebook: `ml-pipelines/donor-churn-prediction.ipynb`
  - Added deployment section tied to shipped endpoint and UI
  - Threshold and retention-capacity policy notes
- Backend deployment evidence:
  - `backend/Intex.Api/Controllers/SupportersController.cs`
  - Endpoint: `GET /api/supporters/churn-risk-summary`
- Frontend deployment evidence:
  - `frontend/src/pages/portal/DonorsContributionsPage.tsx`
  - `frontend/src/api/modules/donors.ts`
  - UI: "At-risk donors (deployed churn scoring)"

## Pipeline 4: Counseling Effectiveness

- Notebook: `ml-pipelines/counseling-effectiveness.ipynb`
  - Explicit explanatory-first positioning when predictive signal is weak
  - Added reliability caveats and operational use boundaries
- Backend deployment evidence:
  - `backend/Intex.Api/Controllers/ReportsController.cs`
  - Endpoint: `GET /api/reports/counseling-risk`
- Frontend deployment evidence:
  - `frontend/src/pages/portal/ProcessRecordingPage.tsx`
  - `frontend/src/api/modules/reports.ts`
  - UI: "Counseling risk monitor"

## Cross-cutting reproducibility and execution

- Shared loader:
  - `ml-pipelines/data_loader.py`
- API contracts:
  - `backend/Intex.Api/DTOs/ReportDtos.cs`
  - `frontend/src/api/types.ts`
- Criteria map:
  - `docs/criteria-map.md`

## Deep Trend Pipeline 5: Social Content Mix Efficiency

- Notebook: `ml-pipelines/social-content-mix-efficiency.ipynb`
  - Explicit prediction vs explanation framing
  - Reproducible prep pipeline and feature-selection outputs
  - Baseline vs predictive comparison and CV reporting
- Deployment evidence:
  - Endpoint included in trend bridge: `GET /api/reports/trend-deployments`
  - UI integration: `frontend/src/pages/portal/ReportsAnalyticsPage.tsx` ("Deep trend deployment scorecards")

## Deep Trend Pipeline 6: Campaign Timing and Seasonality

- Notebook: `ml-pipelines/campaign-timing-seasonality.ipynb`
  - Time-aware split, baseline, explanatory and predictive tracks
  - Campaign and calendar feature interpretation for planning decisions
- Deployment evidence:
  - Endpoint included in trend bridge: `GET /api/reports/trend-deployments`
  - UI integration: `frontend/src/pages/portal/ReportsAnalyticsPage.tsx`

## Deep Trend Pipeline 7: Safehouse Operational Load Risk

- Notebook: `ml-pipelines/safehouse-operational-load-risk.ipynb`
  - Incident-rate explanatory model and guarded predictive path
  - Handles one-class snapshot condition without pipeline failure
- Deployment evidence:
  - Endpoint included in trend bridge: `GET /api/reports/trend-deployments`
  - UI integration: `frontend/src/pages/portal/ReportsAnalyticsPage.tsx`

## Deep Trend Pipeline 8: Intervention Mix Effectiveness

- Notebook: `ml-pipelines/intervention-mix-effectiveness.ipynb`
  - Emotional trajectory explanation + escalation prediction
  - Baseline/CV metrics and actionable intervention guidance
- Deployment evidence:
  - Endpoint included in trend bridge: `GET /api/reports/trend-deployments`
  - UI integration: `frontend/src/pages/portal/ReportsAnalyticsPage.tsx`

## Deep Trend Pipeline 9: Incident Composition Archetypes

- Notebook: `ml-pipelines/incident-composition-archetypes.ipynb`
  - Severity explanation and multiclass incident-type prediction
  - Macro-F1/accuracy discipline and prevention-playbook recommendations
- Deployment evidence:
  - Endpoint included in trend bridge: `GET /api/reports/trend-deployments`
  - UI integration: `frontend/src/pages/portal/ReportsAnalyticsPage.tsx`

## Deep Trend Pipeline 10: Resident Trajectory Archetypes

- Notebook: `ml-pipelines/resident-trajectory-archetypes.ipynb`
  - Cross-domain trajectory explanatory + predictive tracks
  - Feature importance and decision prioritization outputs
- Deployment evidence:
  - Endpoint included in trend bridge: `GET /api/reports/trend-deployments`
  - UI integration: `frontend/src/pages/portal/ReportsAnalyticsPage.tsx`
