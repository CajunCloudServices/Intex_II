# ML Feature Contracts

This document defines the canonical feature payload contracts for each IS 455 pipeline so notebook training, backend feature-building, and inference stay aligned.

## Reintegration Readiness (Pilot)

- Contract type: `ReintegrationFeaturePayload` in `backend/Intex.Api/DTOs/MlDtos.cs`
- Builder: `backend/Intex.Api/Services/ReintegrationFeatureBuilder.cs`
- Inference endpoint (backend): `GET /api/ml/reintegration-risk/{residentId}`
- Raw feature endpoint (backend): `GET /api/ml/reintegration-features/{residentId}`

### Core feature groups

- **Resident baseline:** risk level, abuse categories, family context flags
- **Health trend:** score mean and first-vs-last trend
- **Education trend:** progress mean and first-vs-last trend
- **Counseling process:** session count, duration, progress/concern rates, emotion shift
- **Incident load:** total incidents and high-severity counts

### Canonical SQL projection (reference)

```sql
SELECT
  r."Id" AS resident_id,
  CASE r."InitialRiskLevel"
    WHEN 'Low' THEN 1
    WHEN 'Medium' THEN 2
    WHEN 'High' THEN 3
    WHEN 'Critical' THEN 4
    ELSE 0
  END AS initial_risk_score,
  AVG(h."GeneralHealthScore") AS avg_health_score,
  AVG(e."ProgressPercent") AS avg_education_progress,
  COUNT(pr."Id") AS session_count,
  COUNT(ir."Id") AS incident_count
FROM "Residents" r
LEFT JOIN "HealthWellbeingRecords" h ON h."ResidentId" = r."Id"
LEFT JOIN "EducationRecords" e ON e."ResidentId" = r."Id"
LEFT JOIN "ProcessRecordings" pr ON pr."ResidentId" = r."Id"
LEFT JOIN "IncidentReports" ir ON ir."ResidentId" = r."Id"
GROUP BY r."Id", r."InitialRiskLevel";
```

## Donor Churn

- Contract type: `ChurnFeaturePayload` in `backend/Intex.Api/DTOs/MlDtos.cs`
- Source tables: `Supporters`, `Donations`
- Expected inference behavior: probability of becoming inactive/churned

## Social Media Conversion

- Contract type: `SocialConversionFeaturePayload` in `backend/Intex.Api/DTOs/MlDtos.cs`
- Source tables: `SocialMediaPosts`, `Donations`
- Expected inference behavior: donation-value uplift estimate or conversion propensity

## Counseling Effectiveness

- Contract type: `CounselingFeaturePayload` in `backend/Intex.Api/DTOs/MlDtos.cs`
- Source tables: `ProcessRecordings`, `Residents`, `IncidentReports`
- Expected inference behavior: concern/alert probability per session

## Notes On Training/Inference Parity

- Treat feature names in DTOs as the canonical serving contract.
- Any notebook feature engineering rename must be reflected in DTOs and builder code in the same PR.
- Keep all date parsing and table-name conventions centralized in `ml-pipelines/data_loader.py` for notebook parity.
