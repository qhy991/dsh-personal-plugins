/**
 * KerSor viewer host service: discovers run directories under configured
 * KerSor roots, tails each active run's `events.jsonl`, folds events into the
 * viewer view model, and pushes updates to every browser page through the
 * forwarded `kersor/event` Host event.
 * @module @deepseek-ai/dsh-kersor-viewer
 */
import { Context, Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { KersorRunView } from './fold.ts';
import type { KersorClassicSnapshot } from './classic.ts';
import type { KersorRunRef } from './scanner.ts';
export type { KersorEvent, KersorRunView } from './fold.ts';
export type { KersorRunRef } from './scanner.ts';
export type { KersorClassicLifecycle, KersorClassicSession, KersorClassicSnapshot } from './classic.ts';
export type { KersorViewerFrame } from './types.ts';
export { EventsTailer } from './tailer.ts';
export { DEFAULT_KERSOR_ROOTS, scanRoots } from './scanner.ts';
export { createRunView, foldEvent } from './fold.ts';
export { installedBridge, readClassicSessions } from './classic.ts';
/** Viewer configuration (cordis.patch.yml row config). */
export interface Config {
    /** Extra KerSor session roots scanned in addition to the defaults. */
    roots?: string[];
    /** Disable scanning of the built-in default roots. */
    noDefaultRoots?: boolean;
    /** Discovery rescan interval in milliseconds. */
    scanIntervalMs?: number;
    /** Number of recent classic optimization Sessions shown; zero disables it. */
    classicSessionLimit?: number;
}
/**
 * Host service: run inventory, live event folding, and browser push. Exposes
 * `listRuns` and `runBacklog` remotes for panel open and reconnect.
 */
export declare class KersorViewerService extends TypertRemoteService {
    static Config: z<Config>;
    private readonly rootCtx;
    private readonly configuredRoots;
    private readonly includeDefaults;
    private readonly scanIntervalMs;
    private readonly classicSessionLimit;
    private readonly tracked;
    private group;
    private scanTimer;
    private emittedRunsSignature;
    private classicSnapshot;
    private scanInFlight;
    /** Create the service under the Host composition. */
    constructor(ctx: Context, config: Config);
    /** Start discovery and tailing under the plugin's fiber once ready. */
    [Service.init](): Generator<() => void, void, void>;
    private requireGroup;
    /** Inventory snapshot for the panel's run list. */
    listRuns(): KersorRunRef[];
    /** Recent classic and Session-v2 optimization summaries from KerSor stores. */
    listClassicSessions(): KersorClassicSnapshot;
    /** Full folded view of one run (panel open / reconnect backlog). */
    runBacklog(runDir: string): KersorRunView | undefined;
    /** Rescan roots; start and stop tailers to match discovery. */
    rescan(): Promise<void>;
    private performRescan;
    /** Read a discovered-terminated run's full event log once (no tailer). */
    private backfillTerminated;
    private attachTailer;
}
/** Cordis plugin entry: the service class itself (class plugin, default export). */
export default KersorViewerService;
//# sourceMappingURL=service.d.ts.map