#!/usr/bin/env python3
"""Resolve and invoke the KerSor checkout configured for the DSH preset."""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path


PRESET_ROOT = Path(__file__).resolve().parents[1]
ROOT_FILE = PRESET_ROOT / ".local" / "kersor-root"


def resolve_root() -> Path:
    """Return a validated KerSor checkout from the environment or installer state."""
    configured = os.environ.get("KERSOR_ROOT", "").strip()
    source = "KERSOR_ROOT"
    if not configured and ROOT_FILE.is_file():
        configured = ROOT_FILE.read_text(encoding="utf-8").strip()
        source = str(ROOT_FILE)
    if not configured:
        raise RuntimeError(
            "KerSor checkout is not configured; rerun scripts/install.py with "
            "--kersor-root or set KERSOR_ROOT"
        )

    root = Path(configured).expanduser().resolve()
    required = ("AGENTS.md", "commands", "scripts/compose.py", "scripts/doctor.sh")
    missing = [relative for relative in required if not (root / relative).exists()]
    if missing:
        raise RuntimeError(
            f"invalid KerSor checkout from {source}: {root}; missing {', '.join(missing)}"
        )
    return root


def exec_doctor(root: Path, args: list[str]) -> None:
    """Replace this process with KerSor's doctor command."""
    bash = shutil.which("bash")
    if bash is None:
        raise RuntimeError("bash is required to run KerSor doctor")
    os.execv(bash, [bash, str(root / "scripts" / "doctor.sh"), *args])


def exec_compose(root: Path, args: list[str]) -> None:
    """Replace this process with KerSor's command composer."""
    os.execv(
        sys.executable,
        [sys.executable, str(root / "scripts" / "compose.py"), *args],
    )


def parser() -> argparse.ArgumentParser:
    """Build the bridge command parser."""
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("action", choices=("root", "doctor", "compose"))
    result.add_argument("args", nargs=argparse.REMAINDER)
    return result


def main(argv: list[str] | None = None) -> int:
    """Resolve the checkout and dispatch a supported bridge action."""
    options = parser().parse_args(argv)
    try:
        root = resolve_root()
        if options.action == "root":
            if options.args:
                parser().error("root does not accept additional arguments")
            print(root)
            return 0
        if options.action == "doctor":
            exec_doctor(root, options.args)
        exec_compose(root, options.args)
    except RuntimeError as error:
        print(f"kersor-bridge: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
