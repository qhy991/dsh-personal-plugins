/**
 * Pure fold of a KerSor `events.jsonl` stream into the viewer's run view
 * model. One `KersorRunView` accumulates every event of a single run; phases
 * are buckets in first-appearance order so loop re-visits (KSearch cycles
 * Select/Generate/Evaluate) each get their own bucket.
 * @module @deepseek-ai/dsh-kersor-viewer
 */

/** Terminal lifecycle of a whole workflow run. */
export type KersorRunStatus = 'running' | 'completed' | 'failed' | 'unknown'

/** Lifecycle of one agent or evaluation call row. */
export type KersorCallStatus = 'queued' | 'running' | 'completed' | 'failed'

/** Which host primitive emitted the call. */
export type KersorCallKind = 'agent' | 'evaluation'

/** One folded call row inside a phase bucket. */
export interface KersorCallView {
  readonly seq: number
  readonly callId: string
  readonly label: string
  readonly kind: KersorCallKind
  status: KersorCallStatus
  startedTs?: string | undefined
  endedTs?: string | undefined
  tokens?: number | undefined
  rolledBack?: boolean | undefined
  error?: string | undefined
}

/** One phase bucket holding its calls in arrival order. */
export interface KersorPhaseView {
  readonly title: string
  readonly index: number
  status: 'running' | 'completed' | 'failed'
  readonly calls: KersorCallView[]
}

/** Folded projection of one KerSor autonomous run. */
export interface KersorRunView {
  readonly runId: string
  readonly runDir: string
  readonly sessionDir: string
  status: KersorRunStatus
  startedTs?: string | undefined
  endedTs?: string | undefined
  currentPhase: string
  phases: KersorPhaseView[]
  totals: {
    calls: number
    completed: number
    failed: number
    tokens: number
  }
  error?: string | undefined
}

/** Shape of one parsed `events.jsonl` line (superset; unknown fields ignored). */
export interface KersorEvent {
  readonly type: string
  readonly ts?: string
  readonly phase?: string
  readonly label?: string
  readonly seq?: number
  readonly call_id?: string
  readonly usage?: { total_tokens?: number }
  readonly error?: { message?: string } | string
  [key: string]: unknown
}

function errorMessage(error: KersorEvent['error']): string | undefined {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && typeof error.message === 'string') return error.message
  return undefined
}

function totalTokens(usage: KersorEvent['usage']): number | undefined {
  return usage && typeof usage === 'object' && typeof usage.total_tokens === 'number'
    ? usage.total_tokens
    : undefined
}

function ensurePhase(view: KersorRunView, title: string): KersorPhaseView {
  const existing = view.phases.at(-1)
  if (existing && existing.title === title) return existing
  // Loop revisit of an earlier phase title opens a fresh bucket so cycles
  // read as separate rounds in execution order.
  const phase: KersorPhaseView = { title, index: view.phases.length, status: 'running', calls: [] }
  view.phases.push(phase)
  return phase
}

function callBucket(view: KersorRunView, event: KersorEvent, kind: KersorCallKind): KersorCallView | undefined {
  const seq = typeof event.seq === 'number' ? event.seq : -1
  const callId = typeof event.call_id === 'string' ? event.call_id : `${event.phase ?? ''}/${event.label ?? ''}/${seq}`
  // Terminal events repeat phase+label; route to the LAST bucket whose title
  // matches so the row lands in the round that opened it.
  for (let i = view.phases.length - 1; i >= 0; i -= 1) {
    const bucket = view.phases[i]
    if (bucket === undefined || bucket.title !== (event.phase ?? '')) continue
    const row = bucket.calls.find(call => call.callId === callId)
    if (row) return row
  }
  // Not seen queued/started yet (mid-run attach): materialize the row.
  const phase = ensurePhase(view, event.phase ?? '')
  const row: KersorCallView = {
    seq, callId, kind,
    label: typeof event.label === 'string' ? event.label : callId,
    status: 'running',
  }
  phase.calls.push(row)
  view.totals.calls += 1
  return row
}

/** Fold one parsed event into the view. Mutates `view` in place. */
export function foldEvent(view: KersorRunView, event: KersorEvent): void {
  switch (event.type) {
    case 'workflow.started': {
      view.status = 'running'
      view.startedTs = event.ts
      return
    }
    case 'phase.changed': {
      const title = typeof event.phase === 'string' ? event.phase : ''
      // Leaving for a different phase closes the bucket just opened/left;
      // re-entering the same title on the next loop round opens a fresh one.
      const current = view.phases.at(-1)
      if (current && current.title !== title && current.status === 'running') current.status = 'completed'
      view.currentPhase = title
      ensurePhase(view, title)
      return
    }
    case 'workflow.completed': {
      view.status = 'completed'
      view.endedTs = event.ts
      const tokens = totalTokens(event.usage)
      if (tokens !== undefined) view.totals.tokens = tokens
      const lastPhase = view.phases.at(-1)
      if (lastPhase !== undefined) lastPhase.status = 'completed'
      return
    }
    case 'workflow.failed': {
      view.status = 'failed'
      view.endedTs = event.ts
      view.error = errorMessage(event.error)
      const tokens = totalTokens(event.usage)
      if (tokens !== undefined) view.totals.tokens = tokens
      const lastPhase = view.phases.at(-1)
      if (lastPhase !== undefined) lastPhase.status = 'failed'
      return
    }
    case 'agent.queued':
    case 'evaluation.queued': {
      const phase = ensurePhase(view, event.phase ?? '')
      const seq = typeof event.seq === 'number' ? event.seq : -1
      const callId = typeof event.call_id === 'string' ? event.call_id : ''
      if (phase.calls.some(call => call.callId === callId)) return
      const row: KersorCallView = {
        seq, callId,
        kind: event.type === 'agent.queued' ? 'agent' : 'evaluation',
        label: typeof event.label === 'string' ? event.label : callId,
        status: 'queued',
      }
      phase.calls.push(row)
      view.totals.calls += 1
      return
    }
    case 'agent.started':
    case 'evaluation.started': {
      const row = callBucket(view, event, event.type === 'agent.started' ? 'agent' : 'evaluation')
      if (!row) return
      row.status = 'running'
      row.startedTs = event.ts
      return
    }
    case 'agent.completed':
    case 'evaluation.completed': {
      const row = callBucket(view, event, event.type === 'agent.completed' ? 'agent' : 'evaluation')
      if (!row) return
      row.status = 'completed'
      row.endedTs = event.ts
      const tokens = totalTokens(event.usage)
      if (tokens !== undefined) {
        row.tokens = tokens
        view.totals.tokens += tokens
      }
      view.totals.completed += 1
      return
    }
    case 'agent.failed':
    case 'evaluation.failed': {
      const row = callBucket(view, event, event.type === 'agent.failed' ? 'agent' : 'evaluation')
      if (!row) return
      row.status = 'failed'
      row.endedTs = event.ts
      row.error = errorMessage(event.error)
      const tokens = totalTokens(event.usage)
      if (tokens !== undefined) {
        row.tokens = tokens
        view.totals.tokens += tokens
      }
      view.totals.failed += 1
      return
    }
    case 'agent.transaction.rolled-back': {
      const row = callBucket(view, event, 'agent')
      if (row) row.rolledBack = true
      return
    }
    default:
      // workflow.log, admission, resume, transaction progress, step detail:
      // intentionally not projected into the view model.
      return
  }
}

/** Create an empty view for a discovered run directory. */
export function createRunView(runId: string, runDir: string, sessionDir: string): KersorRunView {
  return {
    runId, runDir, sessionDir,
    status: 'unknown',
    currentPhase: '',
    phases: [],
    totals: { calls: 0, completed: 0, failed: 0, tokens: 0 },
  }
}
