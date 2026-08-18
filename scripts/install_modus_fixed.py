#!/usr/bin/env python3
"""Render and install matched neutral/p000/p100 DSH fixed Worker presets."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
import tempfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from install_common import default_dsh_home, directory_equal, locate_standard, unique_backup
from install_modus import ASSET_ROOT, PERSONA_BLOCK, STANDARD_PERSONA, indent_block


PROFILE_IDS = ("neutral", "p000", "p100")
QUALIFIED_PROFILE_IDS = ("p000", "p100")
FIXED_PLUGIN = "./plugins/modus-fixed-worker.mjs"


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def load_profiles() -> dict[str, dict[str, str]]:
    manifest = json.loads((ASSET_ROOT / "profiles" / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("schema") != "dsh-modus-profile-catalog-v1":
        raise RuntimeError("unsupported Modus profile manifest")
    result = {"neutral": {"text": "", "sha256": sha256_text("")}}
    records = manifest.get("profiles")
    if not isinstance(records, dict) or set(records) != set(QUALIFIED_PROFILE_IDS):
        raise RuntimeError("profile manifest must contain exactly p000 and p100")
    for profile in QUALIFIED_PROFILE_IDS:
        record = records[profile]
        if not isinstance(record, dict) or set(record) != {"path", "sha256"}:
            raise RuntimeError(f"profile manifest record is invalid: {profile}")
        if record["path"] != f"{profile}.md":
            raise RuntimeError(f"profile path mismatch: {profile}")
        text = (ASSET_ROOT / "profiles" / record["path"]).read_text(encoding="utf-8")
        digest = sha256_text(text)
        if digest != record["sha256"]:
            raise RuntimeError(f"profile digest mismatch: {profile}")
        result[profile] = {"text": text, "sha256": digest}
    return result


def plugin_row(
    profile: str,
    digest: str,
    token_budget: tuple[int, int] | None,
) -> str:
    preset_id = f"modus-fixed-{profile}"
    lines = [
        "- id: modus-fixed-worker",
        f"  name: '{FIXED_PLUGIN}'",
        "  config:",
        f"    presetId: {preset_id}",
        f"    profile: {profile}",
        f"    profileDigest: {digest}",
    ]
    if profile in QUALIFIED_PROFILE_IDS:
        lines.append("    maxPreEditInformationAttempts: 3")
    if token_budget is not None:
        max_new_tokens, max_cache_read_tokens = token_budget
        if max_new_tokens < 0 or max_cache_read_tokens < 0:
            raise ValueError("fixed Worker token limits must be non-negative")
        lines.extend(
            [
                "    tokenBudget:",
                f"      maxNewTokens: {max_new_tokens}",
                f"      maxCacheReadTokens: {max_cache_read_tokens}",
            ]
        )
    return "\n".join(lines)


def render_fixed_composition(
    standard_source: str,
    profile: str,
    profiles: dict[str, dict[str, str]] | None = None,
    token_budget: tuple[int, int] | None = None,
) -> str:
    catalog = load_profiles() if profiles is None else profiles
    if profile not in PROFILE_IDS or profile not in catalog:
        raise ValueError(f"unsupported fixed Worker profile: {profile}")
    if standard_source.count(PERSONA_BLOCK) != 1:
        raise RuntimeError(
            "standard preset persona anchor changed; inspect the current DSH preset before updating fixed Workers"
        )
    lines = standard_source.splitlines()
    if not lines:
        raise RuntimeError("standard preset is empty")
    lines[0] = f"# The `modus-fixed-{profile}` preset: matched direct Modus Worker action."
    rendered = "\n".join(lines)
    if profile != "neutral":
        persona = f"{STANDARD_PERSONA}\n\n{catalog[profile]['text'].rstrip()}"
        rendered = rendered.replace(
            PERSONA_BLOCK,
            "    text: |-\n" + indent_block(persona, 6),
            1,
        )
    return (
        f"{rendered.rstrip()}\n\n"
        f"{plugin_row(profile, catalog[profile]['sha256'], token_budget)}\n"
    )


def stage_fixed(parent: Path, profile: str, composition: str) -> Path:
    stage = Path(tempfile.mkdtemp(prefix=f".modus-fixed-{profile}-", dir=parent))
    (stage / "preset.yml").write_text(
        f"name: Modus Fixed {profile}\n"
        f"description: Direct fixed-action Modus Worker ({profile}); no Router model call.\n",
        encoding="utf-8",
    )
    shutil.copy2(ASSET_ROOT / "compatibility.json", stage / "compatibility.json")
    shutil.copytree(ASSET_ROOT / "plugins", stage / "plugins")
    shutil.copytree(ASSET_ROOT / "lib", stage / "lib")
    shutil.copytree(ASSET_ROOT / "profiles", stage / "profiles")
    (stage / "agent.cordis.yml").write_text(composition, encoding="utf-8")
    return stage


def install_one(
    *,
    dsh_home: Path,
    profile: str,
    composition: str,
    force: bool,
    dry_run: bool,
) -> tuple[Path, Path | None, bool]:
    destination = dsh_home.expanduser().resolve() / ".agent-presets" / f"modus-fixed-{profile}"
    if dry_run:
        return destination, None, True
    destination.parent.mkdir(parents=True, exist_ok=True)
    stage = stage_fixed(destination.parent, profile, composition)
    backup: Path | None = None
    try:
        if destination.exists() and directory_equal(stage, destination):
            shutil.rmtree(stage)
            return destination, None, False
        if destination.exists() and not force:
            raise RuntimeError(f"destination exists and differs: {destination}; rerun with --force")
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


def install_all(
    *,
    dsh_home: Path,
    standard_preset: Path | None,
    force: bool,
    dry_run: bool,
    token_budget: tuple[int, int] | None = None,
) -> list[tuple[str, Path, Path | None, bool]]:
    standard = locate_standard(dsh_home, standard_preset)
    source = standard.read_text(encoding="utf-8")
    profiles = load_profiles()
    compositions = {
        profile: render_fixed_composition(source, profile, profiles, token_budget)
        for profile in PROFILE_IDS
    }
    return [
        (
            profile,
            *install_one(
                dsh_home=dsh_home,
                profile=profile,
                composition=compositions[profile],
                force=force,
                dry_run=dry_run,
            ),
        )
        for profile in PROFILE_IDS
    ]


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--dsh-home", type=Path, default=default_dsh_home())
    result.add_argument("--standard-preset", type=Path)
    result.add_argument("--force", action="store_true")
    result.add_argument("--dry-run", action="store_true")
    result.add_argument("--max-new-tokens", type=int)
    result.add_argument("--max-cache-read-tokens", type=int)
    return result


def main(argv: list[str] | None = None) -> int:
    options = parser().parse_args(argv)
    paired = (options.max_new_tokens is None) == (options.max_cache_read_tokens is None)
    if not paired:
        parser().error("--max-new-tokens and --max-cache-read-tokens must be provided together")
    token_budget = None if options.max_new_tokens is None else (
        options.max_new_tokens,
        options.max_cache_read_tokens,
    )
    for profile, destination, backup, changed in install_all(
        dsh_home=options.dsh_home,
        standard_preset=options.standard_preset,
        force=options.force,
        dry_run=options.dry_run,
        token_budget=token_budget,
    ):
        state = "would install" if options.dry_run else ("installed" if changed else "unchanged")
        print(f"{profile}: {state} {destination}")
        if backup is not None:
            print(f"{profile}: backup {backup}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
