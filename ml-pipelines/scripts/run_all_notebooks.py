"""Execute every .ipynb in this directory (code cells only, shared namespace per notebook)."""
import json
import sys
from pathlib import Path


# Long-running or interactive-heavy notebooks; run manually in Jupyter when refreshing metrics.
SKIP = frozenset({"counseling-effectiveness.ipynb", "reintegration-readiness.ipynb"})


def main() -> int:
    root = Path(__file__).parent
    failures = []
    for path in sorted(root.glob("*.ipynb")):
        if path.name in SKIP:
            print("==>", path.name, "(skipped: long-running bootstrap cells)", flush=True)
            continue
        ns: dict = {}
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
