"""Execute every notebook under notebooks/ (code cells only, shared namespace per notebook).

Uses non-interactive Matplotlib (Agg) so plt.show() does not open GUI windows during batch runs.
"""
import json
import os
import sys
from pathlib import Path

# Must run before any notebook imports pyplot (no GUI windows).
os.environ.setdefault("MPLBACKEND", "Agg")


# Long-running or interactive-heavy notebooks; run manually in Jupyter when refreshing metrics.
SKIP = frozenset({"counseling-effectiveness.ipynb", "reintegration-readiness.ipynb"})


def _seed_matplotlib_ns(ns: dict) -> None:
    """Preload Agg backend so notebook cells cannot open interactive figure windows."""
    prelude = (
        "import os\n"
        "os.environ.setdefault('MPLBACKEND', 'Agg')\n"
        "import matplotlib\n"
        "matplotlib.use('Agg')\n"
        "import matplotlib.pyplot as plt\n"
        "plt.ioff()\n"
    )
    exec(prelude, ns, ns)


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    os.chdir(root)
    nb_dir = root / "notebooks"
    if not nb_dir.is_dir():
        print("No notebooks/ directory found; expected", nb_dir, file=sys.stderr)
        return 1
    failures = []
    for path in sorted(nb_dir.glob("*.ipynb")):
        if path.name in SKIP:
            print("==>", path.name, "(skipped: long-running bootstrap cells)", flush=True)
            continue
        ns: dict = {"__name__": "__main__", "__builtins__": __builtins__}
        _seed_matplotlib_ns(ns)
        nb = json.loads(path.read_text(encoding="utf-8"))
        print("==>", path.name, flush=True)
        for i, cell in enumerate(nb["cells"]):
            if cell.get("cell_type") != "code":
                continue
            src = "".join(cell.get("source") or [])
            if not src.strip():
                continue
            try:
                exec(src, ns, ns)
            except Exception as e:
                failures.append((path.name, i, repr(e)))
                print(f"   FAIL cell {i}: {e}", flush=True)
                break
        else:
            print("   OK", flush=True)
    if failures:
        print("\nFailed:", failures)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
