#!/usr/bin/env python3
"""Resolve and invoke the KerSor checkout configured for the DSH preset."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
from pathlib import Path
from typing import Any


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


def read_json_object(path: Path) -> dict[str, Any]:
    """Read an optional JSON object, returning an empty object on invalid input."""
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def selected_workflow(session_dir: Path, round_number: int) -> str | None:
    """Return the workflow committed for one round, if the selection exists."""
    selection = read_json_object(
        session_dir / f"round-{round_number}-selection.json"
    )
    selected = selection.get("selected_workflow")
    if isinstance(selected, dict):
        name = selected.get("name")
        if isinstance(name, str) and name.strip():
            return name.strip()
    legacy = selection.get("selected")
    return legacy.strip() if isinstance(legacy, str) and legacy.strip() else None


def round_decision(session_dir: Path, round_number: int) -> str | None:
    """Return the protocol decision line from a completed round summary."""
    path = session_dir / f"round-{round_number}-summary.md"
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return None
    for line in lines:
        value = line.strip()
        if value.startswith(("COMPLETE:", "CONTINUE:", "STALLED:")):
            return value
    return None


def numeric(value: object) -> float | None:
    """Normalize a finite JSON number while excluding booleans."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if number == number and abs(number) != float("inf") else None


def candidate_rounds(session_dir: Path) -> list[int]:
    """List rounds that have an Attempt directory or a completed summary."""
    rounds: set[int] = set()
    for path in session_dir.iterdir():
        match = re.fullmatch(r"run-(\d+)", path.name)
        if match and path.is_dir():
            rounds.add(int(match.group(1)))
            continue
        match = re.fullmatch(r"round-(\d+)-summary\.md", path.name)
        if match and path.is_file():
            rounds.add(int(match.group(1)))
    return sorted(rounds)


def load_session(root: Path, requested: Path) -> tuple[Path | None, Any, dict[str, Any] | None, list[str]]:
    """Find the newest readable KerSor session under a project or session path."""
    sys.path.insert(0, str(root))
    from kersor_core import SessionStore  # type: ignore[import-not-found]

    warnings: list[str] = []
    direct = SessionStore(requested)
    candidates: list[Path]
    if direct.storage_kind in {"v2", "legacy"}:
        candidates = [requested]
    else:
        sessions_root = requested if requested.name == ".kersor" else requested / ".kersor"
        try:
            candidates = sorted(
                (path for path in sessions_root.iterdir() if path.is_dir()),
                key=lambda path: path.stat().st_mtime,
                reverse=True,
            )
        except OSError:
            candidates = []

    for candidate in candidates:
        store = SessionStore(candidate)
        if store.storage_kind not in {"v2", "legacy"}:
            continue
        try:
            snapshot = dict(store.snapshot())
        except Exception as error:
            warnings.append(f"unreadable session {candidate.name}: {error}")
            continue
        return candidate.resolve(), store, snapshot, warnings
    return None, None, None, warnings


def status(root: Path, requested: Path) -> dict[str, Any]:
    """Build one read-only status snapshot from KerSor's canonical stores."""
    sys.path.insert(0, str(root))
    from kersor_core import AttemptResultError, AttemptResultStore  # type: ignore[import-not-found]

    project_path = requested.expanduser().resolve()
    session_dir, session_store, snapshot, warnings = load_session(
        root, project_path
    )
    if session_dir is None or snapshot is None:
        return {
            "found": False,
            "project_path": str(project_path),
            "session_dir": None,
            "storage_kind": None,
            "phase": None,
            "current_round": None,
            "max_workflows": None,
            "target_speedup": None,
            "target_met": None,
            "mode": None,
            "backend": None,
            "kernel_language": None,
            "kernel_path": None,
            "workflow": None,
            "fit_confidence": None,
            "best_speedup": None,
            "rounds": [],
            "warnings": warnings,
        }

    current_round = snapshot.get("current_round")
    round_number = current_round if isinstance(current_round, int) else 1
    fit = read_json_object(session_dir / f"round-{round_number}-fit.json")
    fit_confidence = fit.get("fit_confidence")
    if not isinstance(fit_confidence, str) or not fit_confidence.strip():
        fit_confidence = None

    rounds: list[dict[str, Any]] = []
    best_speedup: float | None = None
    for number in candidate_rounds(session_dir):
        run_dir = session_dir / f"run-{number}"
        speedup: float | None = None
        if run_dir.is_dir():
            attempt_store = AttemptResultStore(run_dir)
            if attempt_store.storage_kind != "missing":
                try:
                    attempt = attempt_store.snapshot(allow_legacy=True)
                    metric = attempt.get("metric_contract")
                    if isinstance(metric, dict):
                        speedup = numeric(metric.get("speedup"))
                except AttemptResultError as error:
                    warnings.append(f"unusable run-{number} Attempt Result: {error}")
        decision = round_decision(session_dir, number)
        workflow = selected_workflow(session_dir, number)
        if speedup is None and decision is None:
            continue
        if speedup is not None and (
            best_speedup is None or speedup > best_speedup
        ):
            best_speedup = speedup
        rounds.append(
            {
                "round": number,
                "workflow": workflow,
                "speedup": speedup,
                "decision": decision,
            }
        )

    target_speedup = numeric(snapshot.get("target_speedup"))
    target_met = (
        best_speedup >= target_speedup
        if best_speedup is not None and target_speedup is not None
        else None
    )

    def optional_string(name: str) -> str | None:
        value = snapshot.get(name)
        return value if isinstance(value, str) and value else None

    max_workflows = snapshot.get("max_workflows")
    return {
        "found": True,
        "project_path": str(project_path),
        "session_dir": str(session_dir),
        "storage_kind": session_store.storage_kind,
        "phase": optional_string("phase"),
        "current_round": round_number,
        "max_workflows": max_workflows if isinstance(max_workflows, int) else None,
        "target_speedup": target_speedup,
        "target_met": target_met,
        "mode": optional_string("mode"),
        "backend": optional_string("backend"),
        "kernel_language": optional_string("kernel_language"),
        "kernel_path": optional_string("kernel_path"),
        "workflow": selected_workflow(session_dir, round_number),
        "fit_confidence": fit_confidence,
        "best_speedup": best_speedup,
        "rounds": rounds,
        "warnings": warnings,
    }


def status_parser() -> argparse.ArgumentParser:
    """Build the parser for the structured status action."""
    result = argparse.ArgumentParser(prog="kersor_bridge.py status")
    result.add_argument("--path", type=Path, required=True)
    return result


def parser() -> argparse.ArgumentParser:
    """Build the bridge command parser."""
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("action", choices=("root", "doctor", "compose", "status"))
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
        if options.action == "status":
            status_options = status_parser().parse_args(options.args)
            print(json.dumps(status(root, status_options.path), ensure_ascii=False))
            return 0
        exec_compose(root, options.args)
    except RuntimeError as error:
        print(f"kersor-bridge: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
