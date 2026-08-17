/** Terminal-aware presentation policy for a Session's historical fit verdict. */
/** A terminal veto outranks any fit result produced before the Session stopped. */
export function visibleFitConfidence(session) {
    if (session.lifecycle === 'stalled' || session.lifecycle === 'cancelled')
        return undefined;
    return session.fit_confidence ?? undefined;
}
//# sourceMappingURL=readiness.js.map