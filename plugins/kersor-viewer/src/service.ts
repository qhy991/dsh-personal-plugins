/**
 * KerSor viewer Host service: commits one inventory/diagnostics snapshot and
 * folds each run's event stream for browser consumers.
 * @module @deepseek-ai/dsh-kersor-viewer
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type { Fiber } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type {} from '@deepseek-ai/dsh-workspace'
import { readClassicSessionDetail, readClassicSessions } from './classic.ts'
import type { KersorClassicSessionDetail, KersorClassicSnapshot } from './classic.ts'
import { createIssue, issueFromError, mergeIssue } from './diagnostics.ts'
import { createRunView, foldEvent } from './fold.ts'
import type { KersorEvent, KersorRunView } from './fold.ts'
import { scanRoots } from './scanner.ts'
import type { KersorRunRef, KersorScanObservation } from './scanner.ts'
import { EventsTailer } from './tailer.ts'
import type { KersorRunObservation, KersorViewerFrame, KersorViewerSnapshot } from './types.ts'

export type { KersorEvent, KersorRunView } from './fold.ts'
export type { KersorRunRef } from './scanner.ts'
export type {
  KersorClassicHealth, KersorClassicLifecycle, KersorClassicSession,
  KersorClassicSessionDetail, KersorClassicSnapshot, KersorClassicStatus,
} from './classic.ts'
export type { KersorRunObservation, KersorViewerFrame, KersorViewerSnapshot } from './types.ts'
export { EventsTailer } from './tailer.ts'
export { DEFAULT_KERSOR_ROOTS, scanRoots } from './scanner.ts'
export { createRunView, foldEvent } from './fold.ts'
export { installedBridge, readClassicSessionDetail, readClassicSessions } from './classic.ts'

/** Viewer configuration (cordis.patch.yml row config). */
export interface Config {
  /** Extra KerSor session roots scanned in addition to the defaults. */
  roots?: string[]
  /** Disable built-in and preset-checkout roots. */
  noDefaultRoots?: boolean
  /** Discovery rescan interval in milliseconds. */
  scanIntervalMs?: number
  /** Number of recent classic optimization Sessions shown; zero disables it. */
  classicSessionLimit?: number
  /** Seconds without artifact activity before an unfinished Session is stale. */
  classicStaleAfterSeconds?: number
}

interface TrackedRun {
  ref: KersorRunRef
  view: KersorRunView
  tailer: EventsTailer | undefined
  observation: KersorRunObservation
}

/** Host service owning the viewer's single snapshot and folded run views. */
export class KersorViewerService extends TypertRemoteService {
  static inject = ['workspaceRegistry']

  static Config: z<Config> = z.object({
    roots: z.array(z.string()).default([]),
    noDefaultRoots: z.boolean().default(false),
    scanIntervalMs: z.number().min(500).default(5000),
    classicSessionLimit: z.number().step(1).min(0).max(100).default(20),
    classicStaleAfterSeconds: z.number().step(1).min(1).max(86_400).default(1800),
  })

  private readonly rootCtx: Context
  private readonly configuredRoots: string[]
  private readonly includeDefaults: boolean
  private readonly scanIntervalMs: number
  private readonly classicSessionLimit: number
  private readonly classicStaleAfterSeconds: number
  private readonly tracked = new Map<string, TrackedRun>()
  private group: Fiber | undefined
  private scanTimer: NodeJS.Timeout | undefined
  private scanInFlight: Promise<void> | undefined
  private scanObservation: KersorScanObservation = { state: 'never', roots: [] }
  private classicSnapshot: KersorClassicSnapshot = {
    sessions: [],
    source: { state: 'not_installed' },
  }

  /** Create the service under the Host composition. */
  constructor(ctx: Context, config: Config) {
    super(ctx, 'kersorViewer')
    this.rootCtx = ctx
    this.configuredRoots = config.roots ?? []
    this.includeDefaults = !(config.noDefaultRoots ?? false)
    this.scanIntervalMs = config.scanIntervalMs ?? 5000
    this.classicSessionLimit = config.classicSessionLimit ?? 20
    this.classicStaleAfterSeconds = config.classicStaleAfterSeconds ?? 1800
  }

  /** Start discovery and tailing under the plugin's fiber once ready. */
  *[Service.init](): Generator<() => void, void, void> {
    yield () => {
      for (const tracked of this.tracked.values()) tracked.tailer?.stop()
      this.tracked.clear()
      if (this.scanTimer !== undefined) clearInterval(this.scanTimer)
      this.scanTimer = undefined
      void this.group?.dispose()
      this.group = undefined
    }
    const group = this.requireGroup()
    group.effect(() => {
      void this.rescan()
      this.scanTimer = setInterval(() => { void this.rescan() }, this.scanIntervalMs)
      this.scanTimer.unref()
      return () => {
        if (this.scanTimer !== undefined) clearInterval(this.scanTimer)
        this.scanTimer = undefined
      }
    })
  }

  private requireGroup(): Fiber {
    this.group ??= this.rootCtx.plugin({ name: 'kersor-viewer-group', apply: () => {} })
    return this.group
  }

  /** Complete inventory and source-health snapshot for panel refresh/reconnect. */
  @Remote('snapshot')
  snapshot(): KersorViewerSnapshot {
    return {
      asOf: new Date().toISOString(),
      runs: [...this.tracked.values()].map(tracked => tracked.ref)
        .sort((left, right) => rank(right) - rank(left) || right.runId.localeCompare(left.runId)),
      classic: this.classicSnapshot,
      diagnostics: {
        scan: this.scanObservation,
        runs: [...this.tracked.values()].map(tracked => tracked.observation)
          .sort((left, right) => left.runDir.localeCompare(right.runDir)),
      },
    }
  }

  /** Full folded view of one run (panel open / reconnect backlog). */
  @Remote('runBacklog')
  runBacklog(runDir: string): KersorRunView | undefined {
    return this.tracked.get(runDir)?.view
  }

  /**
   * Read sealed, bounded detail for one classic Session present in the snapshot.
   * @param sessionDir - Exact discovered Session directory.
   * @returns Inspector detail, or `undefined` for an unknown or unreadable Session.
   */
  @Remote('classicSessionDetail')
  async classicSessionDetail(sessionDir: string): Promise<KersorClassicSessionDetail | undefined> {
    if (!this.classicSnapshot.sessions.some(session => session.session_dir === sessionDir)) return undefined
    return readClassicSessionDetail(sessionDir)
  }

  /** Rescan roots once; concurrent callers share the in-flight scan. */
  async rescan(): Promise<void> {
    if (this.scanInFlight !== undefined) return this.scanInFlight
    this.scanObservation = {
      ...this.scanObservation,
      state: 'running',
      startedAt: new Date().toISOString(),
    }
    this.publishSnapshot()
    const current = this.performRescan().catch((error: unknown) => {
      const now = new Date().toISOString()
      this.scanObservation = {
        ...this.scanObservation,
        state: 'failed',
        completedAt: now,
        lastIssue: issueFromError('root_scan', error),
      }
      this.publishSnapshot()
    })
    this.scanInFlight = current
    try {
      await current
    } finally {
      if (this.scanInFlight === current) this.scanInFlight = undefined
    }
  }

  private async performRescan(): Promise<void> {
    const workspaceRoots = [...new Set(
      this.rootCtx.workspaceRegistry.list().map(workspace => workspace.path),
    )]
    const [scanned, classic] = await Promise.all([
      scanRoots(this.configuredRoots, this.includeDefaults, workspaceRoots),
      this.classicSessionLimit === 0
        ? Promise.resolve({ sessions: [], source: { state: 'disabled' } } satisfies KersorClassicSnapshot)
        : readClassicSessions(this.classicSessionLimit, this.classicStaleAfterSeconds, {
          includeCheckoutRoot: this.includeDefaults,
          sessionRoots: this.configuredRoots,
          workspaceRoots,
        }),
    ])
    const previousSuccess = this.scanObservation.lastSuccessfulAt
    this.scanObservation = scanned.observation.state === 'failed' && previousSuccess !== undefined
      ? { ...scanned.observation, lastSuccessfulAt: previousSuccess }
      : scanned.observation
    this.classicSnapshot = classic
    const byRunDir = new Map(scanned.runs.map(ref => [ref.runDir, ref]))
    const scanIssues = new Map(scanned.runIssues.map(entry => [entry.runDir, entry.issue]))

    for (const [runDir, tracked] of this.tracked) {
      if (byRunDir.has(runDir)) continue
      tracked.tailer?.stop()
      this.tracked.delete(runDir)
    }
    for (const ref of scanned.runs) {
      const issue = scanIssues.get(ref.runDir)
      const existing = this.tracked.get(ref.runDir)
      if (existing !== undefined) {
        if (issue !== undefined) this.recordRunIssue(existing, issue)
        if (existing.ref.discovery !== ref.discovery) {
          if (existing.ref.discovery !== 'active' && ref.discovery === 'active') continue
          existing.ref = ref
          if (ref.discovery !== 'active') {
            existing.tailer?.stop()
            existing.tailer = undefined
            existing.view.status = terminalStatus(ref)
            existing.observation = {
              ...existing.observation,
              state: existing.observation.lastIssue === undefined ? 'complete' : 'degraded',
            }
            this.publishRun(existing.view)
          } else {
            this.attachTailer(existing)
          }
        }
        continue
      }
      const tracked: TrackedRun = {
        ref,
        view: createRunView(ref.runId, ref.runDir, ref.sessionDir),
        tailer: undefined,
        observation: {
          runDir: ref.runDir,
          mode: ref.discovery === 'active' ? 'tail' : 'backfill',
          state: issue === undefined ? 'waiting' : 'degraded',
          byteOffset: 0,
          linesRead: 0,
          linesRejected: 0,
          ...(issue === undefined ? {} : { lastIssue: issue }),
        },
      }
      this.tracked.set(ref.runDir, tracked)
      if (ref.discovery === 'active') this.attachTailer(tracked)
      else void this.backfillTerminated(tracked)
    }
    this.publishSnapshot()
  }

  private async backfillTerminated(tracked: TrackedRun): Promise<void> {
    const { ref, view } = tracked
    let text: string
    try {
      text = await (await import('node:fs/promises')).readFile(`${ref.runDir}/.runtime/events.jsonl`, 'utf8')
    } catch (error) {
      view.status = terminalStatus(ref)
      this.recordRunIssue(tracked, issueFromError('backfill_read', error))
      tracked.observation = { ...tracked.observation, state: 'failed' }
      if (this.tracked.get(ref.runDir) === tracked) {
        this.publishRun(view)
        this.publishSnapshot()
      }
      return
    }
    for (const line of text.split('\n')) {
      if (line.length === 0) continue
      tracked.observation = {
        ...tracked.observation,
        linesRead: tracked.observation.linesRead + 1,
        lastReadAt: new Date().toISOString(),
      }
      this.foldLine(tracked, line)
    }
    if (view.status !== 'completed' && view.status !== 'failed') view.status = terminalStatus(ref)
    tracked.observation = {
      ...tracked.observation,
      state: tracked.observation.lastIssue === undefined ? 'complete' : 'degraded',
      byteOffset: Buffer.byteLength(text),
    }
    if (this.tracked.get(ref.runDir) !== tracked) return
    this.publishRun(view)
    this.publishSnapshot()
  }

  private attachTailer(tracked: TrackedRun): void {
    if (tracked.tailer !== undefined) return
    const { ref, view } = tracked
    const tailer = new EventsTailer(
      `${ref.runDir}/.runtime/events.jsonl`,
      (lines) => {
        for (const line of lines) this.foldLine(tracked, line)
        tracked.observation = {
          ...tracked.observation,
          state: tracked.observation.lastIssue === undefined ? 'healthy' : 'degraded',
          byteOffset: tailer.byteOffset,
          linesRead: tracked.observation.linesRead + lines.length,
          lastReadAt: new Date().toISOString(),
        }
        this.publishRun(view)
        if (view.status === 'completed' || view.status === 'failed') {
          tracked.ref = { ...tracked.ref, discovery: view.status }
          tracked.observation = {
            ...tracked.observation,
            state: tracked.observation.lastIssue === undefined ? 'complete' : 'degraded',
          }
          tailer.stop()
        }
      },
      () => {
        if (tracked.tailer === tailer) tracked.tailer = undefined
      },
      {
        onObservation: (observation) => {
          const previousFingerprint = observationFingerprint(tracked.observation)
          const currentIssue = tracked.observation.lastIssue
          const tailerIssue = observation.lastIssue
          const lastIssue = tailerIssue !== undefined
            && (currentIssue === undefined || tailerIssue.lastSeenAt >= currentIssue.lastSeenAt)
            ? tailerIssue
            : currentIssue
          const terminal = tracked.view.status === 'completed' || tracked.view.status === 'failed'
          tracked.observation = {
            ...tracked.observation,
            state: terminal
              ? (lastIssue === undefined ? 'complete' : 'degraded')
              : observation.state === 'healthy' && lastIssue !== undefined
                ? 'degraded'
                : observation.state,
            byteOffset: observation.byteOffset,
            linesRead: observation.linesRead,
            ...(observation.lastReadAt === undefined ? {} : { lastReadAt: observation.lastReadAt }),
            ...(lastIssue === undefined ? {} : { lastIssue }),
          }
          if (observationFingerprint(tracked.observation) !== previousFingerprint) this.publishSnapshot()
        },
      },
    )
    tracked.tailer = tailer
    try {
      tailer.start()
    } catch (error) {
      tracked.tailer = undefined
      this.recordRunIssue(tracked, issueFromError('tailer_watch', error))
      tracked.observation = { ...tracked.observation, state: 'failed' }
      this.publishSnapshot()
    }
  }

  private foldLine(tracked: TrackedRun, line: string): void {
    let decoded: unknown
    try {
      decoded = JSON.parse(line)
    } catch (error) {
      this.rejectLine(tracked, issueFromError('event_parse', error, 'warning'))
      return
    }
    if (decoded === null || typeof decoded !== 'object'
      || typeof (decoded as { type?: unknown }).type !== 'string') {
      this.rejectLine(tracked, createIssue('event_parse', 'invalid_payload', 'warning'))
      return
    }
    try {
      foldEvent(tracked.view, decoded as KersorEvent)
    } catch (error) {
      this.rejectLine(tracked, issueFromError('event_fold', error, 'warning'))
    }
  }

  private rejectLine(tracked: TrackedRun, issue: ReturnType<typeof createIssue>): void {
    this.recordRunIssue(tracked, issue)
    tracked.observation = {
      ...tracked.observation,
      state: 'degraded',
      linesRejected: tracked.observation.linesRejected + 1,
    }
  }

  private recordRunIssue(tracked: TrackedRun, issue: ReturnType<typeof createIssue>): void {
    tracked.observation = {
      ...tracked.observation,
      lastIssue: mergeIssue(tracked.observation.lastIssue, issue),
    }
  }

  private publishSnapshot(): void {
    this.rootCtx.emit('kersor/event', { kind: 'snapshot', snapshot: this.snapshot() } satisfies KersorViewerFrame)
  }

  private publishRun(run: KersorRunView): void {
    this.rootCtx.emit('kersor/event', { kind: 'run', run } satisfies KersorViewerFrame)
  }
}

function rank(ref: KersorRunRef): number {
  if (ref.discovery === 'active') return 2
  if (ref.discovery === 'failed') return 1
  return 0
}

function terminalStatus(ref: KersorRunRef): 'completed' | 'failed' {
  return ref.discovery === 'failed' ? 'failed' : 'completed'
}

function observationFingerprint(observation: KersorRunObservation): string {
  const issue = observation.lastIssue
  return `${observation.state}:${observation.byteOffset}:${observation.linesRead}:${issue?.stage ?? ''}:${issue?.code ?? ''}:${issue?.occurrences ?? 0}`
}

/** Cordis plugin entry: the service class itself. */
export default KersorViewerService
