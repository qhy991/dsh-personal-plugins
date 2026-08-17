/**
 * Read-only adapter from the installed KerSor preset bridge to the viewer.
 * @module @deepseek-ai/dsh-kersor-viewer
 */
import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { createIssue, errorCode, issueFromError } from "./diagnostics.js";
const execFileAsync = promisify(execFile);
function dshHome() {
    const configured = process.env.DSH_HOME?.trim();
    if (!configured)
        return path.join(homedir(), '.dsh');
    if (configured === '~')
        return homedir();
    return configured.startsWith('~/')
        ? path.join(homedir(), configured.slice(2))
        : path.resolve(configured);
}
/** Path copied by the portable preset installer. */
export function installedBridge() {
    return path.join(dshHome(), '.agent-presets', 'kersor', 'bin', 'kersor_bridge.py');
}
function kersorPython() {
    return process.env.KERSOR_PYTHON?.trim() || 'python3';
}
function optionalString(value) {
    return value === undefined || value === null || typeof value === 'string';
}
function optionalDetailString(value) {
    return value === undefined || typeof value === 'string';
}
function optionalBoolean(value) {
    return value === undefined || value === null || typeof value === 'boolean';
}
function optionalNumber(value) {
    return value === undefined || value === null || typeof value === 'number';
}
function optionalGate(value) {
    return value === undefined || value === null
        || value === 'pass' || value === 'fail' || value === 'pending' || value === 'not_required';
}
function optionalBaselineAction(value) {
    return value === undefined || value === null
        || value === 'init' || value === 'record_verify' || value === 'new_session';
}
function stringArray(value) {
    return Array.isArray(value) && value.every(item => typeof item === 'string');
}
function isClassicArtifact(value) {
    if (value === null || typeof value !== 'object')
        return false;
    const artifact = value;
    return typeof artifact.name === 'string'
        && typeof artifact.sha256 === 'string'
        && typeof artifact.bytes === 'number' && Number.isInteger(artifact.bytes) && artifact.bytes >= 0;
}
function isClassicValidationCheck(value) {
    if (value === null || typeof value !== 'object')
        return false;
    const check = value;
    return typeof check.name === 'string' && typeof check.passed === 'boolean';
}
function isClassicSessionDetail(value) {
    if (value === null || typeof value !== 'object')
        return false;
    const detail = value;
    if (typeof detail.session_id !== 'string' || typeof detail.session_dir !== 'string'
        || typeof detail.current_round !== 'number' || !Number.isInteger(detail.current_round)
        || detail.current_round < 1 || !Array.isArray(detail.steps))
        return false;
    const validStepIds = new Set([
        'setup', 'baseline', 'profile', 'selection', 'authoring', 'validation',
        'dispatch', 'measurement', 'decision',
    ]);
    const validStepStatuses = new Set(['pending', 'active', 'completed', 'failed']);
    if (!detail.steps.every(step => step !== null && typeof step === 'object'
        && validStepIds.has(step.id)
        && validStepStatuses.has(step.status)))
        return false;
    const selection = detail.selection;
    if (selection === undefined || !['pending', 'stalled', 'selected'].includes(selection.status)
        || typeof selection.rejectedCount !== 'number' || !Number.isInteger(selection.rejectedCount)
        || selection.rejectedCount < 0 || !optionalDetailString(selection.workflow)
        || !optionalDetailString(selection.reason))
        return false;
    const authoring = detail.authoring;
    if (authoring === undefined
        || !['not_started', 'in_progress', 'sealed', 'saved', 'rejected'].includes(authoring.status)
        || !Array.isArray(authoring.files)
        || !authoring.files.every(isClassicArtifact))
        return false;
    if (authoring.omittedReason !== undefined
        && !['too_large', 'invalid', 'hash_mismatch'].includes(authoring.omittedReason))
        return false;
    if (authoring.design !== undefined) {
        const design = authoring.design;
        if (!optionalDetailString(design.name) || !optionalDetailString(design.technique)
            || !optionalDetailString(design.methodCategory) || !optionalDetailString(design.topology)
            || !stringArray(design.requiredArgs) || !stringArray(design.languages)
            || !stringArray(design.backends) || !stringArray(design.integrationPatterns)
            || typeof design.rationale !== 'string' || typeof design.source !== 'string')
            return false;
    }
    const validation = detail.validation;
    if (validation === undefined || !['pending', 'passed', 'failed'].includes(validation.status)
        || !Array.isArray(validation.checks)
        || !validation.checks.every(isClassicValidationCheck))
        return false;
    const dispatch = detail.dispatch;
    return dispatch !== undefined
        && ['pending', 'preparing', 'running', 'completed', 'failed'].includes(dispatch.status)
        && optionalDetailString(dispatch.runDir)
        && optionalDetailString(dispatch.runtimeStatus);
}
function isClassicSession(value) {
    if (value === null || typeof value !== 'object')
        return false;
    const row = value;
    return typeof row.session_id === 'string'
        && typeof row.session_dir === 'string'
        && (row.storage_kind === 'v2' || row.storage_kind === 'legacy')
        && (row.lifecycle === 'active' || row.lifecycle === 'completed'
            || row.lifecycle === 'stalled' || row.lifecycle === 'cancelled')
        && (row.health === 'active' || row.health === 'stale' || row.health === 'needs_resume'
            || row.health === 'terminal' || row.health === 'unknown')
        && (row.status === 'terminal-complete' || row.status === 'terminal-stalled'
            || row.status === 'terminal-cancelled' || row.status === 'resumable'
            || row.status === 'in-progress' || row.status === 'pre-round-1')
        && optionalString(row.kernel_language)
        && optionalString(row.backend)
        && optionalString(row.integration_pattern)
        && optionalBoolean(row.allow_workflow_authoring)
        && optionalNumber(row.workflow_authoring_budget)
        && (row.selection_status === undefined || row.selection_status === null
            || ['pending', 'stalled', 'selected'].includes(row.selection_status))
        && optionalString(row.decision)
        && optionalString(row.fit_confidence)
        && optionalGate(row.baseline_witness)
        && optionalBaselineAction(row.baseline_next_action)
        && optionalString(row.baseline_reason)
        && optionalGate(row.profile_evidence)
        && optionalString(row.profile_reason)
        && optionalGate(row.dsh_compatibility)
        && optionalGate(row.candidate_ownership)
        && optionalGate(row.fresh_session)
        && Array.isArray(row.warnings)
        && row.warnings.every(item => typeof item === 'string');
}
function projectSession(row) {
    return {
        session_id: row.session_id,
        session_dir: row.session_dir,
        storage_kind: row.storage_kind,
        phase: row.phase ?? null,
        lifecycle: row.lifecycle,
        status: row.status,
        health: row.health,
        started_at: row.started_at ?? null,
        last_activity_at: row.last_activity_at ?? null,
        current_round: row.current_round ?? null,
        max_workflows: row.max_workflows ?? null,
        target_speedup: row.target_speedup ?? null,
        target_met: row.target_met ?? null,
        mode: row.mode ?? null,
        backend: row.backend ?? null,
        kernel_language: row.kernel_language ?? null,
        integration_pattern: row.integration_pattern ?? null,
        allow_workflow_authoring: row.allow_workflow_authoring ?? null,
        workflow_authoring_budget: row.workflow_authoring_budget ?? null,
        kernel_name: row.kernel_name ?? null,
        workflow: row.workflow ?? null,
        selection_status: row.selection_status ?? null,
        decision: row.decision ?? null,
        fit_confidence: row.fit_confidence ?? null,
        baseline_witness: row.baseline_witness ?? null,
        baseline_next_action: row.baseline_next_action ?? null,
        baseline_reason: row.baseline_reason ?? null,
        profile_evidence: row.profile_evidence ?? null,
        profile_reason: row.profile_reason ?? null,
        dsh_compatibility: row.dsh_compatibility ?? null,
        candidate_ownership: row.candidate_ownership ?? null,
        fresh_session: row.fresh_session ?? null,
        best_speedup: row.best_speedup ?? null,
        warningCount: row.warnings.length,
    };
}
/**
 * Read a sealed, bounded inspector projection for one classic Session.
 * @param sessionDir - Exact Session directory already discovered by the Host.
 * @returns Valid detail, or `undefined` when the bridge cannot provide it.
 */
export async function readClassicSessionDetail(sessionDir) {
    try {
        const { stdout } = await execFileAsync(kersorPython(), [
            installedBridge(), 'session-detail', '--session', path.resolve(sessionDir),
        ], {
            encoding: 'utf8',
            maxBuffer: 2 * 1024 * 1024,
            timeout: 10_000,
        });
        const decoded = JSON.parse(stdout);
        return isClassicSessionDetail(decoded) ? decoded : undefined;
    }
    catch {
        // A selectable Session remains usable as a summary when detail is unavailable.
        return undefined;
    }
}
/** Invoke the installed bridge without a shell and return a bounded snapshot. */
export async function readClassicSessions(limit, staleAfterSeconds = 1800, roots = {}) {
    const bridge = installedBridge();
    try {
        await access(bridge);
    }
    catch (error) {
        if (errorCode(error) === 'ENOENT')
            return { sessions: [], source: { state: 'not_installed' } };
        return { sessions: [], source: { state: 'failed', lastIssue: issueFromError('classic_bridge', error) } };
    }
    try {
        const args = [
            bridge,
            'sessions',
            '--limit', String(limit),
            '--stale-after', String(staleAfterSeconds),
        ];
        for (const root of roots.sessionRoots ?? []) {
            if (root.trim())
                args.push('--root', root);
        }
        for (const workspace of roots.workspaceRoots ?? []) {
            if (workspace.trim())
                args.push('--workspace', workspace);
        }
        if (roots.includeCheckoutRoot === false)
            args.push('--no-checkout-root');
        const { stdout } = await execFileAsync(kersorPython(), args, {
            encoding: 'utf8',
            maxBuffer: 2 * 1024 * 1024,
            timeout: 10_000,
        });
        let decoded;
        try {
            decoded = JSON.parse(stdout);
        }
        catch (error) {
            return { sessions: [], source: { state: 'failed', lastIssue: issueFromError('classic_bridge', error) } };
        }
        if (!Array.isArray(decoded.sessions) || !decoded.sessions.every(isClassicSession)) {
            return {
                sessions: [],
                source: { state: 'failed', lastIssue: createIssue('classic_bridge', 'invalid_payload') },
            };
        }
        const degraded = Array.isArray(decoded.warnings) && decoded.warnings.length > 0;
        return {
            sessions: decoded.sessions.slice(0, limit).map(projectSession),
            source: degraded
                ? { state: 'degraded', lastIssue: createIssue('classic_bridge', 'io_error', 'warning') }
                : { state: 'healthy' },
        };
    }
    catch (error) {
        return { sessions: [], source: { state: 'failed', lastIssue: issueFromError('classic_bridge', error) } };
    }
}
//# sourceMappingURL=classic.js.map