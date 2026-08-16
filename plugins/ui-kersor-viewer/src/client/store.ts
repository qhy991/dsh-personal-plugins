/**
 * Browser-side viewer store: run inventory plus folded run views, fed by the
 * forwarded `kersor/event` Host frames and the `listRuns`/`runBacklog`
 * remotes. A useSyncExternalStore-compatible snapshot observable.
 * @module @deepseek-ai/dsh-client-ui-kersor-viewer/client
 */

import type { KersorRunView } from '@deepseek-ai/dsh-kersor-viewer/types'
import type { KersorRunRef } from '@deepseek-ai/dsh-kersor-viewer/types'
import type { KersorViewerFrame } from '@deepseek-ai/dsh-kersor-viewer/types'
import type { KersorActiveFrame, KersorActiveLaunch, KersorTaskRef } from '@deepseek-ai/dsh-kersor/types'

export interface KersorRunRow extends KersorRunRef {
  view?: KersorRunView | undefined
}

export interface KersorViewerState {
  readonly rows: readonly KersorRunRow[]
  readonly loading: boolean
  readonly error?: string
  /** Present only while the optional Host launcher namespace is available. */
  readonly launcher?: {
    readonly tasks: readonly KersorTaskRef[]
    readonly active: readonly KersorActiveLaunch[]
    readonly error?: string
  }
}

type Listener = () => void

/** Snapshot store over the run inventory and per-run folded views. */
export class KersorViewerStore {
  private state: KersorViewerState = { rows: [], loading: true }
  private readonly listeners = new Set<Listener>()
  private selected: string | undefined

  /** Stable snapshot for useSyncExternalStore. */
  getSnapshot = (): KersorViewerState => this.state

  /** Subscribe to snapshot replacements. */
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Currently selected run directory (panel-local choice). */
  get selectedRunDir(): string | undefined {
    return this.selected
  }

  /** Select a run for the detail view; persists across inventory frames. */
  select(runDir: string | undefined): void {
    this.selected = runDir
    this.emit()
  }

  /** The selected run's folded view, falling back to the best active run. */
  get activeView(): KersorRunView | undefined {
    const byDir = this.selected !== undefined
      ? this.state.rows.find(row => row.runDir === this.selected)
      : undefined
    const row = byDir ?? this.state.rows.find(candidate => candidate.discovery === 'active') ?? this.state.rows[0]
    return row?.view ?? (row !== undefined ? emptyViewOf(row) : undefined)
  }

  /** Replace the inventory half from a `listRuns` remote answer. */
  setInventory(refs: readonly KersorRunRef[]): void {
    const byDir = new Map(this.state.rows.map(row => [row.runDir, row]))
    const rows = refs.map(ref => ({ ...ref, view: byDir.get(ref.runDir)?.view }) satisfies KersorRunRow)
    this.state = { ...this.state, rows, loading: false }
    this.emit()
  }

  /** Mark a failed inventory read. */
  setError(message: string): void {
    this.state = { ...this.state, loading: false, error: message }
    this.emit()
  }

  /** Replace the optional launcher's configured-task and owned-process inventory. */
  setLauncher(tasks: readonly KersorTaskRef[], active: readonly KersorActiveLaunch[]): void {
    this.state = { ...this.state, launcher: { tasks, active } }
    this.emit()
  }

  /** Hide controls when the Host launcher plugin is not loaded. */
  setLauncherUnavailable(): void {
    if (this.state.launcher === undefined) return
    const { launcher: _, ...state } = this.state
    this.state = state
    this.emit()
  }

  /** Record a launch/stop failure without contaminating viewer read state. */
  setLauncherError(message: string): void {
    if (this.state.launcher === undefined) return
    this.state = { ...this.state, launcher: { ...this.state.launcher, error: message } }
    this.emit()
  }

  /** Apply the Host launcher's complete owned-process replacement frame. */
  applyActiveFrame(frame: KersorActiveFrame): void {
    if (this.state.launcher === undefined) return
    this.state = { ...this.state, launcher: { ...this.state.launcher, active: frame.launches } }
    this.emit()
  }

  /** Apply one forwarded Host frame. */
  applyFrame(frame: KersorViewerFrame): void {
    if (frame.kind === 'runs') {
      this.setInventory(frame.runs)
      return
    }
    const rows = this.state.rows.some(row => row.runDir === frame.run.runDir)
      ? this.state.rows.map(row => row.runDir === frame.run.runDir ? { ...row, view: frame.run } : row)
      : [...this.state.rows, { ...refOf(frame.run), view: frame.run }]
    this.state = { ...this.state, rows, loading: false }
    this.emit()
  }

  /** Store the backlog answer of `runBacklog` (panel open / reconnect). */
  setBacklog(runDir: string, view: KersorRunView | undefined): void {
    if (view === undefined) return
    const rows = this.state.rows.some(row => row.runDir === runDir)
      ? this.state.rows.map(row => row.runDir === runDir ? { ...row, view } : row)
      : [...this.state.rows, { ...refOf(view), view }]
    this.state = { ...this.state, rows, loading: false }
    this.emit()
  }

  /** Drop everything (connection reset). */
  reset(): void {
    this.state = { rows: [], loading: true }
    this.selected = undefined
    this.emit()
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}

function refOf(view: KersorRunView): KersorRunRow {
  return {
    runId: view.runId,
    runDir: view.runDir,
    sessionDir: view.sessionDir,
    root: '',
    discovery: view.status === 'running' ? 'active' : view.status === 'failed' ? 'failed' : 'completed',
    view,
  }
}

function emptyViewOf(row: KersorRunRow): KersorRunView {
  return {
    runId: row.runId, runDir: row.runDir, sessionDir: row.sessionDir,
    status: row.discovery === 'active' ? 'running' : row.discovery,
    currentPhase: '',
    phases: [],
    totals: { calls: 0, completed: 0, failed: 0, tokens: 0 },
  }
}
