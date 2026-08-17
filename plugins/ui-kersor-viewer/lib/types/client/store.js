/**
 * Browser-side KerSor viewer store. One Host snapshot owns inventory,
 * classic Sessions, and source health; folded run views and launcher process
 * ownership remain orthogonal client-side accounts.
 * @module @deepseek-ai/dsh-client-ui-kersor-viewer/client
 */
/** Snapshot store over the Host projection and per-run folded views. */
export class KersorViewerStore {
    state = { views: new Map(), loading: true };
    listeners = new Set();
    selected;
    /** Stable snapshot for useSyncExternalStore. */
    getSnapshot = () => this.state;
    /** Subscribe to snapshot replacements. */
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };
    /** Latest run inventory joined with independently folded views. */
    get rows() {
        return (this.state.snapshot?.runs ?? []).map(ref => ({
            ...ref,
            view: this.state.views.get(ref.runDir),
        }));
    }
    /** Currently selected run directory (panel-local choice). */
    get selectedRunDir() {
        return this.selected;
    }
    /** Select a run for the detail view; persists across Host snapshots. */
    select(runDir) {
        this.selected = runDir;
        this.emit();
    }
    /** Selected folded view, falling back to a real available run view. */
    get activeView() {
        if (this.selected !== undefined)
            return this.state.views.get(this.selected);
        const active = this.state.snapshot?.runs.find(ref => ref.discovery === 'active');
        if (active !== undefined)
            return this.state.views.get(active.runDir);
        for (const ref of this.state.snapshot?.runs ?? []) {
            const view = this.state.views.get(ref.runDir);
            if (view !== undefined)
                return view;
        }
        return undefined;
    }
    /** Atomically replace inventory, classic Sessions, and diagnostics. */
    setSnapshot(snapshot) {
        const live = new Set(snapshot.runs.map(ref => ref.runDir));
        const views = new Map([...this.state.views].filter(([runDir]) => live.has(runDir)));
        const { transportError: _, ...state } = this.state;
        const loading = snapshot.diagnostics.scan.state === 'never'
            || snapshot.diagnostics.scan.state === 'running';
        this.state = { ...state, snapshot, views, loading };
        this.emit();
    }
    /** Record a Remote/connection failure without overwriting Host diagnostics. */
    setTransportError(message) {
        this.state = { ...this.state, loading: false, transportError: message };
        this.emit();
    }
    /** Replace the optional launcher's configured-task and owned-process inventory. */
    setLauncher(tasks, active) {
        this.state = { ...this.state, launcher: { tasks, active } };
        this.emit();
    }
    /** Hide controls when the Host launcher plugin is not loaded. */
    setLauncherUnavailable() {
        if (this.state.launcher === undefined)
            return;
        const { launcher: _, ...state } = this.state;
        this.state = state;
        this.emit();
    }
    /** Record a launch/stop failure without contaminating viewer read state. */
    setLauncherError(message) {
        if (this.state.launcher === undefined)
            return;
        this.state = { ...this.state, launcher: { ...this.state.launcher, error: message } };
        this.emit();
    }
    /** Apply the Host launcher's complete owned-process replacement frame. */
    applyActiveFrame(frame) {
        if (this.state.launcher === undefined)
            return;
        this.state = { ...this.state, launcher: { ...this.state.launcher, active: frame.launches } };
        this.emit();
    }
    /** Apply one forwarded Host frame. */
    applyFrame(frame) {
        if (frame.kind === 'snapshot') {
            this.setSnapshot(frame.snapshot);
            return;
        }
        const views = new Map(this.state.views);
        views.set(frame.run.runDir, frame.run);
        this.state = { ...this.state, views, loading: false };
        this.emit();
    }
    /** Store a successful `runBacklog` answer. Undefined never fabricates zeros. */
    setBacklog(runDir, view) {
        if (view === undefined)
            return;
        const views = new Map(this.state.views);
        views.set(runDir, view);
        this.state = { ...this.state, views, loading: false };
        this.emit();
    }
    /** Drop connection-scoped state. */
    reset() {
        this.state = { views: new Map(), loading: true };
        this.selected = undefined;
        this.emit();
    }
    emit() {
        for (const listener of this.listeners)
            listener();
    }
}
//# sourceMappingURL=store.js.map