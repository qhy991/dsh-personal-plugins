/**
 * Browser-side KerSor viewer store. One Host snapshot owns inventory,
 * classic Sessions, and source health; folded run views and launcher process
 * ownership remain orthogonal client-side accounts.
 * @module @deepseek-ai/dsh-client-ui-kersor-viewer/client
 */

import type {
  KersorRunRef,
  KersorRunView,
  KersorViewerFrame,
  KersorViewerSnapshot,
} from '@deepseek-ai/dsh-kersor-viewer/types'
import type { KersorActiveFrame, KersorActiveLaunch, KersorTaskRef } from '@deepseek-ai/dsh-kersor/types'

export interface KersorRunRow extends KersorRunRef {
  readonly view?: KersorRunView | undefined
}

export interface KersorViewerState {
  /** Latest atomic Host projection; absent until the first successful read. */
  readonly snapshot?: KersorViewerSnapshot
  /** Folded event backlogs keyed independently from the inventory snapshot. */
  readonly views: ReadonlyMap<string, KersorRunView>
  readonly loading: boolean
  /** Transport failure only; Host source failures live in snapshot diagnostics. */
  readonly transportError?: string
  /** Present only while the optional Host launcher namespace is available. */
  readonly launcher?: {
    readonly tasks: readonly KersorTaskRef[]
    readonly active: readonly KersorActiveLaunch[]
    readonly error?: string
  }
}

type Listener = () => void

/** Snapshot store over the Host projection and per-run folded views. */
export class KersorViewerStore {
  private state: KersorViewerState = { views: new Map(), loading: true }
  private readonly listeners = new Set<Listener>()
  private selected: string | undefined

  /** Stable snapshot for useSyncExternalStore. */
  getSnapshot = (): KersorViewerState => this.state

  /** Subscribe to snapshot replacements. */
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Latest run inventory joined with independently folded views. */
  get rows(): readonly KersorRunRow[] {
    return (this.state.snapshot?.runs ?? []).map(ref => ({
      ...ref,
      view: this.state.views.get(ref.runDir),
    }))
  }

  /** Currently selected run directory (panel-local choice). */
  get selectedRunDir(): string | undefined {
    return this.selected
  }

  /** Select a run for the detail view; persists across Host snapshots. */
  select(runDir: string | undefined): void {
    this.selected = runDir
    this.emit()
  }

  /** Selected folded view, falling back to a real available run view. */
  get activeView(): KersorRunView | undefined {
    if (this.selected !== undefined) return this.state.views.get(this.selected)
    const active = this.state.snapshot?.runs.find(ref => ref.discovery === 'active')
    if (active !== undefined) return this.state.views.get(active.runDir)
    for (const ref of this.state.snapshot?.runs ?? []) {
      const view = this.state.views.get(ref.runDir)
      if (view !== undefined) return view
    }
    return undefined
  }

  /** Atomically replace inventory, classic Sessions, and diagnostics. */
  setSnapshot(snapshot: KersorViewerSnapshot): void {
    const live = new Set(snapshot.runs.map(ref => ref.runDir))
    const views = new Map(
      [...this.state.views].filter(([runDir]) => live.has(runDir)),
    )
    const { transportError: _, ...state } = this.state
    const loading = snapshot.diagnostics.scan.state === 'never'
      || snapshot.diagnostics.scan.state === 'running'
    this.state = { ...state, snapshot, views, loading }
    this.emit()
  }

  /** Record a Remote/connection failure without overwriting Host diagnostics. */
  setTransportError(message: string): void {
    this.state = { ...this.state, loading: false, transportError: message }
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
    if (frame.kind === 'snapshot') {
      this.setSnapshot(frame.snapshot)
      return
    }
    const views = new Map(this.state.views)
    views.set(frame.run.runDir, frame.run)
    this.state = { ...this.state, views, loading: false }
    this.emit()
  }

  /** Store a successful `runBacklog` answer. Undefined never fabricates zeros. */
  setBacklog(runDir: string, view: KersorRunView | undefined): void {
    if (view === undefined) return
    const views = new Map(this.state.views)
    views.set(runDir, view)
    this.state = { ...this.state, views, loading: false }
    this.emit()
  }

  /** Drop connection-scoped state. */
  reset(): void {
    this.state = { views: new Map(), loading: true }
    this.selected = undefined
    this.emit()
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}
