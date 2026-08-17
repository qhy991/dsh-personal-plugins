/**
 * Read-only adapter from the installed KerSor preset bridge to the viewer.
 * KerSor's Python SessionStore remains the canonical parser for both v2 and
 * legacy state; this module only launches the bounded projection and checks
 * its wire shape.
 * @module @deepseek-ai/dsh-kersor-viewer
 */
export type KersorClassicLifecycle = 'active' | 'completed' | 'stalled' | 'cancelled';
export type KersorClassicHealth = 'active' | 'stale' | 'needs_resume' | 'terminal' | 'unknown';
export type KersorClassicGate = 'pass' | 'fail' | 'pending' | 'not_required';
export type KersorClassicStatus = 'terminal-complete' | 'terminal-stalled' | 'terminal-cancelled' | 'resumable' | 'in-progress' | 'pre-round-1';
/** One recent optimization Session projected by the canonical KerSor stores. */
export interface KersorClassicSession {
    readonly session_id: string;
    readonly session_dir: string;
    readonly storage_kind: 'v2' | 'legacy';
    readonly phase?: string | null;
    readonly lifecycle: KersorClassicLifecycle;
    readonly status: KersorClassicStatus;
    readonly health: KersorClassicHealth;
    readonly started_at?: string | null;
    readonly last_activity_at?: string | null;
    readonly current_round?: number | null;
    readonly max_workflows?: number | null;
    readonly target_speedup?: number | null;
    readonly target_met?: boolean | null;
    readonly mode?: string | null;
    readonly backend?: string | null;
    readonly kernel_language?: string | null;
    readonly integration_pattern?: string | null;
    readonly allow_workflow_authoring?: boolean | null;
    readonly workflow_authoring_budget?: number | null;
    readonly kernel_name?: string | null;
    readonly workflow?: string | null;
    /** Latest canonical COMPLETE/CONTINUE/STALLED line, when a round has decided. */
    readonly decision?: string | null;
    readonly fit_confidence?: string | null;
    readonly baseline_witness?: KersorClassicGate | null;
    readonly dsh_compatibility?: KersorClassicGate | null;
    readonly best_speedup?: number | null;
    readonly warnings: readonly string[];
}
/** Bounded recent-session inventory plus a non-fatal adapter warning. */
export interface KersorClassicSnapshot {
    readonly sessions: readonly KersorClassicSession[];
    readonly warning?: string;
}
/** Machine-local roots supplied by viewer configuration and DSH workspaces. */
export interface KersorClassicRoots {
    /** Include the `.kersor/` of the checkout configured by the preset. */
    readonly includeCheckoutRoot?: boolean;
    /** Directories whose children are KerSor Sessions. */
    readonly sessionRoots?: readonly string[];
    /** Project directories whose `.kersor/` child owns the Sessions. */
    readonly workspaceRoots?: readonly string[];
}
/** Path copied by the portable preset installer. */
export declare function installedBridge(): string;
/** Invoke the installed bridge without a shell and return a bounded snapshot. */
export declare function readClassicSessions(limit: number, staleAfterSeconds?: number, roots?: KersorClassicRoots): Promise<KersorClassicSnapshot>;
//# sourceMappingURL=classic.d.ts.map