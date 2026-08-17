/**
 * Read-only adapter from the installed KerSor preset bridge to the viewer.
 * @module @deepseek-ai/dsh-kersor-viewer
 */

import { execFile } from 'node:child_process'
import { access } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { createIssue, errorCode, issueFromError } from './diagnostics.ts'
import type { KersorDiagnosticIssue } from './diagnostics.ts'

const execFileAsync = promisify(execFile)

export type KersorClassicLifecycle = 'active' | 'completed' | 'stalled' | 'cancelled'
export type KersorClassicHealth = 'active' | 'stale' | 'needs_resume' | 'terminal' | 'unknown'
export type KersorClassicStatus =
  | 'terminal-complete'
  | 'terminal-stalled'
  | 'terminal-cancelled'
  | 'resumable'
  | 'in-progress'
  | 'pre-round-1'

/** One recent optimization Session projected by the canonical KerSor stores. */
export interface KersorClassicSession {
  readonly session_id: string
  readonly session_dir: string
  readonly storage_kind: 'v2' | 'legacy'
  readonly phase?: string | null
  readonly lifecycle: KersorClassicLifecycle
  readonly status: KersorClassicStatus
  readonly health: KersorClassicHealth
  readonly started_at?: string | null
  readonly last_activity_at?: string | null
  readonly current_round?: number | null
  readonly max_workflows?: number | null
  readonly target_speedup?: number | null
  readonly target_met?: boolean | null
  readonly mode?: string | null
  readonly backend?: string | null
  readonly kernel_language?: string | null
  readonly integration_pattern?: string | null
  readonly allow_workflow_authoring?: boolean | null
  readonly workflow_authoring_budget?: number | null
  readonly kernel_name?: string | null
  readonly workflow?: string | null
  /** Latest canonical COMPLETE/CONTINUE/STALLED line, when a round has decided. */
  readonly decision?: string | null
  readonly fit_confidence?: string | null
  readonly best_speedup?: number | null
  readonly warningCount: number
}

/** Health of the optional classic-Session bridge. */
export interface KersorClassicSource {
  readonly state: 'disabled' | 'not_installed' | 'healthy' | 'degraded' | 'failed'
  readonly lastIssue?: KersorDiagnosticIssue
}

/** Bounded recent-session inventory and its structured source state. */
export interface KersorClassicSnapshot {
  readonly sessions: readonly KersorClassicSession[]
  readonly source: KersorClassicSource
}

/** Machine-local roots supplied by viewer configuration and DSH workspaces. */
export interface KersorClassicRoots {
  readonly includeCheckoutRoot?: boolean
  readonly sessionRoots?: readonly string[]
  readonly workspaceRoots?: readonly string[]
}

interface RawClassicSession extends Omit<KersorClassicSession, 'warningCount'> {
  readonly warnings: readonly string[]
}

function dshHome(): string {
  const configured = process.env.DSH_HOME?.trim()
  if (!configured) return path.join(homedir(), '.dsh')
  if (configured === '~') return homedir()
  return configured.startsWith('~/')
    ? path.join(homedir(), configured.slice(2))
    : path.resolve(configured)
}

/** Path copied by the portable preset installer. */
export function installedBridge(): string {
  return path.join(dshHome(), '.agent-presets', 'kersor', 'bin', 'kersor_bridge.py')
}

function kersorPython(): string {
  return process.env.KERSOR_PYTHON?.trim() || 'python3'
}

function optionalString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string'
}

function optionalBoolean(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'boolean'
}

function optionalNumber(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'number'
}

function isClassicSession(value: unknown): value is RawClassicSession {
  if (value === null || typeof value !== 'object') return false
  const row = value as Partial<RawClassicSession>
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
    && optionalString(row.decision)
    && optionalString(row.fit_confidence)
    && Array.isArray(row.warnings)
    && row.warnings.every(item => typeof item === 'string')
}

function projectSession(row: RawClassicSession): KersorClassicSession {
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
    decision: row.decision ?? null,
    fit_confidence: row.fit_confidence ?? null,
    best_speedup: row.best_speedup ?? null,
    warningCount: row.warnings.length,
  }
}

/** Invoke the installed bridge without a shell and return a bounded snapshot. */
export async function readClassicSessions(
  limit: number,
  staleAfterSeconds = 1800,
  roots: KersorClassicRoots = {},
): Promise<KersorClassicSnapshot> {
  const bridge = installedBridge()
  try {
    await access(bridge)
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return { sessions: [], source: { state: 'not_installed' } }
    return { sessions: [], source: { state: 'failed', lastIssue: issueFromError('classic_bridge', error) } }
  }
  try {
    const args = [
      bridge,
      'sessions',
      '--limit', String(limit),
      '--stale-after', String(staleAfterSeconds),
    ]
    for (const root of roots.sessionRoots ?? []) {
      if (root.trim()) args.push('--root', root)
    }
    for (const workspace of roots.workspaceRoots ?? []) {
      if (workspace.trim()) args.push('--workspace', workspace)
    }
    if (roots.includeCheckoutRoot === false) args.push('--no-checkout-root')
    const { stdout } = await execFileAsync(kersorPython(), args, {
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
      timeout: 10_000,
    })
    let decoded: { sessions?: unknown; warnings?: unknown }
    try {
      decoded = JSON.parse(stdout) as { sessions?: unknown; warnings?: unknown }
    } catch (error) {
      return { sessions: [], source: { state: 'failed', lastIssue: issueFromError('classic_bridge', error) } }
    }
    if (!Array.isArray(decoded.sessions) || !decoded.sessions.every(isClassicSession)) {
      return {
        sessions: [],
        source: { state: 'failed', lastIssue: createIssue('classic_bridge', 'invalid_payload') },
      }
    }
    const degraded = Array.isArray(decoded.warnings) && decoded.warnings.length > 0
    return {
      sessions: decoded.sessions.slice(0, limit).map(projectSession),
      source: degraded
        ? { state: 'degraded', lastIssue: createIssue('classic_bridge', 'io_error', 'warning') }
        : { state: 'healthy' },
    }
  } catch (error) {
    return { sessions: [], source: { state: 'failed', lastIssue: issueFromError('classic_bridge', error) } }
  }
}
