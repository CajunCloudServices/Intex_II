"""Shared helpers for trend pipeline dashboard JSON (insights + model_drivers)."""
from __future__ import annotations

from typing import Any

import pandas as pd


def share_top5_drivers(imp: pd.Series, top_k: int = 5) -> list[dict[str, Any]]:
    imp = imp.dropna().sort_values(ascending=False).head(top_k).clip(lower=0)
    total = float(imp.sum()) or 1.0
    out: list[dict[str, Any]] = []
    for name, val in imp.items():
        out.append(
            {
                "feature": str(name).replace("_", " "),
                "importance": float(val),
                "share_top5_pct": int(round(100.0 * float(val) / total)),
            }
        )
    return out


def safe_round(x: float | None, nd: int = 3) -> str:
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return "—"
    try:
        return str(round(float(x), nd))
    except (TypeError, ValueError):
        return "—"
