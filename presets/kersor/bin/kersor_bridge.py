#!/usr/bin/env python3
"""Resolve and invoke the KerSor checkout configured for the DSH preset."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PRESET_ROOT = Path(__file__).resolve().parents[1]
ROOT_FILE = PRESET_ROOT / ".local" / "kersor-root"
MINIMUM_PYTHON = (3, 10)


def require_supported_python(
    version_info: tuple[int, ...] | None = None,
    executable: str | None = None,
) -> None:
    """Fail with an actionable diagnostic when the bridge Python is too old."""
    version = tuple(sys.version_info[:3]) if version_info is None else version_info
    if version >= MINIMUM_PYTHON:
        return
    rendered = ".".join(str(part) for part in version[:3])
    running = executable or sys.executable or "python3"
    configured = os.environ.get("KERSOR_PYTHON", "").strip()
    configured_note = (
        f" KERSOR_PYTHON is set to {configured!r}, but this bridge is running "
        f"under {running!r}."
        if configured
        else ""
    )
    raise RuntimeError(
        f"KerSor bridge requires Python {MINIMUM_PYTHON[0]}.{MINIMUM_PYTHON[1]}+; "
        f"{running!r} reports {rendered}.{configured_note} Set KERSOR_PYTHON to "
        "a Python 3.10+ executable and restart the DSH Host."
    )


def pin_selected_python() -> None:
    """Make the interpreter actually running the bridge authoritative downstream."""
    os.environ["KERSOR_PYTHON"] = sys.executable


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
    """Return the complete protocol decision paragraph from a round summary."""
    path = session_dir / f"round-{round_number}-summary.md"
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return None
    for index, line in enumerate(lines):
        value = line.strip()
        if value.startswith(("COMPLETE:", "CONTINUE:", "STALLED:")):
            paragraph = [value]
            for continuation in lines[index + 1 :]:
                part = continuation.strip()
                if not part or part.startswith("#"):
                    break
                paragraph.append(part)
            return " ".join(paragraph)
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
            "integration_pattern": None,
            "allow_workflow_authoring": None,
            "workflow_authoring_budget": None,
            "kernel_path": None,
            "started_at": None,
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

    kernel_path = optional_string("kernel_path")
    if kernel_path is not None:
        resolved_kernel = Path(kernel_path).expanduser()
        if resolved_kernel.is_absolute() and not resolved_kernel.exists():
            warnings.append(f"kernel path no longer exists: {kernel_path}")

    max_workflows = snapshot.get("max_workflows")
    allow_workflow_authoring = snapshot.get("allow_workflow_authoring")
    workflow_authoring_budget = snapshot.get("workflow_authoring_budget")
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
        "integration_pattern": optional_string("integration_pattern"),
        "allow_workflow_authoring": (
            allow_workflow_authoring
            if isinstance(allow_workflow_authoring, bool)
            else None
        ),
        "workflow_authoring_budget": (
            workflow_authoring_budget
            if isinstance(workflow_authoring_budget, int)
            and not isinstance(workflow_authoring_budget, bool)
            else None
        ),
        "kernel_path": kernel_path,
        "started_at": optional_string("started_at"),
        "workflow": selected_workflow(session_dir, round_number),
        "fit_confidence": fit_confidence,
        "best_speedup": best_speedup,
        "rounds": rounds,
        "warnings": warnings,
    }


def lifecycle(phase: object) -> str:
    """Project a KerSor phase onto the small lifecycle used by the viewer."""
    if phase == "complete" or phase == "single_run":
        return "completed"
    if phase == "stalled":
        return "stalled"
    if phase == "cancelled":
        return "cancelled"
    return "active"


def last_activity(session_dir: Path) -> tuple[float | None, str | None]:
    """Return the newest stable artifact mtime using KerSor TUI exclusions."""
    latest: float | None = None
    for current, directories, files in os.walk(session_dir):
        directories[:] = [name for name in directories if not name.startswith(".")]
        current_dir = Path(current)
        for name in files:
            if name == ".session-v2.lock" or ".pending" in name or name.endswith(".tmp"):
                continue
            try:
                stamp = (current_dir / name).stat().st_mtime
            except OSError:
                continue
            latest = stamp if latest is None else max(latest, stamp)
    if latest is None:
        return None, None
    rendered = datetime.fromtimestamp(latest, timezone.utc).isoformat().replace(
        "+00:00", "Z"
    )
    return latest, rendered


def session_health(
    value: dict[str, Any], activity_epoch: float | None, stale_after: int
) -> tuple[str, str]:
    """Mirror KerSor TUI/doctor advisory health without changing canonical phase."""
    phase = value.get("phase")
    if phase == "complete" or phase == "single_run":
        return "terminal-complete", "terminal"
    if phase == "stalled":
        return "terminal-stalled", "terminal"
    if phase == "cancelled":
        return "terminal-cancelled", "terminal"

    decided = [
        row
        for row in value.get("rounds", [])
        if isinstance(row, dict)
        and isinstance(row.get("round"), int)
        and isinstance(row.get("decision"), str)
    ]
    last = max(decided, key=lambda row: row["round"], default=None)
    current_round = value.get("current_round")
    if last is None:
        status = "pre-round-1"
    elif last["decision"].startswith("COMPLETE:"):
        status = "terminal-complete"
    elif last["decision"].startswith("STALLED:"):
        status = "terminal-stalled"
    elif (
        last["decision"].startswith("CONTINUE:")
        and isinstance(current_round, int)
        and current_round > last["round"]
    ):
        status = "resumable"
    else:
        status = "in-progress"

    if status.startswith("terminal-"):
        return status, "terminal"
    if activity_epoch is None:
        return status, "unknown"
    age = max(0.0, time.time() - activity_epoch)
    if age <= stale_after:
        return status, "active"
    return status, "needs_resume" if status == "resumable" else "stale"


def session_summary(value: dict[str, Any], stale_after: int) -> dict[str, Any]:
    """Return the bounded, path-light projection consumed by the DSH viewer."""
    session_dir = Path(str(value["session_dir"]))
    kernel_path = value.get("kernel_path")
    activity_epoch, last_activity_at = last_activity(session_dir)
    status, health = session_health(value, activity_epoch, stale_after)
    decided_rounds = [
        row
        for row in value.get("rounds", [])
        if isinstance(row, dict)
        and isinstance(row.get("round"), int)
        and isinstance(row.get("decision"), str)
    ]
    latest_decision = max(
        decided_rounds,
        key=lambda row: row["round"],
        default={},
    ).get("decision")
    warnings: list[str] = []
    for warning in value.get("warnings", []):
        if not isinstance(warning, str):
            continue
        if warning.startswith("kernel path no longer exists:"):
            projected = "kernel path no longer exists"
        elif "Attempt Result" in warning:
            projected = "Attempt Result is unusable"
        else:
            projected = "session status could not be read completely"
        if projected not in warnings:
            warnings.append(projected)
    workflow = value.get("workflow")
    selection_status = (
        "pending" if workflow is None else "stalled" if workflow == "STALLED" else "selected"
    )
    return {
        "session_id": session_dir.name,
        "session_dir": str(session_dir),
        "storage_kind": value.get("storage_kind"),
        "phase": value.get("phase"),
        "lifecycle": lifecycle(value.get("phase")),
        "status": status,
        "health": health,
        "started_at": value.get("started_at"),
        "last_activity_at": last_activity_at,
        "current_round": value.get("current_round"),
        "max_workflows": value.get("max_workflows"),
        "target_speedup": value.get("target_speedup"),
        "target_met": value.get("target_met"),
        "mode": value.get("mode"),
        "backend": value.get("backend"),
        "kernel_language": value.get("kernel_language"),
        "integration_pattern": value.get("integration_pattern"),
        "allow_workflow_authoring": value.get("allow_workflow_authoring"),
        "workflow_authoring_budget": value.get("workflow_authoring_budget"),
        "kernel_name": (
            Path(kernel_path).name
            if isinstance(kernel_path, str) and kernel_path
            else None
        ),
        "workflow": workflow if selection_status == "selected" else None,
        "selection_status": selection_status,
        "decision": latest_decision,
        "fit_confidence": value.get("fit_confidence"),
        "best_speedup": value.get("best_speedup"),
        "warnings": warnings,
    }


def sessions(
    root: Path,
    limit: int,
    stale_after: int,
    session_roots: list[Path],
    workspaces: list[Path],
    include_checkout: bool,
) -> dict[str, Any]:
    """List recent readable sessions from checkout, configured, and workspace roots."""
    roots = [root / ".kersor"] if include_checkout else []
    roots.extend(path.expanduser().resolve() for path in session_roots)
    roots.extend(path.expanduser().resolve() / ".kersor" for path in workspaces)

    candidates: list[Path] = []
    warnings: list[str] = []
    seen_roots: set[Path] = set()
    seen_sessions: set[Path] = set()
    for sessions_root in roots:
        resolved_root = sessions_root.resolve()
        if resolved_root in seen_roots:
            continue
        seen_roots.add(resolved_root)
        if (resolved_root / "session-config.json").is_file() or (
            resolved_root / "state.md"
        ).is_file():
            children = [resolved_root]
        else:
            try:
                children = [path for path in resolved_root.iterdir() if path.is_dir()]
            except FileNotFoundError:
                continue
            except OSError as error:
                warnings.append(
                    f"KerSor session root unavailable ({type(error).__name__})"
                )
                continue
        for candidate in children:
            resolved = candidate.resolve()
            if resolved in seen_sessions:
                continue
            seen_sessions.add(resolved)
            candidates.append(resolved)

    candidates.sort(key=lambda path: path.name, reverse=True)

    result: list[dict[str, Any]] = []
    for candidate in candidates:
        if len(result) >= limit:
            break
        try:
            value = status(root, candidate)
        except Exception as error:
            warnings.append(
                f"unreadable session {candidate.name} ({type(error).__name__})"
            )
            continue
        if not value["found"]:
            continue
        result.append(session_summary(value, stale_after))
    return {"sessions": result, "warnings": warnings}


DETAIL_FILES = ("workflow.js", "metadata.json", "rationale.md")
MAX_WORKFLOW_BYTES = 512 * 1024
MAX_RATIONALE_BYTES = 128 * 1024


def file_sha256(path: Path) -> str:
    """Return the Proposal-compatible digest of one artifact."""
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def string_list(value: object) -> list[str]:
    """Keep only a JSON array whose entries are strings."""
    return [item for item in value if isinstance(item, str)] if isinstance(value, list) else []


def bounded_text(path: Path, maximum: int) -> str | None:
    """Read one UTF-8 artifact only when its complete byte content is bounded."""
    try:
        payload = path.read_bytes()
        return payload.decode("utf-8") if len(payload) <= maximum else None
    except (OSError, UnicodeDecodeError):
        return None


def sealed_staging(session_dir: Path) -> tuple[Path | None, str | None]:
    """Return verified author bytes, withholding content before or after a bad seal."""
    authoring = session_dir / "workflow-authoring"
    staging = authoring / "staging"
    handoff = read_json_object(authoring / "author-handoff.json")
    if not handoff:
        return None, None
    if handoff.get("schema_version") != 1:
        return None, "invalid"
    try:
        sealed_path = Path(str(handoff.get("staging", ""))).expanduser().resolve()
    except OSError:
        return None, "invalid"
    if sealed_path != staging.resolve():
        return None, "invalid"
    files = handoff.get("files")
    if not isinstance(files, dict) or set(files) != set(DETAIL_FILES):
        return None, "invalid"
    try:
        entries = {path.name for path in staging.iterdir() if path.is_file()}
    except OSError:
        return None, "invalid"
    if entries != set(DETAIL_FILES):
        return None, "invalid"
    for name in DETAIL_FILES:
        expected = files.get(name)
        try:
            actual = file_sha256(staging / name)
        except OSError:
            return None, "invalid"
        if expected != actual:
            return None, "hash_mismatch"
    return staging, None


def saved_proposal(session_dir: Path, workflow: str | None) -> Path | None:
    """Find the current Session-local Proposal without consulting checkout state."""
    store = session_dir / "workflow-authoring" / "proposals"
    if workflow and workflow != "STALLED":
        candidate = store / workflow
        if all((candidate / name).is_file() for name in DETAIL_FILES):
            return candidate
    try:
        candidates = [
            path for path in store.iterdir()
            if path.is_dir() and all((path / name).is_file() for name in DETAIL_FILES)
        ]
    except OSError:
        return None
    return candidates[0] if len(candidates) == 1 else None


def artifact_rows(directory: Path) -> list[dict[str, Any]]:
    """Project hashes and sizes for the exact Workflow design files."""
    rows: list[dict[str, Any]] = []
    for name in DETAIL_FILES:
        path = directory / name
        rows.append({"name": name, "sha256": file_sha256(path), "bytes": path.stat().st_size})
    return rows


def workflow_design(directory: Path) -> tuple[dict[str, Any] | None, str | None]:
    """Project bounded sealed source, rationale, and routing metadata."""
    source = bounded_text(directory / "workflow.js", MAX_WORKFLOW_BYTES)
    rationale = bounded_text(directory / "rationale.md", MAX_RATIONALE_BYTES)
    if source is None or rationale is None:
        return None, "too_large"
    metadata = read_json_object(directory / "metadata.json")
    if not metadata:
        return None, "invalid"
    return {
        "name": metadata.get("name") if isinstance(metadata.get("name"), str) else None,
        "technique": metadata.get("technique") if isinstance(metadata.get("technique"), str) else None,
        "methodCategory": metadata.get("method_category") if isinstance(metadata.get("method_category"), str) else None,
        "topology": metadata.get("topology") if isinstance(metadata.get("topology"), str) else None,
        "requiredArgs": string_list(metadata.get("required_args")),
        "languages": string_list(metadata.get("languages")),
        "backends": string_list(metadata.get("backends")),
        "integrationPatterns": string_list(metadata.get("integration_patterns")),
        "rationale": rationale,
        "source": source,
    }, None


def validation_detail(proposal: Path | None, rejected: bool) -> dict[str, Any]:
    """Project the deterministic save report without forwarding arbitrary values."""
    if proposal is None:
        return {"status": "failed" if rejected else "pending", "checks": []}
    validation = read_json_object(proposal / "validation.json")
    checks = validation.get("checks")
    projected = []
    if isinstance(checks, dict):
        for name, value in sorted(checks.items()):
            if isinstance(name, str):
                projected.append({"name": name, "passed": value is True or value == "passed"})
    passed = validation.get("passed") is True and all(row["passed"] for row in projected)
    return {"status": "passed" if passed else "failed", "checks": projected}


def dispatch_detail(session_dir: Path, round_number: int) -> dict[str, Any]:
    """Project dispatch preparation and Workflow Host terminal state."""
    run_dir = session_dir / f"run-{round_number}"
    runtime = read_json_object(run_dir / ".runtime" / "summary.json")
    runtime_status = runtime.get("status") or runtime.get("workflow_status")
    runtime_status = runtime_status if isinstance(runtime_status, str) else None
    if runtime_status in {"error", "failed"}:
        status = "failed"
    elif runtime_status in {"completed", "complete"}:
        status = "completed"
    elif (run_dir / ".dispatch-in-progress").exists() or (run_dir / ".runtime" / "events.jsonl").exists():
        status = "running"
    elif (run_dir / "dispatch-args.json").exists():
        status = "preparing"
    else:
        status = "pending"
    result: dict[str, Any] = {"status": status}
    if run_dir.is_dir():
        result["runDir"] = str(run_dir.resolve())
    if runtime_status is not None:
        result["runtimeStatus"] = runtime_status
    return result


def step_statuses(
    session_dir: Path,
    round_number: int,
    selection_status: str,
    authoring_status: str,
    validation_status: str,
    dispatch: dict[str, Any],
) -> list[dict[str, str]]:
    """Derive the inspector timeline from committed Session artifacts."""
    def present(name: str) -> str:
        return "completed" if (session_dir / name).exists() else "pending"

    author_step = {
        "not_started": "pending", "in_progress": "active", "sealed": "completed",
        "saved": "completed", "rejected": "failed",
    }[authoring_status]
    validation_step = {
        "pending": "pending", "passed": "completed", "failed": "failed",
    }[validation_status]
    dispatch_step = {
        "pending": "pending", "preparing": "active", "running": "active",
        "completed": "completed", "failed": "failed",
    }[str(dispatch["status"])]
    measurement = "completed" if (session_dir / f"run-{round_number}" / "attempt-result.json").exists() else (
        "failed" if dispatch["status"] == "failed" else "pending"
    )
    return [
        {"id": "setup", "status": present("session-config.json")},
        {"id": "baseline", "status": present("test-method.md")},
        {"id": "profile", "status": present("kernel-profile.md")},
        {"id": "selection", "status": "pending" if selection_status == "pending" else "completed"},
        {"id": "authoring", "status": author_step},
        {"id": "validation", "status": validation_step},
        {"id": "dispatch", "status": dispatch_step},
        {"id": "measurement", "status": measurement},
        {"id": "decision", "status": "completed" if round_decision(session_dir, round_number) else "pending"},
    ]


def session_detail(session: Path) -> dict[str, Any]:
    """Return on-demand, seal-aware Workflow design and execution progress."""
    session_dir = session.expanduser().resolve()
    if not session_dir.is_dir() or not (
        (session_dir / "session-config.json").is_file() or (session_dir / "state.md").is_file()
    ):
        raise RuntimeError("requested Session is not a readable KerSor Session")
    state = read_json_object(session_dir / "state.json")
    round_value = state.get("current_round")
    round_number = round_value if isinstance(round_value, int) and round_value > 0 else 1
    selection = read_json_object(session_dir / f"round-{round_number}-selection.json")
    selected = selected_workflow(session_dir, round_number)
    selection_status = "pending" if selected is None else "stalled" if selected == "STALLED" else "selected"
    selected_row = selection.get("selected_workflow")
    reason: str | None = None
    if isinstance(selected_row, dict):
        features = selected_row.get("features")
        if isinstance(features, list):
            reason = next((item for item in features if isinstance(item, str) and item), None)
    rejected_rows = selection.get("rejected")
    rejected_count = len(rejected_rows) if isinstance(rejected_rows, list) else 0

    proposal = saved_proposal(session_dir, selected)
    sealed, seal_error = sealed_staging(session_dir)
    phase = state.get("phase")
    author_context = (session_dir / "workflow-authoring" / "author-context.json").is_file()
    if proposal is not None:
        authoring_status = "saved"
        design_root = proposal
    elif seal_error is not None:
        authoring_status = "rejected"
        design_root = None
    elif sealed is not None:
        authoring_status = "rejected" if phase == "stalled" else "sealed"
        design_root = sealed
    elif author_context:
        authoring_status = "in_progress"
        design_root = None
    else:
        authoring_status = "not_started"
        design_root = None

    files: list[dict[str, Any]] = []
    design: dict[str, Any] | None = None
    omitted = seal_error
    if design_root is not None:
        try:
            files = artifact_rows(design_root)
            design, design_error = workflow_design(design_root)
            omitted = omitted or design_error
        except OSError:
            omitted = "invalid"
    authoring: dict[str, Any] = {"status": authoring_status, "files": files}
    if design is not None:
        authoring["design"] = design
    if omitted is not None:
        authoring["omittedReason"] = omitted
    validation = validation_detail(proposal, authoring_status == "rejected")
    dispatch = dispatch_detail(session_dir, round_number)
    return {
        "session_id": session_dir.name,
        "session_dir": str(session_dir),
        "current_round": round_number,
        "steps": step_statuses(
            session_dir, round_number, selection_status, authoring_status,
            str(validation["status"]), dispatch,
        ),
        "selection": {
            "status": selection_status,
            **({"workflow": selected} if selection_status == "selected" and selected else {}),
            **({"reason": reason} if reason else {}),
            "rejectedCount": rejected_count,
        },
        "authoring": authoring,
        "validation": validation,
        "dispatch": dispatch,
    }


def status_parser() -> argparse.ArgumentParser:
    """Build the parser for the structured status action."""
    result = argparse.ArgumentParser(prog="kersor_bridge.py status")
    result.add_argument("--path", type=Path, required=True)
    return result


def sessions_parser() -> argparse.ArgumentParser:
    """Build the parser for the recent-session inventory action."""
    result = argparse.ArgumentParser(prog="kersor_bridge.py sessions")
    result.add_argument("--limit", type=int, choices=range(1, 101), default=20)
    result.add_argument("--stale-after", type=int, choices=range(1, 86401), default=1800)
    result.add_argument(
        "--root",
        dest="session_roots",
        action="append",
        type=Path,
        default=[],
        help="additional directory containing KerSor Session directories",
    )
    result.add_argument(
        "--workspace",
        action="append",
        type=Path,
        default=[],
        help="DSH workspace whose .kersor directory should be inventoried",
    )
    result.add_argument(
        "--no-checkout-root",
        dest="include_checkout",
        action="store_false",
        help="exclude the configured KerSor checkout's .kersor directory",
    )
    return result


def session_detail_parser() -> argparse.ArgumentParser:
    """Build the parser for one sealed Session inspector projection."""
    result = argparse.ArgumentParser(prog="kersor_bridge.py session-detail")
    result.add_argument("--session", type=Path, required=True)
    return result


def parser() -> argparse.ArgumentParser:
    """Build the bridge command parser."""
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument(
        "action", choices=("root", "doctor", "compose", "status", "sessions", "session-detail")
    )
    result.add_argument("args", nargs=argparse.REMAINDER)
    return result


def main(argv: list[str] | None = None) -> int:
    """Resolve the checkout and dispatch a supported bridge action."""
    try:
        require_supported_python()
        pin_selected_python()
        options = parser().parse_args(argv)
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
        if options.action == "sessions":
            sessions_options = sessions_parser().parse_args(options.args)
            print(
                json.dumps(
                    sessions(
                        root,
                        sessions_options.limit,
                        sessions_options.stale_after,
                        sessions_options.session_roots,
                        sessions_options.workspace,
                        sessions_options.include_checkout,
                    ),
                    ensure_ascii=False,
                )
            )
            return 0
        if options.action == "session-detail":
            detail_options = session_detail_parser().parse_args(options.args)
            print(json.dumps(session_detail(detail_options.session), ensure_ascii=False))
            return 0
        exec_compose(root, options.args)
    except RuntimeError as error:
        print(f"kersor-bridge: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
