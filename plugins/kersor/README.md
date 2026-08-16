# kersor — registered KerSor Mission launcher

English | [中文](README.zh.md)

Host plugin that makes [KerSor](https://github.com/qhy991/KerSor) autonomous Missions launchable from dsh without turning the browser into a shell. Deployment config registers a finite task list. The remote surface can list those tasks, start one through KerSor's Session-binding runner, list process trees still owned by dsh, and stop an owned tree.

KerSor remains the source of truth for Mission validation, workflow state, event history, summaries, artifacts, and resume behavior. This package owns only launch authorization, explicit credential forwarding, and process-tree lifecycle. Pair it with [`@deepseek-ai/dsh-kersor-viewer`](../kersor-viewer/README.md) and [`@deepseek-ai/dsh-client-ui-kersor-viewer`](../ui-kersor-viewer/README.md) to observe workflow state and expose the optional controls in the Web UI.

## Configuration

Add the Host plugin through an overlay such as `~/.dsh/cordis.patch.yml`:

```yaml
- id: kersor
  name: '@deepseek-ai/dsh-kersor'
  config:
    root: /absolute/path/to/KerSor
    python: /absolute/path/to/python3
    tasks:
      - id: memo
        label: Build repository memo
        mission: /absolute/path/to/memo.mission.json
        runtimeConfig: /absolute/path/to/codex-runtime.json
    credentialRefs:
      - INFINI_API_KEY
    env:
      NO_PROXY: 127.0.0.1,localhost
    maxOutputBytes: 65536
    stopGraceMs: 3000
```

- `root` is the absolute KerSor checkout containing `scripts/run-autonomous-workflow.py`.
- `python` is an absolute executable or bare `PATH` name in the subprocess provider's execution world.
- `tasks` is the complete browser-launchable registry. `mission` and optional `runtimeConfig` paths must be absolute; remote callers submit only the task `id`.
- `credentialRefs` are resolved from dsh's credential provider for each launch and forwarded under the same environment names. Secret values never enter the task listing or launch receipt.
- `env` contains explicit non-secret child entries. It does not inherit credential-shaped variables scrubbed by the subprocess boundary.
- `maxOutputBytes` bounds each captured launcher stream; `stopGraceMs` controls TERM-to-KILL escalation.

The Mission must be a JSON `kersor-mission-v1` document. Its `workspace`, `session`, and `runtime` route the canonical KerSor runner. Relative Mission paths resolve from the Mission file itself; no equivalent routing fields exist in plugin config.

## Runtime semantics

`start(taskId)` returns after dsh owns the process tree and includes the generated `runId` and expected `runDir`. It does not claim that the workflow started successfully or completed. `listActive()` is only an inventory of launcher processes still owned by this dsh process. Workflow status comes from KerSor run files through the viewer.

Plugin disposal terminates and joins every owned process tree. A dsh restart does not reconstruct ownership of an already detached KerSor process; its run files remain discoverable by the viewer.

## Model Experience

Indirect and out of process. The plugin adds no text to a dsh Session and does not rewrite KerSor prompts. It launches the configured KerSor runtime, whose planner and worker prompts, model selection, and artifacts remain KerSor concerns.

#### KV Cache effect

None in dsh. The launched KerSor runtime owns any model-side cache behavior.

## Known Limitations and Deferred Work

- Tasks are static deployment config. Editing Missions, runtime configs, or arbitrary command arguments from the browser is intentionally unsupported.
- Resume is not exposed remotely. KerSor's canonical runner remains the owner of resume validation and policy.
- Launcher stdout/stderr is bounded for diagnostics but not exposed to browsers. Workflow diagnostics should be read from KerSor's `.runtime` files.
- The launcher does not infer workflow success from process exit; the viewer's folded KerSor state is authoritative.
