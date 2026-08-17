/**
 * Bounded, content-free diagnostics shared by KerSor viewer sources.
 * @module @deepseek-ai/dsh-kersor-viewer
 */
/** Create a safe issue from a runtime failure without retaining its message. */
export function issueFromError(stage, error, severity = 'error') {
    return createIssue(stage, classifyError(stage, error), severity);
}
/** Create a safe issue for a validated failure code. */
export function createIssue(stage, code, severity = 'error') {
    return { stage, code, severity, occurrences: 1, lastSeenAt: new Date().toISOString() };
}
/** Merge repeated identical failures while bounding history to the latest kind. */
export function mergeIssue(previous, current) {
    if (previous?.stage !== current.stage || previous.code !== current.code)
        return current;
    return { ...current, occurrences: previous.occurrences + 1 };
}
/** Return whether an unknown exception carries a Node-style error code. */
export function errorCode(error) {
    return typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : undefined;
}
function classifyError(stage, error) {
    if (error instanceof SyntaxError)
        return 'invalid_json';
    const code = errorCode(error);
    if (code === 'EACCES' || code === 'EPERM')
        return 'permission_denied';
    if (code === 'ETIMEDOUT')
        return 'timeout';
    if (code === 'ENOENT')
        return stage === 'classic_bridge' ? 'process_unavailable' : 'not_found';
    if (stage === 'tailer_watch')
        return 'watch_unavailable';
    if (code !== undefined)
        return 'io_error';
    return 'unexpected';
}
//# sourceMappingURL=diagnostics.js.map