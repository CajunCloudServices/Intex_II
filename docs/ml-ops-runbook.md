# ML Ops Runbook

## Scope

Operational guidance for the ML data-loading + inference path in this repository.

## Data flow

1. CSV snapshot data is used for notebook experimentation and offline training.
2. Backend relational model (Postgres) is the production source of truth.
3. Backend builds typed feature payloads.
4. Backend calls Python inference service.
5. Prediction payload is returned to API consumers.

## Retraining cadence

- Minimum recommendation: monthly retraining.
- Trigger retraining earlier if:
  - model endpoint latency spikes and fallback starts being used frequently
  - feature null rates increase by more than 10%
  - business outcomes drift from expected ranges

## Monitoring checklist

- API endpoint health: `/api/health`
- ML endpoint health (Python service): `/health`
- Reintegration endpoint behavior:
  - `% responses from local fallback` should remain near zero in stable environments
  - 5xx rate for `GET /api/ml/reintegration-risk/{residentId}`
- Data quality:
  - orphan FK counts for new tables should be zero
  - null rate for required contract fields should be zero

## Failure handling

- If Python inference endpoint is down:
  - backend currently returns a local fallback score (configurable via `MlInference:EnableLocalFallback`)
  - monitor logs and restore remote inference service as priority
- If feature extraction fails for resident:
  - API returns `404` for missing resident or `500` for unhandled errors

## Configuration

`backend/Intex.Api/appsettings.json`:

- `MlInference:BaseUrl`
- `MlInference:ReintegrationEndpoint`
- `MlInference:TimeoutSeconds`
- `MlInference:EnableLocalFallback`
- `Seed:Mode` (`Csv` or `Fixture`)
- `Seed:ImportCsvOnStartup`
- `Seed:CsvPath`

## Database seeding workflow

Application startup can import all 17 CSVs into the relational application schema (not staging tables) when:

- `Seed:Mode=Csv`
- `Seed:ImportCsvOnStartup=true`
- domain tables are empty

Import path and behavior:

- importer service: `backend/Intex.Api/Data/Seed/CsvRelationalSeeder.cs`
- orchestrator: `backend/Intex.Api/Data/Seed/AppSeeder.cs`
- load order enforces PK/FK dependencies
- orphan child rows are skipped with explicit error reporting
- `public_impact_snapshots.metric_payload_json` is normalized to valid JSON during import

To force fixture mode for local smoke tests:

- set `Seed:Mode=Fixture`

To run a one-time fresh CSV reseed:

1. clear application domain tables/database
2. set `Seed:Mode=Csv` and verify `Seed:CsvPath`
3. start backend and monitor seed logs for imported row counts and warnings

## Deployment notes

- Deploy backend and inference service together in the same environment.
- Keep model artifact and feature-contract version paired.
- Validate with a smoke sequence:
  1. API starts and migrates DB
  2. inference service `/health` returns 200
  3. `GET /api/ml/reintegration-features/{residentId}` returns payload
  4. `GET /api/ml/reintegration-risk/{residentId}` returns prediction JSON
