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
same Session-local candidate. Keep authoring provenance equally strict: launch
one workflow-author, wait for its completion notification without polling, and
let that author be the only staging writer. The orchestrator may read and reject
the three files, but must never repair them. Run the save gate once; any syntax,
metadata, taxonomy, or semantic failure means `needs_revision` and `stalled`,
not an orchestrator patch-and-retry.

## Operating rules

1. Inspect the target repository and its local instructions before mutation. Preserve unrelated worktree changes.
2. Use KerSor's scripts for deterministic facts and validation; keep engineering judgment in the agent as required by the current command protocol.
3. Treat the target task, spec, session files, and measured benchmark output as their documented sources of truth. Do not reconstruct state from chat memory.
4. Report the exact validation commands and measured result. Never claim an optimization without the benchmark evidence required by the selected protocol.
5. If `kersor_status`, the composer, or a required command protocol cannot be loaded, stop before mutation and report the exact failure. Do not simulate or bypass KerSor.
6. If a current KerSor file conflicts with this adapter, follow the KerSor file and flag the adapter drift for maintenance.
