/**
 * Read-only adapter from the installed KerSor preset bridge to the viewer.
 * KerSor's Python SessionStore remains the canonical parser for both v2 and
 * legacy state; this module only launches the bounded projection and checks
 * its wire shape.
 * @module @deepseek-ai/dsh-kersor-viewer
 */
import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
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
        && Array.isArray(row.warnings)
        && row.warnings.every(item => typeof item === 'string');
}
/** Invoke the installed bridge without a shell and return a bounded snapshot. */
export async function readClassicSessions(limit, staleAfterSeconds = 1800, roots = {}) {
    const bridge = installedBridge();
    try {
        await access(bridge);
    }
    catch {
        return { sessions: [] }; // autonomous-only installs do not require the preset
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
        const { stdout } = await execFileAsync('python3', args, {
            encoding: 'utf8',
            maxBuffer: 2 * 1024 * 1024,
            timeout: 10_000,
        });
        const decoded = JSON.parse(stdout);
        if (!Array.isArray(decoded.sessions) || !decoded.sessions.every(isClassicSession)) {
            return { sessions: [], warning: 'KerSor bridge returned an invalid session inventory' };
        }
        const warning = Array.isArray(decoded.warnings)
            && decoded.warnings.every(item => typeof item === 'string')
            && decoded.warnings.length > 0
            ? decoded.warnings.join('; ')
            : undefined;
        return {
            sessions: decoded.sessions.slice(0, limit),
            ...(warning === undefined ? {} : { warning }),
        };
    }
    catch (error) {
        const code = typeof error === 'object' && error !== null && 'code' in error
            ? String(error.code)
            : undefined;
        return {
            sessions: [],
            warning: `KerSor session inventory unavailable${code === undefined ? '' : ` (${code})`}`,
        };
    }
}
//# sourceMappingURL=classic.js.map