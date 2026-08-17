# kersor-viewer — KerSor activity viewer

English | [中文](README.zh.md)

Viewer for [KerSor](https://github.com/qhy991/KerSor) activity inside the dsh Web UI. It exposes two intentionally separate projections: recent optimization Sessions (including the existing classic `state.md` format) and live autonomous-workflow runs. This host package asks the installed KerSor preset bridge for bounded Session summaries, discovers autonomous run directories, tails each active run's `.runtime/events.jsonl`, and exposes both snapshot paths through generated remotes. The browser half lives in [`@deepseek-ai/dsh-client-ui-kersor-viewer`](../ui-kersor-viewer/README.md).

KerSor remains the single state owner. The bridge imports KerSor's canonical `SessionStore` and `AttemptResultStore`; the TypeScript package does not reimplement legacy frontmatter parsing. The viewer uses DSH's `workspaceRegistry` as the canonical list of managed projects and automatically scans each registered workspace's `.kersor/` child. If the preset is absent, classic Session inventory is quietly unavailable while autonomous run discovery continues.

This package is observation-only. To start a finite deployment-configured set of Missions from the same panel, compose the sibling launcher [`@deepseek-ai/dsh-kersor`](../kersor/README.md). KerSor run files remain authoritative whether or not that launcher is loaded.

## Configuration

The plugin row accepts config in `cordis.patch.yml`:

```yaml
- id: kersor-viewer
  name: '@deepseek-ai/dsh-kersor-viewer'
  config:
    roots:
      - /absolute/path/to/kersor/.kersor
    noDefaultRoots: false
    scanIntervalMs: 5000
    classicSessionLimit: 20
    classicStaleAfterSeconds: 1800
```

- `roots` — extra directories whose direct children are KerSor Sessions, scanned in addition to registered DSH workspaces and the defaults.
- `noDefaultRoots` — disable the built-in roots: `~/.local/share/kersor`, `~/Agent4Kernel/KerSor/.kersor`, and the checkout recorded by the installed `kersor` preset (or `KERSOR_ROOT`) with `/.kersor` appended. Registered DSH workspaces remain visible because they are task state, not fallback defaults.
- `scanIntervalMs` — run-discovery rescan interval (minimum 500 ms).
- `classicSessionLimit` — recent optimization Sessions returned by the installed preset bridge (`0` disables, maximum `100`, default `20`).
- `classicStaleAfterSeconds` — advisory inactivity threshold for unfinished Sessions (default `1800`, maximum one day), matching the KerSor TUI/doctor default.

A summary with `workflow_status: "waiting"` is terminal for discovery: the KerSor controller has stopped and written its summary, even though the workflow is awaiting external input rather than semantically completed.

Classic Session cards keep KerSor's canonical phase separate from advisory health. Stable-artifact activity within the threshold is `active`; an old clean `CONTINUE` boundary is `needs_resume`; other unfinished old work is `stale`; terminal phases are `terminal`. Elapsed time never mutates phase. The bounded projection also carries language/backend, integration pattern, the workflow-authoring gate/budget, strict fresh-Session isolation, Session-owned baseline-witness status plus its artifact-driven next action and bounded canonical blocker, DSH-workflow compatibility, host-owned candidate-output ownership, and the latest canonical protocol decision so routing, dispatch, or write-boundary drift is visible without opening Session files. It includes the last stable-artifact timestamp, and a missing absolute kernel path becomes a path-free warning rather than leaking the old local path to the browser.

## Layout

| File | Role |
|---|---|
| `src/service.ts` | Host half: cached Session/run snapshots, tailing, folding, and generated remotes |
| `src/classic.ts` | Bounded no-shell invocation of the installed preset bridge and wire-shape validation |
| `src/scanner.ts` | Root scanning: session-v2 directories and their `autonomous-runs/` children |
| `src/tailer.ts` | Position-tracking `events.jsonl` tail with truncation detection |
| `src/fold.ts` | Pure fold of the KerSor event stream into the view model |
