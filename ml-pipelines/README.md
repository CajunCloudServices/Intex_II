# ML Pipelines

This folder contains notebook-based ML exploration and a production bridge for inference integration.

## Notebooks

- `counseling-effectiveness.ipynb`
- `donor-churn-prediction.ipynb`
- `social-media-conversion.ipynb`
- `reintegration-readiness.ipynb`

## Shared loader

Use `data_loader.py` for all table reads to avoid hardcoded paths.

- Canonical CSV root: `ml-pipelines/lighthouse_csv_v7`
- Common API:
  - `load_table(name, source="csv")`
  - `load_table(name, source="db", conn=...)`

## Inference service (pilot)

`inference-service/` contains a minimal FastAPI service for reintegration scoring.

- Health check: `GET /health`
- Prediction endpoint: `POST /predict/reintegration`

## CSV snapshot import utility

Use `import_csv_snapshot.py` to push all 17 CSV tables into a Postgres staging schema.

```bash
python ml-pipelines/import_csv_snapshot.py \
  --connection-string "postgresql+psycopg://intex:intex_dev_password@localhost:5432/intex" \
  --schema ml_snapshot
```

## Relational app seeding (authoritative path)

The backend now supports startup relational seeding directly into the application schema from this folder:

- Source CSV directory: `ml-pipelines/lighthouse_csv_v7`
- Startup seeder:
  - `backend/Intex.Api/Data/Seed/AppSeeder.cs`
  - `backend/Intex.Api/Data/Seed/CsvRelationalSeeder.cs`

`appsettings.json` controls seeding behavior:

- `Seed:Mode` = `Csv` or `Fixture`
- `Seed:ImportCsvOnStartup` = `true`/`false`
- `Seed:CsvPath` = path to CSV folder (relative to backend content root or absolute)

When `Seed:Mode=Csv` and tables are empty, all 17 CSVs are imported in FK-safe dependency order.

## Notebook execution validation

All four notebooks were executed end-to-end from a clean kernel after loader standardization to validate:

- no path/load errors
- centralized parsing contract compatibility
- successful model/training cells
