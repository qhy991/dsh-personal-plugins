import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readWorkflowResult } from '../src/result.ts'

const dirs: string[] = []

async function runDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'kersor-result-'))
  dirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('Workflow result evidence ownership', () => {
  it('never labels a Workflow estimate as measured when Host verification fails', async () => {
    const dir = await runDir()
    await writeFile(path.join(dir, 'output.json'), JSON.stringify({
      arch_stage: 'awaiting_host_verification',
      selected_candidate_id: 'candidate-bad',
      expected_cycles_estimate: 80,
      estimated_speedup: 1.25,
      overall_speedup: 99,
    }))
    await writeFile(path.join(dir, 'host-verification.json'), JSON.stringify({
      verdict: 'fail',
      reason: 'candidate correctness command failed',
      metric: { candidate_cycles: 1, speedup: 100 },
    }))

    const result = await readWorkflowResult(dir)

    expect(result).toMatchObject({
      stage: 'host_rejected',
      verification: 'failed',
      failureKind: 'correctness',
      selectedCandidateId: 'candidate-bad',
      expectedCycles: 80,
      estimatedSpeedup: 1.25,
    })
    expect(result).not.toHaveProperty('measuredCycles')
    expect(result).not.toHaveProperty('measuredSpeedup')
  })

  it('projects measurements only from a passing Host metric', async () => {
    const dir = await runDir()
    await writeFile(path.join(dir, 'output.json'), JSON.stringify({
      estimated_speedup: 1.2,
      overall_speedup: 99,
    }))
    await writeFile(path.join(dir, 'host-verification.json'), JSON.stringify({
      verdict: 'pass',
      metric: {
        baseline_cycles: 100,
        candidate_cycles: 90,
        candidate_speedup: 1.111,
        incumbent_cycles: 80,
        incumbent_speedup: 1.25,
        best_improved: false,
        speedup: 1.25,
      },
    }))

    expect(await readWorkflowResult(dir)).toMatchObject({
      stage: 'host_verified',
      verification: 'passed',
      measuredBaselineCycles: 100,
      measuredCycles: 90,
      estimatedSpeedup: 1.2,
      measuredSpeedup: 1.111,
      incumbentCycles: 80,
      incumbentSpeedup: 1.25,
      bestImproved: false,
    })
  })

  it('keeps raw overall speedup unmeasured when no Host artifact exists', async () => {
    const dir = await runDir()
    await writeFile(path.join(dir, 'output.json'), JSON.stringify({
      arch_stage: 'awaiting_host_verification',
      overall_speedup: 7,
    }))

    const result = await readWorkflowResult(dir)

    expect(result).toEqual({ stage: 'awaiting_host_verification', candidates: [] })
  })
})


describe('general Task verification', () => {
  it.each([
    ['succeeded', 'verifier-passed', true, 0, 'passed'],
    ['stagnated', 'declared-artifacts-unchanged', false, 1, 'failed'],
    ['exhausted', 'round-budget-exhausted', true, 0, 'passed'],
    ['waiting', 'provider-quota', false, 1, 'failed'],
  ])('projects %s independently from the current artifact verdict', async (status, stopReason, passed, exitCode, verification) => {
    const dir = await runDir()
    await writeFile(path.join(dir, 'output.json'), JSON.stringify({
      meta: { name: 'general-self-evolve', contract: 'kersor-task-v1' },
      status, stop_reason: stopReason, rounds: 2,
      final_evaluation: { passed, exit_code: exitCode },
    }))
    expect(await readWorkflowResult(dir)).toEqual({
      task: { status, stopReason, rounds: 2 }, verification, candidates: [],
    })
  })

  it.each([undefined, { passed: true, exit_code: 1 }, { passed: true, exit_code: 0, timed_out: true }])(
    'does not infer acceptance from a success label with invalid evaluation %j', async (evaluation) => {
      const dir = await runDir()
      await writeFile(path.join(dir, 'output.json'), JSON.stringify({
        meta: { name: 'general-self-evolve', contract: 'kersor-task-v1' },
        status: 'succeeded', stop_reason: 'verifier-passed', rounds: 1,
        final_evaluation: evaluation,
      }))
      expect(await readWorkflowResult(dir)).not.toHaveProperty('verification')
    },
  )
})
