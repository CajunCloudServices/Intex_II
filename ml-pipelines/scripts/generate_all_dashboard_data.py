#!/usr/bin/env python3
"""Regenerate all ml-pipelines dashboard JSON files."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HERE = Path(__file__).resolve().parent
SCRIPTS = [
    "generate_counseling_dashboard_data.py",
    "generate_donor_dashboard_data.py",
    "generate_reintegration_dashboard_data.py",
    "generate_social_dashboard_data.py",
]


def main() -> None:
    for name in SCRIPTS:
        path = HERE / name
        print("→", name, flush=True)
        subprocess.run([sys.executable, str(path)], cwd=str(ROOT), check=True)
    print("All dashboard data files updated.")


if __name__ == "__main__":
    main()
