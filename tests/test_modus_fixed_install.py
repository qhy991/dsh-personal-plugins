"""Contracts for matched direct Modus fixed Worker preset installation."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "dsh_modus_fixed_install", ROOT / "scripts" / "install_modus_fixed.py"
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
- id: tool-subagent-fork
  name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: fork
    toolName: subagent_fork
"""


class ModusFixedInstallTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.dsh_home = self.root / "dsh-home"
        self.standard = self.root / "standard.yml"
        self.standard.write_text(STANDARD, encoding="utf-8")

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_rendered_presets_differ_only_by_bound_profile_policy(self) -> None:
        profiles = INSTALLER.load_profiles()
        neutral = INSTALLER.render_fixed_composition(STANDARD, "neutral", profiles)
        p000 = INSTALLER.render_fixed_composition(STANDARD, "p000", profiles)
        p100 = INSTALLER.render_fixed_composition(STANDARD, "p100", profiles)
        self.assertIn("presetId: modus-fixed-neutral", neutral)
        self.assertIn("profileDigest: " + profiles["neutral"]["sha256"], neutral)
        self.assertNotIn("maxPreEditInformationAttempts", neutral)
        self.assertNotIn("# Modus execution policy", neutral)
        for profile, rendered in (("p000", p000), ("p100", p100)):
            self.assertIn(f"presetId: modus-fixed-{profile}", rendered)
            self.assertIn(f"profile: {profile}", rendered)
            self.assertIn("maxPreEditInformationAttempts: 3", rendered)
            persona = (
                f"{INSTALLER.STANDARD_PERSONA}\n\n"
                f"{profiles[profile]['text'].rstrip()}"
            )
            self.assertIn(
                "text: |-\n" + INSTALLER.indent_block(persona, 6), rendered
            )
            self.assertIn("name: './plugins/modus-fixed-worker.mjs'", rendered)

    def test_budget_is_paired_and_rendered_identically(self) -> None:
        profiles = INSTALLER.load_profiles()
        for profile in INSTALLER.PROFILE_IDS:
            rendered = INSTALLER.render_fixed_composition(
                STANDARD,
                profile,
                profiles,
                (200_000, 2_000_000),
            )
            self.assertIn(
                "tokenBudget:\n"
                "      maxNewTokens: 200000\n"
                "      maxCacheReadTokens: 2000000",
                rendered,
            )

    def test_install_all_is_self_contained_and_idempotent(self) -> None:
        first = INSTALLER.install_all(
            dsh_home=self.dsh_home,
            standard_preset=self.standard,
            force=False,
            dry_run=False,
            token_budget=(200_000, 2_000_000),
        )
        self.assertEqual([row[0] for row in first], list(INSTALLER.PROFILE_IDS))
        for profile, destination, backup, changed in first:
            self.assertTrue(changed)
            self.assertIsNone(backup)
            self.assertEqual(destination.name, f"modus-fixed-{profile}")
            self.assertTrue((destination / "plugins" / "modus-fixed-worker.mjs").is_file())
            self.assertTrue((destination / "lib" / "trajectory.mjs").is_file())
            self.assertTrue((destination / "lib" / "worker-policy.mjs").is_file())
            self.assertTrue((destination / "agent.cordis.yml").is_file())
        repeated = INSTALLER.install_all(
            dsh_home=self.dsh_home,
            standard_preset=self.standard,
            force=False,
            dry_run=False,
            token_budget=(200_000, 2_000_000),
        )
        self.assertTrue(all(not row[3] and row[2] is None for row in repeated))


if __name__ == "__main__":
    unittest.main()
