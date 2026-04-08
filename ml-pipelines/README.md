# ML Pipelines

This folder contains notebook-based ML exploration and a production bridge for inference integration.

## Folder layout

| Subfolder | Contents |
|-----------|----------|
| `notebooks/` | All `.ipynb` workbooks (set Jupyter **working directory** to `ml-pipelines` or repo root so `data_loader.py` resolves) |
| `dashboards/` | Static HTML admin views, shared `ml-dashboard-*.css/js` (load JSON from `../json/`) |
| `scripts/` | `generate_*_dashboard_data.py`, `generate_all_dashboard_data.py`, `run_all_notebooks.py`, `import_csv_snapshot.py` |
| `json/` | Generated dashboard data for the static HTML dashboards |
| `images/` | Exported plots (`p*_*.png` from legacy pipeline notebooks) |
| `models/` | Serialized sklearn pipelines (`p*_*.pkl`) |
| `logs/` | Optional run logs (reserved) |
| `lighthouse_csv_v7/` | Canonical CSV snapshot for loaders and seeding |

**Root-level Python** (kept next to `data_loader.py` so notebooks can `import` them with the usual working directory): `data_loader.py`, `path_setup.py`, `trend_eval_helpers.py`.

Batch runner (non-interactive plots, no pop-up windows), run from `ml-pipelines/`: `python scripts/run_all_notebooks.py`

## Notebooks (`notebooks/`)

- `counseling-effectiveness.ipynb`
- `donor-churn-prediction.ipynb`
- `social-media-conversion.ipynb`
- `reintegration-readiness.ipynb`
- `social-content-mix-efficiency.ipynb`
- `campaign-timing-seasonality.ipynb`
- `safehouse-operational-load-risk.ipynb`
- `intervention-mix-effectiveness.ipynb`
- `incident-composition-archetypes.ipynb`
- `resident-trajectory-archetypes.ipynb`
- `donation-impact-predictor.ipynb`

## Deep trend workbook run order

Run these six in sequence for the deep-trend program (under `notebooks/`):

1. `notebooks/social-content-mix-efficiency.ipynb`
2. `notebooks/campaign-timing-seasonality.ipynb`
3. `notebooks/safehouse-operational-load-risk.ipynb`
4. `notebooks/intervention-mix-effectiveness.ipynb`
5. `notebooks/incident-composition-archetypes.ipynb`
6. `notebooks/resident-trajectory-archetypes.ipynb`

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

Use `scripts/import_csv_snapshot.py` to push all 17 CSV tables into a Postgres staging schema.

```bash
python ml-pipelines/scripts/import_csv_snapshot.py \
  --connection-string "postgresql+psycopg://intex:<your-strong-local-password>@localhost:5432/intex" \
  --schema ml_snapshot
```

This populates **`ml_snapshot` only** (notebooks / ML). The web portal reads **application tables** populated by `CsvRelationalSeeder`, not this schema. If dashboards show only a few rows after loading CSVs, see [docs/dashboard-data-troubleshooting.md](../docs/dashboard-data-troubleshooting.md).

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
