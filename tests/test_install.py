"""Regression tests for the generated DSH preset installation contract."""

from __future__ import annotations

import importlib.util
import json
import os
import shutil
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
- id: skill-filesystem
  name: '@deepseek-ai/dsh-skill-filesystem'
- id: tool-skill
  name: '@deepseek-ai/dsh-tool-skill'
"""


FAKE_KERSOR_CORE = '''
import json
from pathlib import Path

class AttemptResultError(ValueError):
    pass

class SessionStore:
    def __init__(self, session_dir):
        self.session_dir = Path(session_dir)
    @property
    def storage_kind(self):
        if (self.session_dir / "session-config.json").is_file() and (self.session_dir / "state.json").is_file():
            return "v2"
        if (self.session_dir / "state.md").is_file():
            return "legacy"
        return "missing"
    def snapshot(self):
        config = json.loads((self.session_dir / "session-config.json").read_text())
        state = json.loads((self.session_dir / "state.json").read_text())
        return {**config, **state}

class AttemptResultStore:
    def __init__(self, run_dir):
        self.run_dir = Path(run_dir)
        self.path = self.run_dir / "attempt-result.json"
    @property
    def storage_kind(self):
        return "canonical" if self.path.is_file() else "missing"
    def snapshot(self, allow_legacy=True):
        try:
            return json.loads(self.path.read_text())
        except Exception as error:
            raise AttemptResultError(str(error)) from error
'''


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
        (self.kersor / "kersor_core").mkdir()
        (self.kersor / "kersor_core" / "__init__.py").write_text(
            FAKE_KERSOR_CORE, encoding="utf-8"
        )

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
        self.assertIn("name: './plugins/kersor-status.mjs'", composition)
        self.assertIn("customSkillDirs:", composition)
        self.assertIn(str((destination / "skills").resolve()), composition)
        self.assertNotIn(str(self.kersor), composition)
        self.assertTrue((destination / "plugins" / "kersor-status.mjs").is_file())
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
            INSTALLER.render_composition(
                "- id: persona\n", skill_dir=self.root / "skills"
            )

    def test_renderer_fails_when_skill_filesystem_anchor_changes(self) -> None:
        source = STANDARD.replace("- id: skill-filesystem\n", "- id: skills-local\n")
        with self.assertRaisesRegex(RuntimeError, "skill-filesystem anchor changed"):
            INSTALLER.render_composition(source, skill_dir=self.root / "skills")

    def make_status_project(self) -> Path:
        """Create a small v2 project whose stores exercise the bridge contract."""
        project = self.root / "project"
        session = project / ".kersor" / "20260817-120000"
        run = session / "run-1"
        run.mkdir(parents=True)
        (session / "session-config.json").write_text(
            json.dumps(
                {
                    "max_workflows": 4,
                    "mode": "auto",
                    "kernel_path": "kernel.cu",
                    "started_at": "2026-08-17T12:00:00+08:00",
                }
            ),
            encoding="utf-8",
        )
        (session / "state.json").write_text(
            json.dumps(
                {
                    "phase": "optimizing",
                    "current_round": 2,
                    "target_speedup": 1.5,
                    "backend": "cuda",
                    "kernel_language": "cuda",
                }
            ),
            encoding="utf-8",
        )
        (session / "round-1-selection.json").write_text(
            json.dumps({"selected_workflow": {"name": "baseline"}}),
            encoding="utf-8",
        )
        (session / "round-1-summary.md").write_text(
            "# Round 1\n\nCONTINUE: measure another workflow.\n", encoding="utf-8"
        )
        (run / "attempt-result.json").write_text(
            json.dumps({"metric_contract": {"speedup": 1.25}}),
            encoding="utf-8",
        )
        (session / "round-2-selection.json").write_text(
            json.dumps({"selected_workflow": {"name": "adaexplore"}}),
            encoding="utf-8",
        )
        (session / "round-2-fit.json").write_text(
            json.dumps({"fit_confidence": "high"}), encoding="utf-8"
        )
        return project

    def test_status_bridge_uses_structured_kersor_stores(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        completed = subprocess.run(
            [
                sys.executable,
                str(destination / "bin" / "kersor_bridge.py"),
                "status",
                "--path",
                str(project),
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        value = json.loads(completed.stdout)
        self.assertTrue(value["found"])
        self.assertEqual(value["phase"], "optimizing")
        self.assertEqual(value["workflow"], "adaexplore")
        self.assertEqual(value["best_speedup"], 1.25)
        self.assertEqual(value["target_met"], False)
        self.assertEqual(value["rounds"][0]["decision"].split(":", 1)[0], "CONTINUE")

    def test_sessions_bridge_lists_bounded_recent_store_snapshots(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        session = project / ".kersor" / "20260817-120000"
        # The inventory is checkout-scoped, matching the installed preset's
        # canonical KerSor root rather than a caller-selected workspace.
        checkout_session = self.kersor / ".kersor" / session.name
        checkout_session.parent.mkdir()
        shutil.copytree(session, checkout_session)
        completed = subprocess.run(
            [
                sys.executable,
                str(destination / "bin" / "kersor_bridge.py"),
                "sessions",
                "--limit",
                "1",
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        value = json.loads(completed.stdout)
        self.assertEqual(len(value["sessions"]), 1)
        row = value["sessions"][0]
        self.assertEqual(row["session_id"], session.name)
        self.assertEqual(row["storage_kind"], "v2")
        self.assertEqual(row["lifecycle"], "active")
        self.assertEqual(row["health"], "active")
        self.assertEqual(row["status"], "resumable")
        self.assertEqual(row["started_at"], "2026-08-17T12:00:00+08:00")
        self.assertIsNotNone(row["last_activity_at"])
        self.assertEqual(row["best_speedup"], 1.25)
        self.assertEqual(row["kernel_name"], "kernel.cu")
        self.assertNotIn("kernel_path", row)

    def test_sessions_bridge_marks_old_continuable_session_needs_resume(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        source = project / ".kersor" / "20260817-120000"
        session = self.kersor / ".kersor" / source.name
        session.parent.mkdir()
        shutil.copytree(source, session)
        for path in session.rglob("*"):
            if path.is_file():
                os.utime(path, (1, 1))
        completed = subprocess.run(
            [
                sys.executable,
                str(destination / "bin" / "kersor_bridge.py"),
                "sessions",
                "--limit",
                "1",
                "--stale-after",
                "1",
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        row = json.loads(completed.stdout)["sessions"][0]
        self.assertEqual(row["status"], "resumable")
        self.assertEqual(row["health"], "needs_resume")

    @unittest.skipIf(shutil.which("node") is None, "Node.js is required by DSH")
    def test_status_tool_executes_and_rejects_workspace_escape(self) -> None:
        project = self.make_status_project()
        outside = self.root / "outside"
        outside.mkdir()
        plugin = ROOT / "presets" / "kersor" / "plugins" / "kersor-status.mjs"
        script = r'''
import { pathToFileURL } from 'node:url'
const plugin = await import(pathToFileURL(process.env.PLUGIN_PATH).href)
let tool
plugin.apply({ tools: { register(value) { tool = value } } })
const signal = new AbortController().signal
const exec = { signal, agent: { session: { header: { cwd: process.env.WORKSPACE } } } }
const value = await tool.execute({}, exec)
const content = tool.output.render({}, value)
const meta = tool.output.presentationMeta({}, value)
const card = tool.presentResult({}, { content, isError: false, meta })
let escaped = false
try { await tool.execute({ path: process.env.OUTSIDE }, exec) } catch { escaped = true }
console.log(JSON.stringify({ name: tool.name, value, content, meta, card, escaped }))
'''
        environment = dict(os.environ)
        environment.update(
            {
                "KERSOR_ROOT": str(self.kersor),
                "PLUGIN_PATH": str(plugin),
                "WORKSPACE": str(project),
                "OUTSIDE": str(outside),
            }
        )
        completed = subprocess.run(
            ["node", "--input-type=module", "--eval", script],
            check=False,
            capture_output=True,
            text=True,
            env=environment,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        result = json.loads(completed.stdout)
        self.assertEqual(result["name"], "kersor_status")
        self.assertIn("1.25x", result["content"][0]["text"])
        self.assertEqual(result["card"]["title"], "KerSor · optimizing · r2/4 · 1.25x")
        self.assertTrue(result["escaped"])


if __name__ == "__main__":
    unittest.main()
