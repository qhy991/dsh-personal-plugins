#!/usr/bin/env python3
"""Render and install the DSH-native Modus Router preset."""

from __future__ import annotations

import argparse
import shutil
import sys
import tempfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from install_common import (
    default_dsh_home,
    directory_equal,
    locate_standard,
    unique_backup,
)


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = REPOSITORY_ROOT / "presets" / "modus"
STANDARD_PERSONA = (
    "You are a coding agent powered by the {{model}} model. "
    "Your working directory is {{cwd}}."
)
PERSONA_BLOCK = f"    text: >-\n      {STANDARD_PERSONA}"
MODUS_PLUGIN_ENTRY = f"""
- id: modus-router
  name: './plugins/modus-router.mjs'
  config:
    provider: fork
    presetId: modus
    basePersona: >-
      {STANDARD_PERSONA}
    routerMaxOutputTokens: 4096
    routerProbeTools: []
    maxProbeCalls: 0
    maxRouteReminders: 1
    workerMaxDepth: 1
""".strip()


def plugin_entry(route_token_budget: tuple[int, int] | None) -> str:
    """Render the plugin row, optionally with an explicit experiment budget."""
    if route_token_budget is None:
        return MODUS_PLUGIN_ENTRY
    max_new_tokens, max_cache_read_tokens = route_token_budget
    if max_new_tokens < 0 or max_cache_read_tokens < 0:
        raise ValueError("route token limits must be non-negative")
    return (
        f"{MODUS_PLUGIN_ENTRY}\n"
        "    routeTokenBudget:\n"
        f"      maxNewTokens: {max_new_tokens}\n"
        f"      maxCacheReadTokens: {max_cache_read_tokens}"
    )


def indent_block(text: str, spaces: int) -> str:
    """Indent a plain-text asset for a YAML literal block."""
    prefix = " " * spaces
    return "\n".join(f"{prefix}{line}" if line else prefix for line in text.splitlines())


def render_composition(
    standard_source: str,
    route_token_budget: tuple[int, int] | None = None,
) -> str:
    """Replace the standard persona with the Router role and append its runtime row."""
    if standard_source.count(PERSONA_BLOCK) != 1:
        raise RuntimeError(
            "standard preset persona anchor changed; inspect the current DSH preset "
            "before updating the Modus renderer"
        )
    if "- id: modus-router\n" in standard_source:
        raise RuntimeError("standard preset already contains a modus-router row")
    router_persona = (ASSET_ROOT / "router-persona.md").read_text(encoding="utf-8")
    replacement = "    text: |-\n" + indent_block(router_persona.rstrip("\n"), 6)
    lines = standard_source.splitlines()
    if not lines:
        raise RuntimeError("standard preset is empty")
    lines[0] = "# The `modus` agent preset: current DSH standard plus bounded Router -> Worker routing."
    rendered = "\n".join(lines).replace(PERSONA_BLOCK, replacement, 1)
    return f"{rendered.rstrip()}\n\n{plugin_entry(route_token_budget)}\n"


def stage_install(parent: Path, composition: str) -> Path:
    """Create a complete self-contained Modus preset tree beside its destination."""
    stage = Path(tempfile.mkdtemp(prefix=".modus-install-", dir=parent))
    shutil.copy2(ASSET_ROOT / "preset.yml", stage / "preset.yml")
    shutil.copy2(ASSET_ROOT / "compatibility.json", stage / "compatibility.json")
    shutil.copytree(ASSET_ROOT / "plugins", stage / "plugins")
    shutil.copytree(ASSET_ROOT / "lib", stage / "lib")
    shutil.copytree(ASSET_ROOT / "profiles", stage / "profiles")
    (stage / "agent.cordis.yml").write_text(composition, encoding="utf-8")
    return stage


def install(
    *,
    dsh_home: Path,
    standard_preset: Path | None,
    force: bool,
    dry_run: bool,
    route_token_budget: tuple[int, int] | None = None,
) -> tuple[Path, Path | None, bool]:
    """Install the rendered preset and return destination, backup, and changed state."""
    standard = locate_standard(dsh_home, standard_preset)
    composition = render_composition(
        standard.read_text(encoding="utf-8"),
        route_token_budget,
    )
    destination = dsh_home.expanduser().resolve() / ".agent-presets" / "modus"
    if dry_run:
        return destination, None, True

    destination.parent.mkdir(parents=True, exist_ok=True)
    stage = stage_install(destination.parent, composition)
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
    """Build the installer CLI."""
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--dsh-home", type=Path, default=default_dsh_home())
    result.add_argument("--standard-preset", type=Path)
    result.add_argument("--force", action="store_true")
    result.add_argument("--dry-run", action="store_true")
    result.add_argument("--max-new-tokens", type=int)
    result.add_argument("--max-cache-read-tokens", type=int)
    return result


def main(argv: list[str] | None = None) -> int:
    """Run the installer CLI."""
    options = parser().parse_args(argv)
    limits = (options.max_new_tokens, options.max_cache_read_tokens)
    if (limits[0] is None) != (limits[1] is None):
        print(
            "install-modus: --max-new-tokens and --max-cache-read-tokens must be supplied together",
            file=sys.stderr,
        )
        return 2
    if any(value is not None and value < 0 for value in limits):
        print("install-modus: token limits must be non-negative", file=sys.stderr)
        return 2
    route_token_budget = None if limits[0] is None else (limits[0], limits[1])
    try:
        destination, backup, changed = install(
            dsh_home=options.dsh_home,
            standard_preset=options.standard_preset,
            force=options.force,
            dry_run=options.dry_run,
            route_token_budget=route_token_budget,
        )
    except RuntimeError as error:
        print(f"install-modus: {error}", file=sys.stderr)
        return 2

    if options.dry_run:
        print(f"would install Modus preset at {destination}")
    elif changed:
        print(f"installed Modus preset at {destination}")
    else:
        print(f"Modus preset already up to date at {destination}")
    if backup is not None:
        print(f"previous preset preserved at {backup}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
