"""Regression tests for the generated DSH preset installation contract."""

from __future__ import annotations

import importlib.util
import hashlib
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
        (self.kersor / "scripts" / "profile-handoff.py").write_text(
            "import sys\n"
            "if sys.argv[1] != 'verify': raise SystemExit(2)\n"
            "print('PROFILE_EVIDENCE=pass')\n"
            "print('PROFILE_SOURCE=sealed-kernel-profiler')\n",
            encoding="utf-8",
        )
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
        self.assertIn("name: '@deepseek-ai/dsh-kersor/control'", composition)
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

    def test_skill_keeps_custom_tasks_on_bounded_authoring_route(self) -> None:
        skill = (
            ROOT / "presets" / "kersor" / "skills" / "kersor" / "SKILL.md"
        ).read_text(encoding="utf-8")
        self.assertIn("--integration-pattern custom_simulator", skill)
        self.assertIn("--allow-workflow-authoring", skill)
        self.assertIn("--workflow-authoring-budget 1", skill)
        self.assertIn('--workflow-authoring-budget "$WORKFLOW_AUTHORING_BUDGET"', skill)
        self.assertIn('--max-workflows "$MAX_WORKFLOWS"', skill)
        self.assertIn('--transfer-mode "$TRANSFER_MODE"', skill)
        self.assertNotIn("--max-workflows 1", skill)
        self.assertIn("explicit `measured-only` transfer", skill)
        self.assertIn("selection must\nremain `STALLED`", skill)
        self.assertIn("research-only\nworkflow evolution", skill)
        self.assertIn('--store "$SESSION_DIR/workflow-authoring/proposals"', skill)
        self.assertIn("Structural Proposal gates do not make", skill)
        self.assertIn("outer optimize alone installs a winner", skill)
        self.assertIn("transition the Session to `stalled`", skill)
        self.assertIn("prove candidate binding", skill)
        self.assertIn("same Session-local candidate", skill)
        self.assertIn("foreground `session-synthesizer` is the sole writer", skill)
        self.assertIn("Only\n`normalize-transfer.py` may atomically advance", skill)
        self.assertIn("Never\ncall `kersor-state.sh ... set current_round ...`", skill)
        self.assertIn("workflow-author in the foreground", skill)
        self.assertIn("`author-context.json.dispatch`", skill)
        self.assertIn("`description`, `run_in_background`, and `prompt`", skill)
        self.assertIn("blocking result is the completion\nnotification", skill)
        self.assertIn("Never call `list_agents`", skill)
        self.assertIn("`scripts/seal-author-handoff.py`", skill)
        self.assertIn(
            "`workflow-authoring/attempts/round-$CURRENT_ROUND/author-handoff.json`",
            skill,
        )
        self.assertIn(
            '--out "$SESSION_DIR/workflow-authoring/attempts/round-$CURRENT_ROUND/author-context.json"',
            skill,
        )
        self.assertIn(
            "Proposal persistence remains shared at\n"
            "`workflow-authoring/proposals`",
            skill,
        )
        self.assertIn("never reuse a sibling round's attempt owners", skill)
        self.assertIn("Save exactly once with `--handoff`", skill)
        self.assertIn("must never repair them", skill)
        self.assertIn("file or directory is mixed provenance", skill)
        self.assertIn("canonical `stalled`, not a patch or retry", skill)
        self.assertIn("Do not accept a prose-only baseline", skill)
        self.assertIn("scripts/baseline-witness.py", skill)
        self.assertIn("baseline-witness.py\" init", skill)
        self.assertIn('--correctness-command "$CORRECTNESS_COMMAND"', skill)
        self.assertIn("baseline-witness.py\" record", skill)
        self.assertIn('--session "$SESSION_DIR" --project-root "$TASK_DIR"', skill)
        self.assertIn("Output produced before Session creation", skill)
        self.assertIn("Never parse `session-config.json` directly", skill)
        self.assertIn("scripts/profile-handoff.py\" context", skill)
        self.assertIn("exact `description`,\n`run_in_background`, and `prompt`", skill)
        self.assertIn("exactly one DSH\n`subagent` call in the foreground", skill)
        self.assertIn("must not write/edit\n`kernel-profile.md`", skill)
        self.assertIn("scripts/profile-handoff.py\" seal", skill)
        self.assertIn('--producer-session-id "$PROFILER_CHILD_SESSION_ID"', skill)
        self.assertIn("scripts/profile-handoff.py\" verify", skill)
        self.assertIn("The first parent action after that result", skill)
        self.assertIn("both\nre-verify this boundary", skill)
        self.assertNotIn(
            'python3 "$kersor_root/scripts/profile-handoff.py"', skill
        )
        self.assertNotIn(
            'python3 "$kersor_root/scripts/baseline-witness.py"', skill
        )
        self.assertIn(
            '"${KERSOR_PYTHON:-python3}" '
            '"$kersor_root/scripts/profile-handoff.py"',
            skill,
        )
        self.assertIn('kersor_python="${KERSOR_PYTHON:-python3}"', skill)
        self.assertIn(
            "The DSH controller prompt freezes the Host's validated absolute "
            "interpreter\npath.",
            skill,
        )
        self.assertIn(
            "never use `which`, PATH search, filesystem search, or\nversion "
            "substitution",
            skill,
        )
        self.assertIn(
            '"$kersor_python" "$kersor_root/scripts/baseline-witness.py" init',
            skill,
        )
        self.assertIn('--python-interpreter "$kersor_python"', skill)
        self.assertIn(
            "must invoke an existing task-owned authoritative harness directly",
            skill,
        )
        self.assertIn(
            "A non-zero benchmark is admissible only when\nit produced non-empty "
            "stdout execution evidence",
            skill,
        )
        self.assertIn(
            'bash "$kersor_root/scripts/run-kersor-python.sh" '
            'author-workflow-context.py',
            skill,
        )
        self.assertIn(
            "Never execute\n`run-kersor-python.sh` with a Python interpreter",
            skill,
        )
        self.assertIn(
            "After any successful `kersor_start`, `kersor_attach`, or "
            "`kersor_resume` call,\nend the parent turn immediately.",
            skill,
        )
        self.assertIn(
            "must not call `kersor_status`,\n`list_agents`, subagent, job, "
            "Workflow, Bash, Read, or Glob",
            skill,
        )
        self.assertIn(
            "After `kersor_status` reports `complete`, `single_run`, `stalled`, or\n"
            "`cancelled`, stop the controller turn immediately.",
            skill,
        )
        self.assertIn("or any other tool after that status", skill)
        self.assertIn('bash "$kersor_root/scripts/setup-session.sh" "$TASK_DIR"', skill)
        self.assertIn("Never call it from `commands/`", skill)
        self.assertIn('kersor-state.sh" "$SESSION_DIR" get fresh_session_required', skill)
        self.assertIn('get kernelwiki_experience_export_mode', skill)
        self.assertIn("scripts/prepare-dsh-workflow.mjs", skill)
        self.assertIn('--out "$RUN_DIR/dsh-workflow.json"', skill)
        self.assertIn('--report "$RUN_DIR/dsh-compatibility.json"', skill)
        self.assertIn("Call `kersor_workflow` exactly once", skill)
        self.assertIn('`{"exp_dir":"<exact absolute RUN_DIR>"}`', skill)
        self.assertIn("Never call raw `workflow`", skill)
        self.assertIn("candidate-ownership.py\" seal", skill)
        self.assertIn("candidate-ownership.py\" verify", skill)
        self.assertIn('check-runtime-budget.sh"', skill)
        self.assertIn('mark-dispatch-start.sh" "$RUN_DIR"', skill)
        self.assertIn("canonical distinction between a\nprepared run", skill)
        self.assertIn("first parent action", skill)
        self.assertIn("Never pass `scriptPath`", skill)
        self.assertIn("not rewrite the author-owned script, retry dispatch, or optimize directly", skill)
        self.assertIn("immutable oracles", skill)
        self.assertIn("`kersor_status` first with an empty argument object", skill)
        self.assertIn("never pass the KerSor checkout", skill)

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
                    "allow_workflow_authoring": True,
                    "workflow_authoring_budget": 1,
                    "extensions": {
                        "baseline_witness_required": True,
                        "candidate_ownership_required": True,
                        "fresh_session_required": True,
                    },
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
                    "backend": "python",
                    "kernel_language": "python_reference",
                    "integration_pattern": "custom_simulator",
                }
            ),
            encoding="utf-8",
        )
        profile = session / "kernel-profile.md"
        profile.write_text(
            "# Kernel Profile\n\n"
            "## Parseable Fields\n\n"
            "- Kernel Path: kernel.cu\n"
            "- Language: python_reference\n"
            "- Backend: python\n"
            "- Integration Pattern: custom_simulator\n"
            "- Operation Type: vliw\n"
            "- Bottleneck Hypothesis: scalar issue width\n",
            encoding="utf-8",
        )
        handoff_dir = session / "profile-handoff"
        handoff_dir.mkdir()
        context = handoff_dir / "context.json"
        context.write_text(
            json.dumps({"schema_version": 1, "session_dir": str(session.resolve())})
            + "\n",
            encoding="utf-8",
        )

        def digest(path: Path) -> str:
            return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()

        (handoff_dir / "seal.json").write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "session_dir": str(session.resolve()),
                    "owner_role": "kernel-profiler",
                    "producer": {
                        "runtime": "dsh-subagent",
                        "session_id": "profile-child-123",
                    },
                    "context": {
                        "path": "profile-handoff/context.json",
                        "sha256": digest(context),
                    },
                    "profile": {
                        "path": "kernel-profile.md",
                        "sha256": digest(profile),
                    },
                }
            ),
            encoding="utf-8",
        )
        (session / "round-1-selection.json").write_text(
            json.dumps({"selected_workflow": {"name": "baseline"}}),
            encoding="utf-8",
        )
        (session / "round-1-summary.md").write_text(
            "# Round 1\n\nCONTINUE: measure another\nworkflow.\n\n## Evidence\n",
            encoding="utf-8",
        )
        (run / "attempt-result.json").write_text(
            json.dumps(
                {
                    "outcome": {"compiled": True, "correct": True},
                    "metric_contract": {"speedup": 1.25, "valid": True},
                    "optimization": {"best_improved": True},
                }
            ),
            encoding="utf-8",
        )
        (run / "host-verification.json").write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "gate": "authored_candidate_host_review_v1",
                    "verdict": "pass",
                    "correctness": {"exit_code": 0},
                    "benchmark": {"exit_code": 0},
                    "candidate": {"id": "fresh29-r1"},
                    "metric": {
                        "name": "cycles",
                        "baseline_cycles": 125,
                        "candidate_cycles": 100,
                        "speedup": 1.25,
                    },
                    "workflow_estimate": {"cycles": 105, "speedup": 1.19},
                }
            ),
            encoding="utf-8",
        )
        (session / "round-2-selection.json").write_text(
            json.dumps({"selected_workflow": {"name": "adaexplore"}}),
            encoding="utf-8",
        )
        (session / "round-2-fit.json").write_text(
            json.dumps({"fit_confidence": "high"}), encoding="utf-8"
        )
        (session / "run-2").mkdir()
        (session / "run-2" / "dsh-compatibility.json").write_text(
            json.dumps({"schema_version": 1, "verdict": "pass"}),
            encoding="utf-8",
        )
        (session / "run-2" / "candidate-ownership.json").write_text(
            json.dumps({"schema_version": 1, "verdict": "pass"}),
            encoding="utf-8",
        )
        return project

    def make_dispatch_design(self, project: Path) -> dict[str, object]:
        """Create one internally hash-bound prepared DSH Workflow projection."""
        session = project / ".kersor" / "20260817-120000"
        run = session / "run-2"
        workflow = self.kersor / "workflows" / "adaexplore" / "workflow.js"
        workflow.parent.mkdir(parents=True, exist_ok=True)
        description = "Inspect one prepared stock Workflow."
        when_to_use = "Use when the selected workflow is ready for DSH dispatch."
        workflow_source = (
            "export const meta = {\n"
            "  name: 'adaexplore',\n"
            f"  description: {description!r},\n"
            f"  whenToUse: {when_to_use!r},\n"
            "  phases: [{ title: 'Inspect', detail: 'Read the current kernel.' }],\n"
            "}\n"
            "phase('Inspect')\n"
            "return { ok: true }\n"
        )
        body = "phase('Inspect')\nreturn { ok: true }"
        args = {"kernel_path": "kernel.cu", "target_speedup": 1.5}
        workflow.write_text(workflow_source, encoding="utf-8")
        args_path = run / "dispatch-args.json"
        args_path.write_text(json.dumps(args, indent=2) + "\n", encoding="utf-8")

        def digest(value: str) -> str:
            return hashlib.sha256(value.encode("utf-8")).hexdigest()

        workflow_hash = digest(workflow_source)
        args_hash = digest(
            json.dumps(args, ensure_ascii=False, separators=(",", ":"))
        )
        body_hash = digest(body)
        envelope = {
            "schema_version": 1,
            "contract": "dsh_workflow_v1",
            "source": {
                "workflow_path": str(workflow.resolve()),
                "workflow_sha256": workflow_hash,
                "args_path": str(args_path.resolve()),
                "args_sha256": args_hash,
                "body_sha256": body_hash,
            },
            "meta": {
                "name": "adaexplore",
                "description": description,
                "whenToUse": when_to_use,
                "phases": [
                    {"title": "Inspect", "detail": "Read the current kernel."}
                ],
            },
            "script": body,
            "args": args,
        }
        compatibility = {
            "schema_version": 1,
            "gate": "dsh_workflow_v1",
            "verdict": "pass",
            "workflow_source": str(workflow.resolve()),
            "workflow_sha256": workflow_hash,
            "args_source": str(args_path.resolve()),
            "args_sha256": args_hash,
            "body_sha256": body_hash,
            "errors": [],
        }
        catalog = {
            "name": "adaexplore",
            "directory": "adaexplore",
            "js_path": str(workflow.resolve()),
            "description": description,
            "when_to_use": when_to_use,
            "topology": "pipeline",
            "method_category": "analysis",
            "workflow_content_hash": f"sha256:{workflow_hash}",
            "languages": ["python_reference"],
            "backends": ["python"],
            "integration_patterns": ["custom_simulator"],
            "required_args": ["kernel_path"],
        }
        envelope_path = run / "dsh-workflow.json"
        compatibility_path = run / "dsh-compatibility.json"
        catalog_path = run / "catalog-entry.json"
        envelope_path.write_text(json.dumps(envelope), encoding="utf-8")
        compatibility_path.write_text(json.dumps(compatibility), encoding="utf-8")
        catalog_path.write_text(json.dumps(catalog), encoding="utf-8")
        return {
            "session": session,
            "workflow_path": workflow,
            "envelope_path": envelope_path,
            "compatibility_path": compatibility_path,
            "catalog_path": catalog_path,
            "description": description,
            "when_to_use": when_to_use,
            "body": body,
        }

    def use_sealed_session_catalog(
        self,
        fixture: dict[str, object],
        entries: list[dict[str, object]] | None = None,
    ) -> tuple[Path, Path]:
        """Replace the legacy per-run catalog projection with the sealed SSOT."""
        session = fixture["session"]
        legacy_path = fixture["catalog_path"]
        self.assertIsInstance(session, Path)
        self.assertIsInstance(legacy_path, Path)
        catalog_entry = json.loads(legacy_path.read_text(encoding="utf-8"))
        catalog_path = session / "workflow-catalog.json"
        catalog_text = json.dumps(
            {"workflows": entries if entries is not None else [catalog_entry]},
            ensure_ascii=False,
            separators=(",", ":"),
        )
        catalog_path.write_text(catalog_text, encoding="utf-8")
        run = session / "run-2"
        seal_path = run / "candidate-ownership-seal.json"
        seal_path.write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "contract": "candidate_output_ownership_v1",
                    "session_dir": str(session.resolve()),
                    "run_dir": str(run.resolve()),
                    "dispatch_package": {
                        "catalog": hashlib.sha256(
                            catalog_text.encode("utf-8")
                        ).hexdigest()
                    },
                }
            ),
            encoding="utf-8",
        )
        legacy_path.unlink()
        return catalog_path, seal_path

    def read_session_detail(self, destination: Path, session: Path) -> dict[str, object]:
        """Read one installed bridge session-detail answer."""
        completed = subprocess.run(
            [
                sys.executable,
                str(destination / "bin" / "kersor_bridge.py"),
                "session-detail",
                "--session",
                str(session),
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        value = json.loads(completed.stdout)
        self.assertIsInstance(value, dict)
        return value

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
        self.assertEqual(value["integration_pattern"], "custom_simulator")
        self.assertIs(value["allow_workflow_authoring"], True)
        self.assertEqual(value["workflow_authoring_budget"], 1)
        self.assertEqual(value["baseline_witness"], "pending")
        self.assertEqual(value["baseline_next_action"], "init")
        self.assertIsNone(value["baseline_reason"])
        self.assertEqual(value["profile_evidence"], "pass")
        self.assertIsNone(value["profile_reason"])
        self.assertEqual(
            value["profile_owner"], "kernel-profiler · profile-child-123"
        )
        self.assertEqual(value["dsh_compatibility"], "pass")
        self.assertEqual(value["candidate_ownership"], "pass")
        self.assertEqual(value["fresh_session"], "pass")
        self.assertEqual(
            [step["id"] for step in value["steps"]],
            [
                "setup", "baseline", "profile", "selection", "authoring",
                "validation", "dispatch", "measurement", "decision",
            ],
        )
        self.assertEqual(value["rounds"][0]["decision"].split(":", 1)[0], "CONTINUE")

    def test_status_bridge_excludes_incorrect_estimates_from_historical_best(self) -> None:
        """Fresh24-style estimates cannot outrank a Fresh29-style Host result."""
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        session = project / ".kersor" / "20260817-120000"
        run = session / "run-2"
        (run / "attempt-result.json").write_text(
            json.dumps(
                {
                    "outcome": {
                        "compiled": True,
                        "correct": False,
                        "failure_class": "correctness_mismatch",
                    },
                    "metric_contract": {
                        "speedup": 17.924532880368844,
                        "valid": True,
                    },
                    "optimization": {"best_improved": None},
                }
            ),
            encoding="utf-8",
        )
        (run / "host-verification.json").write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "gate": "authored_candidate_host_review_v1",
                    "verdict": "fail",
                    "reason": "candidate correctness command failed",
                }
            ),
            encoding="utf-8",
        )
        (session / "round-2-summary.md").write_text(
            "# Round 2\n\nSTALLED: candidate correctness failed.\n",
            encoding="utf-8",
        )

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
        self.assertEqual(value["best_speedup"], 1.25)
        self.assertIs(value["target_met"], False)
        failed_round = next(row for row in value["rounds"] if row["round"] == 2)
        self.assertIsNone(failed_round["speedup"])

    def test_fresh29_wire_projects_terminal_lineage_and_round_history(self) -> None:
        (self.kersor / "scripts" / "baseline-witness.py").write_text(
            "import sys\n"
            "if sys.argv[1] != 'verify': raise SystemExit(2)\n"
            "print('BASELINE_WITNESS=pass')\n",
            encoding="utf-8",
        )
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        session = project / ".kersor" / "20260817-120000"
        config_path = session / "session-config.json"
        config = json.loads(config_path.read_text(encoding="utf-8"))
        config["max_workflows"] = 2
        config_path.write_text(json.dumps(config), encoding="utf-8")
        state_path = session / "state.json"
        state = json.loads(state_path.read_text(encoding="utf-8"))
        state["phase"] = "stalled"
        state_path.write_text(json.dumps(state), encoding="utf-8")
        (session / "baseline-witness.json").write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "verdict": "pass",
                    "executions": [
                        {
                            "kind": "benchmark",
                            "exit_code": 0,
                            "stdout": (
                                "CYCLES: 125\n"
                                "Speedup over baseline: 10.0\n"
                            ),
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )
        (session / "run-1" / "output.json").write_text(
            json.dumps(
                {
                    "selected_candidate_id": "fresh29-r1",
                    "estimated_cycles": 105,
                    "estimated_speedup": 1.19,
                }
            ),
            encoding="utf-8",
        )

        run = session / "run-2"
        (run / "host-verification.json").write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "gate": "authored_candidate_host_review_v1",
                    "verdict": "fail",
                    "reason": "candidate correctness command failed",
                }
            ),
            encoding="utf-8",
        )
        (run / "output.json").write_text(
            json.dumps(
                {
                    "selected_candidate_id": "fresh29-authored-r2",
                    "expected_cycles_estimate": 90,
                    "estimated_speedup": 1.3888888888888888,
                }
            ),
            encoding="utf-8",
        )
        (session / "round-2-summary.md").write_text(
            "# Round 2\n\n"
            "STALLED: execution budget exhausted; retain the verified incumbent.\n",
            encoding="utf-8",
        )
        attempt = session / "workflow-authoring" / "attempts" / "round-2"
        attempt.mkdir(parents=True)
        (attempt / "author-context.json").write_text("{}\n", encoding="utf-8")
        proposal = (
            session / "workflow-authoring" / "proposals" / "adaexplore"
        )
        proposal.mkdir(parents=True)
        (proposal / "workflow.js").write_text(
            "return { ok: true }\n", encoding="utf-8"
        )
        (proposal / "metadata.json").write_text(
            json.dumps({"name": "adaexplore"}), encoding="utf-8"
        )
        (proposal / "rationale.md").write_text(
            "Authored after the catalog route exhausted.\n", encoding="utf-8"
        )

        detail = self.read_session_detail(destination, session)
        self.assertEqual([row["number"] for row in detail["rounds"]], [1, 2])
        verified, failed = detail["rounds"]
        self.assertEqual(verified["workflow_origin"], "catalog")
        self.assertEqual(verified["candidate_id"], "fresh29-r1")
        self.assertEqual(verified["host_verdict"], "pass")
        self.assertEqual(verified["estimate"], {"cycles": 105.0, "speedup": 1.19})
        self.assertEqual(verified["measurement"]["candidate_cycles"], 100.0)
        self.assertEqual(verified["measurement"]["candidate_speedup"], 1.25)
        self.assertIs(verified["measurement"]["best_improved"], True)
        self.assertEqual(failed["workflow_origin"], "authored")
        self.assertEqual(failed["candidate_id"], "fresh29-authored-r2")
        self.assertEqual(failed["host_verdict"], "fail")
        self.assertEqual(failed["failure_kind"], "correctness")
        self.assertEqual(
            failed["estimate"],
            {"cycles": 90.0, "speedup": 1.3888888888888888},
        )
        self.assertNotIn("measurement", failed)

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
        summary = json.loads(completed.stdout)["sessions"][0]
        self.assertEqual(summary["stop_reason"], "execution_budget_exhausted")
        self.assertEqual(summary["workflow_authoring_used"], 1)
        self.assertEqual(
            summary["cycle_lineage"],
            {
                "session_baseline_cycles": 125.0,
                "best_cycles": 100.0,
                "session_speedup": 1.25,
                "task_baseline_cycles": 1250.0,
                "overall_speedup": 12.5,
            },
        )

        state_path = checkout_session / "state.json"
        state = json.loads(state_path.read_text(encoding="utf-8"))
        state.update({"phase": "stalled", "current_round": 1, "max_workflows": 3})
        state_path.write_text(json.dumps(state), encoding="utf-8")
        retried = subprocess.run(
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
        self.assertEqual(retried.returncode, 0, retried.stderr)
        self.assertEqual(
            json.loads(retried.stdout)["sessions"][0]["stop_reason"],
            "authoring_budget_exhausted",
        )

    def test_session_detail_caps_round_history_at_latest_100_in_order(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        session = project / ".kersor" / "20260817-120000"
        for number in range(3, 103):
            (session / f"run-{number}").mkdir()

        detail = self.read_session_detail(destination, session)
        numbers = [row["number"] for row in detail["rounds"]]
        self.assertEqual(len(numbers), 100)
        self.assertEqual(numbers, list(range(3, 103)))

    def test_status_bridge_projects_profile_failure_reason(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        session = project / ".kersor" / "20260817-120000"
        (session / "kernel-profile.md").unlink()
        (session / "run-2" / "profile-gate.json").write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "verdict": "fail",
                    "code": "missing_kernel_profile",
                    "reason": "Phase 2 kernel-profile.md was never produced",
                }
            ),
            encoding="utf-8",
        )
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
        self.assertEqual(value["profile_evidence"], "fail")
        self.assertIsNone(value["profile_owner"])
        self.assertEqual(
            value["profile_reason"],
            "Phase 2 kernel-profile.md was never produced",
        )

    def test_status_bridge_rejects_unsealed_fresh_profile(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        session = project / ".kersor" / "20260817-120000"
        (session / "profile-handoff" / "seal.json").unlink()
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
        self.assertEqual(value["profile_evidence"], "fail")
        self.assertEqual(
            value["profile_reason"],
            "profile handoff seal not found for fresh Session",
        )
        self.assertIsNone(value["profile_owner"])

    def test_status_bridge_rejects_unattributable_profile_producers(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        session = project / ".kersor" / "20260817-120000"
        seal_path = session / "profile-handoff" / "seal.json"
        original = json.loads(seal_path.read_text(encoding="utf-8"))

        for producer_session_id in ("none", "null", "unknown", None):
            with self.subTest(producer_session_id=producer_session_id):
                seal = json.loads(json.dumps(original))
                producer = seal["producer"]
                if producer_session_id is None:
                    producer.pop("session_id")
                else:
                    producer["session_id"] = producer_session_id
                seal_path.write_text(json.dumps(seal), encoding="utf-8")
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
                self.assertEqual(value["profile_evidence"], "fail")
                self.assertEqual(
                    value["profile_reason"],
                    "profile handoff producer provenance is invalid",
                )
                self.assertIsNone(value["profile_owner"])
                profile_step = next(
                    step for step in value["steps"] if step["id"] == "profile"
                )
                self.assertEqual(profile_step["status"], "failed")

    def test_terminal_phase_suppresses_residual_active_artifacts(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        session = project / ".kersor" / "20260817-120000"
        state_path = session / "state.json"
        authoring = session / "workflow-authoring"
        staging = authoring / "staging"
        staging.mkdir(parents=True)
        (authoring / "author-context.json").write_text("{}\n", encoding="utf-8")
        (staging / "workflow.js").write_text("return {}\n", encoding="utf-8")
        (session / "run-2" / ".dispatch-in-progress").write_text(
            "running\n", encoding="utf-8"
        )
        expected = {
            "stalled": ("stalled", "terminal-stalled"),
            "complete": ("completed", "terminal-complete"),
            "cancelled": ("cancelled", "terminal-cancelled"),
        }

        for phase, (expected_lifecycle, expected_status) in expected.items():
            with self.subTest(phase=phase):
                state = json.loads(state_path.read_text(encoding="utf-8"))
                state["phase"] = phase
                state_path.write_text(json.dumps(state), encoding="utf-8")

                status_result = subprocess.run(
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
                self.assertEqual(status_result.returncode, 0, status_result.stderr)
                status_value = json.loads(status_result.stdout)
                self.assertEqual(status_value["phase"], phase)
                self.assertIsNone(status_value["baseline_next_action"])
                self.assertNotIn(
                    "active", {step["status"] for step in status_value["steps"]}
                )

                detail_result = subprocess.run(
                    [
                        sys.executable,
                        str(destination / "bin" / "kersor_bridge.py"),
                        "session-detail",
                        "--session",
                        str(session),
                    ],
                    check=False,
                    capture_output=True,
                    text=True,
                )
                self.assertEqual(detail_result.returncode, 0, detail_result.stderr)
                detail = json.loads(detail_result.stdout)
                self.assertNotEqual(detail["authoring"]["status"], "in_progress")
                self.assertNotIn(detail["dispatch"]["status"], {"preparing", "running"})
                self.assertNotIn(
                    "active", {step["status"] for step in detail["steps"]}
                )

                sessions_result = subprocess.run(
                    [
                        sys.executable,
                        str(destination / "bin" / "kersor_bridge.py"),
                        "sessions",
                        "--limit",
                        "1",
                        "--workspace",
                        str(project),
                        "--no-checkout-root",
                    ],
                    check=False,
                    capture_output=True,
                    text=True,
                )
                self.assertEqual(sessions_result.returncode, 0, sessions_result.stderr)
                row = json.loads(sessions_result.stdout)["sessions"][0]
                self.assertEqual(row["lifecycle"], expected_lifecycle)
                self.assertEqual(row["status"], expected_status)
                self.assertEqual(row["health"], "terminal")
                self.assertNotEqual(row["status"], "resumable")
                self.assertNotEqual(row["health"], "active")

    def test_status_bridge_projects_a_fresh_boundary_failure(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        report = project / ".kersor" / "20260817-120000" / "run-2" / "fresh-session-boundary.json"
        report.write_text(
            json.dumps({"schema_version": 1, "verdict": "fail"}),
            encoding="utf-8",
        )
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
        self.assertEqual(value["fresh_session"], "fail")
        self.assertIsNone(value["baseline_next_action"])

    def test_status_bridge_projects_baseline_action_and_failure_reason(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        session = project / ".kersor" / "20260817-120000"
        method = session / "test-method.md"
        method.write_text(
            "# Test Method\n\n"
            "- Correctness Command: python tests.py correctness\n"
            "- Benchmark Command: python tests.py benchmark\n"
            "- Baseline Status: present\n",
            encoding="utf-8",
        )

        def status() -> dict[str, object]:
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
            return json.loads(completed.stdout)

        ready = status()
        self.assertEqual(ready["baseline_witness"], "pending")
        self.assertEqual(ready["baseline_next_action"], "record_verify")
        self.assertIsNone(ready["baseline_reason"])

        (session / "run-2" / "baseline-gate.json").write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "verdict": "fail",
                    "reason": "Baseline Status must be present before recording, found unknown",
                }
            ),
            encoding="utf-8",
        )
        failed = status()
        self.assertEqual(failed["baseline_witness"], "fail")
        self.assertEqual(failed["baseline_next_action"], "new_session")
        self.assertEqual(
            failed["baseline_reason"],
            "Baseline Status must be present before recording, found unknown",
        )

    def test_status_bridge_suppresses_pending_baseline_action_after_terminal_stop(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        state = project / ".kersor" / "20260817-120000" / "state.json"
        payload = json.loads(state.read_text(encoding="utf-8"))
        payload["phase"] = "stalled"
        state.write_text(json.dumps(payload), encoding="utf-8")
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
        self.assertEqual(value["phase"], "stalled")
        self.assertEqual(value["baseline_witness"], "pending")
        self.assertIsNone(value["baseline_next_action"])

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
        self.assertEqual(row["kernel_language"], "python_reference")
        self.assertEqual(row["backend"], "python")
        self.assertEqual(row["integration_pattern"], "custom_simulator")
        self.assertIs(row["allow_workflow_authoring"], True)
        self.assertEqual(row["workflow_authoring_budget"], 1)
        self.assertEqual(row["baseline_witness"], "pending")
        self.assertEqual(row["baseline_next_action"], "init")
        self.assertIsNone(row["baseline_reason"])
        self.assertEqual(row["dsh_compatibility"], "pass")
        self.assertEqual(row["candidate_ownership"], "pass")
        self.assertEqual(row["fresh_session"], "pass")
        self.assertEqual(row["selection_status"], "selected")
        self.assertEqual(row["decision"], "CONTINUE: measure another workflow.")
        self.assertNotIn("kernel_path", row)

    def test_sessions_bridge_includes_registered_dsh_workspace(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        completed = subprocess.run(
            [
                sys.executable,
                str(destination / "bin" / "kersor_bridge.py"),
                "sessions",
                "--limit",
                "1",
                "--workspace",
                str(project),
                "--workspace",
                str(project),
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        rows = json.loads(completed.stdout)["sessions"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(
            rows[0]["session_dir"],
            str((project / ".kersor" / "20260817-120000").resolve()),
        )
        self.assertEqual(rows[0]["status"], "resumable")

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

    def test_session_detail_projects_hash_bound_dispatch_design(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        fixture = self.make_dispatch_design(project)
        detail = self.read_session_detail(destination, fixture["session"])
        design = detail["workflow"]
        self.assertEqual(design["name"], "adaexplore")
        self.assertEqual(design["description"], fixture["description"])
        self.assertEqual(design["whenToUse"], fixture["when_to_use"])
        self.assertEqual(
            design["phases"],
            [{"title": "Inspect", "detail": "Read the current kernel."}],
        )
        self.assertEqual(design["topology"], "pipeline")
        self.assertEqual(design["methodCategory"], "analysis")
        self.assertEqual(design["requiredArgs"], ["kernel_path"])
        self.assertEqual(design["languages"], ["python_reference"])
        self.assertEqual(design["backends"], ["python"])
        self.assertEqual(design["integrationPatterns"], ["custom_simulator"])
        self.assertEqual(design["rationale"], fixture["when_to_use"])
        self.assertEqual(design["source"], fixture["body"])
        self.assertEqual(detail["selection"]["workflow"], "adaexplore")
        self.assertEqual(detail["dispatch"]["status"], "preparing")
        self.assertEqual(
            detail["authoring"], {"status": "not_started", "files": []}
        )

    def test_session_detail_projects_design_from_sealed_session_catalog(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        fixture = self.make_dispatch_design(project)
        self.use_sealed_session_catalog(fixture)

        detail = self.read_session_detail(destination, fixture["session"])

        self.assertEqual(detail["workflow"]["name"], "adaexplore")
        self.assertEqual(detail["workflow"]["topology"], "pipeline")
        self.assertEqual(detail["workflow"]["source"], fixture["body"])

    def test_session_detail_rejects_invalid_sealed_session_catalog(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()

        for failure in ("tampered", "duplicate", "missing_seal"):
            with self.subTest(failure=failure):
                fixture = self.make_dispatch_design(project)
                legacy_path = fixture["catalog_path"]
                self.assertIsInstance(legacy_path, Path)
                entry = json.loads(legacy_path.read_text(encoding="utf-8"))
                entries = [entry, dict(entry)] if failure == "duplicate" else [entry]
                catalog_path, seal_path = self.use_sealed_session_catalog(
                    fixture, entries
                )
                if failure == "tampered":
                    catalog_path.write_text(
                        catalog_path.read_text(encoding="utf-8") + "\n",
                        encoding="utf-8",
                    )
                elif failure == "missing_seal":
                    seal_path.unlink()

                detail = self.read_session_detail(destination, fixture["session"])
                self.assertEqual(detail["selection"]["workflow"], "adaexplore")
                self.assertNotIn("workflow", detail)

    def test_session_detail_keeps_historical_dispatch_after_checkout_changes(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        fixture = self.make_dispatch_design(project)
        fixture["workflow_path"].write_text(
            "export const meta = { name: 'new-version' }\n",
            encoding="utf-8",
        )
        detail = self.read_session_detail(destination, fixture["session"])
        self.assertEqual(detail["workflow"]["name"], "adaexplore")
        self.assertEqual(detail["workflow"]["topology"], "pipeline")
        self.assertEqual(detail["workflow"]["source"], fixture["body"])
        self.assertEqual(
            detail["authoring"], {"status": "not_started", "files": []}
        )

    def test_session_detail_rejects_workflow_source_path_outside_allowed_roots(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        fixture = self.make_dispatch_design(project)
        outside = self.root / "outside-workflow.js"
        outside.write_text("return { outside: true }\n", encoding="utf-8")
        envelope_path = fixture["envelope_path"]
        compatibility_path = fixture["compatibility_path"]
        catalog_path = fixture["catalog_path"]
        envelope = json.loads(envelope_path.read_text(encoding="utf-8"))
        compatibility = json.loads(compatibility_path.read_text(encoding="utf-8"))
        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
        envelope["source"]["workflow_path"] = str(outside.resolve())
        compatibility["workflow_source"] = str(outside.resolve())
        catalog["js_path"] = str(outside.resolve())
        envelope_path.write_text(json.dumps(envelope), encoding="utf-8")
        compatibility_path.write_text(json.dumps(compatibility), encoding="utf-8")
        catalog_path.write_text(json.dumps(catalog), encoding="utf-8")
        detail = self.read_session_detail(destination, fixture["session"])
        self.assertNotIn("workflow", detail)
        self.assertEqual(
            detail["authoring"], {"status": "not_started", "files": []}
        )

    def test_session_detail_rejects_dispatch_hash_tampering(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()

        for field in ("workflow_sha256", "args_sha256", "body_sha256"):
            with self.subTest(field=field):
                fixture = self.make_dispatch_design(project)
                compatibility_path = fixture["compatibility_path"]
                compatibility = json.loads(
                    compatibility_path.read_text(encoding="utf-8")
                )
                compatibility[field] = "0" * 64
                compatibility_path.write_text(
                    json.dumps(compatibility), encoding="utf-8"
                )
                detail = self.read_session_detail(destination, fixture["session"])
                self.assertEqual(detail["selection"]["workflow"], "adaexplore")
                self.assertNotIn("workflow", detail)
                self.assertEqual(
                    detail["authoring"], {"status": "not_started", "files": []}
                )

    def test_session_detail_rejects_dispatch_name_tampering(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()

        for target in ("envelope", "catalog"):
            with self.subTest(target=target):
                fixture = self.make_dispatch_design(project)
                path = (
                    fixture["envelope_path"]
                    if target == "envelope"
                    else fixture["catalog_path"]
                )
                payload = json.loads(path.read_text(encoding="utf-8"))
                if target == "envelope":
                    payload["meta"]["name"] = "other-workflow"
                else:
                    payload["name"] = "other-workflow"
                path.write_text(json.dumps(payload), encoding="utf-8")
                detail = self.read_session_detail(destination, fixture["session"])
                self.assertEqual(detail["selection"]["workflow"], "adaexplore")
                self.assertNotIn("workflow", detail)
                self.assertEqual(
                    detail["authoring"], {"status": "not_started", "files": []}
                )

    def test_session_detail_rejects_oversized_dispatch_body(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        fixture = self.make_dispatch_design(project)
        envelope_path = fixture["envelope_path"]
        compatibility_path = fixture["compatibility_path"]
        envelope = json.loads(envelope_path.read_text(encoding="utf-8"))
        compatibility = json.loads(compatibility_path.read_text(encoding="utf-8"))
        oversized = "x" * (512 * 1024 + 1)
        body_hash = hashlib.sha256(oversized.encode("utf-8")).hexdigest()
        envelope["script"] = oversized
        envelope["source"]["body_sha256"] = body_hash
        compatibility["body_sha256"] = body_hash
        envelope_path.write_text(json.dumps(envelope), encoding="utf-8")
        compatibility_path.write_text(json.dumps(compatibility), encoding="utf-8")
        detail = self.read_session_detail(destination, fixture["session"])
        self.assertEqual(detail["selection"]["workflow"], "adaexplore")
        self.assertNotIn("workflow", detail)
        self.assertEqual(
            detail["authoring"], {"status": "not_started", "files": []}
        )

    def test_session_detail_withholds_design_until_a_verified_seal(self) -> None:
        destination, _, _ = self.run_install()
        project = self.make_status_project()
        session = project / ".kersor" / "20260817-120000"
        authoring = session / "workflow-authoring"
        staging = authoring / "staging"
        staging.mkdir(parents=True)
        (authoring / "author-context.json").write_text("{}\n", encoding="utf-8")
        files = {
            "workflow.js": "export const meta = {}\nreturn {}\n",
            "metadata.json": json.dumps(
                {
                    "name": "vliw-author",
                    "technique": "instruction_scheduling",
                    "required_args": ["kernel_path"],
                    "languages": ["python_reference"],
                    "backends": ["python"],
                    "integration_patterns": ["custom_simulator"],
                }
            )
            + "\n",
            "rationale.md": "# VLIW author\n\nBundle independent slots.\n",
        }
        for name, content in files.items():
            (staging / name).write_text(content, encoding="utf-8")

        command = [
            sys.executable,
            str(destination / "bin" / "kersor_bridge.py"),
            "session-detail",
            "--session",
            str(session),
        ]
        before = subprocess.run(command, check=False, capture_output=True, text=True)
        self.assertEqual(before.returncode, 0, before.stderr)
        before_value = json.loads(before.stdout)
        self.assertEqual(before_value["authoring"], {"status": "in_progress", "files": []})
        self.assertNotIn("workflow", before_value)

        sealed = {
            "schema_version": 1,
            "staging": str(staging.resolve()),
            "files": {
                name: "sha256:" + hashlib.sha256(content.encode()).hexdigest()
                for name, content in files.items()
            },
        }
        (authoring / "author-handoff.json").write_text(json.dumps(sealed), encoding="utf-8")
        after = subprocess.run(command, check=False, capture_output=True, text=True)
        self.assertEqual(after.returncode, 0, after.stderr)
        after_value = json.loads(after.stdout)
        self.assertEqual(after_value["authoring"]["status"], "sealed")
        self.assertEqual(after_value["authoring"]["design"]["name"], "vliw-author")
        self.assertNotIn("workflow", after_value)
        self.assertNotIn("methodCategory", after_value["authoring"]["design"])
        self.assertNotIn("topology", after_value["authoring"]["design"])
        self.assertIn("Bundle independent slots", after_value["authoring"]["design"]["rationale"])
        self.assertEqual(after_value["selection"]["status"], "selected")

        (staging / "workflow.js").write_text("tampered\n", encoding="utf-8")
        tampered = subprocess.run(command, check=False, capture_output=True, text=True)
        self.assertEqual(tampered.returncode, 0, tampered.stderr)
        tampered_value = json.loads(tampered.stdout)
        self.assertEqual(tampered_value["authoring"]["status"], "rejected")
        self.assertEqual(tampered_value["authoring"]["omittedReason"], "hash_mismatch")
        self.assertNotIn("design", tampered_value["authoring"])

    @unittest.skipIf(shutil.which("node") is None, "Node.js is required by DSH")
    def test_status_tool_executes_for_the_current_workspace_only(self) -> None:
        project = self.make_status_project()
        poisoned = self.root / "poisoned-path"
        poisoned.mkdir()
        fake_python = poisoned / "python3"
        fake_python.write_text("#!/bin/sh\nexit 97\n", encoding="utf-8")
        fake_python.chmod(0o755)
        plugin = ROOT / "presets" / "kersor" / "plugins" / "kersor-status.mjs"
        script = r'''
import { pathToFileURL } from 'node:url'
const plugin = await import(pathToFileURL(process.env.PLUGIN_PATH).href)
let tool
plugin.apply({ tools: { register(value) { tool = value } } })
const signal = new AbortController().signal
const exec = { signal, agent: { session: { header: { cwd: process.env.WORKSPACE } } } }
const value = await tool.execute({}, exec)
const schemaKeys = Object.keys(tool.output.schema.properties).sort()
const valueKeys = Object.keys(value).sort()
const requiredKeys = [...tool.output.schema.required].sort()
if (JSON.stringify(schemaKeys) !== JSON.stringify(valueKeys)) {
  throw new Error(`status schema/value drift: schema=${schemaKeys} value=${valueKeys}`)
}
if (JSON.stringify(requiredKeys) !== JSON.stringify(valueKeys)) {
  throw new Error(`status required/value drift: required=${requiredKeys} value=${valueKeys}`)
}
const content = tool.output.render({}, value)
const meta = tool.output.presentationMeta({}, value)
const card = tool.presentResult({}, { content, isError: false, meta })
console.log(JSON.stringify({
  name: tool.name,
  description: tool.description,
  parameterProperties: tool.parameters.properties,
  value,
  content,
  meta,
  card,
}))
'''
        environment = dict(os.environ)
        environment.update(
            {
                "KERSOR_ROOT": str(self.kersor),
                "PLUGIN_PATH": str(plugin),
                "WORKSPACE": str(project),
                "KERSOR_PYTHON": sys.executable,
                "PATH": f"{poisoned}{os.pathsep}{environment.get('PATH', '')}",
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
        self.assertEqual(result["meta"]["kind"], "kersor-status")
        self.assertEqual(len(result["meta"]["steps"]), 9)
        self.assertEqual(result["value"]["started_at"], "2026-08-17T12:00:00+08:00")
        self.assertEqual(result["meta"]["started_at"], "2026-08-17T12:00:00+08:00")
        self.assertEqual(result["meta"]["integration_pattern"], "custom_simulator")
        self.assertIs(result["meta"]["allow_workflow_authoring"], True)
        self.assertEqual(result["meta"]["baseline_witness"], "pending")
        self.assertEqual(result["meta"]["baseline_next_action"], "init")
        self.assertEqual(result["meta"]["profile_evidence"], "pass")
        self.assertIsNone(result["meta"]["profile_reason"])
        self.assertEqual(
            result["meta"]["profile_owner"],
            "kernel-profiler · profile-child-123",
        )
        self.assertEqual(result["meta"]["dsh_compatibility"], "pass")
        self.assertEqual(result["meta"]["candidate_ownership"], "pass")
        self.assertIn("custom_simulator", result["content"][0]["text"])
        self.assertIn("enabled · budget 1", result["content"][0]["text"])
        self.assertIn("| pending | pass | pass |", result["content"][0]["text"])
        self.assertIn("Baseline next action: init", result["content"][0]["text"])
        self.assertIn(
            "Profile owner: kernel-profiler · profile-child-123",
            result["content"][0]["text"],
        )
        self.assertIn("1.25x", result["content"][0]["text"])
        self.assertEqual(result["card"]["title"], "KerSor · optimizing · r2/4 · 1.25x")
        self.assertEqual(result["parameterProperties"], {})
        self.assertIn("empty argument object", result["description"])


if __name__ == "__main__":
    unittest.main()
