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

## Notebook execution validation

All four notebooks were executed end-to-end from a clean kernel after loader standardization to validate:

- no path/load errors
- centralized parsing contract compatibility
- successful model/training cells
