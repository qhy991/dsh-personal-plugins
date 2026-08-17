/**
 * Bounded, content-free diagnostics shared by KerSor viewer sources.
 * @module @deepseek-ai/dsh-kersor-viewer
 */
/** Operation that produced a viewer source issue. */
export type KersorDiagnosticStage = 'checkout_pointer' | 'root_scan' | 'session_inspect' | 'runs_scan' | 'summary_read' | 'backfill_read' | 'event_parse' | 'event_fold' | 'tailer_watch' | 'tailer_read' | 'classic_bridge';
/** Stable, content-free classification safe to send over the Remote boundary. */
export type KersorDiagnosticCode = 'not_found' | 'permission_denied' | 'invalid_json' | 'invalid_payload' | 'watch_unavailable' | 'process_unavailable' | 'timeout' | 'io_error' | 'unexpected';
/** Last bounded issue for one source; raw exception text is never retained. */
export interface KersorDiagnosticIssue {
    readonly stage: KersorDiagnosticStage;
    readonly code: KersorDiagnosticCode;
    readonly severity: 'warning' | 'error';
    readonly occurrences: number;
    readonly lastSeenAt: string;
}
/** Create a safe issue from a runtime failure without retaining its message. */
export declare function issueFromError(stage: KersorDiagnosticStage, error: unknown, severity?: KersorDiagnosticIssue['severity']): KersorDiagnosticIssue;
/** Create a safe issue for a validated failure code. */
export declare function createIssue(stage: KersorDiagnosticStage, code: KersorDiagnosticCode, severity?: KersorDiagnosticIssue['severity']): KersorDiagnosticIssue;
/** Merge repeated identical failures while bounding history to the latest kind. */
export declare function mergeIssue(previous: KersorDiagnosticIssue | undefined, current: KersorDiagnosticIssue): KersorDiagnosticIssue;
/** Return whether an unknown exception carries a Node-style error code. */
export declare function errorCode(error: unknown): string | undefined;
//# sourceMappingURL=diagnostics.d.ts.map