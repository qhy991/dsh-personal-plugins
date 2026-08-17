/** Compatibility tests that mount Modus through DSH's real Loader and runtimes. */

import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { createScope } from '@deepseek-ai/dsh-scope'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import { CallId, createToolResultMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { CodeRuntime } from '@deepseek-ai/dsh-code-runtime'
import type { CodeRunRequest, CodeRunResult } from '@deepseek-ai/dsh-code-runtime'
import ToolRuntime, { RUN_CODE_NAME, defineTool } from '@deepseek-ai/dsh-tools'
import SubagentRuntime from '@deepseek-ai/dsh-subagent'
import type { ResolvedSubagentStartRequest } from '@deepseek-ai/dsh-subagent'
import * as ForkInProcess from '@deepseek-ai/dsh-subagent-fork-in-process'
import { MockAdapter, textResponse, toolCallResponse } from '@dsh-test/mock-adapter'

import * as ModusRouter from '../presets/modus/plugins/modus-router.mjs'


interface Mounted {
  ctx: Context
  agent: any
  modusId: string
  providerId: string
  starts: ResolvedSubagentStartRequest[]
  disposeCount: () => number
  runtime?: FakeRuntime
}

const contexts: Context[] = []

class FakeRuntime extends CodeRuntime {
  readonly language = 'typescript'
  readonly isolation = 'fake'
  behavior: (request: CodeRunRequest) => Promise<CodeRunResult> =
    () => Promise.resolve({ logs: [] })

  run(request: CodeRunRequest): Promise<CodeRunResult> {
    return this.behavior(request)
  }
}

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(context => context.fiber.dispose()))
})

function routeArgs() {
  return {
    profile: 'p000',
    rationale: 'The request names one bounded implementation surface.',
    evidence: ['The visible request contains one target.'],
    expected_advantage: 'token',
    abstain: false,
  }
}

async function mount(options: { codeMode?: boolean } = {}): Promise<Mounted> {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(Loader)

  const starts: ResolvedSubagentStartRequest[] = []
  let disposals = 0
  let agent: any
  const ProviderFixture = {
    name: 'modus-provider-fixture',
    inject: ['subagents'],
    apply(inner: Context) {
      inner.subagents.registerProvider({
        name: 'fork',
        capabilities: {
          outputSchema: true,
          depthLimit: true,
          toolFilter: true,
          persona: true,
        },
        inheritsParentContext: true,
        async start(request: ResolvedSubagentStartRequest) {
          starts.push(request)
          return {
            id: SessionId('worker-1'),
            localAgent: undefined,
            result: Promise.resolve({
              output: [{ type: 'text' as const, text: 'worker complete' }],
              stopReason: 'completed' as const,
            }),
            async dispose() { disposals += 1 },
          }
        },
      })
    },
  }
  const ProbeFixture = {
    name: 'modus-probe-fixture',
    inject: ['tools'],
    apply(inner: Context) {
      inner.tools.register(defineTool({
        name: 'probe_fixture',
        description: 'A visibility probe for Router restriction lifecycle tests.',
        parameters: {},
        output: {
          schema: { type: 'string' },
          render: (_args, value) => [{ type: 'text', text: value }],
        },
        execute: () => Promise.resolve('probe'),
      }))
    },
  }
  const AgentFixture = {
    name: 'modus-agent-fixture',
    inject: ['agents', 'tools', 'systemPrompt'],
    apply(inner: Context) {
      const id = SessionId('modus-loader-router')
      const session = Session.create(id, undefined, {
        version: 0,
        id,
        createdAt: 1,
        agentPreset: 'modus',
      })
      session.append('turn/start', { turn: 1 })
      session.append('user/message', createUserMessage({
        content: [{ type: 'text', text: 'Implement the bounded change.' }],
        source: { kind: 'user' },
      }), { surfaceOp: 'append' })
      const key: any = {}
      const scope = createScope(inner, key)
      const inbox = { nextStep: [] as any[] }
      agent = Object.assign(key, {
        id,
        options: {},
        session,
        inbox,
        status: 'idle',
        ctx: scope.ctx.extend({ agent: key }),
        cancel() {},
        async whenIdle() {},
        runMaintenance(task: (signal: AbortSignal) => Promise<unknown>) {
          return task(new AbortController().signal)
        },
        send() {},
        followup() {},
        steer(message: unknown) { inbox.nextStep.unshift(message) },
        inject() {},
      })
      inner.agents.register(agent)
    },
  }

  const modules = new Map<string, unknown>([
    ['fixture:system-prompt', SystemPrompt],
    ['fixture:tools', ToolRuntime],
    ...(options.codeMode ? [['fixture:code-runtime', FakeRuntime] as const] : []),
    ['fixture:agents', AgentRegistry],
    ['fixture:subagents', SubagentRuntime],
    ['fixture:provider', ProviderFixture],
    ['fixture:probe', ProbeFixture],
    ['fixture:agent', AgentFixture],
    ['fixture:modus', ModusRouter],
  ])
  ctx.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof ctx.loader.internal>

  let providerId = ''
  for (const specifier of [...modules.keys()].slice(0, -1)) {
    const id = await ctx.loader.create({
      name: specifier,
      ...(specifier === 'fixture:tools' && options.codeMode
        ? { config: { mode: 'both' } }
        : {}),
    })
    if (specifier === 'fixture:provider') providerId = id
  }
  const modusId = await ctx.loader.create({
    name: 'fixture:modus',
    config: { basePersona: 'ordinary coding agent' },
  })
  await ctx.loader.await()
  const unloaded = [...ctx.loader.entries()]
    .filter(entry => entry.fiber === undefined && !entry.disabled)
    .map(entry => entry.options.name)
  expect(unloaded).toEqual([])
  return {
    ctx,
    agent,
    modusId,
    providerId,
    starts,
    disposeCount: () => disposals,
    ...(options.codeMode ? { runtime: ctx.codeRuntime as FakeRuntime } : {}),
  }
}

async function reloadModus(subject: Mounted): Promise<void> {
  await subject.ctx.loader.update(subject.modusId, { disabled: true })
  await subject.ctx.loader.update(subject.modusId, { disabled: false })
  await subject.ctx.loader.await()
}

async function executeRoute(subject: Mounted, callId = 'route-live') {
  return subject.ctx.tools.execute({
    signal: new AbortController().signal,
    callId: CallId(callId),
    name: 'modus_delegate',
    arguments: routeArgs(),
    agent: subject.agent,
  })
}

function appendNativeOutcome(agent: any, outcome: 'success' | 'failure' | 'unknown'): void {
  const callId = CallId(`native-${outcome}`)
  agent.session.append('step/start', { turn: 1, step: 1 })
  const call = agent.session.append('tool/call', {
    turn: 1,
    step: 1,
    callId,
    name: 'modus_delegate',
    arguments: JSON.stringify(routeArgs()),
  })
  if (outcome === 'unknown') return
  agent.session.append('tool/result', {
    turn: 1,
    step: 1,
    message: createToolResultMessage({
      callId,
      content: [{ type: 'text', text: outcome }],
      isError: outcome === 'failure',
    }),
  }, { surfaceOp: 'append', sourceEventSeqs: [call.seq] })
}

function appendCodeOutcome(agent: any, outcome: 'success' | 'failure' | 'unknown'): void {
  const base = {
    rootCallId: CallId(`code-root-${outcome}`),
    parentCallId: CallId(`code-root-${outcome}`),
    subCallId: CallId(`code-root-${outcome}:code:1`),
    name: 'modus_delegate',
    arguments: routeArgs(),
  }
  agent.session.append('tool/code-dispatch-start', base)
  if (outcome === 'unknown') return
  agent.session.append('tool/code-dispatch', {
    ...base,
    isError: outcome === 'failure',
    content: [{ type: 'text', text: outcome }],
  })
}

describe('Modus Router against real DSH Loader and services', () => {
  it('loads, confines a scoped agent, executes an exact Worker request, and unloads cleanly', async () => {
    const subject = await mount()
    expect(subject.ctx.tools.schemas(subject.agent).map(tool => tool.name))
      .toEqual(['modus_delegate'])

    await subject.ctx.loader.update(subject.modusId, { disabled: true })
    expect(subject.ctx.tools.schemas(subject.agent).map(tool => tool.name))
      .toEqual(['probe_fixture'])
    await subject.ctx.loader.update(subject.modusId, { disabled: false })
    await subject.ctx.loader.await()
    expect(subject.ctx.tools.schemas(subject.agent).map(tool => tool.name))
      .toEqual(['modus_delegate'])

    const signal = new AbortController().signal
    const result = await subject.ctx.tools.execute({
      signal,
      callId: CallId('route-1'),
      name: 'modus_delegate',
      arguments: routeArgs(),
      agent: subject.agent,
    })
    expect(result.isError).toBe(false)
    if (result.isError) throw new Error(result.error.message)
    expect(result.value).toMatchObject({
      profile: 'p000',
      worker_session_id: 'worker-1',
      stop_reason: 'completed',
    })
    expect(result.meta).toMatchObject({
      profile: 'p000',
      stop_reason: 'completed',
      token_usage: { total: { complete: false } },
    })
    expect(subject.disposeCount()).toBe(1)
    expect(subject.starts).toHaveLength(1)
    expect(Object.keys(subject.starts[0]!).sort()).toEqual([
      'descriptor', 'label', 'maxDepth', 'parent', 'persona',
      'prompt', 'signal', 'toolFilter',
    ])
    expect(subject.starts[0]!.parent).toBe(subject.agent)
    expect(subject.starts[0]!.signal).toBe(signal)
    expect(subject.starts[0]!.toolFilter).toMatchObject({
      deny: ['modus_delegate'],
    })
  })

  it('tracks provider removal and returns one terminal infrastructure result', async () => {
    const subject = await mount()
    await subject.ctx.loader.update(subject.providerId, { disabled: true })
    expect(subject.ctx.subagents.getProvider('fork')).toBeUndefined()
    const result = await executeRoute(subject, 'provider-absent')
    expect(result.isError).toBe(false)
    if (result.isError) throw new Error(result.error.message)
    expect(result.value).toMatchObject({
      stop_reason: 'infrastructure-error',
      worker_session_id: null,
    })
    expect(subject.starts).toHaveLength(0)
  })

  it.each(['native', 'both'] as const)(
    'captures Worker denials from a real standing preset scope in %s mode',
    async (mode) => {
      const ctx = new Context()
      contexts.push(ctx)
      await ctx.plugin(SystemPrompt)
      await ctx.plugin(ToolRuntime, { mode })
      if (mode === 'both') await ctx.plugin(FakeRuntime)
      await ctx.plugin(AgentRegistry)
      await ctx.plugin(SubagentRuntime)

      const starts: ResolvedSubagentStartRequest[] = []
      let runtimeCtx!: Context
      let agent: any
      const ScopedPresetFixture = {
        name: `modus-scoped-preset-fixture-${mode}`,
        inject: ['tools', 'subagents', 'agents', 'systemPrompt'],
        async apply(inner: Context) {
          runtimeCtx = inner
          inner.subagents.registerProvider({
            name: 'fork',
            capabilities: {
              outputSchema: true, depthLimit: true, toolFilter: true, persona: true,
            },
            inheritsParentContext: true,
            async start(request: ResolvedSubagentStartRequest) {
              starts.push(request)
              return {
                id: SessionId(`scoped-worker-${mode}`),
                localAgent: undefined,
                result: Promise.resolve({
                  output: [{ type: 'text' as const, text: 'worker complete' }],
                  stopReason: 'completed' as const,
                }),
                async dispose() {},
              }
            },
          })

          const standingKey: any = {}
          const standing = createScope(inner, standingKey)
          standing.ctx.tools.register(defineTool({
            name: 'subagent_fork',
            description: 'A recursive capability visible only in this preset scope.',
            parameters: {},
            output: {
              schema: { type: 'string' },
              render: (_args, value) => [{ type: 'text', text: value }],
            },
            execute: () => Promise.resolve('unused'),
          }))
          const id = SessionId(`scoped-router-${mode}`)
          const session = Session.create(id, undefined, {
            version: 0, id, createdAt: 1, agentPreset: 'modus',
          })
          session.append('turn/start', { turn: 1 })
          session.append('user/message', createUserMessage({
            content: [{ type: 'text', text: 'Implement the bounded change.' }],
            source: { kind: 'user' },
          }), { surfaceOp: 'append' })
          const key: any = {}
          const scope = createScope(inner, key, { parent: standingKey })
          const inbox = { nextStep: [] as any[] }
          agent = Object.assign(key, {
            id,
            options: {},
            session,
            inbox,
            status: 'idle',
            ctx: scope.ctx.extend({ agent: key }),
            cancel() {},
            async whenIdle() {},
            runMaintenance(task: (signal: AbortSignal) => Promise<unknown>) {
              return task(new AbortController().signal)
            },
            send() {},
            followup() {},
            steer(message: unknown) { inbox.nextStep.unshift(message) },
            inject() {},
          })
          inner.agents.register(agent)
          await standing.ctx.plugin(ModusRouter, {
            basePersona: 'ordinary coding agent',
          })
        },
      }
      await ctx.plugin(ScopedPresetFixture)

      const globalNames = runtimeCtx.tools.schemas().map(tool => tool.name)
      expect(globalNames).not.toContain('modus_delegate')
      expect(globalNames).not.toContain('subagent_fork')
      expect(runtimeCtx.tools.schemas(agent).map(tool => tool.name).sort()).toEqual(
        mode === 'both'
          ? ['modus_delegate', RUN_CODE_NAME].sort()
          : ['modus_delegate'],
      )
      const result = await runtimeCtx.tools.execute({
        signal: new AbortController().signal,
        callId: CallId(`scoped-route-${mode}`),
        name: 'modus_delegate',
        arguments: routeArgs(),
        agent,
      })
      expect(result.isError).toBe(false)
      expect(starts).toHaveLength(1)
      expect(starts[0]!.toolFilter).toEqual({
        deny: ['modus_delegate', 'subagent_fork'],
      })
    },
  )

  it('routes through the real run_code bridge and reconstructs it after Loader HMR', async () => {
    const subject = await mount({ codeMode: true })
    expect(subject.runtime).toBeDefined()
    expect(subject.ctx.tools.schemas(subject.agent).map(tool => tool.name).sort())
      .toEqual(['modus_delegate', RUN_CODE_NAME].sort())

    subject.runtime!.behavior = async (request) => {
      const tools = request.bindings.find(binding => binding.global === 'tools')
      const delegate = tools?.functions.modus_delegate
      expect(delegate).toBeDefined()
      await delegate!(routeArgs())
      return { logs: [], value: 'routed' }
    }
    const result = await subject.ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId('outer-code-route'),
      name: RUN_CODE_NAME,
      arguments: {
        code: 'return await tools.modus_delegate({})',
        description: 'Route through the Modus decision tool',
      },
      agent: subject.agent,
    })
    expect(result.isError).toBe(false)
    expect(subject.starts).toHaveLength(1)
    expect(subject.starts[0]!.toolFilter).toMatchObject({
      deny: ['modus_delegate'],
    })
    const starts = subject.agent.session.events.filter((event: any) =>
      event.type === 'tool/code-dispatch-start'
      && event.data.name === 'modus_delegate')
    const settlements = subject.agent.session.events.filter((event: any) =>
      event.type === 'tool/code-dispatch'
      && event.data.name === 'modus_delegate')
    expect(starts).toHaveLength(1)
    expect(settlements).toHaveLength(1)
    expect(settlements[0]).toMatchObject({ data: { isError: false } })

    await reloadModus(subject)
    const replay = await executeRoute(subject, 'after-real-code-hmr')
    expect(replay.isError).toBe(true)
    expect(replay.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringMatching(/already has a route decision/),
    })
    expect(subject.starts).toHaveLength(1)
  })

  it('does not redispatch after post-execute turns an already-run route into an error', async () => {
    const subject = await mount()
    const callId = CallId('post-execute-route')
    subject.ctx.on('tools/post-execute', async (exec, _result, next) => {
      if (exec.name !== 'modus_delegate' || exec.callId !== callId) return next()
      return {
        kind: 'block' as const,
        feedback: [{ type: 'text' as const, text: 'downstream policy rejected the result' }],
      }
    })
    const call = subject.agent.session.append('tool/call', {
      turn: 1,
      step: 1,
      callId,
      name: 'modus_delegate',
      arguments: JSON.stringify(routeArgs()),
    })
    const first = await subject.ctx.tools.execute({
      signal: new AbortController().signal,
      callId,
      name: 'modus_delegate',
      arguments: routeArgs(),
      agent: subject.agent,
    })
    expect(first.isError).toBe(true)
    expect(subject.starts).toHaveLength(1)
    subject.agent.session.append('tool/result', {
      turn: 1,
      step: 1,
      message: createToolResultMessage({
        callId,
        content: first.content,
        isError: first.isError,
      }),
    }, { surfaceOp: 'append', sourceEventSeqs: [call.seq] })

    await reloadModus(subject)
    const replay = await executeRoute(subject, 'post-execute-route-retry')
    expect(replay.isError).toBe(true)
    expect(replay.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringMatching(/already has a route decision/),
    })
    expect(subject.starts).toHaveLength(1)
  })

  it('fails a Router turn explicitly when bounded reminders still produce no route', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await mountAgentLoopTestDependencies(ctx)
    await ctx.plugin(AgentLoop, { agents: [] })
    await ctx.plugin(SubagentRuntime)
    const adapter = new MockAdapter([
      textResponse('I will answer without routing.'),
      textResponse('I still will not route.'),
    ])
    ctx.llm.registerAdapter(['mock'], adapter)
    await ctx.plugin(ModusRouter, {
      basePersona: 'ordinary coding agent',
      maxRouteReminders: 1,
    })
    const parent = ctx.agentLoop.create(
      SessionId('modus-route-required-parent'),
      { provider: 'mock', model: 'mock' },
      { cwd: '/workspace' },
    )
    parent.followup(createUserMessage({
      content: [{ type: 'text', text: 'Implement the bounded change.' }],
      source: { kind: 'user' },
    }))
    await parent.whenIdle()

    expect(adapter.requests).toHaveLength(2)
    expect(parent.session.events.findLast((event: any) => event.type === 'turn/end'))
      .toMatchObject({
        data: {
          reason: {
            kind: 'error',
            error: { message: expect.stringContaining('MODUS_ROUTE_REQUIRED') },
          },
        },
      })
    expect(parent.session.events.some((event: any) =>
      event.type === 'tool/call' && event.data.name === 'modus_delegate')).toBe(false)
  })

  it('binds the shared token governor before the built-in fork Worker first request', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await mountAgentLoopTestDependencies(ctx)
    await ctx.plugin(AgentLoop, { agents: [] })
    await ctx.plugin(SubagentRuntime)
    await ctx.plugin(ForkInProcess, { providerName: 'fork' })

    const adapter = new MockAdapter([
      toolCallResponse('route-real', 'modus_delegate', routeArgs()),
      toolCallResponse('worker-probe', 'worker_probe', {}),
      textResponse('this response must remain unused'),
    ])
    ctx.llm.registerAdapter(['mock'], adapter)
    ctx.tools.register(defineTool({
      name: 'worker_probe',
      description: 'Force a second Worker request after one metered response.',
      parameters: {},
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      execute: () => Promise.resolve('continue'),
    }))
    let downstreamWorkerPreSteps = 0
    ctx.on('agent/pre-step', ({ agent }, next) => {
      if (agent.session.header.origin === 'subagent') downstreamWorkerPreSteps += 1
      return next()
    })
    await ctx.plugin(ModusRouter, {
      basePersona: 'ordinary coding agent',
      routeTokenBudget: { maxNewTokens: 20, maxCacheReadTokens: 1_000 },
    })

    let worker: any
    ctx.on('agent/session-start', ({ agent }) => {
      if (agent.session.header.origin === 'subagent') worker = agent
    })
    const parent = ctx.agentLoop.create(
      SessionId('modus-real-budget-parent'),
      { provider: 'mock', model: 'mock' },
      { cwd: '/workspace' },
    )
    parent.followup(createUserMessage({
      content: [{ type: 'text', text: 'Implement the bounded change.' }],
      source: { kind: 'user' },
    }))
    await parent.whenIdle()

    // One Router response + one Worker response. The Worker response costs 15
    // new tokens, taking the shared pool from 15 to 30; its next request is
    // stopped before the adapter sees it.
    expect(adapter.requests).toHaveLength(2)
    expect(downstreamWorkerPreSteps).toBe(1)
    expect(worker).toBeDefined()
    expect(worker.session.events.filter((event: any) => event.type === 'assistant/message'))
      .toHaveLength(1)
    expect(worker.session.events.findLast((event: any) => event.type === 'turn/end'))
      .toMatchObject({
        data: {
          reason: {
            kind: 'error',
            error: { message: expect.stringContaining('MODUS_TOKEN_BUDGET_EXHAUSTED') },
          },
        },
      })

    const routeResult = parent.session.events.find((event: any) =>
      event.type === 'tool/result' && event.data.meta?.profile === 'p000') as any
    expect(routeResult).toBeDefined()
    expect(routeResult.data.meta).toMatchObject({
      stop_reason: 'error',
      token_usage: {
        router: { total_tokens: 15, complete: true },
        worker: { total_tokens: 15, complete: true },
        total: { total_tokens: 30, complete: true },
      },
      budget: {
        state: 'limit-reached',
        next_request_allowed: false,
        locally_enforced: true,
        observed: { new_tokens: 30, complete: true },
      },
      trajectory: {
        structurally_complete: true,
        unclassified_tool_calls: [{ name: 'worker_probe', count: 1 }],
      },
    })
  })

  it('charges an admitted compaction and blocks the ordinary Worker request after it crosses the cap', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await mountAgentLoopTestDependencies(ctx)
    await ctx.plugin(AgentLoop, { agents: [] })
    await ctx.plugin(SubagentRuntime)
    await ctx.plugin(ForkInProcess, { providerName: 'fork' })

    const adapter = new MockAdapter([
      toolCallResponse('route-with-compaction', 'modus_delegate', routeArgs()),
      textResponse('the Worker request must remain unused'),
    ])
    ctx.llm.registerAdapter(['mock'], adapter)
    let compactions = 0
    ctx.on('agent/pre-step', ({ agent, turn }, next) => {
      if (agent.session.header.origin === 'subagent' && compactions === 0) {
        compactions += 1
        ;(agent.session as any).append('compaction/start', {
          compactionId: 'modus-test-compaction',
          turn,
        })
        ;(agent.session as any).append('compaction/summary', {
          compactionId: 'modus-test-compaction',
          usage: { inputTokens: 5, outputTokens: 1 },
        })
      }
      return next()
    })
    await ctx.plugin(ModusRouter, {
      basePersona: 'ordinary coding agent',
      routeTokenBudget: { maxNewTokens: 20, maxCacheReadTokens: 1_000 },
    })

    let worker: any
    ctx.on('agent/session-start', ({ agent }) => {
      if (agent.session.header.origin === 'subagent') worker = agent
    })
    const parent = ctx.agentLoop.create(
      SessionId('modus-compaction-budget-parent'),
      { provider: 'mock', model: 'mock' },
      { cwd: '/workspace' },
    )
    parent.followup(createUserMessage({
      content: [{ type: 'text', text: 'Implement the bounded change.' }],
      source: { kind: 'user' },
    }))
    await parent.whenIdle()

    expect(compactions).toBe(1)
    expect(adapter.requests).toHaveLength(1)
    expect(worker.session.events.filter((event: any) => event.type === 'assistant/message'))
      .toHaveLength(0)
    expect(worker.session.events.findLast((event: any) => event.type === 'turn/end'))
      .toMatchObject({
        data: {
          reason: {
            kind: 'error',
            error: { message: expect.stringContaining('MODUS_TOKEN_BUDGET_EXHAUSTED') },
          },
        },
      })
    const routeResult = parent.session.events.find((event: any) =>
      event.type === 'tool/result' && event.data.meta?.profile === 'p000') as any
    expect(routeResult.data.meta).toMatchObject({
      token_usage: {
        router: { total_tokens: 15, complete: true },
        worker: {
          total_tokens: 6,
          compaction_steps: 1,
          metered_compaction_steps: 1,
          complete: true,
        },
        total: { total_tokens: 21, complete: true },
      },
      budget: {
        state: 'limit-reached',
        next_request_allowed: false,
        observed: { new_tokens: 21, complete: true },
      },
    })
  })

  for (const transport of ['native', 'code'] as const) {
    for (const outcome of ['success', 'failure', 'unknown'] as const) {
      it(`${transport} ${outcome} replay survives Loader HMR with no unsafe redispatch`, async () => {
        const subject = await mount()
        if (transport === 'native') appendNativeOutcome(subject.agent, outcome)
        else appendCodeOutcome(subject.agent, outcome)
        await reloadModus(subject)

        const result = await executeRoute(subject, `${transport}-${outcome}-retry`)
        expect(result.isError).toBe(true)
        expect(result.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringMatching(/already has a route decision/),
        })
        expect(subject.starts).toHaveLength(0)
      })
    }
  }
})
