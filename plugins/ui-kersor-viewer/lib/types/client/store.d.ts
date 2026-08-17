/**
 * Browser-side viewer store: run inventory plus folded run views, fed by the
 * forwarded `kersor/event` Host frames and the `listRuns`/`runBacklog`
 * remotes. A useSyncExternalStore-compatible snapshot observable.
 * @module @deepseek-ai/dsh-client-ui-kersor-viewer/client
 */
import type { KersorRunView } from '@deepseek-ai/dsh-kersor-viewer/types';
import type { KersorRunRef } from '@deepseek-ai/dsh-kersor-viewer/types';
import type { KersorViewerFrame } from '@deepseek-ai/dsh-kersor-viewer/types';
import type { KersorClassicSession, KersorClassicSnapshot } from '@deepseek-ai/dsh-kersor-viewer/types';
import type { KersorActiveFrame, KersorActiveLaunch, KersorTaskRef } from '@deepseek-ai/dsh-kersor/types';
export interface KersorRunRow extends KersorRunRef {
    view?: KersorRunView | undefined;
}
export interface KersorViewerState {
    readonly rows: readonly KersorRunRow[];
    readonly classicSessions: readonly KersorClassicSession[];
    readonly classicWarning?: string;
    readonly loading: boolean;
    readonly error?: string;
    /** Present only while the optional Host launcher namespace is available. */
    readonly launcher?: {
        readonly tasks: readonly KersorTaskRef[];
        readonly active: readonly KersorActiveLaunch[];
        readonly error?: string;
    };
}
type Listener = () => void;
/** Snapshot store over the run inventory and per-run folded views. */
export declare class KersorViewerStore {
    private state;
    private readonly listeners;
    private selected;
    /** Stable snapshot for useSyncExternalStore. */
    getSnapshot: () => KersorViewerState;
    /** Subscribe to snapshot replacements. */
    subscribe: (listener: Listener) => (() => void);
    /** Currently selected run directory (panel-local choice). */
    get selectedRunDir(): string | undefined;
    /** Select a run for the detail view; persists across inventory frames. */
    select(runDir: string | undefined): void;
    /** The selected run's folded view, falling back to the best active run. */
    get activeView(): KersorRunView | undefined;
    /** Replace the inventory half from a `listRuns` remote answer. */
    setInventory(refs: readonly KersorRunRef[]): void;
    /** Replace the classic optimization Session inventory independently. */
    setClassic(snapshot: KersorClassicSnapshot): void;
    /** Keep a classic-adapter failure separate from autonomous-run reads. */
    setClassicWarning(message: string): void;
    /** Mark a failed inventory read. */
    setError(message: string): void;
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
    /** Store the backlog answer of `runBacklog` (panel open / reconnect). */
    setBacklog(runDir: string, view: KersorRunView | undefined): void;
    /** Drop everything (connection reset). */
    reset(): void;
    private emit;
}
export {};
//# sourceMappingURL=store.d.ts.map