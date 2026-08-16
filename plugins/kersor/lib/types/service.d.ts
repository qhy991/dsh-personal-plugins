/**
 * KerSor launcher service. Config registers the only Mission files a remote
 * caller may start; KerSor remains the owner of Mission validation, run files,
 * workflow state, resume semantics, and results.
 * @module @deepseek-ai/dsh-kersor
 */
import { Context, Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { KersorActiveLaunch, KersorTaskId, KersorTaskRef } from './types.ts';
/** One configured, browser-launchable autonomous Mission. */
export interface KersorTaskConfig {
    /** Stable id sent over the remote API. */
    id: string;
    /** Human-readable browser label. */
    label: string;
    /** Absolute `kersor-mission-v1` JSON path. */
    mission: string;
    /** Optional absolute KerSor runtime-config JSON frozen into each run. */
    runtimeConfig?: string;
}
/** KerSor launcher configuration. */
export interface Config {
    /** Absolute path to the KerSor checkout containing the Session-binding runner. */
    root: string;
    /** Python executable in the subprocess provider's execution world. */
    python?: string;
    /** Browser-launchable Missions; arbitrary paths are never accepted remotely. */
    tasks: KersorTaskConfig[];
    /** Credential references resolved per launch and forwarded under the same environment names. */
    credentialRefs?: string[];
    /** Explicit non-secret child environment entries. */
    env?: Record<string, string>;
    /** In-memory cap for each launcher output stream. */
    maxOutputBytes?: number;
    /** TERM-to-KILL grace for launcher process trees. */
    stopGraceMs?: number;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        kersor: KersorService;
    }
}
/** Host-side launcher over registered KerSor autonomous Missions. */
export declare class KersorService extends TypertRemoteService {
    static inject: string[];
    static Config: z<Config>;
    private readonly root;
    private readonly runner;
    private readonly python;
    private readonly tasks;
    private readonly credentialRefs;
    private readonly env;
    private readonly maxOutputBytes;
    private readonly stopGraceMs;
    private readonly active;
    private stopping;
    /** Resolve config once; asynchronous executable and file checks run during init. */
    constructor(ctx: Context, config: Config);
    /** Validate self-contained configuration and quiesce every owned launch on disposal. */
    [Service.init](): AsyncGenerator<() => Promise<void>, void, void>;
    /**
     * Return the configured Mission registry without exposing host paths.
     * @returns tasks in configuration order.
     */
    listTasks(): KersorTaskRef[];
    /**
     * Return launcher processes dsh still owns.
     * @returns active launch receipts in start order.
     */
    listActive(): KersorActiveLaunch[];
    /**
     * Start one configured Mission and return after the process tree is owned.
     * Workflow completion is observed through `dsh-kersor-viewer`, not this receipt.
     * @param taskId - configured task identity from {@link listTasks}.
     * @returns active launcher receipt, including the deterministic run directory.
     * @throws when config, credentials, Mission routing, or process spawn is invalid.
     */
    start(taskId: KersorTaskId): Promise<KersorActiveLaunch>;
    /**
     * Terminate one process tree and wait for quiescence.
     * @param runDir - exact run directory returned by {@link start}.
     * @returns false when this service does not own that run.
     */
    stop(runDir: string): Promise<boolean>;
    private resolveEnvironment;
    private finish;
    private emitActive;
}
/** Cordis class-plugin entry. */
export default KersorService;
//# sourceMappingURL=service.d.ts.map