# @deepseek-ai/dsh-client-ui-kersor-viewer

English | [中文](README.zh.md)

KerSor autonomous-workflow surfaces, browser half: a sidebar panel that lists the runs the host package [`@deepseek-ai/dsh-kersor-viewer`](../kersor-viewer/README.md) discovered and renders the selected run's live phase/call progress, styled after the workflow-run progress card.

When the optional Host launcher [`@deepseek-ai/dsh-kersor`](../kersor/README.md) is loaded, the same panel also lists its deployment-configured tasks and the launcher processes dsh currently owns, with Start and Stop controls. If the launcher namespace is unavailable, the controls are absent and the read-only viewer behaves exactly as before.

**One store, two feeds.** The panel's facts live in a `useSyncExternalStore` observable fed from both directions: the `kersorViewer/listRuns` remote call populates the run inventory when the panel opens or reconnects, and the forwarded `kersor/event` Host event pushes inventory changes and folded run-view updates while the page is open. Phases render as disclosure rows with the shared state dot (running blue, completed green, failed red) and their agent/evaluation calls as rows with status, elapsed time, tokens and a rolled-back mark; loop re-visits each get their own bucket in execution order, so a KSearch cycle reads as separate rounds.

**The node half is empty.** All runtime behavior lives in `src/client/` and ships through the `./client` export as the browser bundle; the package's node-side `apply` exists only so the same package name participates in the browser roster. Discovery, tailing and folding are the host package's; this package renders their results.

**Two state accounts stay separate.** Launcher frames replace only the list of process trees dsh owns. Viewer frames replace or fold KerSor run state. A process disappearing never marks a workflow completed; the KerSor summary and events decide that status.

## Model Experience

Indirect: no prompt input originates here, the panel only invokes the registered-task remote and reads remotes and forwarded events, and no dsh session event is written. A running KerSor workflow's own model-visible effects belong to the KerSor process, not to dsh.

#### KV Cache effect

None: no prompt input originates here.

## Known Limitations and Deferred Work

- **A run selected in one tab is not selected in another** — the selection is per-page component state, deliberately: no host state is mutated by browsing.
- **Backlog is fetched on selection, then only events update it** — a page opened mid-run receives the host's folded backlog once and live frames after; a missed frame (brief disconnect) is healed by re-selecting the run, which re-reads the backlog. Automatic re-fetch on reconnect is deferred.
- **Controls do not edit launch configuration** — task paths, runtime config, credentials, and environment remain Host deployment config; the browser sends only a registered task id or an exact owned run directory.
