/**
 * Browser-side KerSor viewer store. One Host snapshot owns inventory,
 * classic Sessions, and source health; folded run views and launcher process
 * ownership remain orthogonal client-side accounts.
 * @module @deepseek-ai/dsh-client-ui-kersor-viewer/client
 */
/** Snapshot store over the Host projection and per-run folded views. */
export class KersorViewerStore {
    state = { views: new Map(), classicDetails: new Map(), loading: true };
    listeners = new Set();
    selected;
    selectedClassic;
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
            view: this.withInventoryResult(ref.runDir, this.state.views.get(ref.runDir)),
        }));
    }
    /** Currently selected run directory (panel-local choice). */
    get selectedRunDir() {
        return this.selected;
    }
    /** Currently expanded classic Session directory. */
    get selectedClassicSessionDir() {
        return this.selectedClassic;
    }
    /**
     * Expand or collapse one classic Session inspector.
     * @param sessionDir - Selected Session directory, or `undefined` to collapse.
     */
    selectClassic(sessionDir) {
        this.selectedClassic = sessionDir;
        this.emit();
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
        const liveClassic = new Set(snapshot.classic.sessions.map(session => session.session_dir));
        const classicDetails = new Map([...this.state.classicDetails].filter(([sessionDir]) => liveClassic.has(sessionDir)));
        if (this.selectedClassic !== undefined && !liveClassic.has(this.selectedClassic)) {
            this.selectedClassic = undefined;
        }
        const { transportError: _, ...state } = this.state;
        const loading = this.state.snapshot === undefined && (snapshot.diagnostics.scan.state === 'never'
            || snapshot.diagnostics.scan.state === 'running');
        this.state = { ...state, snapshot, views, classicDetails, loading };
        this.emit();
    }
    /** Record a Remote/connection failure without overwriting Host diagnostics. */
    setTransportError(message) {
        this.state = { ...this.state, loading: false, transportError: message };
        this.emit();
    }
    /**
     * Mark one selected classic Session detail as loading.
     * @param sessionDir - Session whose on-demand detail is loading.
     */
    setClassicDetailLoading(sessionDir) {
        const { classicDetailError: _, ...state } = this.state;
        this.state = { ...state, classicDetailLoading: sessionDir };
        this.emit();
    }
    /**
     * Store one successful classic Session detail answer.
     * @param sessionDir - Session owning the answer.
     * @param detail - Valid inspector detail, or `undefined` when unavailable.
     */
    setClassicDetail(sessionDir, detail) {
        const { classicDetailLoading: _, classicDetailError: __, ...state } = this.state;
        const classicDetails = new Map(state.classicDetails);
        if (detail === undefined)
            classicDetails.delete(sessionDir);
        else
            classicDetails.set(sessionDir, detail);
        this.state = { ...state, classicDetails };
        this.emit();
    }
    /**
     * Record a bounded detail-read failure without replacing the summary snapshot.
     * @param sessionDir - Session whose detail failed.
     * @param message - Remote transport diagnostic.
     */
    setClassicDetailError(sessionDir, message) {
        const { classicDetailLoading: _, ...state } = this.state;
        this.state = { ...state, classicDetailError: `${sessionDir}: ${message}` };
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
        views.set(frame.run.runDir, this.withInventoryResult(frame.run.runDir, frame.run) ?? frame.run);
        this.state = { ...this.state, views, loading: false };
        this.emit();
    }
    /** Store a successful `runBacklog` answer. Undefined never fabricates zeros. */
    setBacklog(runDir, view) {
        if (view === undefined)
            return;
        const views = new Map(this.state.views);
        views.set(runDir, this.withInventoryResult(runDir, view) ?? view);
        this.state = { ...this.state, views, loading: false };
        this.emit();
    }
    /** Attach one separately loaded bounded Workflow result to its folded run view. */
    setRunResult(runDir, result) {
        if (result === undefined)
            return;
        const existing = this.state.views.get(runDir);
        if (existing === undefined)
            return;
        const views = new Map(this.state.views);
        views.set(runDir, {
            ...existing,
            result,
            candidateStage: result.stage,
            selectedCandidateId: result.selectedCandidateId,
            expectedCycles: result.expectedCycles,
            estimatedSpeedup: result.estimatedSpeedup,
            measuredSpeedup: result.measuredSpeedup,
            candidates: result.candidates,
        });
        this.state = { ...this.state, views };
        this.emit();
    }
    /** Drop connection-scoped state. */
    reset() {
        this.state = { views: new Map(), classicDetails: new Map(), loading: true };
        this.selected = undefined;
        this.selectedClassic = undefined;
        this.emit();
    }
    withInventoryResult(runDir, view) {
        if (view === undefined || view.result !== undefined)
            return view;
        const result = this.state.snapshot?.runs.find(ref => ref.runDir === runDir)?.result;
        return result === undefined
            ? view
            : {
                ...view,
                result,
                candidateStage: result.stage,
                selectedCandidateId: result.selectedCandidateId,
                expectedCycles: result.expectedCycles,
                estimatedSpeedup: result.estimatedSpeedup,
                measuredSpeedup: result.measuredSpeedup,
                candidates: result.candidates,
            };
    }
    emit() {
        for (const listener of this.listeners)
            listener();
    }
}
//# sourceMappingURL=store.js.map