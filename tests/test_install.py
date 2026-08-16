"""Regression tests for the generated DSH preset installation contract."""

from __future__ import annotations

import importlib.util
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("dsh_plugin_install", ROOT / "scripts" / "install.py")
assert SPEC is not None and SPEC.loader is not None
INSTALLER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(INSTALLER)


STANDARD = """# The `standard` agent preset.
- id: persona
  name: '@deepseek-ai/dsh-persona'
  config:
    text: >-
      You are a coding agent powered by the {{model}} model. Your working directory is {{cwd}}.
- id: tool-bash
  name: '@deepseek-ai/dsh-tool-bash'
"""


class InstallTests(unittest.TestCase):
    """Prove rendering, idempotency, and recoverable replacement."""

    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.dsh_home = self.root / "dsh-home"
        self.standard = self.root / "standard.yml"
        self.standard.write_text(STANDARD, encoding="utf-8")
        self.kersor = self.root / "KerSor"
        (self.kersor / "commands").mkdir(parents=True)
        (self.kersor / "scripts").mkdir()
        (self.kersor / "AGENTS.md").write_text("# Rules\n", encoding="utf-8")
        (self.kersor / "scripts" / "compose.py").write_text("", encoding="utf-8")
        (self.kersor / "scripts" / "doctor.sh").write_text("", encoding="utf-8")

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def run_install(self, *, force: bool = False):
        """Install into the isolated DSH home."""
        return INSTALLER.install(
            dsh_home=self.dsh_home,
            standard_preset=self.standard,
            kersor_root=self.kersor,
            force=force,
            dry_run=False,
        )

    def test_install_renders_delta_and_local_root(self) -> None:
        destination, backup, changed = self.run_install()
        self.assertTrue(changed)
        self.assertIsNone(backup)
        composition = (destination / "agent.cordis.yml").read_text(encoding="utf-8")
        self.assertIn("The `kersor` agent preset", composition)
        self.assertIn(INSTALLER.KERSOR_LINE, composition)
        self.assertNotIn(str(self.kersor), composition)
        self.assertEqual(
            (destination / ".local" / "kersor-root").read_text(encoding="utf-8"),
            f"{self.kersor.resolve()}\n",
        )

    def test_identical_reinstall_is_a_noop(self) -> None:
        destination, _, _ = self.run_install()
        second_destination, backup, changed = self.run_install()
        self.assertEqual(second_destination, destination)
        self.assertFalse(changed)
        self.assertIsNone(backup)

    def test_installed_bridge_resolves_recorded_checkout(self) -> None:
        destination, _, _ = self.run_install()
        environment = dict(os.environ)
        environment.pop("KERSOR_ROOT", None)
        completed = subprocess.run(
            [sys.executable, str(destination / "bin" / "kersor_bridge.py"), "root"],
            check=False,
            capture_output=True,
            text=True,
            env=environment,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(completed.stdout.strip(), str(self.kersor.resolve()))

    def test_same_size_local_edit_is_not_mistaken_for_identical(self) -> None:
        destination, _, _ = self.run_install()
        preset = destination / "preset.yml"
        original = preset.read_text(encoding="utf-8")
        preset.write_text("X" * len(original), encoding="utf-8")
        with self.assertRaisesRegex(RuntimeError, "destination exists and differs"):
            self.run_install()

    def test_force_preserves_different_existing_preset(self) -> None:
        destination, _, _ = self.run_install()
        (destination / "preset.yml").write_text("local edit\n", encoding="utf-8")
        _, backup, changed = self.run_install(force=True)
        self.assertTrue(changed)
        self.assertIsNotNone(backup)
        assert backup is not None
        self.assertEqual((backup / "preset.yml").read_text(encoding="utf-8"), "local edit\n")

    def test_renderer_fails_when_upstream_anchor_changes(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "persona anchor changed"):
            INSTALLER.render_composition("- id: persona\n")


if __name__ == "__main__":
    unittest.main()
