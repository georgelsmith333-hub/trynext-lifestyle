"""Compatibility entry point for the canonical Smart v10.3 release check.

Keep this filename usable for existing runbooks while delegating to the single
active JavaScript validator so the repository has one release contract.
"""

from __future__ import annotations

import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ACTIVE_VALIDATOR = ROOT / "scripts" / "validate-mockup-matrix.mjs"

print("Delegating canonical mockup validation to the active 188-surface Smart v10.3 gate.")
result = subprocess.run(["node", str(ACTIVE_VALIDATOR)], cwd=ROOT, check=False)
raise SystemExit(result.returncode)
