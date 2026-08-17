"""Contracts for the self-contained DSH Modus preset installer."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "dsh_modus_install", ROOT / "scripts" / "install_modus.py"
)
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
- id: agent-instructions
  name: '@deepseek-ai/dsh-agent-instructions'
- id: tool-subagent-fork
  name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: fork
    toolName: subagent_fork
"""


class ModusInstallTests(unittest.TestCase):
    """Prove rendering, immutable assets, idempotency, and recovery."""

    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.dsh_home = self.root / "dsh-home"
        self.standard = self.root / "standard.yml"
        self.standard.write_text(STANDARD, encoding="utf-8")

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def run_install(self, *, force: bool = False):
        return INSTALLER.install(
            dsh_home=self.dsh_home,
            standard_preset=self.standard,
            force=force,
            dry_run=False,
        )

    def test_renderer_replaces_only_persona_and_appends_router(self) -> None:
        rendered = INSTALLER.render_composition(STANDARD)
        router_persona = (
            ROOT / "presets" / "modus" / "router-persona.md"
        ).read_text(encoding="utf-8").strip()
        self.assertIn(
            "text: |-\n" + INSTALLER.indent_block(router_persona, 6), rendered
        )
        self.assertEqual(rendered.count("- id: modus-router\n"), 1)
        self.assertIn("name: './plugins/modus-router.mjs'", rendered)
        self.assertIn(f"basePersona: >-\n      {INSTALLER.STANDARD_PERSONA}", rendered)
        self.assertIn("presetId: modus", rendered)
        self.assertIn("routerProbeTools: []", rendered)
        self.assertIn("maxProbeCalls: 0", rendered)
        self.assertNotIn("routeTokenBudget:", rendered)
        self.assertIn("- id: agent-instructions", rendered)
        self.assertIn("- id: tool-subagent-fork", rendered)

    def test_renderer_adds_only_an_explicit_paired_route_budget(self) -> None:
        rendered = INSTALLER.render_composition(STANDARD, (600_000, 9_000_000))
        self.assertIn(
            "routeTokenBudget:\n"
            "      maxNewTokens: 600000\n"
            "      maxCacheReadTokens: 9000000",
            rendered,
        )
        with self.assertRaisesRegex(ValueError, "non-negative"):
            INSTALLER.render_composition(STANDARD, (-1, 9_000_000))

    def test_renderer_fails_closed_when_upstream_anchor_changes(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "persona anchor changed"):
            INSTALLER.render_composition(STANDARD.replace("text: >-", "text: |-"))

    def test_install_is_self_contained_and_idempotent(self) -> None:
        destination, backup, changed = self.run_install()
        self.assertTrue(changed)
        self.assertIsNone(backup)
        self.assertTrue((destination / "agent.cordis.yml").is_file())
        self.assertTrue((destination / "compatibility.json").is_file())
        self.assertTrue((destination / "plugins" / "modus-router.mjs").is_file())
        self.assertTrue((destination / "lib" / "trajectory.mjs").is_file())
        self.assertTrue((destination / "profiles" / "manifest.json").is_file())
        self.assertTrue((destination / "profiles" / "p000.md").is_file())
        self.assertTrue((destination / "profiles" / "p100.md").is_file())

        repeated, repeated_backup, repeated_changed = self.run_install()
        self.assertEqual(repeated, destination)
        self.assertFalse(repeated_changed)
        self.assertIsNone(repeated_backup)

    def test_force_preserves_a_different_existing_preset(self) -> None:
        destination, _, _ = self.run_install()
        (destination / "preset.yml").write_text("local edit\n", encoding="utf-8")
        _, backup, changed = self.run_install(force=True)
        self.assertTrue(changed)
        self.assertIsNotNone(backup)
        assert backup is not None
        self.assertEqual(
            (backup / "preset.yml").read_text(encoding="utf-8"), "local edit\n"
        )


if __name__ == "__main__":
    unittest.main()
