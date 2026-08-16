# kersor-viewer — KerSor autonomous-workflow viewer

English | [中文](README.zh.md)

Live viewer for [KerSor](https://github.com/qhy991/KerSor) autonomous-workflow runs inside the dsh Web UI. This host package discovers run directories under KerSor session roots, tails each active run's `.runtime/events.jsonl`, folds the event stream into a phase/call view model, and pushes updates to every open browser page through the forwarded `kersor/event` Host event. The browser half lives in the separate bridge package [`@deepseek-ai/dsh-client-ui-kersor-viewer`](../ui-kersor-viewer/README.md) and renders the run inventory and live progress in a sidebar panel, styled after the workflow-run progress card.

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
```

- `roots` — extra KerSor session roots scanned in addition to the defaults.
- `noDefaultRoots` — disable the built-in default roots (`~/.local/share/kersor`, `~/Agent4Kernel/KerSor/.kersor`).
- `scanIntervalMs` — run-discovery rescan interval (minimum 500 ms).

A summary with `workflow_status: "waiting"` is terminal for discovery: the KerSor controller has stopped and written its summary, even though the workflow is awaiting external input rather than semantically completed.

## Layout

| File | Role |
|---|---|
| `src/service.ts` | Host half: discovery, tailing, folding, `kersor/event` emission, `listRuns`/`runBacklog` remotes |
| `src/scanner.ts` | Root scanning: session-v2 directories and their `autonomous-runs/` children |
| `src/tailer.ts` | Position-tracking `events.jsonl` tail with truncation detection |
| `src/fold.ts` | Pure fold of the KerSor event stream into the view model |
