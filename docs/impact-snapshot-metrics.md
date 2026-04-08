# Public impact snapshots

## Semantics

- **`SnapshotDate`** (API / `public_impact_snapshots.snapshot_date`) is the **first calendar day of the reporting month** the row summarizes (e.g. `2026-03-01` = March 2026). It is not a timezone-dependent “as of” timestamp.
- **Headline and summary** should describe that same month so the dropdown label stays aligned with the narrative.

## Seed modes

| Mode | Source | Dropdown |
|------|--------|----------|
| **Fixture** | `AppSeeder.SeedDomainDataAsync` | One demo snapshot (used when CSV import fails or tests force `Seed:Mode=Fixture`). |
| **CSV** | `ml-pipelines/lighthouse_csv_v7/public_impact_snapshots.csv` | One option per published row (many months). |

On first startup with an empty database, `AppSeeder` runs CSV import when `Seed:Mode` is `Csv` and `Seed:ImportCsvOnStartup` is true (see `appsettings.json`). If import fails, it falls back to the fixture dataset.

## Metric payload shapes

The public Impact page reads `metric_payload_json` through `PublicImpactMetricsParser`:

1. **Dashboard shape** (fixture and hand-authored rows): JSON **array** of `{ "label", "value" }` — supports the four KPI cards (active residents, process recordings, etc.).
2. **Legacy CSV shape**: JSON **object** with `month`, `total_residents`, `avg_health_score`, `avg_education_progress`, `donations_total_for_month` — mapped to human-readable labels for the same UI.

## Optional ETL / “accuracy”

Fixture KPIs are **static** for demos. The CSV file carries **synthetic monthly rollups** that are not automatically recomputed from operational tables.

If you need numbers to match `safehouse_monthly_metrics` (or live queries):

1. Choose the month (`month_start` / `month_end` in that table).
2. **Total residents (illustrative):** sum `active_residents` across safehouses for that month (or apply your org’s definition of “active”).
3. **Process / home visits:** sum `process_recording_count` and `home_visitation_count` across safehouses for that month.
4. **Education plans:** define the business rule (e.g. count open education plans from the relevant table) — not present as a single column in `safehouse_monthly_metrics`.
5. Serialize the result as the **dashboard array** shape above and store it in `metric_payload_json`, with `snapshot_date` = first day of that month.

## Verification

- **Automated:** `dotnet test --filter FullyQualifiedName~PublicImpactMetricsParserTests` exercises both JSON shapes.
- **API:** `GET /api/public-impact` should return `200` with metrics for every published snapshot after CSV import (legacy objects are mapped server-side).
