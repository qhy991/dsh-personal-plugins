#!/usr/bin/env python3
"""Run Modus compatibility tests against a pinned DeepSeek Harness checkout."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "presets" / "modus" / "compatibility.json"
CONFIG = ROOT / "tests" / "vitest.dsh.config.mjs"


def configured_root() -> Path | None:
    """Read the optional DSH source checkout override."""
    value = os.environ.get("DSH_SOURCE_ROOT", "").strip()
    return None if not value else Path(value)


def parser() -> argparse.ArgumentParser:
    """Build the compatibility-check CLI."""
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--dsh-root", type=Path, default=configured_root())
    result.add_argument("--allow-unpinned", action="store_true")
    result.add_argument(
        "--allow-dirty",
        action="store_true",
        help="run a development probe even when the DSH worktree differs from HEAD",
    )
    return result


def main(argv: list[str] | None = None) -> int:
    """Verify the checkout identity, then drive its real Vitest runtime."""
    options = parser().parse_args(argv)
    if options.dsh_root is None:
        print("check-dsh-compat: pass --dsh-root or set DSH_SOURCE_ROOT", file=sys.stderr)
        return 2
    dsh_root = options.dsh_root.expanduser().resolve()
    vitest = dsh_root / "node_modules" / ".bin" / "vitest"
    if not (dsh_root / "tsconfig.base.json").is_file() or not vitest.is_file():
        print(f"check-dsh-compat: invalid or unbuilt DSH checkout: {dsh_root}", file=sys.stderr)
        return 2

    compatibility = json.loads(MANIFEST.read_text(encoding="utf-8"))
    expected = compatibility["dsh"]["tested_commit"]
    observed = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=dsh_root,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    if observed != expected and not options.allow_unpinned:
        print(
            f"check-dsh-compat: DSH HEAD {observed} differs from pinned {expected}; "
            "use --allow-unpinned only for an explicit compatibility probe",
            file=sys.stderr,
        )
        return 2
    dirty = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=dsh_root,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    if dirty and not options.allow_dirty:
        print(
            "check-dsh-compat: DSH worktree is dirty; use a clean checkout for "
            "pinned evidence or --allow-dirty only for an explicit development probe",
            file=sys.stderr,
        )
        return 2

    environment = os.environ.copy()
    environment["DSH_SOURCE_ROOT"] = str(dsh_root)
    completed = subprocess.run(
        [
            str(vitest),
            "run",
            "--config",
            str(CONFIG),
            "--no-color",
            "--reporter=verbose",
        ],
        cwd=dsh_root,
        env=environment,
        check=False,
    )
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
