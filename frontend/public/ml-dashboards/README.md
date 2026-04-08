# ML dashboard static assets

These files are **generated from `ml-pipelines/`** when you run `npm run sync-ml-dashboards` or `npm run build` (`prebuild`).

- HTML/CSS/JS are copied from `ml-pipelines` with `fetch` rewritten to **`/api/ml-dashboard/data/{key}`** so session cookies work and JSON is not world-readable from `/ml-dashboards/*.json`.
- JSON payloads are copied into **`backend/Intex.Api/Data/ml-dashboards/`** on each sync so the API and local previews stay aligned with notebook outputs.

Regenerate JSON locally: `python3 generate_all_dashboard_data.py` (from `ml-pipelines/`), then rebuild or run `npm run sync-ml-dashboards`.
