/**
 * Package-owned invariants for the KerSor launcher and conversation binding.
 * @module @deepseek-ai/dsh-kersor/invariant
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { InvariantFailure, InvariantInstaller } from '@deepseek-ai/dsh-invariants'
import { parseKersorLaunchContract } from './types.ts'

const PACKAGE_NAME = '@deepseek-ai/dsh-kersor'
const STATUSES = new Set([
  'provisioning', 'running', 'waiting', 'blocked', 'completed', 'cancelled',
])
const STEP_STATUSES = new Set(['pending', 'active', 'completed', 'failed'])

interface ExperimentTrace {
  readonly childSessionId: string
  revision: number
  status: string
}

type SessionTrace = Map<string, ExperimentTrace>

/** KerSor invariant companion plugin name. */
export const name = 'kersor-invariant'
/** Services required before the companion can reserve package ownership. */
export const inject = ['invariants']

function record(event: SessionEvent, fail: InvariantFailure): Record<string, unknown> {
  const value: unknown = event.data
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${event.type} data must be a JSON object`)
  }
  return value as Record<string, unknown>
}

function text(value: unknown, label: string, fail: InvariantFailure): string {
  if (typeof value !== 'string' || value.length === 0) fail(`${label} must be a non-empty string`)
  return value
}

function positiveInteger(value: unknown, label: string, fail: InvariantFailure): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) fail(`${label} must be a positive safe integer`)
  return value as number
}

function applyExperimentEvent(
  trace: SessionTrace,
  event: SessionEvent,
  fail: InvariantFailure,
): void {
  const data = record(event, fail)
  const experimentId = text(data.experimentId, `${event.type} experimentId`, fail)
  const childSessionId = text(data.childSessionId, `${event.type} childSessionId`, fail)
  if (event.type === 'kersor/experiment-start') {
    if (trace.has(experimentId)) fail(`kersor/experiment-start repeats experiment ${experimentId}`)
    if ([...trace.values()].some(candidate => candidate.childSessionId === childSessionId)) {
      fail(`kersor/experiment-start reuses child ${childSessionId}`)
    }
    const objective = text(data.objective, 'kersor/experiment-start objective', fail)
    if (objective.length > 4_000) fail('kersor/experiment-start objective exceeds 4000 characters')
    if (data.origin !== 'created' && data.origin !== 'attached') fail('kersor/experiment-start origin is invalid')
    if (typeof data.freshSession !== 'boolean') fail('kersor/experiment-start freshSession must be a boolean')
    if (data.origin === 'attached' && data.freshSession) {
      fail('kersor/experiment-start attached origin cannot require a fresh Session')
    }
    if (Object.hasOwn(data, 'launch')) {
      try {
        parseKersorLaunchContract(data.launch, 'kersor/experiment-start launch')
      } catch (error: unknown) {
        fail(error instanceof Error ? error.message : String(error))
      }
    }
    positiveInteger(data.turn, 'kersor/experiment-start turn', fail)
    positiveInteger(data.step, 'kersor/experiment-start step', fail)
    trace.set(experimentId, { childSessionId, revision: 0, status: 'provisioning' })
    return
  }
  const current = trace.get(experimentId)
  if (current === undefined) fail(`kersor/experiment-checkpoint has no start for ${experimentId}`)
  if (current.childSessionId !== childSessionId) {
    fail(`kersor/experiment-checkpoint changes child for ${experimentId}`)
  }
  if (current.status === 'blocked' || current.status === 'completed' || current.status === 'cancelled') {
    fail(`kersor/experiment-checkpoint follows terminal status ${current.status}`)
  }
  const revision = positiveInteger(data.revision, 'kersor/experiment-checkpoint revision', fail)
  if (revision !== current.revision + 1) {
    fail(`kersor/experiment-checkpoint revision ${revision} does not follow ${current.revision}`)
  }
  if (!STATUSES.has(data.status as string)) fail('kersor/experiment-checkpoint status is invalid')
  if (!Array.isArray(data.steps)) fail('kersor/experiment-checkpoint steps must be an array')
  const stepIds = new Set<string>()
  for (const candidate of data.steps as unknown[]) {
    if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
      fail('kersor/experiment-checkpoint step must be an object')
    }
    const step = candidate as Record<string, unknown>
    const id = text(step.id, 'kersor/experiment-checkpoint step id', fail)
    if (stepIds.has(id)) fail(`kersor/experiment-checkpoint repeats step ${id}`)
    stepIds.add(id)
    if (!STEP_STATUSES.has(step.status as string)) fail(`kersor/experiment-checkpoint step ${id} status is invalid`)
  }
  current.revision = revision
  current.status = data.status as string
}

function isExperimentEvent(event: SessionEvent): boolean {
  return event.type === 'kersor/experiment-start' || event.type === 'kersor/experiment-checkpoint'
}

/** Active frames require a launcher; experiment events form one monotonic binding per Session. */
const install: InvariantInstaller = Object.assign((ctx: Context, fail: InvariantFailure) => {
  ctx.on('kersor/active', () => {
    if (ctx.get('kersor') === undefined) fail('kersor/active emitted without a live KerSor launcher')
  })

  const traces = new WeakMap<Session, SessionTrace>()
  const staged = new WeakMap<SessionEvent, { session: Session; trace: SessionTrace }>()
  const seed = (session: Session): void => {
    const trace: SessionTrace = new Map()
    for (const event of session.events.filter(isExperimentEvent)) {
      applyExperimentEvent(trace, event, fail)
    }
    traces.set(session, trace)
  }
  ctx.sessions.list().forEach(seed)
  ctx.on('session/created', seed, { global: true })
  ctx.on('internal/dispatch', (_mode, eventName, args) => {
    if (eventName !== 'session/event') return
    const [session, event] = args as [Session, SessionEvent]
    if (!isExperimentEvent(event)) return
    const trace = new Map(
      [...(traces.get(session) ?? new Map())]
        .map(([id, value]) => [id, { ...value }] as const),
    )
    applyExperimentEvent(trace, event, fail)
    staged.set(event, { session, trace })
  }, { global: true })
  ctx.on('session/event', (session, event) => {
    if (!isExperimentEvent(event)) return
    const candidate = staged.get(event)
    if (candidate === undefined || candidate.session !== session) {
      return fail('KerSor experiment event reached publication without validation')
    }
    staged.delete(event)
    traces.set(session, candidate.trace)
  }, { global: true })
}, { inject: ['sessions'] })

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
