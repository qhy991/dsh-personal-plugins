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

    def test_experimental_p100_is_additive_versioned_and_unqualified(self) -> None:
        candidate = INSTALLER.load_experimental_p100("e1-v2")
        self.assertEqual(candidate["profile"], "p100")
        self.assertEqual(candidate["preset_id"], "modus-fixed-p100-e1-v2")
        self.assertEqual(
            candidate["sha256"],
            "c4d0326d4fb5afb14aa51aeb91653fa7771610a41eb53de019c87bf9ff3419e1",
        )
        self.assertIn("leaving any one of those three unchanged is incomplete", candidate["text"])

        installed = INSTALLER.install_all(
            dsh_home=self.dsh_home,
            standard_preset=self.standard,
            force=False,
            dry_run=False,
            token_budget=(200_000, 2_000_000),
            experimental_p100="e1-v2",
        )
        self.assertEqual(
            [row[0] for row in installed],
            [*INSTALLER.PROFILE_IDS, "p100-e1-v2"],
        )
        candidate_root = self.dsh_home / ".agent-presets" / "modus-fixed-p100-e1-v2"
        composition = (candidate_root / "agent.cordis.yml").read_text(encoding="utf-8")
        self.assertIn("presetId: modus-fixed-p100-e1-v2", composition)
        self.assertIn("profile: p100", composition)
        self.assertIn("profileDigest: " + candidate["sha256"], composition)
        persona = f"{INSTALLER.STANDARD_PERSONA}\n\n{candidate['text'].rstrip()}"
        self.assertIn(
            "text: |-\n" + INSTALLER.indent_block(persona, 6),
            composition,
        )
        self.assertTrue(
            (candidate_root / "experimental-profiles/e1-v2/manifest.json").is_file()
        )

    def test_experimental_p010_is_additive_single_axis_and_has_no_t0_gate(self) -> None:
        candidate = INSTALLER.load_experimental_p010("t1-v1")
        profiles = INSTALLER.load_profiles()
        self.assertEqual(candidate["profile"], "p010")
        self.assertEqual(candidate["preset_id"], "modus-fixed-p010-t1-v1")
        self.assertEqual(
            candidate["sha256"],
            "8b0e10fb396407cce7c1d190aafa98c446115b68763a1f3a42222f2df7b53d48",
        )
        self.assertEqual(
            candidate["text"].replace(
                "Before changing code, inspect the instruction, connected implementation surfaces, "
                "and every relevant public check. Map dependencies and form multiple concrete "
                "hypotheses from that broader evidence, then choose an edit. Do not begin changing "
                "files until all likely interactions, alternative designs, and the first testable "
                "change are clear.",
                "Before changing code, inspect only the instruction, directly named implementation "
                "surface, and nearest relevant public check. Form one concrete hypothesis from that "
                "bounded evidence, then begin editing. Do not map unrelated modules, search for "
                "alternative designs, or continue gathering context once the first testable change "
                "is clear.",
            ),
            profiles["p000"]["text"],
        )

        installed = INSTALLER.install_all(
            dsh_home=self.dsh_home,
            standard_preset=self.standard,
            force=False,
            dry_run=False,
            token_budget=(200_000, 2_000_000),
            experimental_p010="t1-v1",
        )
        self.assertEqual(
            [row[0] for row in installed],
            [*INSTALLER.PROFILE_IDS, "p010-t1-v1"],
        )
        candidate_root = self.dsh_home / ".agent-presets" / "modus-fixed-p010-t1-v1"
        composition = (candidate_root / "agent.cordis.yml").read_text(encoding="utf-8")
        self.assertIn("presetId: modus-fixed-p010-t1-v1", composition)
        self.assertIn("profile: p010", composition)
        self.assertIn("profileDigest: " + candidate["sha256"], composition)
        self.assertNotIn("maxPreEditInformationAttempts", composition)
        self.assertTrue(
            (candidate_root / "experimental-profiles/t1-v1/manifest.json").is_file()
        )


if __name__ == "__main__":
    unittest.main()
