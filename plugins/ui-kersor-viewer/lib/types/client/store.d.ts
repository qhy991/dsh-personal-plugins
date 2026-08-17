/**
 * Browser-side KerSor viewer store. One Host snapshot owns inventory,
 * classic Sessions, and source health; folded run views and launcher process
 * ownership remain orthogonal client-side accounts.
 * @module @deepseek-ai/dsh-client-ui-kersor-viewer/client
 */
import type { KersorClassicSessionDetail, KersorRunRef, KersorRunView, KersorViewerFrame, KersorViewerSnapshot } from '@deepseek-ai/dsh-kersor-viewer/types';
import type { KersorActiveFrame, KersorActiveLaunch, KersorTaskRef } from '@deepseek-ai/dsh-kersor/types';
export interface KersorRunRow extends KersorRunRef {
    readonly view?: KersorRunView | undefined;
}
export interface KersorViewerState {
    /** Latest atomic Host projection; absent until the first successful read. */
    readonly snapshot?: KersorViewerSnapshot;
    /** Folded event backlogs keyed independently from the inventory snapshot. */
    readonly views: ReadonlyMap<string, KersorRunView>;
    /** On-demand, seal-aware classic Session details keyed by Session directory. */
    readonly classicDetails: ReadonlyMap<string, KersorClassicSessionDetail>;
    readonly classicDetailLoading?: string;
    readonly classicDetailError?: string;
    readonly loading: boolean;
    /** Transport failure only; Host source failures live in snapshot diagnostics. */
    readonly transportError?: string;
    /** Present only while the optional Host launcher namespace is available. */
    readonly launcher?: {
        readonly tasks: readonly KersorTaskRef[];
        readonly active: readonly KersorActiveLaunch[];
        readonly error?: string;
    };
}
type Listener = () => void;
/** Snapshot store over the Host projection and per-run folded views. */
export declare class KersorViewerStore {
    private state;
    private readonly listeners;
    private selected;
    private selectedClassic;
    /** Stable snapshot for useSyncExternalStore. */
    getSnapshot: () => KersorViewerState;
    /** Subscribe to snapshot replacements. */
    subscribe: (listener: Listener) => (() => void);
    /** Latest run inventory joined with independently folded views. */
    get rows(): readonly KersorRunRow[];
    /** Currently selected run directory (panel-local choice). */
    get selectedRunDir(): string | undefined;
    /** Currently expanded classic Session directory. */
    get selectedClassicSessionDir(): string | undefined;
    /**
     * Expand or collapse one classic Session inspector.
     * @param sessionDir - Selected Session directory, or `undefined` to collapse.
     */
    selectClassic(sessionDir: string | undefined): void;
    /** Select a run for the detail view; persists across Host snapshots. */
    select(runDir: string | undefined): void;
    /** Selected folded view, falling back to a real available run view. */
    get activeView(): KersorRunView | undefined;
    /** Atomically replace inventory, classic Sessions, and diagnostics. */
    setSnapshot(snapshot: KersorViewerSnapshot): void;
    /** Record a Remote/connection failure without overwriting Host diagnostics. */
    setTransportError(message: string): void;
    /**
     * Mark one selected classic Session detail as loading.
     * @param sessionDir - Session whose on-demand detail is loading.
     */
    setClassicDetailLoading(sessionDir: string): void;
    /**
     * Store one successful classic Session detail answer.
     * @param sessionDir - Session owning the answer.
     * @param detail - Valid inspector detail, or `undefined` when unavailable.
     */
    setClassicDetail(sessionDir: string, detail: KersorClassicSessionDetail | undefined): void;
    /**
     * Record a bounded detail-read failure without replacing the summary snapshot.
     * @param sessionDir - Session whose detail failed.
     * @param message - Remote transport diagnostic.
     */
    setClassicDetailError(sessionDir: string, message: string): void;
    /** Replace the optional launcher's configured-task and owned-process inventory. */
    setLauncher(tasks: readonly KersorTaskRef[], active: readonly KersorActiveLaunch[]): void;
    /** Hide controls when the Host launcher plugin is not loaded. */
    setLauncherUnavailable(): void;
    /** Record a launch/stop failure without contaminating viewer read state. */
    setLauncherError(message: string): void;
    /** Apply the Host launcher's complete owned-process replacement frame. */
    applyActiveFrame(frame: KersorActiveFrame): void;
    /** Apply one forwarded Host frame. */
    applyFrame(frame: KersorViewerFrame): void;
    /** Store a successful `runBacklog` answer. Undefined never fabricates zeros. */
    setBacklog(runDir: string, view: KersorRunView | undefined): void;
    /** Drop connection-scoped state. */
    reset(): void;
    private emit;
}
export {};
//# sourceMappingURL=store.d.ts.map