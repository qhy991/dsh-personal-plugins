/** DSH-native KerSor experiment start, attach, progress, and resume contracts. */

import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { CallId, type ContentBlock } from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId, type JsonValue, type Session } from '@deepseek-ai/dsh-session'
import ToolRuntime, { defineTool } from '@deepseek-ai/dsh-tools'
import type { SubagentListEntry } from '@deepseek-ai/dsh-subagent'
import type { KersorLaunchContract } from '../src/types.ts'
import * as control from '../src/control.ts'

const signal = new AbortController().signal
const testKersorPython = realpathSync(process.execPath)
const originalKersorPython = process.env.KERSOR_PYTHON
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
  correctness_command: 'python3 verify.py --case baseline',
  benchmark_command: 'python3 benchmark.py --rounds 5',
} satisfies KersorLaunchContract
const workflowMeta = {
  name: 'prepared-workflow',
  description: 'Execute one prepared Workflow exactly.',
  phases: [{ title: 'Optimize', detail: 'Read and optimize the current kernel.' }],
}
const workflowScript = "phase('Optimize')\nreturn { best_kernel_code: 'candidate' }"

beforeEach(() => {
  process.env.KERSOR_PYTHON = testKersorPython
})

afterEach(() => {
  if (originalKersorPython === undefined) delete process.env.KERSOR_PYTHON
  else process.env.KERSOR_PYTHON = originalKersorPython
})

interface MockSubagents {
  readonly children: SubagentListEntry[]
  readonly starts: unknown[]
  readonly followups: unknown[]
  listChildren(): Promise<SubagentListEntry[]>
  startContinuable(spec: { childId: SessionId }): Promise<{ childId: SessionId; messageId: string }>
  followup(...args: unknown[]): Promise<string>
}

interface Harness {
  readonly ctx: Context
  readonly session: Session
  readonly agent: Agent
  readonly subagents: MockSubagents
  readonly order: string[]
}

async function setup(workspace = '/work/kernel'): Promise<Harness> {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(SessionStore)
  await ctx.plugin(ToolRuntime)
  const order: string[] = []
  ctx.on('session/flush', () => { order.push('flush') })
  const children: SubagentListEntry[] = []
  const subagents: MockSubagents = {
    children,
    starts: [],
    followups: [],
    listChildren: () => Promise.resolve([...children]),
    startContinuable(spec) {
      order.push('start-child')
      this.starts.push(spec)
      children.push({
        kind: 'child', id: spec.childId, mode: 'continuable', label: 'KerSor experiment',
        activity: 'running', hasChildren: false,
      })
      return Promise.resolve({ childId: spec.childId, messageId: 'message-1' })
    },
    followup(...args) {
      order.push('followup')
      this.followups.push(args)
      return Promise.resolve('message-2')
    },
  }
  ctx.provide('subagents', subagents as never)
  await ctx.plugin(control)
  const session = ctx.sessions.create(SessionId('parent'), { meta: { cwd: workspace } })
  session.append('turn/start', { turn: 1 })
  session.append('step/start', { turn: 1, step: 1 })
  const agent = { id: session.id, session } as unknown as Agent
  return { ctx, session, agent, subagents, order }
}

let callSequence = 0
async function call(harness: Harness, name: string, args: unknown, agent = harness.agent) {
  const callId = CallId(`kersor-control-${++callSequence}`)
  agent.session.append('tool/call', {
    turn: 1, step: 1, callId, name, arguments: JSON.stringify(args),
  })
  return harness.ctx.tools.execute({ callId, name, arguments: args, agent, signal })
}

function starts(session: Session) {
  return session.events.filter(event => event.type === 'kersor/experiment-start')
}

function checkpoints(session: Session) {
  return session.events.filter(event => event.type === 'kersor/experiment-checkpoint')
}

function promptText(content: readonly ContentBlock[]): string {
  return content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n')
}

function startedPrompt(harness: Harness): string {
  const start = harness.subagents.starts[0] as {
    readonly request: { readonly prompt: readonly ContentBlock[] }
  }
  return promptText(start.request.prompt)
}

function resumedPrompt(harness: Harness): string {
  const followup = harness.subagents.followups[0] as readonly [unknown, unknown, readonly ContentBlock[]]
  return promptText(followup[2])
}

function registerProbe(harness: Harness, name: string, calls: string[]): void {
  harness.ctx.tools.register(defineTool({
    name,
    description: 'Record one test probe invocation.',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    execute: () => {
      calls.push(name)
      return Promise.resolve(name)
    },
  }))
}

function registerBashProbe(harness: Harness, calls: string[]): void {
  harness.ctx.tools.register(defineTool({
    name: 'bash',
    description: 'Execute one test Bash command.',
    parameters: {
      command: { type: 'string', required: true },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    execute: (args) => {
      calls.push(args.command)
      return Promise.resolve(args.command)
    },
  }))
}

interface WorkflowProbeValue {
  readonly runId: string
  readonly agentsStarted: number
  readonly result: JsonValue
}

function registerWorkflowProbe(
  harness: Harness,
  value: WorkflowProbeValue | Error,
  calls?: string[],
): void {
  harness.ctx.tools.register(defineTool({
    name: 'workflow',
    description: 'Return one canonical Workflow probe result.',
    parameters: {
      meta: {
        type: 'object',
        required: true,
        additionalProperties: true,
        properties: {
          name: { type: 'string', required: true },
          description: { type: 'string', required: true },
        },
      },
      script: { type: 'string', required: true },
      args: {
        type: 'object',
        required: true,
        additionalProperties: true,
        properties: {
          exp_dir: { type: 'string', required: true },
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          runId: { type: 'string', required: true },
          agentsStarted: { type: 'integer', required: true },
          result: { type: 'json', required: true },
        },
      },
      render: (_args, result) => [{
        type: 'text',
        text: `truncated workflow preview: ${JSON.stringify(result).slice(0, 96)}`,
      }],
    },
    execute: () => {
      if (value instanceof Error) throw value
      calls?.push('workflow')
      return Promise.resolve(value)
    },
  }))
}

function registerFileProbe(harness: Harness, name: 'write' | 'edit', calls: string[]): void {
  harness.ctx.tools.register(defineTool({
    name,
    description: 'Record one test file mutation.',
    parameters: {
      file_path: { type: 'string', required: true },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    execute: (args) => {
      calls.push(args.file_path)
      return Promise.resolve(args.file_path)
    },
  }))
}

function makeRunDirectory(workspace: string, run = 'run-1'): string {
  const path = join(workspace, '.kersor', '20260822-raw-custody', run)
  mkdirSync(path, { recursive: true })
  return path
}

function workflowArguments(runDir: string): {
  meta: typeof workflowMeta
  script: string
  args: { exp_dir: string; kernel_path: string; target_speedup: number }
} {
  return {
    meta: structuredClone(workflowMeta),
    script: workflowScript,
    args: {
      exp_dir: runDir,
      kernel_path: 'Session/best-kernel/perf_takehome.py',
      target_speedup: 8,
    },
  }
}

function writeWorkflowEnvelope(
  runDir: string,
  call = workflowArguments(runDir),
): void {
  writeFileSync(join(runDir, 'dsh-workflow.json'), JSON.stringify({
    schema_version: 1,
    contract: 'dsh_workflow_v1',
    source: {
      workflow_path: '/prepared/workflow.js',
      args_path: join(runDir, 'dispatch-args.json'),
    },
    meta: call.meta,
    script: call.script,
    args: call.args,
  }))
}

function descendantAgent(harness: Harness, parent: Session, id: string): Agent {
  const session = harness.ctx.sessions.create(SessionId(id), {
    meta: { cwd: parent.header.cwd ?? '/work/kernel', parentSession: parent.id, origin: 'subagent' },
  })
  return { id: session.id, session } as unknown as Agent
}

async function startController(harness: Harness): Promise<Agent> {
  await call(harness, 'kersor_start', { objective: 'Optimize' })
  const controllerId = starts(harness.session)[0]!.data.childSessionId
  return descendantAgent(harness, harness.session, controllerId)
}

describe('KerSor conversation controls', () => {
  it('persists one typed launch authority and reuses its canonical JSON on resume', async () => {
    const harness = await setup()
    const started = await call(harness, 'kersor_start', {
      objective: 'Reach an 8x target, if possible.',
      fresh_session: true,
      launch: launchContract,
    })
    expect(started.isError).toBe(false)
    expect(starts(harness.session)[0]?.data.launch).toEqual(launchContract)
    const canonical = JSON.stringify(launchContract)
    expect(startedPrompt(harness)).toContain(`Typed launch contract (canonical JSON): ${canonical}`)
    expect(startedPrompt(harness)).toContain('authoritative and overrides conflicting objective or continuation prose')
    expect(startedPrompt(harness)).toContain('target_speedup = 8 (JSON number only; never append x, %, or another suffix)')
    expect(startedPrompt(harness)).toContain(`correctness_command = ${JSON.stringify(launchContract.correctness_command)} (copy and execute verbatim`)
    expect(startedPrompt(harness)).toContain(`benchmark_command = ${JSON.stringify(launchContract.benchmark_command)} (copy and execute verbatim`)
    expect(startedPrompt(harness)).toContain('selected_workflow.name is STALLED is a recoverable routing gap')
    expect(startedPrompt(harness)).toContain('complete Phase 3.6 and the full same-round selection sequence')
    expect(startedPrompt(harness)).toContain('kersor_workflow({exp_dir: <exact absolute run-N directory>})')
    expect(startedPrompt(harness)).toContain('never call workflow directly')
    expect(startedPrompt(harness)).toContain('session-synthesizer is the sole writer')
    expect(startedPrompt(harness)).toContain('Never call kersor-state.sh set current_round')
    expect(startedPrompt(harness)).toContain('branch only on PHASE_COMMITTED=complete, advanced, or stalled')

    const resumed = await call(harness, 'kersor_resume', {
      instruction: 'Try a 9x target instead.',
    })
    expect(resumed.isError).toBe(false)
    expect(resumedPrompt(harness)).toContain(`Typed launch contract (canonical JSON): ${canonical}`)
    expect(resumedPrompt(harness)).toContain('target_speedup = 8 (JSON number only')
    expect(resumedPrompt(harness)).toContain('selected_workflow.name is STALLED is a recoverable routing gap')
    expect(resumedPrompt(harness)).toContain('dispatch any non-STALLED commit before synthesizing a terminal STALLED decision')
    expect(resumedPrompt(harness)).toContain('end this controller turn at the unchanged canonical round and resume later')
    expect(starts(harness.session)).toHaveLength(1)
  })

  it.each([
    ['empty backend', { ...launchContract, backend: '' }],
    ['blank language', { ...launchContract, language: '   ' }],
    ['multiline correctness command', { ...launchContract, correctness_command: 'verify\nagain' }],
    ['multiline benchmark command', { ...launchContract, benchmark_command: 'bench\ragain' }],
    ['string target', { ...launchContract, target_speedup: '8x' }],
    ['zero target', { ...launchContract, target_speedup: 0 }],
    ['zero workflow cap', { ...launchContract, max_workflows: 0 }],
    ['fractional workflow cap', { ...launchContract, max_workflows: 1.5 }],
    ['negative authoring budget', { ...launchContract, workflow_authoring_budget: -1 }],
    ['fractional authoring budget', { ...launchContract, workflow_authoring_budget: 1.5 }],
    ['unknown mode', { ...launchContract, mode: 'fast' }],
    ['unknown field', { ...launchContract, runtime: 'dsh' }],
  ])('rejects typed launch contract with %s before binding', async (_label, launch) => {
    const harness = await setup()
    const result = await call(harness, 'kersor_start', { objective: 'Optimize', launch })
    expect(result.isError).toBe(true)
    expect(starts(harness.session)).toHaveLength(0)
    expect(harness.subagents.starts).toHaveLength(0)
  })

  it('freezes the exact Host KerSor Python path in start, attach, and resume prompts', async () => {
    const started = await setup()
    await call(started, 'kersor_start', { objective: 'Optimize' })
    const frozenAssignment = `KERSOR_PYTHON='${testKersorPython}'`
    expect(startedPrompt(started)).toContain(`Host-frozen KerSor Python executable is ${JSON.stringify(testKersorPython)}`)
    expect(startedPrompt(started)).toContain(`must begin with exactly ${frozenAssignment}`)
    expect(startedPrompt(started)).toContain('Never use which, command -v, PATH lookup, a filesystem search')

    await call(started, 'kersor_resume', { instruction: 'Continue' })
    expect(resumedPrompt(started)).toContain(`Host-frozen KerSor Python executable is ${JSON.stringify(testKersorPython)}`)
    expect(resumedPrompt(started)).toContain(`must begin with exactly ${frozenAssignment}`)

    const attached = await setup()
    await call(attached, 'kersor_attach', { objective: 'Continue existing' })
    expect(startedPrompt(attached)).toContain(`Host-frozen KerSor Python executable is ${JSON.stringify(testKersorPython)}`)
    expect(startedPrompt(attached)).toContain(`must begin with exactly ${frozenAssignment}`)
  })

  it.each([
    ['missing', undefined],
    ['relative', 'python3'],
  ] as const)('rejects a %s Host KerSor Python path before start or attach binding', async (_label, configured) => {
    if (configured === undefined) delete process.env.KERSOR_PYTHON
    else process.env.KERSOR_PYTHON = configured
    for (const [name, args] of [
      ['kersor_start', { objective: 'Optimize' }],
      ['kersor_attach', { objective: 'Continue existing' }],
    ] as const) {
      const harness = await setup()
      const result = await call(harness, name, args)
      expect(result.isError).toBe(true)
      expect(result.content.some(block => block.type === 'text'
        && block.text.includes('KERSOR_PYTHON'))).toBe(true)
      expect(starts(harness.session)).toHaveLength(0)
      expect(harness.subagents.starts).toHaveLength(0)
    }
  })

  it('rejects a non-file Host KerSor Python path before start or attach binding', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dsh-kersor-python-directory-'))
    process.env.KERSOR_PYTHON = directory
    try {
      for (const [name, args] of [
        ['kersor_start', { objective: 'Optimize' }],
        ['kersor_attach', { objective: 'Continue existing' }],
      ] as const) {
        const harness = await setup()
        const result = await call(harness, name, args)
        expect(result.isError).toBe(true)
        expect(starts(harness.session)).toHaveLength(0)
        expect(harness.subagents.starts).toHaveLength(0)
      }
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it.skipIf(process.platform === 'win32')(
    'rejects a non-executable Host KerSor Python path before start or attach binding',
    async () => {
      const directory = mkdtempSync(join(tmpdir(), 'dsh-kersor-python-executable-'))
      const executable = join(directory, 'python')
      writeFileSync(executable, '#!/bin/sh\nexit 0\n')
      chmodSync(executable, 0o600)
      process.env.KERSOR_PYTHON = executable
      try {
        for (const [name, args] of [
          ['kersor_start', { objective: 'Optimize' }],
          ['kersor_attach', { objective: 'Continue existing' }],
        ] as const) {
          const harness = await setup()
          const result = await call(harness, name, args)
          expect(result.isError).toBe(true)
          expect(starts(harness.session)).toHaveLength(0)
          expect(harness.subagents.starts).toHaveLength(0)
        }
      } finally {
        rmSync(directory, { recursive: true, force: true })
      }
    },
  )

  it('does not follow up an existing binding when the Host KerSor Python path is invalid', async () => {
    const harness = await setup()
    await call(harness, 'kersor_start', { objective: 'Optimize' })
    process.env.KERSOR_PYTHON = 'python3'

    const result = await call(harness, 'kersor_resume', { instruction: 'Continue' })
    expect(result.isError).toBe(true)
    expect(starts(harness.session)).toHaveLength(1)
    expect(harness.subagents.starts).toHaveLength(1)
    expect(harness.subagents.followups).toHaveLength(0)
  })

  it('flushes the immutable binding before materializing a dsh child', async () => {
    const harness = await setup()
    const result = await call(harness, 'kersor_start', {
      objective: 'Optimize instruction bundles', fresh_session: true,
    })
    expect(result.isError).toBe(false)
    expect(result.concludesTurn).toBe(true)
    expect(result.content.some(block => block.type === 'text'
      && block.text.includes('End this parent turn immediately'))).toBe(true)
    expect(harness.order.slice(0, 3)).toEqual(['flush', 'start-child', 'flush'])
    expect(starts(harness.session)[0]?.data).toMatchObject({
      origin: 'created', objective: 'Optimize instruction bundles', freshSession: true,
      turn: 1, step: 1,
    })
    expect(checkpoints(harness.session)[0]?.data).toMatchObject({ revision: 1, status: 'running' })
    expect(harness.subagents.starts).toHaveLength(1)
    expect(harness.subagents.starts[0]).toMatchObject({ provider: 'spawn' })
  })

  it('resumes the same experiment and continuable child without a second start', async () => {
    const harness = await setup()
    await call(harness, 'kersor_start', { objective: 'Optimize' })
    const start = starts(harness.session)[0]!.data
    const result = await call(harness, 'kersor_resume', { instruction: 'Continue from disk' })
    expect(result.isError).toBe(false)
    expect(result.concludesTurn).toBe(true)
    expect(starts(harness.session)).toHaveLength(1)
    expect(harness.subagents.starts).toHaveLength(1)
    expect(harness.subagents.followups).toHaveLength(1)
    const followup = harness.subagents.followups[0] as readonly unknown[]
    expect(followup[1]).toBe(start.childSessionId)
  })

  it('requires explicit attach when no experiment is bound', async () => {
    const harness = await setup()
    const missing = await call(harness, 'kersor_resume', {})
    expect(missing.isError).toBe(true)
    expect(starts(harness.session)).toHaveLength(0)

    const attached = await call(harness, 'kersor_attach', { objective: 'Continue existing Session' })
    expect(attached.isError).toBe(false)
    expect(attached.concludesTurn).toBe(true)
    expect(starts(harness.session)[0]?.data).toMatchObject({
      origin: 'attached', freshSession: false, objective: 'Continue existing Session',
    })
  })

  it.each(['completed', 'cancelled'] as const)(
    'reports the latest %s binding without requiring an explicit experiment id',
    async (status) => {
      const harness = await setup()
      await call(harness, 'kersor_start', { objective: 'Optimize' })
      const start = starts(harness.session)[0]!.data
      harness.session.append('kersor/experiment-checkpoint', {
        experimentId: start.experimentId,
        childSessionId: start.childSessionId,
        revision: 2,
        status,
        steps: [],
      })

      const result = await call(harness, 'kersor_resume', {})
      expect(result.isError).toBe(true)
      expect(result.content.some(block => block.type === 'text'
        && block.text.includes(`is terminal (${status})`))).toBe(true)
      expect(starts(harness.session)).toHaveLength(1)
      expect(harness.subagents.starts).toHaveLength(1)
      expect(harness.subagents.followups).toHaveLength(0)
    },
  )

  it('closes a stalled binding, rejects resume, and permits a new Experiment', async () => {
    const harness = await setup()
    await call(harness, 'kersor_start', { objective: 'First attempt' })
    const first = starts(harness.session)[0]!.data
    harness.session.append('kersor/experiment-checkpoint', {
      experimentId: first.experimentId,
      childSessionId: first.childSessionId,
      revision: 2,
      status: 'waiting',
      phase: 'stalled',
      nextAction: 'Continue in the bound dsh execution conversation.',
      steps: [],
    })
    // Preserve the real historical failure shape: a parent illegally reopened
    // the same binding after the stalled checkpoint. The control fold must keep
    // the first closed boundary authoritative.
    harness.session.append('kersor/experiment-checkpoint', {
      experimentId: first.experimentId,
      childSessionId: first.childSessionId,
      revision: 3,
      status: 'running',
      steps: [],
    })

    const resume = await call(harness, 'kersor_resume', {})
    expect(resume.isError).toBe(true)
    expect(resume.content.some(block => block.type === 'text'
      && block.text.includes('is blocked (stalled)'))).toBe(true)
    expect(harness.subagents.followups).toHaveLength(0)

    const next = await call(harness, 'kersor_start', { objective: 'Second attempt' })
    expect(next.isError).toBe(false)
    expect(starts(harness.session)).toHaveLength(2)
    expect(harness.subagents.starts).toHaveLength(2)
  })

  it('reserves all direct subagents to declared controller children in the parent', async () => {
    const harness = await setup()
    const calls: string[] = []
    registerProbe(harness, 'subagent', calls)
    registerProbe(harness, 'subagent_fork', calls)
    registerProbe(harness, 'workflow', calls)
    await call(harness, 'kersor_start', { objective: 'Optimize' })
    const declaredChild = starts(harness.session)[0]!.data.childSessionId

    const monitor = await call(harness, 'subagent', {})
    const author = await call(harness, 'subagent_fork', {})
    const workflow = await call(harness, 'workflow', {})
    expect(monitor.isError).toBe(true)
    expect(author.isError).toBe(true)
    expect(workflow.isError).toBe(true)
    expect(monitor.content.some(block => block.type === 'text'
      && block.text.includes('reserved to its declared controller child'))).toBe(true)
    expect(calls).toEqual([])
    expect(harness.subagents.starts).toHaveLength(1)
    expect(harness.subagents.children[0]).toMatchObject({ id: declaredChild, mode: 'continuable' })
  })

  it('hard-gates KerSor Python use in the direct controller while allowing unrelated Bash', async () => {
    const harness = await setup()
    const calls: string[] = []
    registerBashProbe(harness, calls)
    await call(harness, 'kersor_start', { objective: 'Optimize' })
    const controllerId = starts(harness.session)[0]!.data.childSessionId
    const controller = descendantAgent(harness, harness.session, controllerId)
    const prefix = `KERSOR_PYTHON='${testKersorPython}'; export KERSOR_PYTHON;`

    const missingPrefix = await call(harness, 'bash', {
      command: 'python3 /opt/KerSor/scripts/normalize-transfer.py',
    }, controller)
    expect(missingPrefix.isError).toBe(true)
    expect(missingPrefix.content.some(block => block.type === 'text'
      && block.text.includes(`exact Host-frozen prefix ${prefix}`))).toBe(true)

    const substituted = await call(harness, 'bash', {
      command: `${prefix} python3 /opt/KerSor/scripts/normalize-transfer.py`,
    }, controller)
    expect(substituted.isError).toBe(true)
    expect(substituted.content.some(block => block.type === 'text'
      && block.text.includes('may not substitute python/python3'))).toBe(true)

    const discovery = await call(harness, 'bash', { command: 'which python3' }, controller)
    expect(discovery.isError).toBe(true)
    expect(discovery.content.some(block => block.type === 'text'
      && block.text.includes(`exact prefix ${prefix}`))).toBe(true)

    const exact = `${prefix} "$KERSOR_PYTHON" /opt/KerSor/scripts/normalize-transfer.py`
    expect((await call(harness, 'bash', { command: exact }, controller)).isError).toBe(false)
    const typedSetup = `${prefix} bash /opt/KerSor/scripts/setup-session.sh /work/kernel --backend python --language python_reference --correctness-command '${testKersorPython} tests/check.py' --benchmark-command '${testKersorPython} tests/bench.py'`
    expect((await call(harness, 'bash', { command: typedSetup }, controller)).isError).toBe(false)
    expect((await call(harness, 'bash', {
      command: `${prefix} echo ready && python3 /opt/KerSor/scripts/normalize-transfer.py`,
    }, controller)).isError).toBe(true)
    expect((await call(harness, 'bash', {
      command: `${prefix} BACKEND=python python3 /opt/KerSor/scripts/normalize-transfer.py`,
    }, controller)).isError).toBe(true)
    expect((await call(harness, 'bash', { command: 'python3 analyze-results.py' }, controller)).isError).toBe(false)
    expect((await call(harness, 'bash', {
      command: 'ls /work/kernel/KerSor/agents /work/kernel/KerSor/docs',
    }, controller)).isError).toBe(false)
    expect(calls).toEqual([
      exact,
      typedSetup,
      'python3 analyze-results.py',
      'ls /work/kernel/KerSor/agents /work/kernel/KerSor/docs',
    ])
  })

  it('reserves round synthesis artifacts and cursor advancement to their deterministic owners', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'dsh-kersor-synthesis-ownership-'))
    try {
      const harness = await setup(workspace)
      const fileCalls: string[] = []
      registerFileProbe(harness, 'write', fileCalls)
      registerFileProbe(harness, 'edit', fileCalls)
      const bashCalls: string[] = []
      registerBashProbe(harness, bashCalls)
      const controller = await startController(harness)
      const synthesizer = descendantAgent(harness, controller.session, 'session-synthesizer')
      const summary = join(workspace, '.kersor', '20260822-synthesis', 'round-2-summary.md')
      const transfer = join(workspace, '.kersor', '20260822-synthesis', 'round-2-transfer.json')
      const prefix = `KERSOR_PYTHON='${testKersorPython}'; export KERSOR_PYTHON;`

      for (const result of [
        await call(harness, 'write', { file_path: summary }, controller),
        await call(harness, 'edit', { file_path: transfer }, controller),
        await call(harness, 'bash', {
          command: `printf result > '${transfer}'`,
        }, controller),
      ]) {
        expect(result.isError).toBe(true)
        expect(result.content.some(block => block.type === 'text'
          && block.text.includes('session-synthesizer is their sole writer'))).toBe(true)
      }

      const setRound = await call(harness, 'bash', {
        command: `${prefix} bash /opt/KerSor/scripts/kersor-state.sh "$SESSION_DIR" set current_round 3`,
      }, controller)
      const advance = await call(harness, 'bash', {
        command: `${prefix} bash /opt/KerSor/scripts/kersor-state.sh "$SESSION_DIR" advance 3`,
      }, controller)
      expect(setRound.isError).toBe(true)
      expect(advance.isError).toBe(true)
      expect(setRound.content.some(block => block.type === 'text'
        && block.text.includes('Only normalize-transfer.py'))).toBe(true)

      const normalize = `${prefix} "$KERSOR_PYTHON" /opt/KerSor/scripts/normalize-transfer.py '${transfer}'`
      expect((await call(harness, 'bash', { command: normalize }, controller)).isError).toBe(false)
      expect((await call(harness, 'write', { file_path: summary }, synthesizer)).isError).toBe(false)
      expect((await call(harness, 'write', { file_path: transfer }, synthesizer)).isError).toBe(false)
      expect(fileCalls).toEqual([summary, transfer])
      expect(bashCalls).toEqual([normalize])
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  })

  it('propagates the Bash gate through a live one-shot grandchild ancestry', async () => {
    const harness = await setup()
    const calls: string[] = []
    registerBashProbe(harness, calls)
    await call(harness, 'kersor_start', { objective: 'Optimize' })
    const controllerId = starts(harness.session)[0]!.data.childSessionId
    const controller = descendantAgent(harness, harness.session, controllerId)
    const grandchild = descendantAgent(harness, controller.session, 'session-synthesizer')
    const prefix = `KERSOR_PYTHON='${testKersorPython}'; export KERSOR_PYTHON;`

    for (const command of [
      '"$KERSOR_PYTHON" "$kersor_root/scripts/session-synthesizer.py"',
      'bash /opt/helpers/run-kersor-python.sh',
      'bash /opt/helpers/setup-session.sh',
      '"$KERSOR_PYTHON" /opt/helpers/kersor_bridge.py',
      'command -v python3',
      'type -a python3',
      'python3 --version',
      "find /usr -name 'python*'",
    ]) {
      const result = await call(harness, 'bash', { command }, grandchild)
      expect(result.isError, command).toBe(true)
    }

    const allowed = `${prefix} bash /opt/helpers/setup-session.sh`
    expect((await call(harness, 'bash', { command: allowed }, grandchild)).isError).toBe(false)
    expect(calls).toEqual([allowed])
  })

  it('does not apply the KerSor Bash gate outside an Experiment ancestry', async () => {
    const harness = await setup()
    const calls: string[] = []
    registerBashProbe(harness, calls)
    const ordinaryChild = descendantAgent(harness, harness.session, 'ordinary-child')
    for (const command of [
      'which python3',
      'python3 /opt/KerSor/scripts/normalize-transfer.py',
    ]) {
      expect((await call(harness, 'bash', { command }, ordinaryChild)).isError).toBe(false)
    }
    expect(calls).toEqual([
      'which python3',
      'python3 /opt/KerSor/scripts/normalize-transfer.py',
    ])
  })

  it('executes only the exact dsh-workflow envelope and denies meta/script/args drift before the body', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'dsh-kersor-envelope-exact-'))
    try {
      const calls: string[] = []
      const harness = await setup(workspace)
      registerWorkflowProbe(harness, {
        runId: 'workflow-envelope', agentsStarted: 1, result: { best_kernel_code: 'exact' },
      }, calls)
      const controller = await startController(harness)

      const exactRun = makeRunDirectory(workspace)
      writeWorkflowEnvelope(exactRun)
      const exact = await call(harness, 'workflow', workflowArguments(exactRun), controller)
      expect(exact.isError).toBe(false)
      expect(calls).toEqual(['workflow'])

      const scriptRun = makeRunDirectory(workspace, 'run-2')
      writeWorkflowEnvelope(scriptRun)
      const scriptDrift = {
        ...workflowArguments(scriptRun),
        script: `${workflowScript}\nreturn { reconstructed: true }`,
      }
      const script = await call(harness, 'workflow', scriptDrift, controller)
      expect(script.isError).toBe(true)
      expect(script.content.some(block => block.type === 'text'
        && block.text.includes('script differs from dsh-workflow.json'))).toBe(true)

      const metaRun = makeRunDirectory(workspace, 'run-3')
      writeWorkflowEnvelope(metaRun)
      const metaDrift = workflowArguments(metaRun)
      metaDrift.meta.description = 'Reconstructed description.'
      const meta = await call(harness, 'workflow', metaDrift, controller)
      expect(meta.isError).toBe(true)
      expect(meta.content.some(block => block.type === 'text'
        && block.text.includes('meta differs from dsh-workflow.json'))).toBe(true)

      const argsRun = makeRunDirectory(workspace, 'run-4')
      writeWorkflowEnvelope(argsRun)
      const argsDrift = workflowArguments(argsRun)
      argsDrift.args.target_speedup = 9
      const args = await call(harness, 'workflow', argsDrift, controller)
      expect(args.isError).toBe(true)
      expect(args.content.some(block => block.type === 'text'
        && block.text.includes('args differ from dsh-workflow.json'))).toBe(true)
      expect(calls).toEqual(['workflow'])
      for (const runDir of [scriptRun, metaRun, argsRun]) {
        expect(existsSync(join(runDir, 'output.json'))).toBe(false)
      }
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  })

  it('loads and executes a sealed Workflow envelope Host-side from exp_dir only', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'dsh-kersor-sealed-workflow-'))
    try {
      const calls: string[] = []
      const harness = await setup(workspace)
      const raw = { best_kernel_code: 'host-loaded-candidate', speedup: 8.5 }
      registerWorkflowProbe(harness, {
        runId: 'workflow-host-loaded', agentsStarted: 2, result: raw,
      }, calls)
      const controller = await startController(harness)
      const runDir = makeRunDirectory(workspace)
      writeWorkflowEnvelope(runDir)

      const result = await call(harness, 'kersor_workflow', { exp_dir: runDir }, controller)

      expect(result.isError).toBe(false)
      expect(result.value).toEqual({
        runId: 'workflow-host-loaded', agentsStarted: 2, result: raw,
      })
      expect(result.content.some(block => block.type === 'text'
        && block.text.includes('Host raw output custody completed'))).toBe(true)
      expect(calls).toEqual(['workflow'])
      expect(JSON.parse(readFileSync(join(runDir, 'output.json'), 'utf8'))).toEqual(raw)

      const ordinary = descendantAgent(harness, harness.session, 'ordinary-child')
      const denied = await call(harness, 'kersor_workflow', { exp_dir: runDir }, ordinary)
      expect(denied.isError).toBe(true)
      expect(denied.content.some(block => block.type === 'text'
        && block.text.includes('conversation-bound KerSor controller'))).toBe(true)
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  })

  it('denies missing, symlinked, and oversized dsh-workflow envelopes before execution', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'dsh-kersor-envelope-invalid-'))
    try {
      const calls: string[] = []
      const harness = await setup(workspace)
      registerWorkflowProbe(harness, {
        runId: 'workflow-envelope-invalid', agentsStarted: 1, result: { best_kernel_code: 'no' },
      }, calls)
      const controller = await startController(harness)

      const missingRun = makeRunDirectory(workspace)
      const missing = await call(harness, 'workflow', workflowArguments(missingRun), controller)
      expect(missing.isError).toBe(true)
      expect(missing.content.some(block => block.type === 'text'
        && block.text.includes('required Workflow envelope is missing'))).toBe(true)

      if (process.platform !== 'win32') {
        const symlinkRun = makeRunDirectory(workspace, 'run-2')
        const target = join(workspace, 'prepared-envelope.json')
        writeFileSync(target, JSON.stringify({
          schema_version: 1,
          contract: 'dsh_workflow_v1',
          ...workflowArguments(symlinkRun),
        }))
        symlinkSync(target, join(symlinkRun, 'dsh-workflow.json'))
        const symlink = await call(harness, 'workflow', workflowArguments(symlinkRun), controller)
        expect(symlink.isError).toBe(true)
        expect(symlink.content.some(block => block.type === 'text'
          && block.text.includes('must not be a symlink'))).toBe(true)
      }

      const oversizedRun = makeRunDirectory(workspace, 'run-3')
      writeFileSync(join(oversizedRun, 'dsh-workflow.json'), 'x'.repeat(2 * 1024 * 1024 + 1))
      const oversized = await call(harness, 'workflow', workflowArguments(oversizedRun), controller)
      expect(oversized.isError).toBe(true)
      expect(oversized.content.some(block => block.type === 'text'
        && block.text.includes('exceeds the 2097152-byte limit'))).toBe(true)
      expect(calls).toEqual([])
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  })

  it('atomically preserves a raw Workflow result beyond its rendered preview and denies overwrite', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'dsh-kersor-raw-output-'))
    try {
      const runDir = makeRunDirectory(workspace)
      const raw = {
        best_kernel_code: `kernel-start\n${'x'.repeat(120_000)}\nkernel-complete`,
        speedup: 8.25,
      }
      const harness = await setup(workspace)
      registerWorkflowProbe(harness, { runId: 'workflow-raw', agentsStarted: 3, result: raw })
      const fileCalls: string[] = []
      registerFileProbe(harness, 'write', fileCalls)
      registerFileProbe(harness, 'edit', fileCalls)
      const bashCalls: string[] = []
      registerBashProbe(harness, bashCalls)
      const controller = await startController(harness)
      writeWorkflowEnvelope(runDir)

      const result = await call(harness, 'workflow', workflowArguments(runDir), controller)
      expect(result.isError).toBe(false)
      expect(result.content.some(block => block.type === 'text'
        && block.text.includes('kernel-complete'))).toBe(false)
      const outputPath = join(runDir, 'output.json')
      expect(JSON.parse(readFileSync(outputPath, 'utf8'))).toEqual(raw)
      expect(readFileSync(outputPath, 'utf8')).toContain('kernel-complete')

      const write = await call(harness, 'write', { file_path: outputPath }, controller)
      const edit = await call(harness, 'edit', { file_path: outputPath }, controller)
      expect(write.isError).toBe(true)
      expect(edit.isError).toBe(true)
      expect(write.content.some(block => block.type === 'text'
        && block.text.includes('Host-owned'))).toBe(true)
      expect(fileCalls).toEqual([])
      expect(JSON.parse(readFileSync(outputPath, 'utf8'))).toEqual(raw)

      const pythonOverwrite = await call(harness, 'bash', {
        command: 'python -c "open(\'$RUN_DIR/output.json\',\'w\').write(\'truncated\')"',
      }, controller)
      const redirectOverwrite = await call(harness, 'bash', {
        command: `cat > '${outputPath}' <<'EOF'\ntruncated\nEOF`,
      }, controller)
      expect(pythonOverwrite.isError).toBe(true)
      expect(redirectOverwrite.isError).toBe(true)
      expect(pythonOverwrite.content.some(block => block.type === 'text'
        && block.text.includes('Python open/write'))).toBe(true)

      const catRead = `cat '${outputPath}'`
      const pythonRead = `python3 -c "print(open('${outputPath}').read())"`
      expect((await call(harness, 'bash', { command: catRead }, controller)).isError).toBe(false)
      expect((await call(harness, 'bash', { command: pythonRead }, controller)).isError).toBe(false)
      expect(bashCalls).toEqual([catRead, pythonRead])
      expect(JSON.parse(readFileSync(outputPath, 'utf8'))).toEqual(raw)
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  })

  it('blocks Workflow success for workspace escape, symlinked run, and existing output', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'dsh-kersor-custody-workspace-'))
    const outside = mkdtempSync(join(tmpdir(), 'dsh-kersor-custody-outside-'))
    try {
      const harness = await setup(workspace)
      registerWorkflowProbe(harness, {
        runId: 'workflow-paths', agentsStarted: 1, result: { best_kernel_code: 'complete' },
      })
      const controller = await startController(harness)
      const outsideRun = makeRunDirectory(outside)
      writeWorkflowEnvelope(outsideRun)
      const outsideResult = await call(harness, 'workflow', workflowArguments(outsideRun), controller)
      expect(outsideResult.isError).toBe(true)
      expect(outsideResult.content.some(block => block.type === 'text'
        && block.text.includes('must resolve exactly under'))).toBe(true)
      expect(existsSync(join(outsideRun, 'output.json'))).toBe(false)

      if (process.platform !== 'win32') {
        const symlinkTarget = join(outside, 'symlink-target')
        mkdirSync(symlinkTarget)
        const symlinkRun = join(workspace, '.kersor', '20260822-raw-custody', 'run-2')
        mkdirSync(join(workspace, '.kersor', '20260822-raw-custody'), { recursive: true })
        symlinkSync(symlinkTarget, symlinkRun, 'dir')
        writeWorkflowEnvelope(symlinkRun)
        const symlinkResult = await call(harness, 'workflow', workflowArguments(symlinkRun), controller)
        expect(symlinkResult.isError).toBe(true)
        expect(symlinkResult.content.some(block => block.type === 'text'
          && block.text.includes('symlink escape'))).toBe(true)
        expect(existsSync(join(symlinkTarget, 'output.json'))).toBe(false)
      }

      const existingRun = makeRunDirectory(workspace, 'run-3')
      const existingPath = join(existingRun, 'output.json')
      writeFileSync(existingPath, '{"failure":"existing"}\n')
      writeWorkflowEnvelope(existingRun)
      const existingResult = await call(harness, 'workflow', workflowArguments(existingRun), controller)
      expect(existingResult.isError).toBe(true)
      expect(existingResult.content.some(block => block.type === 'text'
        && block.text.includes('already exists and will not be overwritten'))).toBe(true)
      expect(readFileSync(existingPath, 'utf8')).toBe('{"failure":"existing"}\n')
    } finally {
      rmSync(workspace, { recursive: true, force: true })
      rmSync(outside, { recursive: true, force: true })
    }
  })

  it('blocks non-object and oversized raw Workflow results without creating output', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'dsh-kersor-custody-shape-'))
    try {
      const scalarRun = makeRunDirectory(workspace)
      const scalarHarness = await setup(workspace)
      registerWorkflowProbe(scalarHarness, {
        runId: 'workflow-scalar', agentsStarted: 1, result: 'truncated text',
      })
      const scalarController = await startController(scalarHarness)
      writeWorkflowEnvelope(scalarRun)
      const scalar = await call(scalarHarness, 'workflow', workflowArguments(scalarRun), scalarController)
      expect(scalar.isError).toBe(true)
      expect(scalar.content.some(block => block.type === 'text'
        && block.text.includes('result.value.result must be a JSON object'))).toBe(true)
      expect(existsSync(join(scalarRun, 'output.json'))).toBe(false)

      const largeRun = makeRunDirectory(workspace, 'run-2')
      const largeHarness = await setup(workspace)
      registerWorkflowProbe(largeHarness, {
        runId: 'workflow-large', agentsStarted: 1, result: { code: 'x'.repeat(4 * 1024 * 1024) },
      })
      const largeController = await startController(largeHarness)
      writeWorkflowEnvelope(largeRun)
      const large = await call(largeHarness, 'workflow', workflowArguments(largeRun), largeController)
      expect(large.isError).toBe(true)
      expect(large.content.some(block => block.type === 'text'
        && block.text.includes('exceeding the 4194304-byte'))).toBe(true)
      expect(existsSync(join(largeRun, 'output.json'))).toBe(false)
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  })

  it('does not custody non-Experiment Workflow results', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'dsh-kersor-non-experiment-output-'))
    try {
      const runDir = makeRunDirectory(workspace)
      const harness = await setup(workspace)
      registerWorkflowProbe(harness, {
        runId: 'workflow-ordinary', agentsStarted: 1, result: { best_kernel_code: 'ordinary' },
      })
      const result = await call(harness, 'workflow', workflowArguments(runDir))
      expect(result.isError).toBe(false)
      expect(existsSync(join(runDir, 'output.json'))).toBe(false)
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  })

  it('writes no Host output after Workflow error and permits one missing failure stub', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'dsh-kersor-failure-stub-'))
    try {
      const runDir = makeRunDirectory(workspace)
      const harness = await setup(workspace)
      registerWorkflowProbe(harness, new Error('workflow failed before a raw result'))
      const fileCalls: string[] = []
      registerFileProbe(harness, 'write', fileCalls)
      const controller = await startController(harness)
      writeWorkflowEnvelope(runDir)
      const workflow = await call(harness, 'workflow', workflowArguments(runDir), controller)
      expect(workflow.isError).toBe(true)
      const outputPath = join(runDir, 'output.json')
      expect(existsSync(outputPath)).toBe(false)

      const stub = await call(harness, 'write', { file_path: outputPath }, controller)
      expect(stub.isError).toBe(false)
      expect(fileCalls).toEqual([outputPath])
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  })

  it('projects kersor_status metadata into a flushed nine-stage checkpoint', async () => {
    const harness = await setup()
    await call(harness, 'kersor_start', { objective: 'Optimize' })
    const childId = starts(harness.session)[0]!.data.childSessionId
    const childSession = harness.ctx.sessions.create(childId, {
      meta: { cwd: '/work/kernel', parentSession: harness.session.id, origin: 'subagent' },
    })
    const child = { id: childId, session: childSession } as unknown as Agent
    harness.ctx.tools.register(defineTool({
      name: 'kersor_status',
      description: 'Return projected KerSor status for this test.',
      parameters: {},
      output: {
        schema: { type: 'object', additionalProperties: true, properties: {} },
        render: () => [{ type: 'text', text: 'ok' }],
        presentationMeta: () => ({
          kind: 'kersor-status', found: true, session_dir: '/work/kernel/.kersor/20260821',
          phase: 'optimizing', current_round: 2, max_workflows: 4,
          workflow: 'bundle-pack', best_speedup: 3.5, target_speedup: 8,
          steps: [
            { id: 'setup', status: 'completed' },
            { id: 'baseline', status: 'completed' },
            { id: 'profile', status: 'completed' },
            { id: 'selection', status: 'completed' },
            { id: 'authoring', status: 'completed' },
            { id: 'validation', status: 'completed' },
            { id: 'dispatch', status: 'active' },
            { id: 'measurement', status: 'pending' },
            { id: 'decision', status: 'pending' },
          ],
        }),
      },
      execute: () => Promise.resolve({}),
    }))
    const result = await harness.ctx.tools.execute({
      callId: CallId('status-child'), name: 'kersor_status', arguments: {}, agent: child, signal,
    })
    expect(result.isError).toBe(false)
    const latest = checkpoints(harness.session).at(-1)?.data
    expect(latest).toMatchObject({
      revision: 2, status: 'running', kersorSessionId: '20260821', phase: 'optimizing',
      currentRound: 2, maxWorkflows: 4, workflow: 'bundle-pack', bestSpeedup: 3.5,
    })
    expect(latest?.steps).toContainEqual({ id: 'decision', status: 'pending' })
  })

  it('denies recursive controls and external product subagents inside the controller child', async () => {
    const harness = await setup()
    await call(harness, 'kersor_start', { objective: 'Optimize' })
    const childId = starts(harness.session)[0]!.data.childSessionId
    const childSession = harness.ctx.sessions.create(childId, {
      meta: { cwd: '/work/kernel', parentSession: harness.session.id, origin: 'subagent' },
    })
    const child = { id: childId, session: childSession } as unknown as Agent
    const recursive = await harness.ctx.tools.execute({
      callId: CallId('recursive'), name: 'kersor_resume', arguments: {}, agent: child, signal,
    })
    expect(recursive.isError).toBe(true)
    expect(recursive.content.some(block => block.type === 'text'
      && block.text.includes('cannot execute kersor_resume'))).toBe(true)
  })

  it('lets a running controller delegate, then denies every non-status tool after stalled', async () => {
    const harness = await setup()
    const calls: string[] = []
    registerProbe(harness, 'subagent', calls)
    registerProbe(harness, 'bash', calls)
    await call(harness, 'kersor_start', { objective: 'Optimize' })
    const childId = starts(harness.session)[0]!.data.childSessionId
    const childSession = harness.ctx.sessions.create(childId, {
      meta: { cwd: '/work/kernel', parentSession: harness.session.id, origin: 'subagent' },
    })
    const child = { id: childId, session: childSession } as unknown as Agent

    const delegated = await harness.ctx.tools.execute({
      callId: CallId('controller-delegates'), name: 'subagent', arguments: {}, agent: child, signal,
    })
    expect(delegated.isError).toBe(false)
    expect(calls).toEqual(['subagent'])

    harness.ctx.tools.register(defineTool({
      name: 'kersor_status',
      description: 'Return a stalled KerSor status for this test.',
      parameters: {},
      output: {
        schema: { type: 'object', additionalProperties: true, properties: {} },
        render: () => [{ type: 'text', text: 'stalled' }],
        presentationMeta: () => ({
          kind: 'kersor-status', found: true, phase: 'stalled',
          session_dir: '/work/kernel/.kersor/stalled', steps: [],
        }),
      },
      execute: () => Promise.resolve({}),
    }))
    const status = await harness.ctx.tools.execute({
      callId: CallId('controller-stalled'), name: 'kersor_status', arguments: {}, agent: child, signal,
    })
    expect(status.isError).toBe(false)
    expect(status.concludesTurn).toBe(true)
    expect(checkpoints(harness.session).at(-1)?.data).toMatchObject({
      status: 'blocked', phase: 'stalled',
    })
    expect(checkpoints(harness.session).at(-1)?.data.nextAction).toBeUndefined()

    const repeatedStatus = await harness.ctx.tools.execute({
      callId: CallId('controller-stalled-again'), name: 'kersor_status', arguments: {}, agent: child, signal,
    })
    expect(repeatedStatus.isError).toBe(false)
    expect(repeatedStatus.concludesTurn).toBe(true)

    const subagent = await harness.ctx.tools.execute({
      callId: CallId('controller-subagent-after-stalled'), name: 'subagent', arguments: {}, agent: child, signal,
    })
    const bash = await harness.ctx.tools.execute({
      callId: CallId('controller-bash-after-stalled'), name: 'bash', arguments: {}, agent: child, signal,
    })
    expect(subagent.isError).toBe(true)
    expect(bash.isError).toBe(true)
    expect(calls).toEqual(['subagent'])
  })
})
