"""Resolve ml-pipelines root and add it to sys.path (for notebooks under notebooks/)."""
from __future__ import annotations

import sys
from pathlib import Path


def ensure_ml_pipelines_root() -> Path:
    """Return directory containing data_loader.py and insert it on sys.path."""
    here = Path.cwd().resolve()
    candidates = [
        here,
        here.parent,
        here / "ml-pipelines",
        here.parent / "ml-pipelines",
    ]
    for c in candidates:
        if (c / "data_loader.py").is_file():
            s = str(c)
            if s not in sys.path:
                sys.path.insert(0, s)
            return c
    raise ImportError(
        "Could not find data_loader.py. Set the working directory to the repo's "
        "'ml-pipelines' folder (or repo root) before running this notebook."
    )


def artifact_dirs(root: Path | None = None) -> tuple[Path, Path]:
    """Return (images_dir, models_dir) under ml-pipelines root; create if missing."""
    r = root if root is not None else ensure_ml_pipelines_root()
    images = r / "images"
    models = r / "models"
    images.mkdir(parents=True, exist_ok=True)
    models.mkdir(parents=True, exist_ok=True)
    return images, models
