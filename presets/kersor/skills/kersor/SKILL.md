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
kersor_root="$("${KERSOR_PYTHON:-python3}" "$bridge" root)"
```

`KERSOR_ROOT` overrides the checkout recorded by the installer. If resolution fails, stop and report the bridge diagnostic instead of guessing a path.
`KERSOR_PYTHON` is the Python 3.10+ interpreter used by every bridge call; when
unset, the DSH Host's `python3` is used. Do not replace the resolved interpreter
with a different `python3` later in the session.
The DSH controller prompt freezes the Host's validated absolute interpreter
path. Export that exact value before the first shell action and carry it into
every later command; never use `which`, PATH search, filesystem search, or
version substitution to select another Python.

Before changing a KerSor checkout, read `$kersor_root/AGENTS.md`. Before running a workflow, read the relevant current command protocol under `$kersor_root/commands/` and any file it directly names.

## Conversation ownership

In a top-level DSH conversation, do not execute the optimization protocol in
the parent. Start a new experiment with `kersor_start`, bind an existing
workspace Session with `kersor_attach`, and continue a bound experiment with
`kersor_resume`. These controls reserve and flush the Experiment-to-child
binding before a continuable DSH child starts, so the full controller dialog
and Workflow tree remain inspectable after a turn ends. `kersor_resume` always
targets the original child and never creates another dispatch.

After any successful `kersor_start`, `kersor_attach`, or `kersor_resume` call,
end the parent turn immediately. The parent must not call `kersor_status`,
`list_agents`, subagent, job, Workflow, Bash, Read, or Glob to monitor or take
over the controller; the bound child and durable checkpoints are the only
execution path. A later user request may invoke the appropriate KerSor control
again, subject to its terminal-state guard.

When the current task explicitly identifies you as that KerSor controller
child, continue with the protocol below instead of calling any of those three
parent controls. The runtime is always `dsh`; Claude/Codex tools and fallbacks
are forbidden by the controller boundary.

After `kersor_status` reports `complete`, `single_run`, `stalled`, or
`cancelled`, stop the controller turn immediately. Do not invoke Bash,
subagents, Workflow, authoring, dispatch, or any other tool after that status;
the DSH executor enforces this terminal boundary even when prose reasoning is
wrong.

## Route the request

- For a kernel file or task directory, preflight the direct route with `"${KERSOR_PYTHON:-python3}" "$bridge" compose optimize --path <path> --json`.
- For a bundled case, list or match cases first, then use `"${KERSOR_PYTHON:-python3}" "$bridge" compose build --case <id> --json`.
- For environment diagnosis, use `"${KERSOR_PYTHON:-python3}" "$bridge" doctor --runtime dsh`.
- For status, call `kersor_status` first with an empty argument object. It always reads the current DSH workspace; never pass the KerSor checkout or another filesystem path. It reads canonical Session and Attempt Result stores and renders the live round, workflow, best measured speedup, target, fit, and recent decisions.
- For resume, trace, campaign, research, export, or a named workflow, read the matching `$kersor_root/commands/<name>.md` protocol. Use `kersor_status` before resume or diagnosis so the current session—not chat memory—sets the starting point.

For a direct task, preserve an explicit typed contract as composer flags such as
`--backend python --language python_reference`; do not hide those fields in
`--note`. When the user explicitly authorizes KerSor to create a task-native
Workflow, add `--allow-workflow-authoring` and, when specified, its
`--workflow-authoring-budget`. `--yolo` is not a creation grant. Workflow
evolution remains a Research Runner capability and must follow the current
`commands/research.md` protocol when the user explicitly authorizes it.

The composer emits a `/kersor:<command>` string as validated parameter binding. It is not a shell command. Execute the matching command protocol with the tools available in DSH, preserving its gates, evidence files, confirmation points, budgets, and stop semantics.

When the user asks for a “from scratch”, “fresh”, or “从头开始” evaluation,
the route must include `--fresh-session`. Run it in a fresh worktree. A new
empty `KERSOR_SESSION_ROOT` is valid only when the task workspace itself has no
`.kersor` history. Never inspect, search, or read an older
`.kersor/<session-id>` to obtain a baseline, test method, strategy, candidate,
or measurement. If setup finds prior Session history, stop and create the
physical isolation before continuing. Prompt instructions alone are not an
acceptable freshness boundary.

Session bootstrap has one executable entrypoint. Resolve the checkout first,
pass the task path as the required first positional argument, and invoke the
owner script exactly. When the controller prompt carries a typed launch
contract, bind every uppercase value below from that contract verbatim; do not
replace it with the illustrative defaults elsewhere in this skill:

```bash
bash "$kersor_root/scripts/setup-session.sh" "$TASK_DIR" \
  --runtime dsh \
  --fresh-session \
  --integration-pattern "$INTEGRATION_PATTERN" \
  --allow-workflow-authoring \
  --workflow-authoring-budget "$WORKFLOW_AUTHORING_BUDGET" \
  --max-workflows "$MAX_WORKFLOWS" \
  --mode "$MODE" \
  --target-speedup "$TARGET_SPEEDUP" \
  --backend "$BACKEND" \
  --language "$LANGUAGE" \
  --retrieval-mode "$RETRIEVAL_MODE" \
  --transfer-mode "$TRANSFER_MODE" \
  --experience-mode "$EXPERIENCE_MODE" \
  --kernelwiki-experience-export-mode "$KERNELWIKI_EXPERIENCE_EXPORT_MODE"
```

Never call it from `commands/`: that directory owns Markdown command
protocols, not executable setup scripts. Never omit or reorder `$TASK_DIR`.
Only consume `SESSION_DIR` after this command exits successfully; a missing
entrypoint or non-zero setup is a hard stop, not permission to guess another
path.

### Task-native authoring

When the task uses a custom simulator/build system and the user asks KerSor to
create a task-native workflow, preserve that grounded topology in the direct
preflight instead of routing by filename alone:

```bash
"${KERSOR_PYTHON:-python3}" "$bridge" compose optimize --path <task-dir> \
  --integration-pattern custom_simulator \
  --allow-workflow-authoring --workflow-authoring-budget 1 --json
```

Use the exact integration pattern evidenced by the task or explicitly supplied
by the user; do not invent `custom_simulator` for an ordinary standalone task.
Conversely, when the candidate emits/schedules instructions that a repository-
local interpreter or virtual machine executes and the task-native harness
reports simulator cycles, the topology is `custom_simulator`, not `standalone`.
Freeze that fact during setup; a single Python candidate file does not make its
evaluation topology standalone.
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
`true`, `true`, `true`, the grounded integration pattern, then the exact typed
retrieval, experience, transfer, and KernelWiki export modes. Fresh isolation
defaults all four to `off`; an explicit `measured-only` transfer is permitted
only for evidence produced between rounds of this new physical Session. A
mismatch is a hard stop; do not repair raw Session JSON.

After the baseline witness passes and before selection, build the canonical
Phase 2 profiler handoff:

```bash
"${KERSOR_PYTHON:-python3}" "$kersor_root/scripts/profile-handoff.py" context \
  --session "$SESSION_DIR"
```

Read `profile-handoff/context.json`. Pass its exact `description`,
`run_in_background`, and `prompt` fields unchanged to exactly one DSH
`subagent` call in the foreground. The parent must not write/edit
`kernel-profile.md`, create a second profiler prompt, poll the child, inspect
the profile while it runs, or use prompt constants as profile evidence. The
blocking subagent result is the only completion notification.

The first parent action after that result must seal the exact profile bytes,
using the returned child Session id, before reading the file:

```bash
"${KERSOR_PYTHON:-python3}" "$kersor_root/scripts/profile-handoff.py" seal \
  --session "$SESSION_DIR" \
  --producer-session-id "$PROFILER_CHILD_SESSION_ID"
"${KERSOR_PYTHON:-python3}" "$kersor_root/scripts/profile-handoff.py" verify \
  --session "$SESSION_DIR"
```

The seal binds the profiler context, child owner, parseable fields, immutable
Session integration pattern, and profile hash. A missing/invalid seal or any
parent/post-seal edit is a hard stop: record the Profile gate failure, set the
Session to canonical `stalled`, and do not select, author, dispatch, or mutate
the candidate. `select-workflow.sh` and `author-workflow-context.py` both
re-verify this boundary for fresh Sessions; never create or patch their outputs
by hand.

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
Read `CURRENT_ROUND` from canonical Session state. Build that round's only
author context through the shell wrapper exactly; the wrapper selects the
configured Python internally and is not itself a Python file:

```bash
KERSOR_PYTHON="${KERSOR_PYTHON:-python3}" \
  bash "$kersor_root/scripts/run-kersor-python.sh" author-workflow-context.py \
  --session "$SESSION_DIR" \
  --out "$SESSION_DIR/workflow-authoring/attempts/round-$CURRENT_ROUND/author-context.json"
```

If this wrapper call fails, transition to `stalled` and stop. Never execute
`run-kersor-python.sh` with a Python interpreter or bypass it by invoking
`author-workflow-context.py` directly.
The round-scoped `author-context.json.dispatch` is the only DSH subagent
envelope: pass its
`description`, `run_in_background`, and `prompt` fields unchanged instead of
synthesizing a task summary or metadata template. The envelope launches one
workflow-author in the foreground; its blocking result is the completion
notification. Never call `list_agents`, a job tool, or inspect staging progress
while it runs.

The first parent action after that result must be
`scripts/seal-author-handoff.py`, writing
`workflow-authoring/attempts/round-$CURRENT_ROUND/author-handoff.json` beside
that round's staging directory. Do not read or edit staging first, and never
replace an existing seal. The parent may read and reject the sealed three files,
but must never repair them. Save exactly once with `--handoff` pointing to that
seal; any hash, syntax, metadata, taxonomy, or semantic failure means
`needs_revision` and canonical `stalled`, not a patch or retry. Any extra staging
file or directory is mixed provenance. Proposal persistence remains shared at
`workflow-authoring/proposals`; never reuse a sibling round's attempt owners.

Do not accept a prose-only baseline. After Session creation and before
selection or authoring, create the minimal task-native test method through the
deterministic initializer when the exact commands are already known, then
record and verify the baseline through KerSor's Session-owned witness:

```bash
kersor_python="${KERSOR_PYTHON:-python3}"
"$kersor_python" "$kersor_root/scripts/baseline-witness.py" init \
  --session "$SESSION_DIR" \
  --python-interpreter "$kersor_python" \
  --correctness-command "$CORRECTNESS_COMMAND" \
  --benchmark-command "$BENCHMARK_COMMAND"
"$kersor_python" "$kersor_root/scripts/baseline-witness.py" record \
  --session "$SESSION_DIR" --project-root "$TASK_DIR"
"$kersor_python" "$kersor_root/scripts/baseline-witness.py" verify \
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

Resolve and version-check `kersor_python` before `init`, and use that exact
executable inside every Python correctness or benchmark command passed to the
initializer. Decide both commands completely before the one allowed `init`.
Each command must invoke an existing task-owned authoritative harness directly;
do not create or reference a new helper/wrapper whose bytes can change outside
the receipt and witness bindings. A non-zero benchmark is admissible only when
it produced non-empty stdout execution evidence; a traceback or stderr-only
failure is a failed record, not a measured baseline.
If initialization, recording, or verification fails, never delete, rename, or
recreate `test-method.md`, the initialization receipt, or
`baseline-witness.json`; transition the Session to `stalled` and create a new
fresh Session after fixing the launch contract.

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
"${KERSOR_PYTHON:-python3}" "$kersor_root/scripts/candidate-ownership.py" seal \
  --session "$SESSION_DIR" \
  --run-dir "$RUN_DIR"
```

Then run the cooperative budget safe point and commit the durable dispatch
start marker before entering the blocking Workflow call:

```bash
bash "$kersor_root/scripts/check-runtime-budget.sh"
bash "$kersor_root/scripts/mark-dispatch-start.sh" "$RUN_DIR"
```

Do not omit or defer the marker. It is the canonical distinction between a
prepared run and a Workflow Host that has actually started, drives the KerSor
viewer's live dispatch state, and lets resume diagnose a Host process reaped at
a Session boundary. A non-zero safe-point or marker command is a hard stop;
transition the Session to `stalled` and do not call Workflow.

Call `kersor_workflow` exactly once with only
`{"exp_dir":"<exact absolute RUN_DIR>"}`. The Host reads and validates the
generated envelope, invokes the native DSH Workflow with its exact owned fields,
and atomically commits raw `output.json`. Never call raw `workflow`, extract or
retype the script, compare envelope hashes in the model, or write a rendered
preview yourself. The first parent action after that blocking call returns,
including an error, must verify the same boundary:

```bash
"${KERSOR_PYTHON:-python3}" "$kersor_root/scripts/candidate-ownership.py" verify \
  --session "$SESSION_DIR" \
  --run-dir "$RUN_DIR"
```

On an ownership failure, reject all child output and measurements, transition
the Session to canonical `stalled`, and stop. Restoring an oracle afterward is
recovery, not a passing result.
When the returned `output.json` declares
`arch_stage=awaiting_host_verification`, run the current optimize protocol's
deterministic authored-candidate reviewer before result analysis:

```bash
KERSOR_PYTHON="${KERSOR_PYTHON:-python3}" \
  bash "$kersor_root/scripts/run-kersor-python.sh" review-authored-candidate.py \
  --session "$SESSION_DIR" \
  --run-dir "$RUN_DIR"
```

It owns Session-local materialization and the immutable witness commands. Do
not copy the returned candidate into the canonical task, edit an oracle, use a
Workflow estimate as a measurement, or replace its Host-owned analysis.
Never pass `scriptPath`, invoke a nested `workflow()` helper, or translate the
Proposal ad hoc. If compatibility preparation or the Workflow call fails, do
not rewrite the author-owned script, retry dispatch, or optimize directly as
the parent. Transition the Session to canonical `stalled`, record the failure,
and stop at that fresh boundary.

Task tests, reference implementations, problem definitions, and benchmark
harnesses are immutable oracles. A workflow may return a candidate or exercise
a candidate-aware Session-local seam; neither child nor parent may copy-edit an
oracle to manufacture such a seam.

At Phase 6, the foreground `session-synthesizer` is the sole writer of
`round-$CURRENT_ROUND-summary.md` and
`round-$CURRENT_ROUND-transfer.json`. The controller must not write, edit,
reconstruct, or repair either artifact after a timeout or failed child. Leave
canonical phase and round unchanged and end the controller turn; a later
`kersor_resume` retries from that exact synthesis boundary. Only
`normalize-transfer.py` may atomically advance a DSH `CONTINUE` round. Never
call `kersor-state.sh ... set current_round ...` or `kersor-state.sh ...
advance ...`, and never manufacture `phase=stalled` to compensate for missing
synthesis evidence.
For an exact `COMPLETE`, the same normalizer runs KerSor's deterministic
acceptance gate against the canonical Attempt Result and target: a pass commits
`phase=complete`; a fail continues or stalls at the execution budget. Publish a
committed terminal result with one final `kersor_status`; do not substitute a
prose completion or an external Claude/Codex acceptance process.

## Operating rules

1. Inspect the target repository and its local instructions before mutation. Preserve unrelated worktree changes.
2. Use KerSor's scripts for deterministic facts and validation; keep engineering judgment in the agent as required by the current command protocol.
3. Treat the target task, spec, session files, and measured benchmark output as their documented sources of truth. Do not reconstruct state from chat memory.
4. Report the exact validation commands and measured result. Never claim an optimization without the benchmark evidence required by the selected protocol.
5. If `kersor_status`, the composer, or a required command protocol cannot be loaded, stop before mutation and report the exact failure. Do not simulate or bypass KerSor.
6. If a current KerSor file conflicts with this adapter, follow the KerSor file and flag the adapter drift for maintenance.
