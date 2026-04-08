# Dashboard row counts and CSV seeding

Operational portal dashboards (donors, caseload, process recordings, home visitations, admin summary) read **PostgreSQL through Entity Framework** — the same tables defined in `ApplicationDbContext`. They do **not** read from the ML staging schema.

## What to look for in API logs

On startup the API logs one of these outcomes (search for `DATA_SEED` or `CSV relational seed`):

| Log message | Meaning |
|-------------|---------|
| `CSV relational seed starting from directory {path}` | Import began; `{path}` is the resolved CSV root — verify it exists in the running environment. |
| `DATA_SEED: Full CSV snapshot loaded` | All required CSV files were imported; dashboards should reflect full counts. |
| `DATA_SEED: Embedded fixture loaded` | CSV import failed or was disabled; you get a **small demo** (~3 supporters, ~2 residents, single-digit child rows). |
| `DATA_SEED: Domain tables already contain Safehouses rows; skipping` | Database was not empty; the seeder does **not** replace existing domain data. |
| `CSV relational seed skipped: Safehouses already populated` | Second call to the CSV seeder when safehouses already exist (idempotent path). |

**Connection string:** Confirm `ConnectionStrings__DefaultConnection` (or `CONNECTIONSTRINGS__DEFAULTCONNECTION`) points to the Postgres instance you expect. The UI only shows data in that database.

## `ml_snapshot` vs application tables

`ml-pipelines/scripts/import_csv_snapshot.py` loads the 17 CSV tables into a **`ml_snapshot`** schema (configurable) for notebooks and ML jobs. **The ASP.NET API does not query that schema** for portal dashboards.

To populate dashboards you need either:

- Successful **`CsvRelationalSeeder`** import into the normal EF tables (startup when the DB has no `Safehouses` rows), or  
- Your own ETL into the same tables the API uses (not included in this repo).

## Resolving `Seed:CsvPath`

Default in [`appsettings.json`](../backend/Intex.Api/appsettings.json) is relative to the API content root: `../../ml-pipelines/lighthouse_csv_v7`.

Override with environment variable **`Seed__CsvPath`** (absolute path recommended in Docker).

**Local `dotnet run`:** Keep [`ml-pipelines/lighthouse_csv_v7/`](../ml-pipelines/lighthouse_csv_v7/) in the repo; the relative path usually resolves from `backend/Intex.Api`.

**Docker:** The published image contains **no** CSV files. [`docker-compose.yml`](../docker-compose.yml) and [`docker-compose.production.yml`](../docker-compose.production.yml) mount `./ml-pipelines/lighthouse_csv_v7` to `/data/lighthouse_csv_v7` and set `Seed__CsvPath=/data/lighthouse_csv_v7`. On a server without the repo checkout, copy the CSV directory to the host and adjust the mount path, or bake CSVs into a custom image.

## Forcing a full CSV load after a partial or wrong seed

`CsvRelationalSeeder` runs only when the **`Safehouses` table is empty** (and `Seed:Mode` is `Csv` with `ImportCsvOnStartup` true). If you already have rows (including the embedded fixture), startup will **not** replace them.

Safe options:

1. **New database** — Create an empty database, point the connection string at it, run migrations (automatic on startup), restart so the CSV import runs once.  
2. **Truncate domain tables** — Only if you understand FK order and are not in production with real users. Drop or truncate child tables first, then parents (or use `TRUNCATE ... CASCADE` in Postgres with appropriate care). **Do not** truncate ASP.NET Identity tables unless you intend to recreate users.  
3. **Manual SQL / restore** — Restore a backup that already contains the desired rows.

After clearing domain data, restart the API and confirm logs show `DATA_SEED: Full CSV snapshot loaded`.

## ML Insights static JSON

ML admin dashboards served under `/api/ml-dashboard/data/{key}` read **generated JSON files** (see `MlDashboardOptions`), not live SQL aggregates. Refresh them with `ml-pipelines/scripts/generate_*_dashboard_data.py` when needed. Operational KPIs on other pages still come from the EF database.
