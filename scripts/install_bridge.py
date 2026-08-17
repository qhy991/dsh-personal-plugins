#!/usr/bin/env python3
"""Install and validate the local Codex Responses bridge LaunchAgent."""

from __future__ import annotations

import argparse
import errno
import json
import os
import plistlib
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Callable
from urllib.parse import urlsplit, urlunsplit


ROOT = Path(__file__).resolve().parents[1]
SERVER_SOURCE = ROOT / "tools" / "codex-infini-bridge" / "server.mjs"
LABEL = "ai.infini.codex-responses-bridge"
HOST = "127.0.0.1"
PORT = 8143
SERVICE_NAME = "codex-infini-bridge"
HEALTH_URL = f"http://{HOST}:{PORT}/health"


@dataclass(frozen=True)
class Layout:
    """All user-owned paths managed by this installer."""

    data_dir: Path
    server: Path
    extra_ca: Path
    launch_agent: Path
    log_dir: Path
    stdout_log: Path
    stderr_log: Path


def layout_for(home: Path) -> Layout:
    """Resolve the persistent state, LaunchAgent, and log paths for one home."""
    resolved = home.expanduser().resolve()
    data_dir = resolved / ".local" / "share" / "codex-infini-bridge"
    log_dir = resolved / "Library" / "Logs" / "codex-infini-bridge"
    return Layout(
        data_dir=data_dir,
        server=data_dir / "server.mjs",
        extra_ca=data_dir / "extra-ca.pem",
        launch_agent=(
            resolved
            / "Library"
            / "LaunchAgents"
            / f"{LABEL}.plist"
        ),
        log_dir=log_dir,
        stdout_log=log_dir / "stdout.log",
        stderr_log=log_dir / "stderr.log",
    )


def normalize_upstream_base(value: str) -> str:
    """Validate and normalize the non-secret HTTPS upstream endpoint."""
    if not value or value.strip() != value:
        raise RuntimeError("--upstream-base must be a non-empty HTTPS URL")
    parsed = urlsplit(value)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
    ):
        raise RuntimeError(
            "--upstream-base must be an HTTPS URL without credentials, "
            "query, or fragment"
        )
    path = parsed.path.rstrip("/")
    return urlunsplit(("https", parsed.netloc, path, "", ""))


def resolve_executable(value: str | None, command: str) -> Path:
    """Resolve an executable to the absolute path persisted in the plist."""
    if value is None:
        discovered = shutil.which(command)
        if discovered is None:
            raise RuntimeError(f"cannot find {command}; pass --{command} explicitly")
        candidate = Path(discovered)
    else:
        candidate = Path(value).expanduser()
        if not candidate.is_absolute():
            raise RuntimeError(f"--{command} must be an absolute path")
    lexical = candidate.absolute()
    resolved = lexical.resolve()
    if not resolved.is_file() or not os.access(resolved, os.X_OK):
        raise RuntimeError(f"{command} is not executable: {lexical}")
    return lexical


def validate_node(node: Path) -> None:
    """Require the Node system-CA switch and syntax-check the bridge source."""
    help_result = subprocess.run(
        [str(node), "--help"],
        check=False,
        capture_output=True,
        text=True,
    )
    if help_result.returncode != 0 or "--use-system-ca" not in (
        help_result.stdout + help_result.stderr
    ):
        raise RuntimeError(
            f"Node at {node} does not support --use-system-ca; "
            "install a current Node release"
        )
    syntax = subprocess.run(
        [str(node), "--check", str(SERVER_SOURCE)],
        check=False,
        capture_output=True,
        text=True,
    )
    if syntax.returncode != 0:
        detail = (syntax.stderr or syntax.stdout).strip()
        raise RuntimeError(f"bridge source failed Node syntax check: {detail}")


def read_extra_ca(source: Path | None) -> bytes | None:
    """Read an optional extra trust bundle without making it the default."""
    if source is None:
        return None
    resolved = source.expanduser().resolve()
    if not resolved.is_file():
        raise RuntimeError(f"extra CA bundle does not exist: {resolved}")
    content = resolved.read_bytes()
    begins = content.count(b"-----BEGIN CERTIFICATE-----")
    ends = content.count(b"-----END CERTIFICATE-----")
    if begins == 0 or begins != ends or b"PRIVATE KEY" in content:
        raise RuntimeError(f"extra CA bundle is not valid PEM: {resolved}")
    return content


def render_plist(
    layout: Layout,
    *,
    node: Path,
    upstream_base: str,
    include_extra_ca: bool,
) -> dict[str, object]:
    """Render the complete secret-free LaunchAgent contract."""
    environment = {
        "UPSTREAM_BASE": upstream_base,
        "PORT": str(PORT),
    }
    if include_extra_ca:
        environment["NODE_EXTRA_CA_CERTS"] = str(layout.extra_ca)
    return {
        "Label": LABEL,
        "ProgramArguments": [
            str(node),
            "--use-system-ca",
            str(layout.server),
        ],
        "EnvironmentVariables": environment,
        "RunAtLoad": True,
        "KeepAlive": True,
        "ProcessType": "Background",
        "WorkingDirectory": str(layout.data_dir),
        "StandardOutPath": str(layout.stdout_log),
        "StandardErrorPath": str(layout.stderr_log),
        "Umask": 0o077,
        "ThrottleInterval": 10,
    }


def plist_bytes(value: dict[str, object]) -> bytes:
    """Serialize a stable XML plist accepted by launchd."""
    return plistlib.dumps(value, fmt=plistlib.FMT_XML, sort_keys=False)


def port_available() -> bool:
    """Return true only when loopback connection refusal proves the port free."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as client:
        client.settimeout(0.5)
        result = client.connect_ex((HOST, PORT))
    if result == 0:
        return False
    if result == errno.ECONNREFUSED:
        return True
    raise RuntimeError(
        f"cannot prove {HOST}:{PORT} is free (socket error {result}); "
        "refusing to install"
    )


def require_free_port(probe: Callable[[], bool] = port_available) -> None:
    """Fail closed instead of replacing or killing an existing listener."""
    if not probe():
        raise RuntimeError(
            f"{HOST}:{PORT} is already in use; stop the existing listener "
            "manually before installing"
        )


def probe_health(timeout: float) -> dict[str, object]:
    """Wait for the exact local service identity at the health endpoint."""
    deadline = time.monotonic() + timeout
    last_error = "no response"
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    while time.monotonic() < deadline:
        remaining = max(0.1, deadline - time.monotonic())
        try:
            with opener.open(
                HEALTH_URL,
                timeout=min(1.0, remaining),
            ) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if payload == {"ok": True, "service": SERVICE_NAME}:
                return payload
            last_error = "unexpected service identity"
        except (
            OSError,
            UnicodeError,
            ValueError,
            urllib.error.URLError,
        ) as error:
            last_error = type(error).__name__
        time.sleep(min(0.2, max(0.0, deadline - time.monotonic())))
    raise RuntimeError(f"health probe failed for {HEALTH_URL}: {last_error}")


def atomic_write(path: Path, content: bytes, mode: int) -> bool:
    """Atomically replace one managed file only when its bytes differ."""
    if path.is_file() and path.read_bytes() == content:
        os.chmod(path, mode)
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.",
        dir=path.parent,
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()
    return True


def build_plan(
    *,
    home: Path,
    node_value: str | None,
    upstream_value: str,
    extra_ca_source: Path | None,
    launchctl_value: str | None,
) -> tuple[dict[str, object], Layout, Path, Path, str, bytes | None]:
    """Validate all inputs and return the deterministic install plan."""
    layout = layout_for(home)
    node = resolve_executable(node_value, "node")
    launchctl = resolve_executable(launchctl_value, "launchctl")
    upstream_base = normalize_upstream_base(upstream_value)
    extra_ca = read_extra_ca(extra_ca_source)
    validate_node(node)
    plist = render_plist(
        layout,
        node=node,
        upstream_base=upstream_base,
        include_extra_ca=extra_ca is not None,
    )
    plan = {
        "label": LABEL,
        "listen": f"{HOST}:{PORT}",
        "health": HEALTH_URL,
        "node": str(node),
        "system_ca": True,
        "extra_ca": str(layout.extra_ca) if extra_ca is not None else None,
        "server": str(layout.server),
        "launch_agent": str(layout.launch_agent),
        "logs": [str(layout.stdout_log), str(layout.stderr_log)],
        "upstream_base": upstream_base,
        "launchctl": str(launchctl),
        "plist": plist,
    }
    return plan, layout, node, launchctl, upstream_base, extra_ca


def install(
    *,
    home: Path,
    node_value: str | None,
    upstream_value: str,
    extra_ca_source: Path | None = None,
    launchctl_value: str | None = None,
    health_timeout: float = 10.0,
    uid: int | None = None,
    port_probe: Callable[[], bool] = port_available,
    health_probe: Callable[[float], dict[str, object]] = probe_health,
) -> dict[str, object]:
    """Persist, bootstrap, kickstart, and health-check the LaunchAgent."""
    (
        plan,
        layout,
        _node,
        launchctl,
        _upstream,
        extra_ca,
    ) = build_plan(
        home=home,
        node_value=node_value,
        upstream_value=upstream_value,
        extra_ca_source=extra_ca_source,
        launchctl_value=launchctl_value,
    )
    require_free_port(port_probe)

    layout.data_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    layout.log_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(layout.data_dir, 0o700)
    os.chmod(layout.log_dir, 0o700)
    changed = {
        "server": atomic_write(layout.server, SERVER_SOURCE.read_bytes(), 0o600),
        "plist": atomic_write(
            layout.launch_agent,
            plist_bytes(plan["plist"]),
            0o600,
        ),
        "extra_ca": False,
    }
    if extra_ca is not None:
        changed["extra_ca"] = atomic_write(layout.extra_ca, extra_ca, 0o600)

    resolved_uid = os.getuid() if uid is None else uid
    domain = f"gui/{resolved_uid}"
    service = f"{domain}/{LABEL}"
    commands = [
        [str(launchctl), "bootstrap", domain, str(layout.launch_agent)],
        [str(launchctl), "kickstart", service],
    ]
    for command in commands:
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
        )
        if completed.returncode != 0:
            detail = (completed.stderr or completed.stdout).strip()
            raise RuntimeError(
                f"launchctl {' '.join(command[1:])} failed: {detail}"
            )
    health = health_probe(health_timeout)
    return {
        **{key: value for key, value in plan.items() if key != "plist"},
        "changed": changed,
        "health_result": health,
    }


def check_installation(
    *,
    home: Path,
    expected_node: str | None = None,
    expected_upstream: str | None = None,
    expected_extra_ca: Path | None = None,
    health_timeout: float = 3.0,
    health_probe: Callable[[float], dict[str, object]] = probe_health,
) -> list[str]:
    """Return drift, safety, and runtime health violations."""
    layout = layout_for(home)
    violations: list[str] = []
    if not layout.server.is_file():
        violations.append(f"missing installed server: {layout.server}")
    elif layout.server.read_bytes() != SERVER_SOURCE.read_bytes():
        violations.append("installed server differs from repository source")

    plist: dict[str, object] | None = None
    if not layout.launch_agent.is_file():
        violations.append(f"missing LaunchAgent: {layout.launch_agent}")
    else:
        try:
            loaded = plistlib.loads(layout.launch_agent.read_bytes())
            if not isinstance(loaded, dict):
                raise ValueError("plist root is not a dictionary")
            plist = loaded
        except (OSError, ValueError, plistlib.InvalidFileException) as error:
            violations.append(f"invalid LaunchAgent plist: {error}")

    if plist is not None:
        arguments = plist.get("ProgramArguments")
        environment = plist.get("EnvironmentVariables")
        if (
            not isinstance(arguments, list)
            or len(arguments) != 3
            or arguments[1:] != ["--use-system-ca", str(layout.server)]
            or not isinstance(arguments[0], str)
            or not Path(arguments[0]).is_absolute()
        ):
            violations.append("LaunchAgent ProgramArguments drifted")
        else:
            try:
                installed_node = resolve_executable(arguments[0], "node")
                validate_node(installed_node)
            except RuntimeError as error:
                violations.append(str(error))
        if not isinstance(environment, dict):
            violations.append("LaunchAgent EnvironmentVariables drifted")
        else:
            if "BRIDGE_DEBUG" in environment:
                violations.append("LaunchAgent must not enable BRIDGE_DEBUG")
            try:
                installed_upstream = normalize_upstream_base(
                    str(environment.get("UPSTREAM_BASE", ""))
                )
            except RuntimeError as error:
                violations.append(str(error))
                installed_upstream = None
            if environment.get("PORT") != str(PORT):
                violations.append("LaunchAgent PORT drifted")
            ca_value = environment.get("NODE_EXTRA_CA_CERTS")
            include_extra_ca = ca_value is not None
            if include_extra_ca:
                if ca_value != str(layout.extra_ca):
                    violations.append("LaunchAgent extra CA path drifted")
                try:
                    read_extra_ca(layout.extra_ca)
                except RuntimeError as error:
                    violations.append(str(error))
            if installed_upstream is not None and isinstance(arguments, list):
                try:
                    expected = render_plist(
                        layout,
                        node=Path(str(arguments[0])),
                        upstream_base=installed_upstream,
                        include_extra_ca=include_extra_ca,
                    )
                    if plist != expected:
                        violations.append("LaunchAgent contract drifted")
                except (IndexError, TypeError, ValueError):
                    pass
            if expected_upstream is not None:
                try:
                    wanted = normalize_upstream_base(expected_upstream)
                except RuntimeError as error:
                    violations.append(str(error))
                else:
                    if installed_upstream != wanted:
                        violations.append("installed upstream differs from expectation")

        if expected_node is not None and isinstance(arguments, list) and arguments:
            try:
                wanted_node = resolve_executable(expected_node, "node")
            except RuntimeError as error:
                violations.append(str(error))
            else:
                if arguments[0] != str(wanted_node):
                    violations.append("installed Node path differs from expectation")

    if expected_extra_ca is not None:
        installed_environment = (
            plist.get("EnvironmentVariables")
            if isinstance(plist, dict)
            else None
        )
        if (
            not isinstance(installed_environment, dict)
            or installed_environment.get("NODE_EXTRA_CA_CERTS")
            != str(layout.extra_ca)
        ):
            violations.append("expected extra CA bundle is not enabled")
        try:
            wanted_ca = read_extra_ca(expected_extra_ca)
        except RuntimeError as error:
            violations.append(str(error))
        else:
            if not layout.extra_ca.is_file():
                violations.append("expected extra CA bundle is not installed")
            elif layout.extra_ca.read_bytes() != wanted_ca:
                violations.append("installed extra CA bundle differs from expectation")

    for directory in (layout.data_dir, layout.log_dir):
        if not directory.is_dir():
            violations.append(f"missing managed directory: {directory}")
        elif directory.stat().st_mode & 0o7777 != 0o700:
            violations.append(f"managed directory mode drifted: {directory}")
    for managed_file in (layout.server, layout.launch_agent):
        if managed_file.is_file() and managed_file.stat().st_mode & 0o7777 != 0o600:
            violations.append(f"managed file mode drifted: {managed_file}")
    if layout.extra_ca.is_file() and layout.extra_ca.stat().st_mode & 0o7777 != 0o600:
        violations.append(f"managed file mode drifted: {layout.extra_ca}")

    try:
        health_probe(health_timeout)
    except RuntimeError as error:
        violations.append(str(error))
    return violations


def parser() -> argparse.ArgumentParser:
    """Build the dry-run/check/install command-line interface."""
    result = argparse.ArgumentParser(description=__doc__)
    commands = result.add_subparsers(dest="command", required=True)

    for name in ("dry-run", "install"):
        command = commands.add_parser(name)
        command.add_argument("--upstream-base", required=True)
        command.add_argument("--node")
        command.add_argument("--extra-ca", type=Path)
        command.add_argument("--home", type=Path, default=Path.home())
        command.add_argument("--launchctl", default="/bin/launchctl")
    install_parser = commands.choices["install"]
    install_parser.add_argument("--health-timeout", type=float, default=10.0)

    check = commands.add_parser("check")
    check.add_argument("--home", type=Path, default=Path.home())
    check.add_argument("--node")
    check.add_argument("--upstream-base")
    check.add_argument("--extra-ca", type=Path)
    check.add_argument("--health-timeout", type=float, default=3.0)
    return result


def main(argv: list[str] | None = None) -> int:
    """Execute one bridge lifecycle command."""
    arguments = parser().parse_args(argv)
    try:
        if arguments.command == "check":
            violations = check_installation(
                home=arguments.home,
                expected_node=arguments.node,
                expected_upstream=arguments.upstream_base,
                expected_extra_ca=arguments.extra_ca,
                health_timeout=arguments.health_timeout,
            )
            if violations:
                print("bridge check failed:", file=sys.stderr)
                for violation in violations:
                    print(f"  - {violation}", file=sys.stderr)
                return 1
            print(json.dumps({"ok": True, "service": SERVICE_NAME}, sort_keys=True))
            return 0

        plan, *_ = build_plan(
            home=arguments.home,
            node_value=arguments.node,
            upstream_value=arguments.upstream_base,
            extra_ca_source=arguments.extra_ca,
            launchctl_value=arguments.launchctl,
        )
        require_free_port()
        if arguments.command == "dry-run":
            print(json.dumps(plan, indent=2, sort_keys=True))
            return 0

        report = install(
            home=arguments.home,
            node_value=arguments.node,
            upstream_value=arguments.upstream_base,
            extra_ca_source=arguments.extra_ca,
            launchctl_value=arguments.launchctl,
            health_timeout=arguments.health_timeout,
        )
        print(json.dumps(report, indent=2, sort_keys=True))
        return 0
    except RuntimeError as error:
        print(f"bridge {arguments.command} failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
