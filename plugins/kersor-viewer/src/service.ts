/**
 * KerSor viewer host service: discovers run directories under configured
 * KerSor roots, tails each active run's `events.jsonl`, folds events into the
 * viewer view model, and pushes updates to every browser page through the
 * forwarded `kersor/event` Host event.
 * @module @deepseek-ai/dsh-kersor-viewer
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type { Fiber } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type {} from '@deepseek-ai/dsh-workspace'
import { createRunView, foldEvent } from './fold.ts'
import type { KersorEvent, KersorRunView } from './fold.ts'
import { readClassicSessions } from './classic.ts'
import type { KersorClassicSnapshot } from './classic.ts'
import { scanRoots } from './scanner.ts'
import type { KersorRunRef } from './scanner.ts'
import { EventsTailer } from './tailer.ts'
import type { KersorViewerFrame } from './types.ts'

export type { KersorEvent, KersorRunView } from './fold.ts'
export type { KersorRunRef } from './scanner.ts'
export type { KersorBaselineAction, KersorClassicHealth, KersorClassicLifecycle, KersorClassicSession, KersorClassicSnapshot, KersorClassicStatus } from './classic.ts'
export type { KersorViewerFrame } from './types.ts'
export { EventsTailer } from './tailer.ts'
export { DEFAULT_KERSOR_ROOTS, scanRoots } from './scanner.ts'
export { createRunView, foldEvent } from './fold.ts'
export { installedBridge, readClassicSessions } from './classic.ts'

/** Viewer configuration (cordis.patch.yml row config). */
export interface Config {
  /** Extra KerSor session roots scanned in addition to the defaults. */
  roots?: string[]
  /** Disable scanning of the built-in default roots. */
  noDefaultRoots?: boolean
  /** Discovery rescan interval in milliseconds. */
  scanIntervalMs?: number
  /** Number of recent classic optimization Sessions shown; zero disables it. */
  classicSessionLimit?: number
  /** Seconds without stable artifact activity before an unfinished Session is stale. */
  classicStaleAfterSeconds?: number
}

interface TrackedRun {
  ref: KersorRunRef
  view: KersorRunView
  tailer: EventsTailer | undefined
}

/**
 * Host service: run inventory, live event folding, and browser push. Exposes
 * `listRuns` and `runBacklog` remotes for panel open and reconnect.
 */
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
  private emittedRunsSignature = ''
  private classicSnapshot: KersorClassicSnapshot = { sessions: [] }
  private scanInFlight: Promise<void> | undefined

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
      // Teardown: stop every tailer and the scan loop; the group fiber's own
      // disposers (registered via group.effect below) run on group dispose.
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

  /** Inventory snapshot for the panel's run list. */
  @Remote('listRuns')
  listRuns(): KersorRunRef[] {
    return [...this.tracked.values()].map(tracked => tracked.ref)
      .sort((left, right) => rank(right) - rank(left) || right.runId.localeCompare(left.runId))
  }

  /** Recent classic and Session-v2 optimization summaries from KerSor stores. */
  @Remote('listClassicSessions')
  listClassicSessions(): KersorClassicSnapshot {
    return this.classicSnapshot
  }

  /** Full folded view of one run (panel open / reconnect backlog). */
  @Remote('runBacklog')
  runBacklog(runDir: string): KersorRunView | undefined {
    return this.tracked.get(runDir)?.view
  }

  /** Rescan roots; start and stop tailers to match discovery. */
  async rescan(): Promise<void> {
    if (this.scanInFlight !== undefined) return this.scanInFlight
    const current = this.performRescan()
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
    const [found, classicSnapshot] = await Promise.all([
      scanRoots(this.configuredRoots, this.includeDefaults, workspaceRoots),
      this.classicSessionLimit === 0
        ? Promise.resolve({ sessions: [] } satisfies KersorClassicSnapshot)
        : readClassicSessions(this.classicSessionLimit, this.classicStaleAfterSeconds, {
          includeCheckoutRoot: this.includeDefaults,
          sessionRoots: this.configuredRoots,
          workspaceRoots,
        }),
    ])
    this.classicSnapshot = classicSnapshot
    const byRunDir = new Map(found.map(ref => [ref.runDir, ref]))
    for (const [runDir, tracked] of this.tracked) {
      if (byRunDir.has(runDir)) continue
      tracked.tailer?.stop()
      this.tracked.delete(runDir)
    }
    for (const ref of found) {
      const existing = this.tracked.get(ref.runDir)
      if (existing !== undefined) {
        if (existing.ref.discovery !== ref.discovery) {
          // Lifecycle is monotonic. A summary can be momentarily unreadable
          // while it is replaced, but a terminal run must not become active
          // again because of that transient scan result.
          if (existing.ref.discovery !== 'active' && ref.discovery === 'active') continue
          existing.ref = ref
          if (ref.discovery !== 'active') {
            existing.tailer?.stop()
            existing.tailer = undefined
            // A waiting summary is terminal even when the event stream has no
            // workflow.completed frame. Summary-backed discovery is the
            // authoritative lifecycle shown in the inventory.
            existing.view.status = terminalStatus(ref)
            this.rootCtx.emit('kersor/event', { kind: 'run', run: existing.view } satisfies KersorViewerFrame)
          } else {
            this.attachTailer(existing)
          }
        }
        continue
      }
      const view = createRunView(ref.runId, ref.runDir, ref.sessionDir)
      const tracked: TrackedRun = { ref, view, tailer: undefined }
      this.tracked.set(ref.runDir, tracked)
      if (ref.discovery === 'active') this.attachTailer(tracked)
      else void this.backfillTerminated(tracked)
    }
    const signature = found.map(ref => `${ref.runDir}:${ref.discovery}`).sort().join('|')
    if (signature !== this.emittedRunsSignature) {
      this.emittedRunsSignature = signature
      this.rootCtx.emit('kersor/event', { kind: 'runs', runs: this.listRuns() } satisfies KersorViewerFrame)
    }
  }

  /** Read a discovered-terminated run's full event log once (no tailer). */
  private async backfillTerminated(tracked: TrackedRun): Promise<void> {
    const { ref, view } = tracked
    let text: string
    try {
      text = await (await import('node:fs/promises')).readFile(`${ref.runDir}/.runtime/events.jsonl`, 'utf8')
    } catch {
      return // no event log (e.g. crashed before the first flush): empty view
    }
    for (const line of text.split('\n')) {
      if (line.length === 0) continue
      try {
        foldEvent(view, JSON.parse(line) as KersorEvent)
      } catch {
        // partial or non-JSON line: skip
      }
    }
    if (view.status !== 'completed' && view.status !== 'failed') {
      view.status = terminalStatus(ref)
    }
    if (this.tracked.get(ref.runDir) !== tracked) return
    this.rootCtx.emit('kersor/event', { kind: 'run', run: view } satisfies KersorViewerFrame)
  }

  private attachTailer(tracked: TrackedRun): void {
    if (tracked.tailer !== undefined) return
    const { ref, view } = tracked
    const eventsFile = `${ref.runDir}/.runtime/events.jsonl`
    const tailer = new EventsTailer(
      eventsFile,
      (lines) => {
        let mutated = false
        for (const line of lines) {
          let event: KersorEvent
          try {
            event = JSON.parse(line) as KersorEvent
          } catch {
            continue // partial or non-JSON line: skip
          }
          mutated = true
          foldEvent(view, event)
        }
        if (mutated) this.rootCtx.emit('kersor/event', { kind: 'run', run: view } satisfies KersorViewerFrame)
        if (view.status === 'completed' || view.status === 'failed') {
          tracked.ref = { ...tracked.ref, discovery: view.status }
          tailer.stop()
        }
      },
      () => {
        if (tracked.tailer === tailer) tracked.tailer = undefined
      },
    )
    tracked.tailer = tailer
    tailer.start()
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

/** Cordis plugin entry: the service class itself (class plugin, default export). */
export default KersorViewerService
