"""Shared filesystem primitives for recoverable DSH preset installers."""

from __future__ import annotations

import filecmp
import os
from datetime import datetime
from pathlib import Path


def default_dsh_home() -> Path:
    """Resolve the DSH home without embedding a machine path in repository assets."""
    configured = os.environ.get("DSH_HOME", "").strip()
    return Path(configured).expanduser() if configured else Path.home() / ".dsh"


def locate_standard(dsh_home: Path, explicit: Path | None) -> Path:
    """Locate the installed standard preset or fail with actionable guidance."""
    candidates: list[Path] = []
    if explicit is not None:
        candidates.append(explicit.expanduser())
    configured = os.environ.get("DSH_STANDARD_PRESET", "").strip()
    if configured:
        candidates.append(Path(configured).expanduser())
    candidates.append(
        dsh_home
        / "profiles"
        / "node_modules"
        / "@deepseek-ai"
        / "dsh"
        / "config"
        / "agent-presets"
        / "standard"
        / "agent.cordis.yml"
    )
    for candidate in candidates:
        if candidate.is_file():
            return candidate.resolve()
    rendered = "\n  - ".join(str(candidate) for candidate in candidates)
    raise RuntimeError(
        "cannot locate DSH standard preset; checked:\n  - "
        f"{rendered}\npass --standard-preset explicitly"
    )


def directory_equal(left: Path, right: Path) -> bool:
    """Compare two directory trees without introducing a persisted fingerprint."""
    comparison = filecmp.dircmp(left, right)
    if comparison.left_only or comparison.right_only or comparison.funny_files:
        return False
    if any(
        not filecmp.cmp(left / name, right / name, shallow=False)
        for name in comparison.common_files
    ):
        return False
    return all(
        directory_equal(left / name, right / name)
        for name in comparison.common_dirs
    )


def unique_backup(destination: Path) -> Path:
    """Choose a non-conflicting recoverable backup path beside a preset."""
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    candidate = destination.with_name(f"{destination.name}.backup-{stamp}")
    suffix = 1
    while candidate.exists():
        candidate = destination.with_name(
            f"{destination.name}.backup-{stamp}-{suffix}"
        )
        suffix += 1
    return candidate
