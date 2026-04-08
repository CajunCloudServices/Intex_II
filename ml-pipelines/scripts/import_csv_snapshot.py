#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT))

from sqlalchemy import create_engine, text

from data_loader import DATA_DIR, TABLE_CONFIG, load_table


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Load all 17 CSV snapshot tables into Postgres staging schema.")
    parser.add_argument(
        "--connection-string",
        required=True,
        help="SQLAlchemy connection string, e.g. postgresql+psycopg://user:pass@localhost:5432/intex",
    )
    parser.add_argument(
        "--schema",
        default="ml_snapshot",
        help="Target staging schema name (default: ml_snapshot)",
    )
    parser.add_argument(
        "--if-exists",
        default="replace",
        choices=["replace", "append"],
        help="Behavior for existing snapshot tables (default: replace)",
    )
    return parser.parse_args()


def load_snapshot_tables(connection_string: str, schema: str, if_exists: str) -> None:
    engine = create_engine(connection_string)
    with engine.begin() as conn:
        conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))

    for table_name in sorted(TABLE_CONFIG.keys()):
        df = load_table(table_name)
        df.to_sql(table_name, engine, schema=schema, if_exists=if_exists, index=False)
        print(f"Loaded {table_name} ({len(df)} rows) -> {schema}.{table_name}")

    print(f"\nSnapshot import complete from {DATA_DIR}")


def main() -> None:
    args = parse_args()
    load_snapshot_tables(args.connection_string, args.schema, args.if_exists)


if __name__ == "__main__":
    main()
