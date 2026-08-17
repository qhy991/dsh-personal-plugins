# @deepseek-ai/dsh-client-ui-kersor-viewer

English | [中文](README.zh.md)

KerSor activity surfaces, browser half: one sidebar panel shows recent classic/Session-v2 optimization summaries from the host package [`@deepseek-ai/dsh-kersor-viewer`](../kersor-viewer/README.md), then lists autonomous-workflow runs and renders the selected run's live phase/call progress. The compact two-column Session cards show advisory health, canonical phase, last activity, round budget, best/target speedup, language/backend, integration pattern, workflow-authoring budget, mode, selected Workflow, fit confidence, storage kind, status-warning count, and a two-line preview of the latest canonical `COMPLETE`/`CONTINUE`/`STALLED` reason. High fit is green and low fit is amber, so dispatch readiness is visible before opening Session files; stalled and cancelled Sessions suppress that readiness badge because a historical fit verdict cannot override their terminal decision. Hovering the decision preview reveals the full reason. The section header reports both the recent inventory size and the genuinely active count, so stale `optimizing` projections no longer light the global activity dot.

When the optional Host launcher [`@deepseek-ai/dsh-kersor`](../kersor/README.md) is loaded, the same panel also lists its deployment-configured tasks and the launcher processes dsh currently owns, with Start and Stop controls. The launcher remote is deliberately not an injection dependency: if its namespace is unavailable, the panel still mounts and the controls are absent.

**One store, one snapshot path.** The panel's facts live in a `useSyncExternalStore` observable refreshed every two seconds through the generated `kersorViewer/listClassicSessions`, `listRuns`, `runBacklog`, `kersor/listTasks`, and `listActive` remotes. The client plugin mounts those generated Remote contributions itself, so a third-party install does not need to edit dsh's core Remote assembly or Host-event allowlist. Reconnect resets and immediately refreshes the same snapshot path. Phases render as disclosure rows with the shared state dot (running blue, completed green, failed red) and their agent/evaluation calls as rows with status, elapsed time, tokens and a rolled-back mark; loop re-visits each get their own bucket in execution order, so a KSearch cycle reads as separate rounds.

**The node half is empty.** All runtime behavior lives in `src/client/` and ships through the `./client` export as the browser bundle; the package's node-side `apply` exists only so the same package name participates in the browser roster. Discovery, tailing and folding are the host package's; this package renders their results.

**Three state accounts stay separate.** Classic Session snapshots, autonomous-run views, and launcher-owned process trees replace only their own store slice. A process disappearing never marks a workflow completed; KerSor's Session store, summary, and events decide status.

## Model Experience

Indirect: no prompt input originates here, the panel only invokes the registered-task remote and reads snapshot remotes, and no dsh session event is written. A running KerSor workflow's own model-visible effects belong to the KerSor process, not to dsh.

#### KV Cache effect

None: no prompt input originates here.

## Known Limitations and Deferred Work

- **A run selected in one tab is not selected in another** — the selection is per-page component state, deliberately: no host state is mutated by browsing.
- **Live state is snapshot-polled** — the two-second interval trades sub-second animation for portable third-party installation and automatic healing after missed frames or brief disconnects.
- **Controls do not edit launch configuration** — task paths, runtime config, credentials, and environment remain Host deployment config; the browser sends only a registered task id or an exact owned run directory.
