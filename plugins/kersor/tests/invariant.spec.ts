/** Pre-commit validation of durable KerSor experiment bindings. */

import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import SessionStore, { SessionId, type Session } from '@deepseek-ai/dsh-session'
import type { KersorExperimentId, KersorLaunchContract } from '../src/types.ts'
import * as invariant from '../src/invariant.ts'

const launchContract = {
  backend: 'custom_simulator',
  language: 'python',
  integration_pattern: 'replace-kernel-entrypoint',
  target_speedup: 8,
  max_workflows: 4,
  mode: 'auto',
  workflow_authoring_budget: 2,
  retrieval_mode: 'off',
  transfer_mode: 'measured-only',
  experience_mode: 'off',
  kernelwiki_experience_export_mode: 'off',
  correctness_command: 'python3 verify.py',
  benchmark_command: 'python3 benchmark.py',
} satisfies KersorLaunchContract

async function setup(): Promise<{ ctx: Context; session: Session }> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(InvariantRegistry, { enabled: true })
  await ctx.plugin(invariant)
  return { ctx, session: ctx.sessions.create(SessionId('parent')) }
}

function start(session: Session, experiment = 'experiment', child = 'child'): void {
  session.append('kersor/experiment-start', {
    experimentId: experiment as KersorExperimentId,
    childSessionId: SessionId(child),
    origin: 'created',
    objective: 'Optimize',
    freshSession: true,
    turn: 1,
    step: 1,
  })
}

function checkpoint(
  session: Session,
  revision: number,
  status: 'running' | 'waiting' | 'blocked' | 'completed' | 'cancelled' = 'running',
  child = 'child',
): void {
  session.append('kersor/experiment-checkpoint', {
    experimentId: 'experiment' as KersorExperimentId,
    childSessionId: SessionId(child),
    revision,
    status,
    steps: [],
  })
}

function rawStart(session: Session, launch: unknown): void {
  session.append('kersor/experiment-start', {
    experimentId: 'experiment' as KersorExperimentId,
    childSessionId: SessionId('child'),
    origin: 'created',
    objective: 'Optimize',
    freshSession: true,
    launch,
    turn: 1,
    step: 1,
  } as never)
}

describe('KerSor experiment invariants', () => {
  it('accepts a legacy start event without a typed launch contract', async () => {
    const { session } = await setup()
    start(session)
    const event = session.events.find(candidate => candidate.type === 'kersor/experiment-start')
    expect(event?.data.launch).toBeUndefined()
  })

  it('accepts and preserves a complete typed launch contract', async () => {
    const { session } = await setup()
    rawStart(session, launchContract)
    const event = session.events.find(candidate => candidate.type === 'kersor/experiment-start')
    expect(event?.data.launch).toEqual(launchContract)
  })

  it('strictly rejects incomplete, unknown, malformed, and out-of-range launch fields', async () => {
    const missing = { ...launchContract } as Record<string, unknown>
    delete missing.backend
    const cases: [unknown, RegExp][] = [
      [missing, /launch\.backend is required/],
      [{ ...launchContract, runtime: 'dsh' }, /unknown field "runtime"/],
      [{ ...launchContract, backend: '' }, /backend must be a non-empty string/],
      [{ ...launchContract, target_speedup: 0 }, /target_speedup must be a positive finite number/],
      [{ ...launchContract, max_workflows: 1.5 }, /max_workflows must be a safe integer/],
      [{ ...launchContract, workflow_authoring_budget: -1 }, /workflow_authoring_budget must be a safe integer/],
      [{ ...launchContract, mode: 'fast' }, /mode must be one of auto, guided, explore/],
      [{ ...launchContract, correctness_command: 'verify\nagain' }, /correctness_command must be a single-line string/],
    ]
    for (const [launch, expected] of cases) {
      const { session } = await setup()
      expect(() => { rawStart(session, launch) }).toThrow(expected)
      expect(session.events).toHaveLength(0)
    }
  })

  it('accepts a monotonic binding through terminal completion', async () => {
    const { session } = await setup()
    start(session)
    checkpoint(session, 1)
    checkpoint(session, 2, 'waiting')
    checkpoint(session, 3, 'running')
    checkpoint(session, 4, 'completed')
    expect(session.events.filter(event => event.type.startsWith('kersor/'))).toHaveLength(5)
  })

  it('rejects duplicate starts, child changes, revision gaps, and terminal reopening before commit', async () => {
    const { session } = await setup()
    start(session)
    expect(() => { start(session) }).toThrow(/repeats experiment/)
    const before = session.seq
    expect(() => { checkpoint(session, 1, 'running', 'other') }).toThrow(/changes child/)
    expect(() => { checkpoint(session, 2) }).toThrow(/does not follow 0/)
    expect(session.seq).toBe(before)
    checkpoint(session, 1, 'completed')
    expect(() => { checkpoint(session, 2, 'running') }).toThrow(/follows terminal status/)
  })

  it('does not poison the committed revision after a rejected candidate', async () => {
    const { session } = await setup()
    start(session)
    expect(() => { checkpoint(session, 2) }).toThrow(/does not follow 0/)
    expect(() => { checkpoint(session, 1) }).not.toThrow()
  })

  it('treats blocked as terminal before a later checkpoint can commit', async () => {
    const { session } = await setup()
    start(session)
    checkpoint(session, 1, 'blocked')
    expect(() => { checkpoint(session, 2, 'running') }).toThrow(/follows terminal status/)
  })

  it('rejects attached bindings that claim fresh-session creation', async () => {
    const { session } = await setup()
    expect(() => {
      session.append('kersor/experiment-start', {
        experimentId: 'attached' as KersorExperimentId,
        childSessionId: SessionId('attached-child'),
        origin: 'attached',
        objective: 'Continue',
        freshSession: true,
        turn: 1,
        step: 1,
      })
    }).toThrow(/attached origin cannot require a fresh Session/)
  })
})
