/**
 * Read-only adapter from the installed KerSor preset bridge to the viewer.
 * KerSor's Python SessionStore remains the canonical parser for both v2 and
 * legacy state; this module only launches the bounded projection and checks
 * its wire shape.
 * @module @deepseek-ai/dsh-kersor-viewer
 */

import { execFile } from 'node:child_process'
import { access } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type KersorClassicLifecycle = 'active' | 'completed' | 'stalled' | 'cancelled'

/** One recent optimization Session projected by the canonical KerSor stores. */
export interface KersorClassicSession {
  readonly session_id: string
  readonly session_dir: string
  readonly storage_kind: 'v2' | 'legacy'
  readonly phase?: string | null
  readonly lifecycle: KersorClassicLifecycle
  readonly current_round?: number | null
  readonly max_workflows?: number | null
  readonly target_speedup?: number | null
  readonly target_met?: boolean | null
  readonly mode?: string | null
  readonly backend?: string | null
  readonly kernel_language?: string | null
  readonly kernel_name?: string | null
  readonly workflow?: string | null
  readonly fit_confidence?: string | null
  readonly best_speedup?: number | null
  readonly warnings: readonly string[]
}

/** Bounded recent-session inventory plus a non-fatal adapter warning. */
export interface KersorClassicSnapshot {
  readonly sessions: readonly KersorClassicSession[]
  readonly warning?: string
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

function isClassicSession(value: unknown): value is KersorClassicSession {
  if (value === null || typeof value !== 'object') return false
  const row = value as Partial<KersorClassicSession>
  return typeof row.session_id === 'string'
    && typeof row.session_dir === 'string'
    && (row.storage_kind === 'v2' || row.storage_kind === 'legacy')
    && (row.lifecycle === 'active' || row.lifecycle === 'completed'
      || row.lifecycle === 'stalled' || row.lifecycle === 'cancelled')
    && Array.isArray(row.warnings)
    && row.warnings.every(item => typeof item === 'string')
}

/** Invoke the installed bridge without a shell and return a bounded snapshot. */
export async function readClassicSessions(limit: number): Promise<KersorClassicSnapshot> {
  const bridge = installedBridge()
  try {
    await access(bridge)
  } catch {
    return { sessions: [] } // autonomous-only installs do not require the preset
  }
  try {
    const { stdout } = await execFileAsync('python3', [bridge, 'sessions', '--limit', String(limit)], {
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
      timeout: 10_000,
    })
    const decoded = JSON.parse(stdout) as { sessions?: unknown, warnings?: unknown }
    if (!Array.isArray(decoded.sessions) || !decoded.sessions.every(isClassicSession)) {
      return { sessions: [], warning: 'KerSor bridge returned an invalid session inventory' }
    }
    const warning = Array.isArray(decoded.warnings)
      && decoded.warnings.every(item => typeof item === 'string')
      && decoded.warnings.length > 0
      ? decoded.warnings.join('; ')
      : undefined
    return {
      sessions: decoded.sessions.slice(0, limit),
      ...(warning === undefined ? {} : { warning }),
    }
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : undefined
    return {
      sessions: [],
      warning: `KerSor session inventory unavailable${code === undefined ? '' : ` (${code})`}`,
    }
  }
}
