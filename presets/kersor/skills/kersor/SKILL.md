---
name: kersor
description: Route local task evolution, benchmarked optimization, workflow execution, status, resume, trace, and diagnosis through the installed KerSor checkout
---

# KerSor DSH bridge

This skill is an adapter. The KerSor checkout owns its commands, defaults, workflow policy, and completion rules; do not restate or guess them here.

## Resolve the checkout

Use the bridge installed beside this skill:

```bash
bridge="${DSH_HOME:-$HOME/.dsh}/.agent-presets/kersor/bin/kersor_bridge.py"
kersor_root="$(python3 "$bridge" root)"
```

`KERSOR_ROOT` overrides the checkout recorded by the installer. If resolution fails, stop and report the bridge diagnostic instead of guessing a path.

Before changing a KerSor checkout, read `$kersor_root/AGENTS.md`. Before running a workflow, read the relevant current command protocol under `$kersor_root/commands/` and any file it directly names.

## Route the request

- For a kernel file or task directory, preflight the direct route with `python3 "$bridge" compose optimize --path <path> --json`.
- For a bundled case, list or match cases first, then use `python3 "$bridge" compose build --case <id> --json`.
- For environment diagnosis, use `python3 "$bridge" doctor --runtime auto`.
- For status, call `kersor_status` first with an empty argument object. It always reads the current DSH workspace; never pass the KerSor checkout or another filesystem path. It reads canonical Session and Attempt Result stores and renders the live round, workflow, best measured speedup, target, fit, and recent decisions.
- For resume, trace, campaign, research, export, or a named workflow, read the matching `$kersor_root/commands/<name>.md` protocol. Use `kersor_status` before resume or diagnosis so the current session—not chat memory—sets the starting point.

The composer emits a `/kersor:<command>` string as validated parameter binding. It is not a shell command. Execute the matching command protocol with the tools available in DSH, preserving its gates, evidence files, confirmation points, budgets, and stop semantics.

When the user asks for a “from scratch”, “fresh”, or “从头开始” evaluation,
the route must include `--fresh-session`. Run it in a fresh worktree. A new
empty `KERSOR_SESSION_ROOT` is valid only when the task workspace itself has no
`.kersor` history. Never inspect, search, or read an older
`.kersor/<session-id>` to obtain a baseline, test method, strategy, candidate,
or measurement. If setup finds prior Session history, stop and create the
physical isolation before continuing. Prompt instructions alone are not an
acceptable freshness boundary.

### Task-native authoring

When the task uses a custom simulator/build system and the user asks KerSor to
create a task-native workflow, preserve that grounded topology in the direct
preflight instead of routing by filename alone:

```bash
python3 "$bridge" compose optimize --path <task-dir> \
  --integration-pattern custom_simulator \
  --allow-workflow-authoring --workflow-authoring-budget 1 --json
```

Use the exact integration pattern evidenced by the task or explicitly supplied
by the user; do not invent `custom_simulator` for an ordinary standalone task.
After setup and before mutation, verify the frozen Session language/backend and
integration pattern. If every released workflow is incompatible, selection must
remain `STALLED` until Phase 3.6 validates and re-catalogs a Proposal. Do not
bypass KerSor by editing the candidate first, and do not request research-only
workflow evolution through the stable `/kersor:optimize` path.

Never parse `session-config.json` directly to verify the setup contract. Its
immutable storage groups compatibility fields under `extensions`, while the
supported state adapter owns the stable projected names. Read each fact through
that adapter and compare the exact value before baseline initialization:

```bash
bash "$kersor_root/scripts/kersor-state.sh" "$SESSION_DIR" get fresh_session_required
bash "$kersor_root/scripts/kersor-state.sh" "$SESSION_DIR" get baseline_witness_required
bash "$kersor_root/scripts/kersor-state.sh" "$SESSION_DIR" get candidate_ownership_required
bash "$kersor_root/scripts/kersor-state.sh" "$SESSION_DIR" get integration_pattern
bash "$kersor_root/scripts/kersor-state.sh" "$SESSION_DIR" get retrieval_mode
bash "$kersor_root/scripts/kersor-state.sh" "$SESSION_DIR" get experience_mode
bash "$kersor_root/scripts/kersor-state.sh" "$SESSION_DIR" get transfer_mode
bash "$kersor_root/scripts/kersor-state.sh" "$SESSION_DIR" get kernelwiki_experience_export_mode
```

For a fresh task-native authoring run the expected values are respectively
`true`, `true`, `true`, the grounded integration pattern, then four `off`
values. A mismatch is a hard stop; do not repair raw Session JSON.

In DSH Workspace Write, Phase 3.6 must keep the Proposal Registry below the
Session: save with `--store "$SESSION_DIR/workflow-authoring/proposals"` and
regenerate the Catalog with the same path in `KERSOR_PROPOSALS_DIR`. Do not fall
back to the checkout-level Proposal store, which is outside the task boundary.

Before dispatch, perform the semantic output-ownership review required by the
current optimize protocol. Structural Proposal gates do not make an in-place
checkpoint write safe: the authored workflow must return candidate code or
evaluate a Session-local copy, while outer optimize alone installs a winner
after correctness and objective proof. On a KILL/needs-revision stop, use
KerSor's state tool to transition the Session to `stalled`, then confirm the
terminal state with `kersor_status`; a Markdown summary is not a state change.
The review must also prove candidate binding: importing a candidate is
insufficient when the invoked harness still resolves the canonical
implementation. Correctness and benchmark evidence must name and execute the
same Session-local candidate. Keep authoring provenance equally strict.
`author-context.json.dispatch` is the only DSH subagent envelope: pass its
`description`, `run_in_background`, and `prompt` fields unchanged instead of
synthesizing a task summary or metadata template. The envelope launches one
workflow-author in the foreground; its blocking result is the completion
notification. Never call `list_agents`, a job tool, or inspect staging progress
while it runs.

The first parent action after that result must be
`scripts/seal-author-handoff.py`, writing
`workflow-authoring/author-handoff.json` outside staging. Do not read or edit
staging first, and never replace an existing seal. The parent may read and
reject the sealed three files, but must never repair them. Save exactly once
with `--handoff` pointing to that seal; any hash, syntax, metadata, taxonomy, or
semantic failure means `needs_revision` and canonical `stalled`, not a patch or
retry. Any extra staging file or directory is mixed provenance.

Do not accept a prose-only baseline. After Session creation and before
selection or authoring, create the minimal task-native test method through the
deterministic initializer when the exact commands are already known, then
record and verify the baseline through KerSor's Session-owned witness:

```bash
python3 "$kersor_root/scripts/baseline-witness.py" init \
  --session "$SESSION_DIR" \
  --correctness-command "$CORRECTNESS_COMMAND" \
  --benchmark-command "$BENCHMARK_COMMAND"
python3 "$kersor_root/scripts/baseline-witness.py" record \
  --session "$SESSION_DIR" --project-root "$TASK_DIR"
python3 "$kersor_root/scripts/baseline-witness.py" verify \
  --session "$SESSION_DIR"
```

`test-method.md` owns the exact correctness and benchmark commands. The
initializer atomically writes both commands and `Baseline Status: present`,
rejects blank/multiline input, and never overwrites an existing owner. Do not
hand-format a minimal `test-method.md` or wrap its command values in Markdown
code spans. The
immutable witness binds their post-Session execution to the Session config and
kernel hash. Output produced before Session creation, or a historical cycle
count copied into Markdown, is not execution evidence. A failed witness is a
hard stop; do not select, author, dispatch, or mutate the candidate.

After KerSor's dispatch-args, harness-binding, and output-ownership gates pass,
convert the sealed Proposal to the one portable DSH wire contract before
calling the Workflow tool:

```bash
node "$kersor_root/scripts/prepare-dsh-workflow.mjs" \
  --script "$PROPOSAL_DIR/workflow.js" \
  --args-file "$RUN_DIR/dispatch-args.json" \
  --out "$RUN_DIR/dsh-workflow.json" \
  --report "$RUN_DIR/dsh-compatibility.json"
```

After compatibility passes, seal the host-owned candidate boundary exactly
once, before the Workflow call:

```bash
python3 "$kersor_root/scripts/candidate-ownership.py" seal \
  --session "$SESSION_DIR" \
  --run-dir "$RUN_DIR"
```

Read the generated envelope and call the Workflow tool exactly once as
`Workflow({meta: envelope.meta, script: envelope.script, args: envelope.args})`.
The first parent action after that blocking call returns, including an error,
must verify the same boundary:

```bash
python3 "$kersor_root/scripts/candidate-ownership.py" verify \
  --session "$SESSION_DIR" \
  --run-dir "$RUN_DIR"
```

On an ownership failure, reject all child output and measurements, transition
the Session to canonical `stalled`, and stop. Restoring an oracle afterward is
recovery, not a passing result.
Never pass `scriptPath`, invoke a nested `workflow()` helper, or translate the
Proposal ad hoc. If compatibility preparation or the Workflow call fails, do
not rewrite the author-owned script, retry dispatch, or optimize directly as
the parent. Transition the Session to canonical `stalled`, record the failure,
and stop at that fresh boundary.

Task tests, reference implementations, problem definitions, and benchmark
harnesses are immutable oracles. A workflow may return a candidate or exercise
a candidate-aware Session-local seam; neither child nor parent may copy-edit an
oracle to manufacture such a seam.

## Operating rules

1. Inspect the target repository and its local instructions before mutation. Preserve unrelated worktree changes.
2. Use KerSor's scripts for deterministic facts and validation; keep engineering judgment in the agent as required by the current command protocol.
3. Treat the target task, spec, session files, and measured benchmark output as their documented sources of truth. Do not reconstruct state from chat memory.
4. Report the exact validation commands and measured result. Never claim an optimization without the benchmark evidence required by the selected protocol.
5. If `kersor_status`, the composer, or a required command protocol cannot be loaded, stop before mutation and report the exact failure. Do not simulate or bypass KerSor.
6. If a current KerSor file conflicts with this adapter, follow the KerSor file and flag the adapter drift for maintenance.
