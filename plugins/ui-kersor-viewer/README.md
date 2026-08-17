# @deepseek-ai/dsh-client-ui-kersor-viewer

English | [中文](README.zh.md)

KerSor activity surfaces, browser half: one sidebar panel shows recent classic/Session-v2 optimization summaries from the host package [`@deepseek-ai/dsh-kersor-viewer`](../kersor-viewer/README.md), then lists autonomous-workflow runs and renders the selected run's live phase/call progress. The compact two-column Session cards show advisory health, canonical phase, last activity, round budget, best/target speedup, language/backend, integration pattern, workflow-authoring budget, Session-owned baseline-witness, DSH-compatibility, candidate-ownership and fresh-Session gates, mode, selector outcome, selected Workflow, fit confidence, storage kind, status-warning count, and a two-line preview of the latest canonical `COMPLETE`/`CONTINUE`/`STALLED` reason. Expanding a card loads an artifact-derived stage timeline plus authoring/seal/save, Proposal validation, dispatch, and measurement state. A verified author handoff unlocks read-only metadata, file hashes, rationale, and Workflow source; an in-progress or hash-mismatched handoff exposes no staging content. An inline baseline action callout distinguishes initialize, record/verify, and new-Session recovery, with the bounded canonical blocker beneath failures. Gate badges are green for pass, amber for pending, and red for fail. Stalled and cancelled Sessions suppress the advisory fit badge because a historical fit verdict cannot override their terminal decision.

When the optional Host launcher [`@deepseek-ai/dsh-kersor`](../kersor/README.md) is loaded, the same panel also lists its deployment-configured tasks and the launcher processes dsh currently owns, with Start and Stop controls. The launcher remote is deliberately not an injection dependency: if its namespace is unavailable, the panel still mounts and the controls are absent.

**One store, one Host snapshot.** The panel's facts live in a `useSyncExternalStore` observable. Initial load, panel open, and reconnect read `kersorViewer/snapshot`; replacement `kersor/event` frames then update the same atomic projection. Selecting a run reads `runBacklog` for its folded detail; expanding a classic Session reads `classicSessionDetail` and refreshes that detail while it stays selected. The API Remotes assembly is the sole owner of generated-contribution lifetime; this UI consumes the assembled namespaces without mounting them again. Launcher discovery checks `pluginInventory/list` before calling `kersor/listTasks` or `listActive`, so a read-only profile never probes absent launcher routes. Phases render as disclosure rows with the shared state dot and their agent/evaluation calls as rows with status, elapsed time, tokens and a rolled-back mark.

**The node half is empty.** All runtime behavior lives in `src/client/` and ships through the `./client` export as the browser bundle; the package's node-side `apply` exists only so the same package name participates in the browser roster. Discovery, tailing and folding are the host package's; this package renders their results.

**Three state accounts stay separate.** Classic Session snapshots, autonomous-run views, and launcher-owned process trees replace only their own store slice. A process disappearing never marks a workflow completed; KerSor's Session store, summary, and events decide status.

## Model Experience

Indirect: no prompt input originates here, the panel only invokes the registered-task remote and reads snapshot remotes, and no dsh session event is written. A running KerSor workflow's own model-visible effects belong to the KerSor process, not to dsh.

#### KV Cache effect

None: no prompt input originates here.

## Known Limitations and Deferred Work

- **A run selected in one tab is not selected in another** — the selection is per-page component state, deliberately: no host state is mutated by browsing.
- **Details follow selection** — inventory and source health update live, while a selected run backlog or classic Session inspector is fetched on selection and refreshed after reconnect or replacement snapshots.
- **Controls do not edit launch configuration** — task paths, runtime config, credentials, and environment remain Host deployment config; the browser sends only a registered task id or an exact owned run directory.
