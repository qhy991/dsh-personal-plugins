/**
 * KerSor viewer Host service: commits one inventory/diagnostics snapshot and
 * folds each run's event stream for browser consumers.
 * @module @deepseek-ai/dsh-kersor-viewer
 */
import { Context, Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { KersorClassicSessionDetail } from './classic.ts';
import type { KersorRunView } from './fold.ts';
import type { KersorWorkflowResultView } from './fold.ts';
import type { KersorViewerSnapshot } from './types.ts';
export type { KersorEvent, KersorRunView } from './fold.ts';
export type { KersorRunRef } from './scanner.ts';
export type { KersorBaselineAction, KersorClassicGate, KersorClassicHealth, KersorClassicLifecycle, KersorClassicSession, KersorClassicSessionDetail, KersorClassicSnapshot, KersorClassicStatus, } from './classic.ts';
export type { KersorRunObservation, KersorViewerFrame, KersorViewerSnapshot } from './types.ts';
export { EventsTailer } from './tailer.ts';
export { DEFAULT_KERSOR_ROOTS, scanRoots } from './scanner.ts';
export { createRunView, foldEvent } from './fold.ts';
export { installedBridge, readClassicSessionDetail, readClassicSessions } from './classic.ts';
/** Viewer configuration (cordis.patch.yml row config). */
export interface Config {
    /** Extra KerSor session roots scanned in addition to the defaults. */
    roots?: string[];
    /** Disable built-in and preset-checkout roots. */
    noDefaultRoots?: boolean;
    /** Discovery rescan interval in milliseconds. */
    scanIntervalMs?: number;
    /** Number of recent classic optimization Sessions shown; zero disables it. */
    classicSessionLimit?: number;
    /** Seconds without artifact activity before an unfinished Session is stale. */
    classicStaleAfterSeconds?: number;
}
/** Host service owning the viewer's single snapshot and folded run views. */
export declare class KersorViewerService extends TypertRemoteService {
    static inject: string[];
    static Config: z<Config>;
    private readonly rootCtx;
    private readonly configuredRoots;
    private readonly includeDefaults;
    private readonly scanIntervalMs;
    private readonly classicSessionLimit;
    private readonly classicStaleAfterSeconds;
    private readonly tracked;
    private group;
    private scanTimer;
    private scanInFlight;
    private scanObservation;
    private classicSnapshot;
    /** Create the service under the Host composition. */
    constructor(ctx: Context, config: Config);
    /** Start discovery and tailing under the plugin's fiber once ready. */
    [Service.init](): Generator<() => void, void, void>;
    private requireGroup;
    /** Complete inventory and source-health snapshot for panel refresh/reconnect. */
    snapshot(): KersorViewerSnapshot;
    /** Full folded view of one run (panel open / reconnect backlog). */
    runBacklog(runDir: string): Promise<KersorRunView | undefined>;
    /** Bounded candidate-selection result for one discovered run. */
    runResult(runDir: string): Promise<KersorWorkflowResultView | undefined>;
    /**
     * Read sealed, bounded detail for one classic Session present in the snapshot.
     * @param sessionDir - Exact discovered Session directory.
     * @returns Inspector detail, or `undefined` for an unknown or unreadable Session.
     */
    classicSessionDetail(sessionDir: string): Promise<KersorClassicSessionDetail | undefined>;
    /** Rescan roots once; concurrent callers share the in-flight scan. */
    rescan(): Promise<void>;
    private performRescan;
    private backfillTerminated;
    private attachTailer;
    private loadRunResult;
    private foldLine;
    private rejectLine;
    private recordRunIssue;
    private publishSnapshot;
    private publishRun;
}
/** Cordis plugin entry: the service class itself. */
export default KersorViewerService;
//# sourceMappingURL=service.d.ts.map