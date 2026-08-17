"""Regression tests for the persistent Codex bridge LaunchAgent."""

from __future__ import annotations

import importlib.util
import json
import os
import plistlib
import stat
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "bridge_install",
    ROOT / "scripts" / "install_bridge.py",
)
assert SPEC is not None and SPEC.loader is not None
INSTALLER = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = INSTALLER
SPEC.loader.exec_module(INSTALLER)


class BridgeInstallTests(unittest.TestCase):
    """Exercise only temporary homes and fake process-control commands."""

    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.home = self.root / "home"
        self.fake_node = self.root / "node"
        self.fake_node.write_text(
            "#!/bin/sh\n"
            "if [ \"$1\" = \"--help\" ]; then\n"
            "  echo '  --use-system-ca  use system CA store'\n"
            "  exit 0\n"
            "fi\n"
            "if [ \"$1\" = \"--check\" ]; then exit 0; fi\n"
            "exit 64\n",
            encoding="utf-8",
        )
        self.fake_node.chmod(0o755)
        self.launchctl_log = self.root / "launchctl.log"
        self.fake_launchctl = self.root / "launchctl"
        self.fake_launchctl.write_text(
            "#!/bin/sh\n"
            "printf '%s\\n' \"$*\" >> \"$FAKE_LAUNCHCTL_LOG\"\n"
            "if [ \"$FAKE_LAUNCHCTL_FAIL\" = \"$1\" ]; then exit 73; fi\n",
            encoding="utf-8",
        )
        self.fake_launchctl.chmod(0o755)
        self.environment = mock.patch.dict(
            os.environ,
            {"FAKE_LAUNCHCTL_LOG": str(self.launchctl_log)},
        )
        self.environment.start()

    def tearDown(self) -> None:
        self.environment.stop()
        self.temporary.cleanup()

    @staticmethod
    def healthy(_timeout: float) -> dict[str, object]:
        return {"ok": True, "service": INSTALLER.SERVICE_NAME}

    def run_install(self, *, extra_ca: Path | None = None):
        """Install with no real launchd or loopback side effects."""
        return INSTALLER.install(
            home=self.home,
            node_value=str(self.fake_node),
            upstream_value="https://cloud.infini-ai.com/maas/v1/",
            extra_ca_source=extra_ca,
            launchctl_value=str(self.fake_launchctl),
            health_timeout=0.1,
            uid=501,
            port_probe=lambda: True,
            health_probe=self.healthy,
        )

    def test_install_persists_secret_free_launch_agent_and_checks_health(self) -> None:
        extra_ca = self.root / "company.pem"
        extra_ca.write_text(
            "-----BEGIN CERTIFICATE-----\nZmFrZQ==\n"
            "-----END CERTIFICATE-----\n",
            encoding="utf-8",
        )

        report = self.run_install(extra_ca=extra_ca)

        layout = INSTALLER.layout_for(self.home)
        self.assertEqual(
            layout.server.read_bytes(),
            INSTALLER.SERVER_SOURCE.read_bytes(),
        )
        self.assertEqual(layout.extra_ca.read_bytes(), extra_ca.read_bytes())
        plist = plistlib.loads(layout.launch_agent.read_bytes())
        self.assertEqual(
            plist,
            INSTALLER.render_plist(
                layout,
                node=self.fake_node.absolute(),
                upstream_base="https://cloud.infini-ai.com/maas/v1",
                include_extra_ca=True,
            ),
        )
        self.assertEqual(
            plist["ProgramArguments"],
            [
                str(self.fake_node.absolute()),
                "--use-system-ca",
                str(layout.server),
            ],
        )
        self.assertEqual(
            plist["EnvironmentVariables"],
            {
                "UPSTREAM_BASE": "https://cloud.infini-ai.com/maas/v1",
                "PORT": "8143",
                "NODE_EXTRA_CA_CERTS": str(layout.extra_ca),
            },
        )
        self.assertTrue(plist["RunAtLoad"])
        self.assertTrue(plist["KeepAlive"])
        self.assertEqual(plist["Umask"], 0o077)
        self.assertEqual(plist["ThrottleInterval"], 10)
        self.assertNotIn("BRIDGE_DEBUG", layout.launch_agent.read_text())
        self.assertNotIn("authorization", layout.launch_agent.read_text().lower())
        self.assertEqual(
            stat.S_IMODE(layout.data_dir.stat().st_mode),
            0o700,
        )
        self.assertEqual(
            stat.S_IMODE(layout.log_dir.stat().st_mode),
            0o700,
        )
        self.assertEqual(
            report["health_result"],
            {"ok": True, "service": INSTALLER.SERVICE_NAME},
        )
        launchctl_calls = self.launchctl_log.read_text(encoding="utf-8").splitlines()
        self.assertEqual(
            launchctl_calls,
            [
                f"bootstrap gui/501 {layout.launch_agent}",
                f"kickstart gui/501/{INSTALLER.LABEL}",
            ],
        )
        self.assertNotIn(" -k", self.launchctl_log.read_text(encoding="utf-8"))
        self.assertEqual(
            INSTALLER.check_installation(
                home=self.home,
                expected_extra_ca=extra_ca,
                health_probe=self.healthy,
            ),
            [],
        )

    def test_default_uses_system_ca_without_bundle_dependency(self) -> None:
        self.run_install()
        layout = INSTALLER.layout_for(self.home)
        plist = plistlib.loads(layout.launch_agent.read_bytes())
        self.assertNotIn(
            "NODE_EXTRA_CA_CERTS",
            plist["EnvironmentVariables"],
        )
        self.assertFalse(layout.extra_ca.exists())
        self.assertIn("--use-system-ca", plist["ProgramArguments"])

    def test_port_occupancy_fails_before_writes_or_launchctl(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "already in use"):
            INSTALLER.install(
                home=self.home,
                node_value=str(self.fake_node),
                upstream_value="https://cloud.infini-ai.com/maas/v1",
                launchctl_value=str(self.fake_launchctl),
                port_probe=lambda: False,
                health_probe=self.healthy,
            )
        self.assertFalse(self.home.exists())
        self.assertFalse(self.launchctl_log.exists())

    def test_dry_run_plan_is_complete_without_writing_home(self) -> None:
        plan, *_ = INSTALLER.build_plan(
            home=self.home,
            node_value=str(self.fake_node),
            upstream_value="https://cloud.infini-ai.com/maas/v1",
            extra_ca_source=None,
            launchctl_value=str(self.fake_launchctl),
        )
        INSTALLER.require_free_port(lambda: True)
        self.assertEqual(plan["listen"], "127.0.0.1:8143")
        self.assertEqual(plan["health"], "http://127.0.0.1:8143/health")
        self.assertEqual(plan["plist"]["Label"], INSTALLER.LABEL)
        self.assertFalse(self.home.exists())

    def test_node_symlink_path_is_persisted_without_resolving_target(self) -> None:
        stable_node = self.root / "stable-node"
        stable_node.symlink_to(self.fake_node)
        plan, *_ = INSTALLER.build_plan(
            home=self.home,
            node_value=str(stable_node),
            upstream_value="https://cloud.infini-ai.com/maas/v1",
            extra_ca_source=None,
            launchctl_value=str(self.fake_launchctl),
        )
        self.assertEqual(plan["node"], str(stable_node.absolute()))
        self.assertEqual(
            plan["plist"]["ProgramArguments"][0],
            str(stable_node.absolute()),
        )

    def test_check_accepts_exact_install_and_rejects_server_drift(self) -> None:
        self.run_install()
        violations = INSTALLER.check_installation(
            home=self.home,
            expected_node=str(self.fake_node),
            expected_upstream="https://cloud.infini-ai.com/maas/v1/",
            health_probe=self.healthy,
        )
        self.assertEqual(violations, [])

        layout = INSTALLER.layout_for(self.home)
        layout.server.write_text("// drift\n", encoding="utf-8")
        violations = INSTALLER.check_installation(
            home=self.home,
            health_probe=self.healthy,
        )
        self.assertIn(
            "installed server differs from repository source",
            violations,
        )

    def test_check_rejects_managed_file_mode_drift(self) -> None:
        self.run_install()
        layout = INSTALLER.layout_for(self.home)
        layout.server.chmod(0o644)
        violations = INSTALLER.check_installation(
            home=self.home,
            health_probe=self.healthy,
        )
        self.assertIn(
            f"managed file mode drifted: {layout.server}",
            violations,
        )

    def test_bootstrap_failure_is_reported_without_kickstart(self) -> None:
        with mock.patch.dict(os.environ, {"FAKE_LAUNCHCTL_FAIL": "bootstrap"}):
            with self.assertRaisesRegex(RuntimeError, "launchctl bootstrap"):
                self.run_install()
        calls = self.launchctl_log.read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(calls), 1)
        self.assertTrue(calls[0].startswith("bootstrap "))

    def test_install_reports_post_start_health_failure(self) -> None:
        def unhealthy(_timeout: float) -> dict[str, object]:
            raise RuntimeError("health probe failed after kickstart")

        with self.assertRaisesRegex(
            RuntimeError,
            "health probe failed after kickstart",
        ):
            INSTALLER.install(
                home=self.home,
                node_value=str(self.fake_node),
                upstream_value="https://cloud.infini-ai.com/maas/v1",
                launchctl_value=str(self.fake_launchctl),
                port_probe=lambda: True,
                health_probe=unhealthy,
            )
        self.assertEqual(
            len(self.launchctl_log.read_text(encoding="utf-8").splitlines()),
            2,
        )

    def test_check_reports_unhealthy_runtime_separately(self) -> None:
        self.run_install()

        def unhealthy(_timeout: float) -> dict[str, object]:
            raise RuntimeError("health probe failed")

        violations = INSTALLER.check_installation(
            home=self.home,
            health_probe=unhealthy,
        )
        self.assertIn("health probe failed", violations)

    def test_rejects_insecure_or_credentialed_upstreams(self) -> None:
        for value in (
            "http://cloud.infini-ai.com/maas/v1",
            "https://token@cloud.infini-ai.com/maas/v1",
            "https://cloud.infini-ai.com/maas/v1?token=secret",
        ):
            with self.subTest(value=value):
                with self.assertRaisesRegex(RuntimeError, "HTTPS URL"):
                    INSTALLER.normalize_upstream_base(value)

    def test_source_has_no_raw_debug_dump_or_tmp_dependency(self) -> None:
        source = INSTALLER.SERVER_SOURCE.read_text(encoding="utf-8")
        self.assertNotIn("BRIDGE_DEBUG", source)
        self.assertNotIn("/tmp/", source)
        self.assertNotIn("err?.message", source)
        self.assertNotIn("error.message", source)
        self.assertNotIn("${req.url}", source)
        self.assertIn("UPSTREAM_BASE is required", source)
        self.assertIn(
            "JSON.stringify({ ok: true, service: 'codex-infini-bridge' })",
            source,
        )

    def test_cli_exposes_only_dry_run_check_and_install(self) -> None:
        command = INSTALLER.parser()
        subparsers = next(
            action
            for action in command._actions
            if hasattr(action, "choices") and action.choices
        )
        self.assertEqual(
            set(subparsers.choices),
            {"dry-run", "check", "install"},
        )


if __name__ == "__main__":
    unittest.main()
