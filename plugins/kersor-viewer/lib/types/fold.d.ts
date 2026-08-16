/**
 * Pure fold of a KerSor `events.jsonl` stream into the viewer's run view
 * model. One `KersorRunView` accumulates every event of a single run; phases
 * are buckets in first-appearance order so loop re-visits (KSearch cycles
 * Select/Generate/Evaluate) each get their own bucket.
 * @module @deepseek-ai/dsh-kersor-viewer
 */
/** Terminal lifecycle of a whole workflow run. */
export type KersorRunStatus = 'running' | 'completed' | 'failed' | 'unknown';
/** Lifecycle of one agent or evaluation call row. */
export type KersorCallStatus = 'queued' | 'running' | 'completed' | 'failed';
/** Which host primitive emitted the call. */
export type KersorCallKind = 'agent' | 'evaluation';
/** One folded call row inside a phase bucket. */
export interface KersorCallView {
    readonly seq: number;
    readonly callId: string;
    readonly label: string;
    readonly kind: KersorCallKind;
    status: KersorCallStatus;
    startedTs?: string | undefined;
    endedTs?: string | undefined;
    tokens?: number | undefined;
    rolledBack?: boolean | undefined;
    error?: string | undefined;
}
/** One phase bucket holding its calls in arrival order. */
export interface KersorPhaseView {
    readonly title: string;
    readonly index: number;
    status: 'running' | 'completed' | 'failed';
    readonly calls: KersorCallView[];
}
/** Folded projection of one KerSor autonomous run. */
export interface KersorRunView {
    readonly runId: string;
    readonly runDir: string;
    readonly sessionDir: string;
    status: KersorRunStatus;
    startedTs?: string | undefined;
    endedTs?: string | undefined;
    currentPhase: string;
    phases: KersorPhaseView[];
    totals: {
        calls: number;
        completed: number;
        failed: number;
        tokens: number;
    };
    error?: string | undefined;
}
/** Shape of one parsed `events.jsonl` line (superset; unknown fields ignored). */
export interface KersorEvent {
    readonly type: string;
    readonly ts?: string;
    readonly phase?: string;
    readonly label?: string;
    readonly seq?: number;
    readonly call_id?: string;
    readonly usage?: {
        total_tokens?: number;
    };
    readonly error?: {
        message?: string;
    } | string;
    [key: string]: unknown;
}
/** Fold one parsed event into the view. Mutates `view` in place. */
export declare function foldEvent(view: KersorRunView, event: KersorEvent): void;
/** Create an empty view for a discovered run directory. */
export declare function createRunView(runId: string, runDir: string, sessionDir: string): KersorRunView;
//# sourceMappingURL=fold.d.ts.map