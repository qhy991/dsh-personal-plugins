#!/usr/bin/env python3
"""Render and install the KerSor preset from the current DSH standard preset."""

from __future__ import annotations

import argparse
import filecmp
import json
import os
import shutil
import sys
import tempfile
from datetime import datetime
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = REPOSITORY_ROOT / "presets" / "kersor"
PERSONA_LINE = (
    "      You are a coding agent powered by the {{model}} model. "
    "Your working directory is {{cwd}}."
)
KERSOR_LINE = (
    "      Use the kersor skill and kersor_status tool for KerSor tasks; "
    "the bridge resolves the configured checkout."
)
TOOL_SKILL_ENTRY = "- id: tool-skill\n  name: '@deepseek-ai/dsh-tool-skill'"
SKILL_FILESYSTEM_ENTRY = (
    "- id: skill-filesystem\n"
    "  name: '@deepseek-ai/dsh-skill-filesystem'"
)
KERSOR_STATUS_ENTRY = (
    "- id: kersor-status\n"
    "  name: './plugins/kersor-status.mjs'"
)


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


def validate_kersor_root(path: Path) -> Path:
    """Return a canonical KerSor checkout after checking bridge dependencies."""
    root = path.expanduser().resolve()
    required = ("AGENTS.md", "commands", "scripts/compose.py", "scripts/doctor.sh")
    missing = [relative for relative in required if not (root / relative).exists()]
    if missing:
        raise RuntimeError(f"invalid KerSor checkout {root}; missing {', '.join(missing)}")
    return root


def render_composition(standard_source: str, *, skill_dir: Path) -> str:
    """Apply the KerSor-owned persona delta to a DSH standard composition."""
    if standard_source.count(PERSONA_LINE) != 1:
        raise RuntimeError(
            "standard preset persona anchor changed; inspect the current DSH preset "
            "before updating this renderer"
        )
    if standard_source.count(TOOL_SKILL_ENTRY) != 1:
        raise RuntimeError(
            "standard preset skill-tool anchor changed; inspect the current DSH preset "
            "before updating this renderer"
        )
    if standard_source.count(SKILL_FILESYSTEM_ENTRY) != 1:
        raise RuntimeError(
            "standard preset skill-filesystem anchor changed; inspect the current "
            "DSH preset before updating this renderer"
        )
    lines = standard_source.splitlines()
    if not lines:
        raise RuntimeError("standard preset is empty")
    lines[0] = "# The `kersor` agent preset: current DSH standard plus the KerSor bridge."
    rendered = "\n".join(lines).replace(
        PERSONA_LINE,
        f"{PERSONA_LINE}\n{KERSOR_LINE}",
        1,
    )
    rendered = rendered.replace(
        SKILL_FILESYSTEM_ENTRY,
        (
            f"{SKILL_FILESYSTEM_ENTRY}\n"
            "  config:\n"
            "    customSkillDirs:\n"
            f"      - {json.dumps(str(skill_dir.resolve()))}"
        ),
        1,
    )
    rendered = rendered.replace(
        TOOL_SKILL_ENTRY,
        f"{TOOL_SKILL_ENTRY}\n\n{KERSOR_STATUS_ENTRY}",
        1,
    )
    return rendered.rstrip("\n") + "\n"


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


def stage_install(parent: Path, composition: str, kersor_root: Path) -> Path:
    """Create a complete preset tree on the destination filesystem."""
    stage = Path(tempfile.mkdtemp(prefix=".kersor-install-", dir=parent))
    shutil.copy2(ASSET_ROOT / "preset.yml", stage / "preset.yml")
    shutil.copytree(ASSET_ROOT / "skills", stage / "skills")
    shutil.copytree(ASSET_ROOT / "plugins", stage / "plugins")
    shutil.copytree(
        ASSET_ROOT / "bin",
        stage / "bin",
        ignore=shutil.ignore_patterns("__pycache__", "*.pyc"),
    )
    (stage / "agent.cordis.yml").write_text(composition, encoding="utf-8")
    local = stage / ".local"
    local.mkdir()
    (local / "kersor-root").write_text(f"{kersor_root}\n", encoding="utf-8")
    return stage


def unique_backup(destination: Path) -> Path:
    """Choose a non-conflicting recoverable backup path beside the preset."""
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    candidate = destination.with_name(f"{destination.name}.backup-{stamp}")
    suffix = 1
    while candidate.exists():
        candidate = destination.with_name(
            f"{destination.name}.backup-{stamp}-{suffix}"
        )
        suffix += 1
    return candidate


def install(
    *,
    dsh_home: Path,
    standard_preset: Path | None,
    kersor_root: Path,
    force: bool,
    dry_run: bool,
) -> tuple[Path, Path | None, bool]:
    """Install the rendered preset and return destination, backup, and changed state."""
    standard = locate_standard(dsh_home, standard_preset)
    root = validate_kersor_root(kersor_root)
    destination = dsh_home.expanduser().resolve() / ".agent-presets" / "kersor"
    composition = render_composition(
        standard.read_text(encoding="utf-8"),
        skill_dir=destination / "skills",
    )
    if dry_run:
        return destination, None, True

    destination.parent.mkdir(parents=True, exist_ok=True)
    stage = stage_install(destination.parent, composition, root)
    backup: Path | None = None
    try:
        if destination.exists() and directory_equal(stage, destination):
            shutil.rmtree(stage)
            return destination, None, False
        if destination.exists() and not force:
            raise RuntimeError(
                f"destination exists and differs: {destination}; rerun with --force"
            )
        if destination.exists():
            backup = unique_backup(destination)
            destination.rename(backup)
        try:
            stage.rename(destination)
        except Exception:
            if backup is not None and not destination.exists():
                backup.rename(destination)
            raise
    finally:
        if stage.exists():
            shutil.rmtree(stage)
    return destination, backup, True


def parser() -> argparse.ArgumentParser:
    """Build the installer command parser."""
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--dsh-home", type=Path, default=default_dsh_home())
    result.add_argument("--standard-preset", type=Path)
    result.add_argument("--kersor-root", type=Path, required=True)
    result.add_argument("--force", action="store_true")
    result.add_argument("--dry-run", action="store_true")
    return result


def main(argv: list[str] | None = None) -> int:
    """Run the installer CLI."""
    options = parser().parse_args(argv)
    try:
        destination, backup, changed = install(
            dsh_home=options.dsh_home,
            standard_preset=options.standard_preset,
            kersor_root=options.kersor_root,
            force=options.force,
            dry_run=options.dry_run,
        )
    except RuntimeError as error:
        print(f"install: {error}", file=sys.stderr)
        return 2

    if options.dry_run:
        print(f"would install KerSor preset at {destination}")
    elif changed:
        print(f"installed KerSor preset at {destination}")
    else:
        print(f"KerSor preset already up to date at {destination}")
    if backup is not None:
        print(f"previous preset preserved at {backup}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
