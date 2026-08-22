#!/usr/bin/env python3
"""Resolve and invoke the KerSor checkout configured for the DSH preset."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PRESET_ROOT = Path(__file__).resolve().parents[1]
ROOT_FILE = PRESET_ROOT / ".local" / "kersor-root"
MINIMUM_PYTHON = (3, 10)
TERMINAL_PHASES = frozenset({"complete", "stalled", "cancelled", "single_run"})
UNATTRIBUTABLE_SESSION_IDS = frozenset({"none", "null", "unknown"})
NUMBER_TOKEN = r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?"
CYCLES_PATTERN = re.compile(rf"\bCYCLES\s*:\s*({NUMBER_TOKEN})\b")
OVERALL_SPEEDUP_PATTERN = re.compile(
    rf"\bSpeedup\s+over\s+baseline\s*:\s*({NUMBER_TOKEN})\b",
    re.IGNORECASE,
)


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


def positive_numeric(value: object) -> float | None:
    """Normalize one finite positive measurement."""
    number = numeric(value)
    return number if number is not None and number > 0 else None


def verified_host_metric(run_dir: Path) -> tuple[dict[str, Any], dict[str, Any] | None]:
    """Return the Host record and its metric only for a complete PASS review."""
    host = read_json_object(run_dir / "host-verification.json")
    correctness = host.get("correctness")
    benchmark = host.get("benchmark")
    metric = host.get("metric")
    verified = (
        host.get("schema_version") == 1
        and host.get("verdict") == "pass"
        and isinstance(correctness, dict)
        and correctness.get("exit_code") == 0
        and isinstance(benchmark, dict)
        and benchmark.get("exit_code") == 0
        and isinstance(metric, dict)
        and (
            positive_numeric(metric.get("speedup")) is not None
            or positive_numeric(metric.get("candidate_speedup")) is not None
        )
    )
    return host, metric if verified else None


def verified_measured_speedup(
    run_dir: Path, attempt: dict[str, Any]
) -> float | None:
    """Return only a correct, valid speedup measured by the Host reviewer.

    Workflow output and legacy analysis may contain optimistic estimates.  The
    bridge therefore fails closed unless the canonical Attempt Result confirms
    compilation, correctness, and metric validity, while the Host record
    independently proves both gates passed and owns the returned measurement.
    """
    outcome = attempt.get("outcome")
    metric = attempt.get("metric_contract")
    _, host_metric = verified_host_metric(run_dir)
    if (
        not isinstance(outcome, dict)
        or outcome.get("compiled") is not True
        or outcome.get("correct") is not True
        or not isinstance(metric, dict)
        or metric.get("valid") is not True
        or positive_numeric(metric.get("speedup")) is None
        or host_metric is None
    ):
        return None
    return positive_numeric(host_metric.get("speedup")) or positive_numeric(
        host_metric.get("candidate_speedup")
    )


def bounded_reason(value: object, limit: int = 240) -> str | None:
    """Normalize one bounded single-line diagnostic for browser projection."""
    if not isinstance(value, str):
        return None
    reason = " ".join(value.split())
    return reason[:limit] if reason else None


def baseline_projection(
    root: Path, session_dir: Path, round_number: int
) -> tuple[str, str | None, str | None]:
    """Project the canonical baseline verifier plus its next artifact boundary."""
    config = read_json_object(session_dir / "session-config.json")
    extensions = config.get("extensions")
    required = (
        isinstance(extensions, dict)
        and extensions.get("baseline_witness_required") is True
    )
    if not required:
        return "not_required", None, None
    failure = read_json_object(
        session_dir / f"run-{round_number}" / "baseline-gate.json"
    )
    if failure.get("verdict") == "fail":
        return "fail", "new_session", bounded_reason(failure.get("reason"))
    if not (session_dir / "baseline-witness.json").is_file():
        action = "record_verify" if (session_dir / "test-method.md").is_file() else "init"
        return "pending", action, None
    verifier = root / "scripts" / "baseline-witness.py"
    if not verifier.is_file():
        return "fail", "new_session", "baseline verifier is unavailable"
    try:
        completed = subprocess.run(
            [sys.executable, str(verifier), "verify", "--session", str(session_dir)],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return "fail", "new_session", "baseline verification could not complete"
    if completed.returncode == 0:
        return "pass", None, None
    reason = bounded_reason(completed.stderr) or "baseline witness verification failed"
    return "fail", "new_session", reason


def profile_projection(
    root: Path, session_dir: Path, round_number: int
) -> tuple[str, str | None, str | None]:
    """Project Phase 2 through KerSor's verifier and attributable producer seal."""
    failure = read_json_object(
        session_dir / f"run-{round_number}" / "profile-gate.json"
    )
    if failure.get("verdict") == "fail":
        return (
            "fail",
            bounded_reason(failure.get("reason")),
            bounded_reason(failure.get("created_by"), limit=80),
        )
    profile = session_dir / "kernel-profile.md"
    try:
        if not profile.is_file() or not profile.read_text(encoding="utf-8").strip():
            return "pending", None, None
    except OSError:
        return "fail", "kernel profile could not be read", None

    config = read_json_object(session_dir / "session-config.json")
    extensions = config.get("extensions")
    fresh_required = (
        isinstance(extensions, dict)
        and extensions.get("fresh_session_required") is True
    )

    producer_id: str | None = None
    if fresh_required and not (
        isinstance(config.get("prepared_spec"), str)
        and config["prepared_spec"].strip()
    ):
        handoff = read_json_object(session_dir / "profile-handoff" / "seal.json")
        if not handoff:
            return "fail", "profile handoff seal not found for fresh Session", None
        producer = handoff.get("producer")
        raw_producer_id = (
            producer.get("session_id") if isinstance(producer, dict) else None
        )
        if not isinstance(raw_producer_id, str):
            return "fail", "profile handoff producer provenance is invalid", None
        producer_id = raw_producer_id.strip()
        if (
            not producer_id
            or any(char.isspace() for char in producer_id)
            or producer_id.casefold() in UNATTRIBUTABLE_SESSION_IDS
        ):
            return "fail", "profile handoff producer provenance is invalid", None

    verifier = root / "scripts" / "profile-handoff.py"
    if not verifier.is_file():
        return "fail", "profile handoff verifier is unavailable", None
    try:
        completed = subprocess.run(
            [
                sys.executable,
                str(verifier),
                "verify",
                "--session",
                str(session_dir),
            ],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return "fail", "profile handoff verification could not complete", None
    if completed.returncode != 0:
        detail = bounded_reason(completed.stderr) or "profile handoff verification failed"
        if "profile handoff seal not found" in detail:
            detail = "profile handoff seal not found for fresh Session"
        return "fail", detail, None
    if not fresh_required:
        return "pass", None, "legacy-session"
    if isinstance(config.get("prepared_spec"), str) and config["prepared_spec"].strip():
        return "pass", None, "prepared-spec"
    return "pass", None, f"kernel-profiler · {producer_id}"


def dsh_compatibility_gate(session_dir: Path, round_number: int) -> str:
    """Read the DSH adapter's canonical per-round compatibility report."""
    report = read_json_object(
        session_dir / f"run-{round_number}" / "dsh-compatibility.json"
    )
    verdict = report.get("verdict")
    return verdict if verdict in {"pass", "fail"} else "pending"


def candidate_ownership_gate(session_dir: Path, round_number: int) -> str:
    """Project the host-owned candidate boundary report for this round."""
    report_path = session_dir / f"run-{round_number}" / "candidate-ownership.json"
    if report_path.is_file():
        verdict = read_json_object(report_path).get("verdict")
        return verdict if verdict in {"pass", "fail"} else "fail"
    config = read_json_object(session_dir / "session-config.json")
    extensions = config.get("extensions")
    required = (
        isinstance(extensions, dict)
        and extensions.get("candidate_ownership_required") is True
    )
    return "pending" if required else "not_required"


def fresh_session_gate(session_dir: Path, round_number: int) -> str | None:
    """Project strict Session-history isolation and any runtime violation."""
    report_path = session_dir / f"run-{round_number}" / "fresh-session-boundary.json"
    if report_path.is_file():
        verdict = read_json_object(report_path).get("verdict")
        return verdict if verdict in {"pass", "fail"} else "fail"
    config = read_json_object(session_dir / "session-config.json")
    extensions = config.get("extensions")
    required = (
        isinstance(extensions, dict)
        and extensions.get("fresh_session_required") is True
    )
    return "pass" if required else None


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
            "baseline_witness": None,
            "baseline_next_action": None,
            "baseline_reason": None,
            "profile_evidence": None,
            "profile_reason": None,
            "profile_owner": None,
            "dsh_compatibility": None,
            "candidate_ownership": None,
            "fresh_session": None,
            "best_speedup": None,
            "steps": [],
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
                    speedup = verified_measured_speedup(run_dir, attempt)
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
    fresh_session = fresh_session_gate(session_dir, round_number)
    baseline_witness, baseline_next_action, baseline_reason = baseline_projection(
        root, session_dir, round_number
    )
    profile_evidence, profile_reason, profile_owner = profile_projection(
        root, session_dir, round_number
    )
    terminal = snapshot.get("phase") in TERMINAL_PHASES
    if fresh_session == "fail" or terminal:
        baseline_next_action = None
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
        "baseline_witness": baseline_witness,
        "baseline_next_action": baseline_next_action,
        "baseline_reason": baseline_reason,
        "profile_evidence": profile_evidence,
        "profile_reason": profile_reason,
        "profile_owner": profile_owner,
        "dsh_compatibility": dsh_compatibility_gate(session_dir, round_number),
        "candidate_ownership": candidate_ownership_gate(session_dir, round_number),
        "fresh_session": fresh_session,
        "best_speedup": best_speedup,
        "steps": session_detail(
            root,
            session_dir,
            phase=snapshot.get("phase"),
            profile_status=profile_evidence,
        )["steps"],
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


def last_reported_number(value: object, pattern: re.Pattern[str]) -> float | None:
    """Read the last finite positive number matching one bounded stdout pattern."""
    if not isinstance(value, str):
        return None
    matches = pattern.findall(value)
    if not matches:
        return None
    try:
        return positive_numeric(float(matches[-1]))
    except ValueError:
        return None


def baseline_cycle_seed(session_dir: Path) -> tuple[float | None, float | None]:
    """Read Session and task baseline cycles from the verified witness output."""
    witness = read_json_object(session_dir / "baseline-witness.json")
    if witness.get("schema_version") != 1 or witness.get("verdict") != "pass":
        return None, None
    executions = witness.get("executions")
    if not isinstance(executions, list):
        return None, None
    session_cycles: float | None = None
    reported_overall: float | None = None
    for execution in executions:
        if not isinstance(execution, dict) or execution.get("kind") != "benchmark":
            continue
        stdout = execution.get("stdout")
        cycles = last_reported_number(stdout, CYCLES_PATTERN)
        if cycles is not None:
            session_cycles = cycles
            reported_overall = last_reported_number(stdout, OVERALL_SPEEDUP_PATTERN)
    task_cycles = (
        session_cycles * reported_overall
        if session_cycles is not None and reported_overall is not None
        else None
    )
    return session_cycles, task_cycles


def cycle_lineage(
    session_dir: Path, *, baseline_verified: bool
) -> dict[str, float] | None:
    """Build a truth-grounded baseline-to-incumbent cycle lineage."""
    if not baseline_verified:
        return None
    session_baseline, task_baseline = baseline_cycle_seed(session_dir)
    if session_baseline is None:
        return None
    best_cycles = session_baseline
    for number in candidate_rounds(session_dir):
        _, metric = verified_host_metric(session_dir / f"run-{number}")
        if metric is None:
            continue
        candidate_cycles = positive_numeric(metric.get("candidate_cycles"))
        if candidate_cycles is not None:
            best_cycles = min(best_cycles, candidate_cycles)
    lineage = {
        "session_baseline_cycles": session_baseline,
        "best_cycles": best_cycles,
        "session_speedup": session_baseline / best_cycles,
    }
    if task_baseline is not None:
        lineage["task_baseline_cycles"] = task_baseline
        lineage["overall_speedup"] = task_baseline / best_cycles
    return lineage


def workflow_authoring_used(session_dir: Path) -> int:
    """Count attributable workflow-author attempts in the current Session."""
    attempts = session_dir / "workflow-authoring" / "attempts"
    try:
        return sum(
            1
            for path in attempts.iterdir()
            if path.is_dir()
            and re.fullmatch(r"round-[1-9]\d*", path.name)
            and (path / "author-context.json").is_file()
        )
    except OSError:
        return 0


def terminal_stop_reason(
    value: dict[str, Any], *, authoring_used: int
) -> str | None:
    """Classify the canonical terminal cause without conflating candidate failure."""
    phase = value.get("phase")
    if phase not in TERMINAL_PHASES:
        return None
    if value.get("target_met") is True:
        return "target_met"
    if phase == "cancelled":
        return "cancelled"
    current_round = value.get("current_round")
    max_workflows = value.get("max_workflows")
    if (
        isinstance(current_round, int)
        and not isinstance(current_round, bool)
        and isinstance(max_workflows, int)
        and not isinstance(max_workflows, bool)
        and max_workflows > 0
        and current_round >= max_workflows
    ):
        return "execution_budget_exhausted"
    if phase == "stalled":
        budget = value.get("workflow_authoring_budget")
        if (
            value.get("allow_workflow_authoring") is True
            and isinstance(budget, int)
            and not isinstance(budget, bool)
            and budget > 0
            and authoring_used >= budget
        ):
            return "authoring_budget_exhausted"
        return "selection_stalled"
    if phase == "single_run":
        return "single_run_complete"
    return None


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
    authoring_used = workflow_authoring_used(session_dir)
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
        "baseline_witness": value.get("baseline_witness"),
        "baseline_next_action": value.get("baseline_next_action"),
        "baseline_reason": value.get("baseline_reason"),
        "profile_evidence": value.get("profile_evidence"),
        "profile_reason": value.get("profile_reason"),
        "profile_owner": value.get("profile_owner"),
        "dsh_compatibility": value.get("dsh_compatibility"),
        "candidate_ownership": value.get("candidate_ownership"),
        "fresh_session": value.get("fresh_session"),
        "best_speedup": value.get("best_speedup"),
        "stop_reason": terminal_stop_reason(value, authoring_used=authoring_used),
        "workflow_authoring_used": authoring_used,
        "cycle_lineage": cycle_lineage(
            session_dir,
            baseline_verified=value.get("baseline_witness") == "pass",
        ),
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
MAX_DSH_ENVELOPE_BYTES = 2 * 1024 * 1024
MAX_DSH_COMPATIBILITY_BYTES = 128 * 1024
MAX_CATALOG_ENTRY_BYTES = 256 * 1024
MAX_DISPATCH_ARGS_BYTES = 1024 * 1024
MAX_DESIGN_DESCRIPTION_BYTES = 32 * 1024
MAX_DESIGN_PHASES = 64


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


def bounded_json_object(path: Path, maximum: int) -> dict[str, Any] | None:
    """Read one bounded UTF-8 JSON object without exposing parse failures."""
    payload = bounded_text(path, maximum)
    if payload is None:
        return None
    try:
        value = json.loads(payload)
    except json.JSONDecodeError:
        return None
    return value if isinstance(value, dict) else None


def round_workflow_origin(session_dir: Path, workflow: str) -> str:
    """Distinguish a current-Session authored Proposal from a catalog entry."""
    proposal = session_dir / "workflow-authoring" / "proposals" / workflow
    return (
        "authored"
        if all((proposal / name).is_file() for name in DETAIL_FILES)
        else "catalog"
    )


def round_failure_kind(host: dict[str, Any]) -> str | None:
    """Classify a Host FAIL without presenting candidate failure as Host outage."""
    if host.get("verdict") != "fail":
        return None
    correctness = host.get("correctness")
    benchmark = host.get("benchmark")
    if isinstance(correctness, dict):
        exit_code = correctness.get("exit_code")
        if isinstance(exit_code, int) and not isinstance(exit_code, bool) and exit_code != 0:
            return "correctness"
    if isinstance(benchmark, dict):
        exit_code = benchmark.get("exit_code")
        if isinstance(exit_code, int) and not isinstance(exit_code, bool) and exit_code != 0:
            return "benchmark"
    reason = host.get("reason")
    rendered = reason.casefold() if isinstance(reason, str) else ""
    if "correctness" in rendered:
        return "correctness"
    if "benchmark" in rendered or "measurement" in rendered:
        return "benchmark"
    if any(
        token in rendered
        for token in ("infrastructure", "dispatch", "runtime", "timeout", "host outage")
    ):
        return "infrastructure"
    return None


def round_estimate(host: dict[str, Any], output: dict[str, Any]) -> dict[str, float] | None:
    """Project advisory Workflow estimates separately from Host measurement."""
    claimed = host.get("workflow_estimate")
    claimed = claimed if isinstance(claimed, dict) else {}
    cycles = positive_numeric(claimed.get("cycles"))
    if cycles is None:
        cycles = positive_numeric(output.get("expected_cycles_estimate"))
    if cycles is None:
        cycles = positive_numeric(output.get("estimated_cycles"))
    speedup = positive_numeric(claimed.get("speedup"))
    if speedup is None:
        speedup = positive_numeric(output.get("estimated_speedup"))
    if speedup is None:
        speedup = positive_numeric(output.get("overall_speedup"))
    estimate: dict[str, float] = {}
    if cycles is not None:
        estimate["cycles"] = cycles
    if speedup is not None:
        estimate["speedup"] = speedup
    return estimate or None


def round_measurement(
    host: dict[str, Any], metric: dict[str, Any] | None
) -> dict[str, float | bool] | None:
    """Project only a complete Host PASS measurement with explicit semantics."""
    if metric is None:
        return None
    baseline_cycles = positive_numeric(metric.get("baseline_cycles"))
    candidate_cycles = positive_numeric(metric.get("candidate_cycles"))
    candidate_speedup = positive_numeric(metric.get("candidate_speedup"))
    if candidate_speedup is None:
        candidate_speedup = positive_numeric(metric.get("speedup"))
    incumbent_cycles = positive_numeric(metric.get("incumbent_cycles"))
    incumbent_speedup = positive_numeric(metric.get("incumbent_speedup"))
    best_improved = metric.get("best_improved")
    if not isinstance(best_improved, bool) and candidate_cycles is not None:
        comparison = incumbent_cycles or baseline_cycles
        if comparison is not None:
            best_improved = candidate_cycles < comparison
    benchmark = host.get("benchmark")
    benchmark_stdout = benchmark.get("stdout") if isinstance(benchmark, dict) else None
    overall_speedup = last_reported_number(
        benchmark_stdout, OVERALL_SPEEDUP_PATTERN
    )
    values: tuple[tuple[str, float | bool | None], ...] = (
        ("baseline_cycles", baseline_cycles),
        ("candidate_cycles", candidate_cycles),
        ("candidate_speedup", candidate_speedup),
        ("incumbent_cycles", incumbent_cycles),
        ("incumbent_speedup", incumbent_speedup),
        ("best_improved", best_improved if isinstance(best_improved, bool) else None),
        ("overall_speedup", overall_speedup),
    )
    measurement = {name: value for name, value in values if value is not None}
    return measurement or None


def round_history(session_dir: Path) -> list[dict[str, Any]]:
    """Project at most the latest 100 rounds in strict ascending order."""
    projected: list[dict[str, Any]] = []
    for number in candidate_rounds(session_dir)[-100:]:
        run_dir = session_dir / f"run-{number}"
        workflow = selected_workflow(session_dir, number)
        host, metric = verified_host_metric(run_dir)
        raw_verdict = host.get("verdict")
        host_verdict = raw_verdict if raw_verdict in {"pass", "fail"} else "pending"
        output = bounded_json_object(run_dir / "output.json", MAX_DSH_ENVELOPE_BYTES) or {}
        candidate = host.get("candidate")
        candidate_id = (
            candidate.get("id") if isinstance(candidate, dict) else None
        )
        if not isinstance(candidate_id, str) or not candidate_id.strip():
            candidate_id = output.get("selected_candidate_id")
        candidate_id = bounded_reason(candidate_id, limit=240)
        estimate = round_estimate(host, output)
        measurement = round_measurement(host, metric)
        failure_kind = round_failure_kind(host)
        decision = round_decision(session_dir, number)
        row: dict[str, Any] = {
            "number": number,
            "host_verdict": host_verdict,
        }
        if workflow is not None and workflow != "STALLED":
            row["workflow"] = workflow
            row["workflow_origin"] = round_workflow_origin(session_dir, workflow)
        if candidate_id is not None:
            row["candidate_id"] = candidate_id
        if failure_kind is not None:
            row["failure_kind"] = failure_kind
        if estimate is not None:
            row["estimate"] = estimate
        if measurement is not None:
            row["measurement"] = measurement
        if decision is not None:
            row["decision"] = decision
        projected.append(row)
    return projected


def sha256_text(value: str) -> str:
    """Return one lowercase bare SHA-256 digest over exact UTF-8 text."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def normalized_sha256(value: object) -> str | None:
    """Normalize a bare or prefixed lowercase SHA-256 claim."""
    if not isinstance(value, str):
        return None
    digest = value.removeprefix("sha256:")
    return digest if re.fullmatch(r"[0-9a-f]{64}", digest) else None


def canonical_json_sha256(value: object) -> str | None:
    """Mirror JSON.stringify for ordinary finite dispatch-argument objects."""
    try:
        encoded = json.dumps(
            value,
            ensure_ascii=False,
            allow_nan=False,
            separators=(",", ":"),
        )
    except (TypeError, ValueError):
        return None
    return sha256_text(encoded)


def bounded_string(value: object, maximum: int) -> str | None:
    """Return one non-empty string only when its UTF-8 bytes fit the bound."""
    if not isinstance(value, str) or not value.strip():
        return None
    return value if len(value.encode("utf-8")) <= maximum else None


def bounded_string_array(
    value: object,
    *,
    maximum_items: int = 128,
    maximum_item_bytes: int = 1024,
) -> list[str] | None:
    """Validate one bounded string array for browser projection."""
    if not isinstance(value, list) or len(value) > maximum_items:
        return None
    projected: list[str] = []
    for item in value:
        if not isinstance(item, str) or len(item.encode("utf-8")) > maximum_item_bytes:
            return None
        projected.append(item)
    return projected


def bounded_phases(value: object) -> list[dict[str, str]] | None:
    """Validate the DSH metadata phase list without forwarding extra fields."""
    if value is None:
        return []
    if not isinstance(value, list) or len(value) > MAX_DESIGN_PHASES:
        return None
    phases: list[dict[str, str]] = []
    for item in value:
        if not isinstance(item, dict):
            return None
        title = bounded_string(item.get("title"), 1024)
        detail_value = item.get("detail", "")
        if title is None or not isinstance(detail_value, str):
            return None
        if len(detail_value.encode("utf-8")) > MAX_DESIGN_DESCRIPTION_BYTES:
            return None
        phases.append({"title": title, "detail": detail_value})
    return phases


def path_within(path: Path, roots: tuple[Path, ...]) -> bool:
    """Return whether the resolved path is inside one allowed workflow root."""
    return any(path == root or path.is_relative_to(root) for root in roots)


def sealed_session_catalog_entry(
    session_dir: Path,
    run_dir: Path,
    selected: str,
) -> tuple[dict[str, Any] | None, bool]:
    """Read the selected entry from the Host-sealed Session catalog.

    The boolean reports whether either half of the sealed representation was
    present.  Callers must fail closed instead of falling back to the legacy
    per-run projection when a partial or invalid sealed representation exists.
    """
    catalog_path = session_dir / "workflow-catalog.json"
    seal_path = run_dir / "candidate-ownership-seal.json"
    present = catalog_path.exists() or seal_path.exists()
    if not present or not catalog_path.is_file() or not seal_path.is_file():
        return None, present

    catalog_text = bounded_text(catalog_path, MAX_CATALOG_ENTRY_BYTES)
    seal = bounded_json_object(seal_path, MAX_CATALOG_ENTRY_BYTES)
    if catalog_text is None or seal is None:
        return None, True
    try:
        catalog_document = json.loads(catalog_text)
    except json.JSONDecodeError:
        return None, True
    if not isinstance(catalog_document, dict):
        return None, True

    dispatch_package = seal.get("dispatch_package")
    if (
        seal.get("schema_version") != 1
        or seal.get("contract") != "candidate_output_ownership_v1"
        or not isinstance(dispatch_package, dict)
        or normalized_sha256(dispatch_package.get("catalog"))
        != sha256_text(catalog_text)
    ):
        return None, True
    try:
        sealed_session = Path(str(seal.get("session_dir", ""))).expanduser().resolve()
        sealed_run = Path(str(seal.get("run_dir", ""))).expanduser().resolve()
    except OSError:
        return None, True
    if sealed_session != session_dir.resolve() or sealed_run != run_dir.resolve():
        return None, True

    workflows = catalog_document.get("workflows")
    if not isinstance(workflows, list) or len(workflows) > 1024:
        return None, True
    matches = [
        entry
        for entry in workflows
        if isinstance(entry, dict) and entry.get("name") == selected
    ]
    return (matches[0] if len(matches) == 1 else None), True


def dispatched_workflow_design(
    root: Path,
    session_dir: Path,
    round_number: int,
    selected: str | None,
) -> dict[str, Any] | None:
    """Project one hash-bound prepared DSH Workflow, failing closed on drift."""
    run_dir = session_dir / f"run-{round_number}"
    envelope_path = run_dir / "dsh-workflow.json"
    compatibility_path = run_dir / "dsh-compatibility.json"
    legacy_catalog_path = run_dir / "catalog-entry.json"
    if not envelope_path.exists():
        return None
    if (
        selected is None
        or selected == "STALLED"
        or not envelope_path.is_file()
        or not compatibility_path.is_file()
    ):
        return None

    envelope = bounded_json_object(envelope_path, MAX_DSH_ENVELOPE_BYTES)
    compatibility = bounded_json_object(
        compatibility_path, MAX_DSH_COMPATIBILITY_BYTES
    )
    catalog, sealed_catalog_present = sealed_session_catalog_entry(
        session_dir, run_dir, selected
    )
    if not sealed_catalog_present:
        catalog = bounded_json_object(legacy_catalog_path, MAX_CATALOG_ENTRY_BYTES)
    if envelope is None or compatibility is None or catalog is None:
        return None
    if (
        envelope.get("schema_version") != 1
        or envelope.get("contract") != "dsh_workflow_v1"
        or compatibility.get("schema_version") != 1
        or compatibility.get("gate") != "dsh_workflow_v1"
        or compatibility.get("verdict") != "pass"
        or compatibility.get("errors") != []
    ):
        return None

    source = envelope.get("source")
    meta = envelope.get("meta")
    args = envelope.get("args")
    body = envelope.get("script")
    if (
        not isinstance(source, dict)
        or not isinstance(meta, dict)
        or not isinstance(args, dict)
        or not isinstance(body, str)
        or len(body.encode("utf-8")) > MAX_WORKFLOW_BYTES
        or meta.get("name") != selected
        or catalog.get("name") != selected
    ):
        return None

    workflow_path_value = source.get("workflow_path")
    args_path_value = source.get("args_path")
    if not isinstance(workflow_path_value, str) or not isinstance(args_path_value, str):
        return None
    try:
        workflow_path = Path(workflow_path_value).expanduser().resolve()
        args_path = Path(args_path_value).expanduser().resolve()
        report_workflow = Path(str(compatibility.get("workflow_source", ""))).expanduser().resolve()
        report_args = Path(str(compatibility.get("args_source", ""))).expanduser().resolve()
        catalog_workflow = Path(str(catalog.get("js_path", ""))).expanduser().resolve()
    except OSError:
        return None
    allowed_roots = (
        (root / "workflows").resolve(),
        (session_dir / "workflow-authoring" / "proposals").resolve(),
    )
    expected_args = (run_dir / "dispatch-args.json").resolve()
    if (
        not path_within(workflow_path, allowed_roots)
        or workflow_path != report_workflow
        or workflow_path != catalog_workflow
        or args_path != expected_args
        or args_path != report_args
    ):
        return None

    persisted_args = bounded_json_object(args_path, MAX_DISPATCH_ARGS_BYTES)
    if persisted_args is None or persisted_args != args:
        return None
    workflow_hash = normalized_sha256(source.get("workflow_sha256"))
    args_hash = canonical_json_sha256(args)
    body_hash = sha256_text(body)
    if workflow_hash is None or args_hash is None:
        return None
    if (
        normalized_sha256(compatibility.get("workflow_sha256")) != workflow_hash
        or normalized_sha256(catalog.get("workflow_content_hash")) != workflow_hash
        or normalized_sha256(source.get("args_sha256")) != args_hash
        or normalized_sha256(compatibility.get("args_sha256")) != args_hash
        or normalized_sha256(source.get("body_sha256")) != body_hash
        or normalized_sha256(compatibility.get("body_sha256")) != body_hash
    ):
        return None

    description = bounded_string(
        meta.get("description"), MAX_DESIGN_DESCRIPTION_BYTES
    )
    catalog_description = bounded_string(
        catalog.get("description"), MAX_DESIGN_DESCRIPTION_BYTES
    )
    if description is None or (
        catalog_description is not None and catalog_description != description
    ):
        return None
    when_to_use = bounded_string(
        meta.get("whenToUse"), MAX_RATIONALE_BYTES
    )
    catalog_when = bounded_string(catalog.get("when_to_use"), MAX_RATIONALE_BYTES)
    if (
        when_to_use is not None
        and catalog_when is not None
        and not when_to_use.startswith(catalog_when)
        and not catalog_when.startswith(when_to_use)
    ):
        return None
    phases = bounded_phases(meta.get("phases"))
    topology = bounded_string(catalog.get("topology"), 1024)
    required_args = bounded_string_array(catalog.get("required_args"))
    languages = bounded_string_array(catalog.get("languages"))
    backends = bounded_string_array(catalog.get("backends"))
    integration_patterns = bounded_string_array(catalog.get("integration_patterns"))
    if (
        phases is None
        or topology is None
        or required_args is None
        or languages is None
        or backends is None
        or integration_patterns is None
    ):
        return None
    rationale = when_to_use or catalog_when or description
    design: dict[str, Any] = {
        "name": selected,
        "description": description,
        **({"whenToUse": when_to_use} if when_to_use is not None else {}),
        "phases": phases,
        "topology": topology,
        "requiredArgs": required_args,
        "languages": languages,
        "backends": backends,
        "integrationPatterns": integration_patterns,
        "rationale": rationale,
        "source": body,
    }
    method_category = bounded_string(catalog.get("method_category"), 1024)
    if method_category is not None:
        design["methodCategory"] = method_category
    technique = bounded_string(catalog.get("technique"), 1024)
    if technique is not None:
        design["technique"] = technique
    return design


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
    design: dict[str, Any] = {
        "requiredArgs": string_list(metadata.get("required_args")),
        "languages": string_list(metadata.get("languages")),
        "backends": string_list(metadata.get("backends")),
        "integrationPatterns": string_list(metadata.get("integration_patterns")),
        "rationale": rationale,
        "source": source,
    }
    for output, source_name in (
        ("name", "name"),
        ("technique", "technique"),
        ("methodCategory", "method_category"),
        ("topology", "topology"),
    ):
        value = metadata.get(source_name)
        if isinstance(value, str):
            design[output] = value
    return design, None


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
    phase: object,
    profile_status: str,
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
    profile_step = {
        "pass": "completed", "not_required": "completed",
        "pending": "pending", "fail": "failed",
    }.get(profile_status, "failed")
    steps = [
        {"id": "setup", "status": present("session-config.json")},
        {"id": "baseline", "status": present("test-method.md")},
        {"id": "profile", "status": profile_step},
        {"id": "selection", "status": "pending" if selection_status == "pending" else "completed"},
        {"id": "authoring", "status": author_step},
        {"id": "validation", "status": validation_step},
        {"id": "dispatch", "status": dispatch_step},
        {"id": "measurement", "status": measurement},
        {"id": "decision", "status": "completed" if round_decision(session_dir, round_number) else "pending"},
    ]
    if phase in TERMINAL_PHASES:
        replacement = "failed" if phase == "stalled" else "pending"
        for step in steps:
            if step["status"] == "active":
                step["status"] = replacement
    return steps


def session_detail(
    root: Path,
    session: Path,
    *,
    phase: object | None = None,
    profile_status: str | None = None,
) -> dict[str, Any]:
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
    if phase is None:
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

    if phase in TERMINAL_PHASES and authoring_status == "in_progress":
        authoring_status = "rejected" if phase == "stalled" else "not_started"

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
    if phase in TERMINAL_PHASES and dispatch["status"] in {"preparing", "running"}:
        dispatch["status"] = "failed" if phase == "stalled" else "pending"
    if profile_status is None:
        profile_status = profile_projection(root, session_dir, round_number)[0]
    dispatch_design = dispatched_workflow_design(
        root, session_dir, round_number, selected
    )
    return {
        "session_id": session_dir.name,
        "session_dir": str(session_dir),
        "current_round": round_number,
        "steps": step_statuses(
            session_dir, round_number, phase, profile_status,
            selection_status, authoring_status,
            str(validation["status"]), dispatch,
        ),
        "selection": {
            "status": selection_status,
            **({"workflow": selected} if selection_status == "selected" and selected else {}),
            **({"reason": reason} if reason else {}),
            "rejectedCount": rejected_count,
        },
        "authoring": authoring,
        **({"workflow": dispatch_design} if dispatch_design is not None else {}),
        "validation": validation,
        "dispatch": dispatch,
        "rounds": round_history(session_dir),
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
            print(json.dumps(session_detail(root, detail_options.session), ensure_ascii=False))
            return 0
        exec_compose(root, options.args)
    except RuntimeError as error:
        print(f"kersor-bridge: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
