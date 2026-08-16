/**
 * Root-directory discovery of KerSor autonomous runs. A root is scanned for
 * Session-v2 directories (`session-config.json` + `state.json`) that carry an
 * `autonomous-runs/` child; each child directory is one run.
 * @module @deepseek-ai/dsh-kersor-viewer
 */

import { readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

/** Default roots scanned in addition to configured ones. */
export const DEFAULT_KERSOR_ROOTS = [
  path.join(homedir(), '.local', 'share', 'kersor'),
  path.join(homedir(), 'Agent4Kernel', 'KerSor', '.kersor'),
]

/** Lifecycle classification of one discovered run directory. */
export type KersorRunDiscovery = 'active' | 'completed' | 'failed'

/** One discovered run: identity paths plus classification. */
export interface KersorRunRef {
  readonly runId: string
  readonly runDir: string
  readonly sessionDir: string
  readonly root: string
  readonly discovery: KersorRunDiscovery
}

async function exists(entry: string): Promise<boolean> {
  try {
    await readdir(entry)
    return true
  } catch {
    return false
  }
}

async function isSessionV2(dir: string): Promise<boolean> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.some(entry => entry.isFile() && entry.name === 'session-config.json')
      && entries.some(entry => entry.isFile() && entry.name === 'state.json')
  } catch {
    return false
  }
}

async function readJson(file: string): Promise<Record<string, unknown> | undefined> {
  try {
    return JSON.parse(await (await import('node:fs/promises')).readFile(file, 'utf8')) as Record<string, unknown>
  } catch {
    return undefined
  }
}

/** Scan one session directory's `autonomous-runs/` for run children. */
async function scanSession(
  sessionDir: string,
  root: string,
  into: KersorRunRef[],
): Promise<void> {
  const runsDir = path.join(sessionDir, 'autonomous-runs')
  let children: string[]
  try {
    children = await readdir(runsDir)
  } catch {
    return
  }
  for (const runId of children) {
    const runDir = path.join(runsDir, runId)
    if (!(await exists(runDir))) continue
    const summary = await readJson(path.join(runDir, '.runtime', 'summary.json'))
    let discovery: KersorRunDiscovery = 'active'
    if (summary !== undefined) {
      // workflow-host writes `status: 'completed' | 'error'` (failure summary
      // has no workflow_status); the controller's terminal statuses are
      // 'completed' | 'failed' | 'waiting' (autonomous-controller.js status
      // enum). 'waiting' means the run stopped awaiting external input — the
      // host has written its summary, so it is terminal here, shown completed.
      const status = summary.workflow_status ?? summary.status
      if (status === 'completed' || status === 'waiting') discovery = 'completed'
      else if (status === 'error' || status === 'failed') discovery = 'failed'
    }
    into.push({ runId, runDir, sessionDir, root, discovery })
  }
}

/**
 * Scan every root (deduplicated) for KerSor runs.
 * @param roots - configured roots; defaults are appended when `includeDefaults`.
 * @returns run refs; ordering is unspecified (the service sorts for display).
 */
export async function scanRoots(roots: readonly string[], includeDefaults: boolean): Promise<KersorRunRef[]> {
  const all = [...new Set(includeDefaults ? [...roots, ...DEFAULT_KERSOR_ROOTS] : [...roots])]
  const found: KersorRunRef[] = []
  for (const root of all) {
    const expanded = root.startsWith('~/') ? path.join(homedir(), root.slice(2)) : root
    let sessions: string[]
    try {
      sessions = await readdir(expanded)
    } catch {
      continue // root absent or unreadable: not an error, just no runs there
    }
    for (const session of sessions) {
      const sessionDir = path.join(expanded, session)
      if (!(await isSessionV2(sessionDir))) continue
      await scanSession(sessionDir, expanded, found)
    }
  }
  return found
}
