import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  PROFILE_CATALOG,
  apply,
  createModusDelegateTool,
  loadProfileCatalog,
  reconstructRouterTurns,
  resolveConfig,
} from '../presets/modus/plugins/modus-router.mjs'
import {
  evaluatePreEditInformationGate,
  evaluateRouteTokenBudget,
  foldBehaviorTrajectory,
  foldTokenUsage,
  foldWorkerTokenUsage,
  sumTokenUsage,
  zeroTokenUsage,
} from '../presets/modus/lib/trajectory.mjs'


const digest = value => createHash('sha256').update(value).digest('hex')
const VISIBLE_WORKER_TOOL_NAMES = [
  'ask_user_question', 'modus_delegate', 'subagent', 'subagent_fork', 'send_message',
  'interrupt_agent', 'list_agents', 'workflow', 'ralph',
]
const visibleWorkerToolSchemas = () =>
  VISIBLE_WORKER_TOOL_NAMES.map(name => ({ name }))

function taskEvents(turn = 3) {
  return [
    { type: 'turn/start', data: { turn } },
    {
      type: 'user/message',
      data: {
        content: [{ type: 'text', text: 'optimize parser.js' }],
        source: { kind: 'user' },
      },
    },
    {
      type: 'user/message',
      data: {
        content: [{ type: 'text', text: 'workspace policy that must not be forwarded' }],
        source: { kind: 'agent-instructions', form: 'instructions', changes: [] },
      },
    },
    {
      type: 'user/message',
      data: {
        content: [{ type: 'text', text: 'preserve the public API' }],
        source: { kind: 'user' },
      },
    },
    {
      type: 'assistant/message',
      data: {
        turn,
        step: 1,
        message: { role: 'assistant', content: [], source: { kind: 'model' } },
        usage: {
          inputTokens: 100,
          outputTokens: 10,
          cacheReadTokens: 20,
          cacheWriteTokens: 2,
        },
      },
    },
  ]
}

function decision(profile = 'p000') {
  return {
    profile,
    rationale: 'The requested change is concentrated in one named module.',
    evidence: ['The user named parser.js as the target.'],
    expected_advantage: 'token',
    abstain: false,
  }
}

function harness({ result, startError, localAgent } = {}) {
  const requests = []
  let disposals = 0
  const ctx = {
    tools: {
      schemas() {
        return visibleWorkerToolSchemas()
      },
    },
    subagents: {
      async start(provider, request) {
        requests.push({ provider, request })
        if (startError !== undefined) throw startError
        return {
          id: 'worker-1',
          localAgent,
          result: Promise.resolve(result ?? {
            stopReason: 'completed',
            output: [{ type: 'text', text: 'worker answer' }],
          }),
          async dispose() { disposals += 1 },
        }
      },
    },
  }
  return { ctx, requests, disposalCount: () => disposals }
}

test('profile catalog verifies the exact pinned snapshot', () => {
  const manifest = JSON.parse(readFileSync(
    new URL('../presets/modus/profiles/manifest.json', import.meta.url),
    'utf8',
  ))
  assert.equal(PROFILE_CATALOG.upstream.repository, 'qhy991/Modus')
  assert.equal(PROFILE_CATALOG.upstream.commit, '7661a5da146d6957de18f14a0e226684486d6bf6')
  assert.equal(
    PROFILE_CATALOG.upstream.component_source,
    'config/modus-edit-topology-component-source-v1.json',
  )
  assert.equal(
    PROFILE_CATALOG.upstream.component_source_sha256,
    '2169dac3bdedf2d1155c159e3215ada09f18282f6ba4aaa9e735c64d11417052',
  )
  assert.equal(
    PROFILE_CATALOG.profiles.p000.sha256,
    '4430eff8d5b732333319f93bf0a699c3593f6e6d708296d304c76c7161f67282',
  )
  assert.equal(
    PROFILE_CATALOG.profiles.p100.sha256,
    'ec850834450c09a0e6d736c606a8d2295b955206e00c0e7778f982809ca98bfe',
  )
  assert.equal(PROFILE_CATALOG.profiles.p000.sha256, manifest.profiles.p000.sha256)
  assert.equal(PROFILE_CATALOG.profiles.p100.sha256, manifest.profiles.p100.sha256)
  assert.equal(PROFILE_CATALOG.profiles.neutral.sha256, digest(''))
  const loaded = loadProfileCatalog()
  assert.equal(loaded.profiles.p100.text, PROFILE_CATALOG.profiles.p100.text)
  assert.equal(Object.isFrozen(loaded.profiles.neutral), true)
  assert.equal(Object.isFrozen(loaded.profiles.p000), true)
  assert.equal(Object.isFrozen(loaded.profiles.p100), true)
  assert.throws(() => { loaded.profiles.p000.text = 'tampered' }, TypeError)
})

test('configuration is bounded and fails closed on contradictory probe policy', () => {
  const config = resolveConfig({ basePersona: 'ordinary coder' })
  assert.deepEqual(config.routerAllowedTools, ['modus_delegate'])
  assert.equal(config.maxProbeCalls, 0)
  assert.equal(config.routerMaxOutputTokens, 4096)
  assert.ok(config.workerDeniedTools.includes('modus_delegate'))
  assert.ok(config.workerDeniedTools.includes('subagent_fork'))
  assert.equal(config.presetId, 'modus')
  assert.equal(config.preEditInformationGate, undefined)

  const behaviorGate = resolveConfig({
    basePersona: 'x',
    preEditInformationGate: { profiles: ['p000', 'p100'], maxAttempts: 3 },
  })
  assert.deepEqual(behaviorGate.preEditInformationGate.profiles, ['p000', 'p100'])
  assert.equal(behaviorGate.preEditInformationGate.maxAttempts, 3)

  assert.throws(() => resolveConfig({}), /basePersona/)
  assert.throws(
    () => resolveConfig({ basePersona: 'x', routerProbeTools: ['read'], maxProbeCalls: 0 }),
    /must be positive/,
  )
  assert.throws(
    () => resolveConfig({ basePersona: 'x', routerProbeTools: [], maxProbeCalls: 1 }),
    /must be 0/,
  )
  assert.throws(
    () => resolveConfig({
      basePersona: 'x',
      provider: 'remote',
      routeTokenBudget: { maxNewTokens: 1, maxCacheReadTokens: 1 },
    }),
    /in-process fork/,
  )
  assert.throws(
    () => resolveConfig({
      basePersona: 'x',
      preEditInformationGate: { profiles: ['neutral'], maxAttempts: 3 },
    }),
    /qualified profiles/,
  )
  assert.throws(
    () => resolveConfig({
      basePersona: 'x',
      provider: 'remote',
      preEditInformationGate: { profiles: ['p000'], maxAttempts: 3 },
    }),
    /in-process fork/,
  )
})

test('one route binds the host-derived input digest before starting a fixed-profile worker', async () => {
  const workerAgent = {
    session: {
      header: { seedLength: 2 },
      events: [
        {
          seq: 0,
          type: 'assistant/message',
          data: {
            turn: 1,
            step: 1,
            message: { role: 'assistant', content: [], source: { kind: 'model' } },
            usage: { inputTokens: 999, outputTokens: 999 },
          },
        },
        { seq: 1, type: 'session/seed-boundary', data: {} },
        {
          seq: 2,
          type: 'assistant/message',
          data: {
            turn: 2,
            step: 1,
            message: { role: 'assistant', content: [], source: { kind: 'model' } },
            usage: {
              inputTokens: 200,
              outputTokens: 30,
              cacheReadTokens: 40,
              cacheWriteTokens: 3,
            },
          },
        },
      ],
    },
  }
  const runtime = harness({ localAgent: workerAgent })
  const config = resolveConfig({ basePersona: 'ordinary coder' })
  const parent = { session: { header: {}, events: taskEvents() } }
  const states = new WeakMap([[parent, { turns: new Map() }]])
  const tool = createModusDelegateTool(runtime.ctx, config, states)
  let concluded = 0
  const exec = {
    agent: parent,
    signal: new AbortController().signal,
    concludeTurn() { concluded += 1 },
  }

  const value = await tool.execute(decision(), exec)
  assert.equal(runtime.requests.length, 1)
  const request = runtime.requests[0]
  assert.equal(request.provider, 'fork')
  assert.equal(request.request.parent, parent)
  assert.equal(request.request.maxDepth, 1)
  assert.deepEqual(request.request.toolFilter, { deny: config.workerDeniedTools })
  assert.match(request.request.label, /^Modus p000@[0-9a-f]{12}$/)
  assert.ok(request.request.persona.startsWith('ordinary coder\n\n'))
  assert.ok(request.request.persona.endsWith(PROFILE_CATALOG.profiles.p000.text))
  assert.deepEqual(request.request.prompt, [
    { type: 'text', text: 'optimize parser.js' },
    { type: 'text', text: '\n\n--- next input in this turn ---\n\n' },
    { type: 'text', text: 'preserve the public API' },
  ])
  assert.equal(value.input_digest, digest(JSON.stringify(request.request.prompt)))
  assert.equal(value.profile_digest, PROFILE_CATALOG.profiles.p000.sha256)
  assert.equal(value.worker_session_id, 'worker-1')
  assert.equal(value.stop_reason, 'completed')
  assert.equal(value.error, null)
  assert.deepEqual(value.token_usage.router, {
    uncached_input_tokens: 100,
    output_tokens: 10,
    cache_read_tokens: 20,
    cache_write_tokens: 2,
    total_tokens: 132,
    proposed_steps: 1,
    assistant_steps: 1,
    metered_steps: 1,
    compaction_steps: 0,
    metered_compaction_steps: 0,
    complete: true,
  })
  assert.equal(value.token_usage.worker.uncached_input_tokens, 200)
  assert.equal(value.token_usage.worker.total_tokens, 273)
  assert.equal(value.token_usage.total.total_tokens, 405)
  assert.equal(value.token_usage.total.complete, true)
  assert.equal(concluded, 1)
  assert.equal(runtime.disposalCount(), 1)
  assert.equal(tool.presentCall(decision()).kind, 'execute')
  assert.equal(tool.presentCall(null), undefined)
  assert.equal(tool.presentCall({}), undefined)

  await assert.rejects(() => tool.execute(decision('p100'), exec), /already has a route decision/)
  assert.equal(runtime.requests.length, 1)
})

test('neutral is a true no-profile action and abstention cannot select a profile', async () => {
  const runtime = harness()
  const config = resolveConfig({ basePersona: 'ordinary coder' })
  const parent = { session: { header: {}, events: taskEvents(1) } }
  const states = new WeakMap([[parent, { turns: new Map() }]])
  const tool = createModusDelegateTool(runtime.ctx, config, states)
  const args = {
    ...decision('neutral'),
    rationale: 'The request does not expose enough topology evidence.',
    abstain: true,
  }
  await tool.execute(args, {
    agent: parent,
    signal: new AbortController().signal,
    concludeTurn() {},
  })
  assert.equal(runtime.requests[0].request.persona, 'ordinary coder')
  assert.equal(PROFILE_CATALOG.profiles.neutral.text, '')

  const otherParent = { session: { header: {}, events: taskEvents(2) } }
  const otherStates = new WeakMap([[otherParent, { turns: new Map() }]])
  const otherTool = createModusDelegateTool(runtime.ctx, config, otherStates)
  await assert.rejects(
    () => otherTool.execute(
      { ...decision('p100'), abstain: true },
      { agent: otherParent, signal: new AbortController().signal, concludeTurn() {} },
    ),
    /abstaining route must select neutral/,
  )
})

test('Router usage at the limit blocks Worker creation before provider start', async () => {
  const runtime = harness()
  const config = resolveConfig({
    basePersona: 'ordinary coder',
    routeTokenBudget: { maxNewTokens: 110, maxCacheReadTokens: 1_000 },
  })
  const parent = { session: { header: { id: 'root' }, events: taskEvents(1) } }
  const states = new WeakMap([[parent, { turns: new Map() }]])
  const tool = createModusDelegateTool(runtime.ctx, config, states)
  const value = await tool.execute(decision(), {
    agent: parent,
    signal: new AbortController().signal,
    concludeTurn() {},
  })
  assert.equal(runtime.requests.length, 0)
  assert.equal(value.stop_reason, 'budget-blocked')
  assert.equal(value.worker_session_id, null)
  assert.equal(value.token_usage.worker.total_tokens, 0)
  assert.equal(value.trajectory, null)
  assert.equal(value.budget.state, 'limit-reached')
  assert.equal(value.budget.locally_enforced, true)
})

test('worker infrastructure failure is recorded once and never redispatched', async () => {
  const runtime = harness({ startError: new Error('provider unavailable') })
  const config = resolveConfig({ basePersona: 'ordinary coder' })
  const parent = { session: { header: {}, events: taskEvents(8) } }
  const states = new WeakMap([[parent, { turns: new Map() }]])
  const tool = createModusDelegateTool(runtime.ctx, config, states)
  const exec = {
    agent: parent,
    signal: new AbortController().signal,
    concludeTurn() {},
  }
  const value = await tool.execute(decision(), exec)
  assert.equal(value.stop_reason, 'infrastructure-error')
  assert.equal(value.worker_session_id, null)
  assert.match(value.error, /provider unavailable/)
  await assert.rejects(() => tool.execute(decision(), exec), /already has a route decision/)
  assert.equal(runtime.requests.length, 1)
})

test('raw tool execution rejects undeclared decision fields before consuming the route', async () => {
  const runtime = harness()
  const config = resolveConfig({ basePersona: 'ordinary coder' })
  const parent = { session: { header: {}, events: taskEvents(9) } }
  const states = new WeakMap([[parent, { turns: new Map() }]])
  const tool = createModusDelegateTool(runtime.ctx, config, states)
  const exec = {
    agent: parent,
    signal: new AbortController().signal,
    concludeTurn() {},
  }
  await assert.rejects(
    () => tool.execute({ ...decision(), hidden_override: true }, exec),
    /route decision fields differ/,
  )
  assert.equal(runtime.requests.length, 0)
  await tool.execute(decision(), exec)
  assert.equal(runtime.requests.length, 1)
})

test('apply confines top-level Router capability, token budget, probes, and reminder', async () => {
  const handlers = new Map()
  let registered
  let pluginCleanup
  const provider = {
    name: 'fork',
    capabilities: { outputSchema: true, depthLimit: true, toolFilter: true, persona: true },
  }
  const ctx = {
    tools: {
      register(tool) { registered = tool },
      schemas() { return visibleWorkerToolSchemas() },
    },
    subagents: {
      getProvider() { return provider },
      async start() { throw new Error('not used') },
    },
    agents: { list() { return [] } },
    logger: { info() {} },
    effect(factory) { pluginCleanup = factory() },
    on(event, handler) { handlers.set(event, handler) },
  }
  apply(ctx, {
    basePersona: 'ordinary coder',
    routerProbeTools: ['read'],
    maxProbeCalls: 1,
    routerMaxOutputTokens: 321,
    maxRouteReminders: 1,
  })
  assert.equal(registered.name, 'modus_delegate')

  const restrictions = []
  const steering = []
  const agent = {
    session: { header: {}, events: taskEvents(5) },
    ctx: { tools: { restrict(value) { restrictions.push(value); return () => restrictions.push('lifted') } } },
    steer(message) { steering.push(message) },
  }
  handlers.get('agent/session-start')({ agent })
  assert.deepEqual(restrictions, [{ allow: ['modus_delegate', 'read'] }])

  const request = await handlers.get('agent/request')(
    { agent },
    async () => ({ provider: 'test', maxTokens: 9999 }),
  )
  assert.equal(request.maxTokens, 321)

  const allowed = await handlers.get('tools/pre-execute')(
    { agent, name: 'read' },
    async () => ({ kind: 'allow' }),
  )
  assert.deepEqual(allowed, { kind: 'allow' })
  const denied = await handlers.get('tools/pre-execute')(
    { agent, name: 'read' },
    async () => ({ kind: 'allow' }),
  )
  assert.equal(denied.kind, 'deny')

  handlers.get('agent/turn-stopping')({ agent, turn: 5 })
  assert.throws(
    () => handlers.get('agent/turn-stopping')({ agent, turn: 5 }),
    /MODUS_ROUTE_REQUIRED/,
  )
  assert.equal(steering.length, 1)
  assert.equal(steering[0].source.plugin, 'dsh-modus-router')

  const childRestrictions = []
  const child = {
    session: { header: { origin: 'subagent' }, events: [] },
    ctx: { tools: { restrict(value) { childRestrictions.push(value) } } },
  }
  handlers.get('agent/session-start')({ agent: child })
  assert.deepEqual(childRestrictions, [])
  pluginCleanup()
  assert.equal(restrictions.at(-1), 'lifted')
})

test('apply snapshots the preset-visible Worker deny-list before Router confinement', async () => {
  let registered
  let restricted = false
  let request
  const agent = {
    id: 'scoped-router',
    session: {
      header: { id: 'scoped-router', agentPreset: 'modus' },
      events: taskEvents(6),
    },
    ctx: {
      tools: {
        restrict() {
          restricted = true
          return () => { restricted = false }
        },
      },
    },
    steer() {},
  }
  const ctx = {
    tools: {
      register(tool) { registered = tool },
      schemas(scope) {
        assert.equal(scope, agent)
        return restricted ? [{ name: 'modus_delegate' }] : visibleWorkerToolSchemas()
      },
    },
    subagents: {
      getProvider() {
        return {
          name: 'fork',
          capabilities: {
            outputSchema: true, depthLimit: true, toolFilter: true, persona: true,
          },
        }
      },
      async start(_provider, value) {
        request = value
        return {
          id: 'scoped-worker',
          result: Promise.resolve({
            stopReason: 'completed',
            output: [{ type: 'text', text: 'done' }],
          }),
          async dispose() {},
        }
      },
    },
    agents: { list() { return [] } },
    logger: { info() {} },
    effect() {},
    on(event, handler) {
      if (event === 'agent/session-start') this.sessionStart = handler
    },
  }
  apply(ctx, { basePersona: 'ordinary coder' })
  ctx.sessionStart({ agent })
  assert.equal(restricted, true)
  await registered.execute(decision(), {
    agent,
    signal: new AbortController().signal,
    concludeTurn() {},
  })
  assert.deepEqual(request.toolFilter, { deny: VISIBLE_WORKER_TOOL_NAMES })
})

test('local Worker request admission enforces a shared Router plus Worker budget', async () => {
  const handlers = new Map()
  const provider = {
    name: 'fork',
    capabilities: { outputSchema: true, depthLimit: true, toolFilter: true, persona: true },
  }
  const ctx = {
    tools: { register() {}, schemas() { return visibleWorkerToolSchemas() } },
    subagents: { getProvider() { return provider } },
    agents: { list() { return [] } },
    logger: { info() {} },
    effect() {},
    on(event, handler) { handlers.set(event, handler) },
  }
  apply(ctx, {
    basePersona: 'ordinary coder',
    routeTokenBudget: { maxNewTokens: 20, maxCacheReadTokens: 100 },
  })
  const parent = {
    id: 'root',
    session: {
      header: { id: 'root', agentPreset: 'modus' },
      events: [
        { type: 'turn/start', data: { turn: 1 } },
        {
          type: 'assistant/message',
          data: {
            turn: 1,
            step: 1,
            usage: { inputTokens: 10, outputTokens: 1, cacheReadTokens: 2 },
          },
        },
      ],
    },
    ctx: { tools: { restrict() { return () => {} } } },
  }
  handlers.get('agent/session-start')({ agent: parent })

  const worker = {
    id: 'worker',
    session: {
      header: {
        id: 'worker',
        agentPreset: 'modus',
        origin: 'subagent',
        parentSession: 'root',
      },
      events: [],
    },
  }
  handlers.get('agent/session-start')({ agent: worker })
  let calls = 0
  const first = await handlers.get('agent/request')({ agent: worker }, async () => {
    calls += 1
    return { provider: 'test', model: 'test' }
  })
  assert.equal(first.model, 'test')
  worker.session.events.push({
    type: 'assistant/message',
    data: { turn: 1, step: 1, usage: { inputTokens: 8, outputTokens: 1 } },
  })
  await assert.rejects(
    () => handlers.get('agent/request')({ agent: worker }, async () => {
      calls += 1
      return { provider: 'test', model: 'test' }
    }),
    /MODUS_TOKEN_BUDGET_EXHAUSTED/,
  )
  assert.equal(calls, 1)

  const compacted = {
    id: 'worker-compacted',
    session: {
      header: {
        id: 'worker-compacted',
        agentPreset: 'modus',
        origin: 'subagent',
        parentSession: 'root',
      },
      events: [
        {
          seq: 0,
          type: 'compaction/start',
          data: { compactionId: 'compact-before-step', turn: 1 },
        },
        {
          seq: 1,
          type: 'compaction/summary',
          data: {
            compactionId: 'compact-before-step',
            usage: { inputTokens: 8, outputTokens: 1 },
          },
        },
      ],
    },
  }
  handlers.get('agent/session-start')({ agent: compacted })
  let downstreamPreStep = 0
  await assert.rejects(
    () => handlers.get('agent/pre-step')({ agent: compacted }, async () => {
      downstreamPreStep += 1
      return { kind: 'enter', messages: [] }
    }),
    /MODUS_TOKEN_BUDGET_EXHAUSTED/,
  )
  assert.equal(downstreamPreStep, 0)

  const incomplete = {
    id: 'worker-incomplete',
    session: {
      header: {
        id: 'worker-incomplete',
        agentPreset: 'modus',
        origin: 'subagent',
        parentSession: 'root',
      },
      events: [{ type: 'assistant/message', data: { turn: 1, step: 1 } }],
    },
  }
  handlers.get('agent/session-start')({ agent: incomplete })
  await assert.rejects(
    () => handlers.get('agent/request')(
      { agent: incomplete },
      async () => ({ provider: 'test', model: 'test' }),
    ),
    /MODUS_TOKEN_USAGE_INCOMPLETE/,
  )
})

test('reload reconstructs a durable route and unload lifts its restriction', async () => {
  let registered
  let pluginCleanup
  let restrictions = 0
  let lifts = 0
  const events = [
    ...taskEvents(12),
    {
      type: 'tool/call',
      data: {
        turn: 12,
        step: 1,
        callId: 'route-1',
        name: 'modus_delegate',
        arguments: JSON.stringify(decision()),
      },
    },
  ]
  const agent = {
    session: { header: { agentPreset: 'modus' }, events },
    ctx: { tools: { restrict() { restrictions += 1; return () => { lifts += 1 } } } },
    steer() {},
  }
  const provider = {
    name: 'fork',
    capabilities: { outputSchema: true, depthLimit: true, toolFilter: true, persona: true },
  }
  const ctx = {
    tools: {
      register(tool) { registered = tool },
      schemas() { return visibleWorkerToolSchemas() },
    },
    subagents: {
      getProvider() { return provider },
      async start() { throw new Error('must not redispatch') },
    },
    agents: { list() { return [agent] } },
    logger: { info() {} },
    effect(factory) { pluginCleanup = factory() },
    on() {},
  }
  apply(ctx, { basePersona: 'ordinary coder' })
  assert.equal(restrictions, 1)
  await assert.rejects(
    () => registered.execute(decision(), {
      agent,
      signal: new AbortController().signal,
      concludeTurn() {},
    }),
    /already has a route decision/,
  )
  pluginCleanup()
  assert.equal(lifts, 1)
})

test('reload reconstructs a live Worker budget from parent and fork-suffix logs', async () => {
  const handlers = new Map()
  const parent = {
    id: 'budget-root',
    session: {
      header: { id: 'budget-root', agentPreset: 'modus' },
      events: [
        { type: 'turn/start', data: { turn: 1 } },
        {
          type: 'assistant/message',
          data: { turn: 1, step: 1, usage: { inputTokens: 4, outputTokens: 1 } },
        },
      ],
    },
    ctx: { tools: { restrict() { return () => {} } } },
  }
  const worker = {
    id: 'budget-worker',
    session: {
      header: {
        id: 'budget-worker',
        agentPreset: 'modus',
        origin: 'subagent',
        parentSession: 'budget-root',
        seedLength: 1,
      },
      events: [
        {
          seq: 0,
          type: 'assistant/message',
          data: { turn: 8, step: 1, usage: { inputTokens: 1_000, outputTokens: 1_000 } },
        },
        {
          seq: 1,
          type: 'assistant/message',
          data: { turn: 1, step: 1, usage: { inputTokens: 4, outputTokens: 1 } },
        },
      ],
    },
  }
  const provider = {
    name: 'fork',
    capabilities: { outputSchema: true, depthLimit: true, toolFilter: true, persona: true },
  }
  const ctx = {
    tools: { register() {}, schemas() { return visibleWorkerToolSchemas() } },
    subagents: { getProvider() { return provider } },
    // Deliberately child-first: apply() must use a two-pass reconstruction.
    agents: { list() { return [worker, parent] } },
    logger: { info() {} },
    effect() {},
    on(event, handler) { handlers.set(event, handler) },
  }
  apply(ctx, {
    basePersona: 'ordinary coder',
    routeTokenBudget: { maxNewTokens: 10, maxCacheReadTokens: 100 },
  })
  let calls = 0
  await assert.rejects(
    () => handlers.get('agent/request')({ agent: worker }, async () => {
      calls += 1
      return { provider: 'test', model: 'test' }
    }),
    /MODUS_TOKEN_BUDGET_EXHAUSTED/,
  )
  assert.equal(calls, 0)
})

test('reload reconstructs the qualified-profile pre-edit information gate', async () => {
  const handlers = new Map()
  const workerRestrictions = []
  let workerLifts = 0
  const parent = {
    id: 'behavior-root',
    session: {
      header: { id: 'behavior-root', agentPreset: 'modus' },
      events: taskEvents(1),
    },
    ctx: { tools: { restrict() { return () => {} } } },
  }
  const worker = {
    id: 'behavior-worker',
    session: {
      header: {
        id: 'behavior-worker',
        agentPreset: 'modus',
        origin: 'subagent',
        parentSession: 'behavior-root',
        cwd: '/workspace',
      },
      events: [
        {
          seq: 0,
          type: 'subagent/descriptor',
          data: {
            version: 2,
            mode: 'one-shot',
            provider: 'fork',
            label: `Modus p000@${PROFILE_CATALOG.profiles.p000.sha256.slice(0, 12)}`,
          },
        },
        nativeCall(1, 'read-a', 'read', { file_path: 'src/a.ts' }),
        nativeResult(2, 'read-a'),
        nativeCall(3, 'read-b', 'grep', { pattern: 'x', path: 'src' }),
        nativeResult(4, 'read-b'),
        nativeCall(5, 'read-c', 'bash', { command: 'rg y src' }),
        nativeResult(6, 'read-c'),
      ],
    },
    ctx: {
      tools: {
        restrict(value) {
          workerRestrictions.push(value)
          return () => { workerLifts += 1 }
        },
      },
    },
  }
  const provider = {
    name: 'fork',
    capabilities: { outputSchema: true, depthLimit: true, toolFilter: true, persona: true },
  }
  const ctx = {
    tools: {
      register() {},
      schemas() {
        return [...visibleWorkerToolSchemas(), { name: 'read' }, { name: 'edit' }]
      },
    },
    subagents: { getProvider() { return provider } },
    agents: { list() { return [worker, parent] } },
    logger: { info() {} },
    effect() {},
    on(event, handler) { handlers.set(event, handler) },
  }
  apply(ctx, {
    basePersona: 'ordinary coder',
    preEditInformationGate: { profiles: ['p000', 'p100'], maxAttempts: 3 },
  })
  const signal = new AbortController().signal
  const denied = await handlers.get('tools/pre-execute')({
    agent: worker,
    callId: 'read-d',
    name: 'read',
    arguments: { file_path: 'src/d.ts' },
    signal,
  }, async () => ({ kind: 'allow' }))
  assert.equal(denied.kind, 'deny')
  assert.match(denied.reason, /MODUS_PRE_EDIT_INFORMATION_LIMIT/)
  assert.deepEqual(workerRestrictions, [{ deny: ['read'] }])

  worker.session.events.push(
    nativeCall(7, 'edit-a', 'edit', { file_path: 'src/a.ts' }),
    nativeResult(8, 'edit-a'),
  )
  const allowed = await handlers.get('tools/pre-execute')({
    agent: worker,
    callId: 'read-after-edit',
    name: 'read',
    arguments: { file_path: 'src/d.ts' },
    signal,
  }, async () => ({ kind: 'allow' }))
  assert.deepEqual(allowed, { kind: 'allow' })
  assert.equal(workerLifts, 1)
})

test('qualified behavior enforcement fails closed when HMR cannot bind a Worker descriptor', async () => {
  const handlers = new Map()
  const parent = {
    id: 'unbound-root',
    session: {
      header: { id: 'unbound-root', agentPreset: 'modus' },
      events: taskEvents(1),
    },
    ctx: { tools: { restrict() { return () => {} } } },
  }
  const worker = {
    id: 'unbound-worker',
    session: {
      header: {
        id: 'unbound-worker', agentPreset: 'modus', origin: 'subagent',
        parentSession: 'unbound-root', cwd: '/workspace',
      },
      events: [],
    },
  }
  const provider = {
    name: 'fork',
    capabilities: { outputSchema: true, depthLimit: true, toolFilter: true, persona: true },
  }
  const ctx = {
    tools: { register() {}, schemas() { return visibleWorkerToolSchemas() } },
    subagents: { getProvider() { return provider } },
    agents: { list() { return [parent, worker] } },
    logger: { info() {} },
    effect() {},
    on(event, handler) { handlers.set(event, handler) },
  }
  apply(ctx, {
    basePersona: 'ordinary coder',
    preEditInformationGate: { profiles: ['p000', 'p100'], maxAttempts: 3 },
  })
  await assert.rejects(
    () => handlers.get('agent/request')(
      { agent: worker, turn: 1, step: 1 },
      async () => ({ provider: 'test', model: 'test' }),
    ),
    /MODUS_PROFILE_BEHAVIOR_UNBOUND/,
  )
})

test('replay consumes every native and Code Mode route start regardless of final outcome', () => {
  const config = resolveConfig({
    basePersona: 'ordinary coder',
    routerProbeTools: ['read'],
    maxProbeCalls: 3,
  })
  const result = (turn, callId, isError, code) => ({
    type: 'tool/result',
    data: {
      turn,
      step: 1,
      message: {
        source: { kind: 'tool', callId },
        content: [{
          type: 'tool-result',
          toolCallId: callId,
          isError,
          content: [],
        }],
      },
      ...(code === undefined ? {} : { error: { name: 'RecoveredError', code } }),
    },
  })
  const agent = {
    session: {
      events: [
        { type: 'turn/start', data: { turn: 1 } },
        { type: 'tool/call', data: { turn: 1, step: 1, callId: 'n-fail', name: 'modus_delegate', arguments: '{}' } },
        result(1, 'n-fail', true),
        { type: 'tool/call', data: { turn: 1, step: 1, callId: 'probe', name: 'read', arguments: '{}' } },
        result(1, 'probe', false),
        { type: 'turn/end', data: { turn: 1 } },
        { type: 'turn/start', data: { turn: 2 } },
        { type: 'tool/call', data: { turn: 2, step: 1, callId: 'n-ok', name: 'modus_delegate', arguments: '{}' } },
        result(2, 'n-ok', false),
        { type: 'turn/end', data: { turn: 2 } },
        { type: 'turn/start', data: { turn: 3 } },
        { type: 'tool/call', data: { turn: 3, step: 1, callId: 'n-unknown', name: 'modus_delegate', arguments: '{}' } },
        result(3, 'n-unknown', true, 'TOOL_OUTCOME_UNKNOWN'),
        { type: 'turn/end', data: { turn: 3 } },
        { type: 'turn/start', data: { turn: 4 } },
        { type: 'tool/code-dispatch-start', data: { subCallId: 'c-fail', name: 'modus_delegate' } },
        { type: 'tool/code-dispatch', data: { subCallId: 'c-fail', name: 'modus_delegate', isError: true } },
        { type: 'tool/code-dispatch-start', data: { subCallId: 'c-probe', name: 'read' } },
        { type: 'tool/code-dispatch', data: { subCallId: 'c-probe', name: 'read', isError: false } },
        { type: 'turn/end', data: { turn: 4 } },
        { type: 'turn/start', data: { turn: 5 } },
        { type: 'tool/code-dispatch-start', data: { subCallId: 'c-ok', name: 'modus_delegate' } },
        { type: 'tool/code-dispatch', data: { subCallId: 'c-ok', name: 'modus_delegate', isError: false } },
        { type: 'turn/end', data: { turn: 5 } },
        { type: 'turn/start', data: { turn: 6 } },
        { type: 'tool/code-dispatch-start', data: { subCallId: 'c-pending', name: 'modus_delegate' } },
      ],
    },
    inbox: {
      nextStep: [{ source: { kind: 'plugin', plugin: 'dsh-modus-router' } }],
    },
  }
  const turns = reconstructRouterTurns(agent, config)
  assert.equal(turns.get(1).routed, true)
  assert.equal(turns.get(1).probes, 1)
  assert.equal(turns.get(2).routed, true)
  assert.equal(turns.get(3).routed, true)
  assert.equal(turns.get(4).routed, true)
  assert.equal(turns.get(4).probes, 1)
  assert.equal(turns.get(5).routed, true)
  assert.equal(turns.get(6).routed, true)
  assert.equal(turns.get(6).reminders, 1)
})

test('provider capability mismatch fails at plugin load', () => {
  const ctx = {
    tools: { register() { throw new Error('must not register') } },
    subagents: {
      getProvider() {
        return {
          name: 'fork',
          capabilities: {
            outputSchema: true,
            depthLimit: true,
            toolFilter: false,
            persona: true,
          },
        }
      },
    },
    agents: { list() { return [] } },
    logger: { info() {} },
    effect() {},
    on() {},
  }
  assert.throws(() => apply(ctx, { basePersona: 'ordinary coder' }), /toolFilter/)
})

test('token fold uses finalized messages, excludes fork seed usage, and reports proposed steps', () => {
  const events = [
    {
      seq: 0,
      type: 'assistant/message',
      data: { turn: 1, step: 1, usage: { inputTokens: 500, outputTokens: 50 } },
    },
    {
      seq: 1,
      type: 'assistant/chunk',
      data: {
        turn: 2,
        step: 1,
        chunk: {
          type: 'usage',
          usage: { inputTokens: 10, outputTokens: 1, cacheReadTokens: 2 },
        },
      },
    },
    {
      seq: 2,
      type: 'assistant/message',
      data: {
        turn: 2,
        step: 1,
        usage: {
          inputTokens: 12,
          outputTokens: 3,
          cacheReadTokens: 4,
          cacheWriteTokens: 1,
        },
      },
    },
    {
      seq: 3,
      type: 'assistant/message',
      data: { turn: 2, step: 2, usage: { inputTokens: 5, outputTokens: 2 } },
    },
  ]
  const folded = foldTokenUsage(events, { minSeq: 1 })
  assert.deepEqual(folded, {
    uncached_input_tokens: 17,
    output_tokens: 5,
    cache_read_tokens: 4,
    cache_write_tokens: 1,
    total_tokens: 27,
    proposed_steps: 2,
    assistant_steps: 2,
    metered_steps: 2,
    compaction_steps: 0,
    metered_compaction_steps: 0,
    complete: true,
  })
  const worker = foldWorkerTokenUsage({
    session: { header: { seedLength: 1 }, events },
  })
  assert.deepEqual(worker, folded)
  assert.equal(sumTokenUsage(folded, null).complete, false)
})

test('finalized usage is fail-closed when only a streaming sample exists', () => {
  const folded = foldTokenUsage([
    { seq: 0, type: 'step/start', data: { turn: 1, step: 1 } },
    {
      seq: 1,
      type: 'assistant/chunk',
      data: {
        turn: 1,
        step: 1,
        chunk: { type: 'usage', usage: { inputTokens: 100, outputTokens: 10 } },
      },
    },
    { seq: 2, type: 'assistant/message', data: { turn: 1, step: 1 } },
  ])
  assert.equal(folded.proposed_steps, 1)
  assert.equal(folded.assistant_steps, 1)
  assert.equal(folded.metered_steps, 0)
  assert.equal(folded.total_tokens, 0)
  assert.equal(folded.complete, false)
})

test('a started provider step without a finalized assistant message fails closed', () => {
  const events = [
    { seq: 0, type: 'step/start', data: { turn: 1, step: 1 } },
    {
      seq: 1,
      type: 'assistant/chunk',
      data: {
        turn: 1,
        step: 1,
        chunk: { type: 'usage', usage: { inputTokens: 100, outputTokens: 10 } },
      },
    },
  ]
  const folded = foldTokenUsage(events)
  assert.equal(folded.proposed_steps, 1)
  assert.equal(folded.assistant_steps, 0)
  assert.equal(folded.metered_steps, 0)
  assert.equal(folded.total_tokens, 0)
  assert.equal(folded.complete, false)
  const atAdmissionBoundary = foldTokenUsage(events, {
    openStep: { turn: 1, step: 1 },
  })
  assert.equal(atAdmissionBoundary.complete, true)
  assert.throws(
    () => foldTokenUsage(events, { openStep: { turn: 0, step: 1 } }),
    /openStep/,
  )
})

test('a Modus budget-blocked step is model-free and does not poison final usage', () => {
  const folded = foldTokenUsage([
    { seq: 0, type: 'turn/start', data: { turn: 1 } },
    { seq: 1, type: 'step/start', data: { turn: 1, step: 1 } },
    { seq: 2, type: 'step/end', data: { turn: 1, step: 1 } },
    {
      seq: 3,
      type: 'turn/end',
      data: {
        turn: 1,
        reason: {
          kind: 'error',
          error: { message: 'MODUS_TOKEN_BUDGET_EXHAUSTED: stopped before request' },
        },
      },
    },
  ])
  assert.equal(folded.proposed_steps, 1)
  assert.equal(folded.assistant_steps, 0)
  assert.equal(folded.total_tokens, 0)
  assert.equal(folded.complete, true)
})

test('duplicate finalized usage for one step fails closed instead of choosing a sample', () => {
  const folded = foldTokenUsage([
    {
      seq: 0,
      type: 'assistant/message',
      data: { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 2 } },
    },
    {
      seq: 1,
      type: 'assistant/message',
      data: { turn: 1, step: 1, usage: { inputTokens: 11, outputTokens: 3 } },
    },
  ])
  assert.equal(folded.assistant_steps, 1)
  assert.equal(folded.metered_steps, 1)
  assert.equal(folded.complete, false)
})

test('model-free surface replacements do not double-count token or tool evidence', () => {
  const originalMessage = {
    seq: 0,
    type: 'assistant/message',
    surfaceOp: 'append',
    data: { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 2 } },
  }
  const replacementMessage = {
    seq: 1,
    type: 'assistant/message',
    surfaceOp: { op: 'replace', start: 0, end: 0 },
    sourceEventSeqs: [0],
    data: { turn: 1, step: 1 },
  }
  const usage = foldTokenUsage([originalMessage, replacementMessage])
  assert.equal(usage.total_tokens, 12)
  assert.equal(usage.assistant_steps, 1)
  assert.equal(usage.complete, true)

  const call = nativeCall(2, 'read-once', 'read', { file_path: 'src/a.ts' })
  const originalResult = { ...nativeResult(3, 'read-once'), surfaceOp: 'append' }
  const replacementResult = {
    ...nativeResult(4, 'read-once'),
    surfaceOp: { op: 'replace', start: 3, end: 3 },
    sourceEventSeqs: [3],
  }
  const trajectory = foldBehaviorTrajectory(
    [call, originalResult, replacementResult],
    { cwd: '/workspace' },
  )
  assert.equal(trajectory.structurally_complete, true)
  assert.equal(trajectory.concrete_read_attempts, 1)
})

test('finalized compaction usage is charged once and attributed to its owning turn', () => {
  const events = [
    {
      seq: 0,
      type: 'compaction/start',
      data: { compactionId: 'compact-1', turn: 2 },
    },
    {
      seq: 1,
      type: 'compaction/summary',
      data: {
        compactionId: 'compact-1',
        usage: {
          inputTokens: 100,
          outputTokens: 20,
          cacheReadTokens: 30,
          cacheWriteTokens: 4,
        },
      },
    },
  ]
  const owner = foldTokenUsage(events, { turn: 2 })
  assert.equal(owner.total_tokens, 154)
  assert.equal(owner.compaction_steps, 1)
  assert.equal(owner.metered_compaction_steps, 1)
  assert.equal(owner.complete, true)

  const otherTurn = foldTokenUsage(events, { turn: 1 })
  assert.equal(otherTurn.total_tokens, 0)
  assert.equal(otherTurn.compaction_steps, 0)
  assert.equal(otherTurn.complete, true)

  const missingUsage = foldTokenUsage([
    events[0],
    { ...events[1], data: { compactionId: 'compact-1' } },
  ], { turn: 2 })
  assert.equal(missingUsage.compaction_steps, 1)
  assert.equal(missingUsage.metered_compaction_steps, 0)
  assert.equal(missingUsage.complete, false)

  const failedBeforeSummary = foldTokenUsage([
    events[0],
    {
      seq: 1,
      type: 'compaction/end',
      data: { compactionId: 'compact-1', turn: 2, error: 'provider failed' },
    },
  ], { turn: 2 })
  assert.equal(failedBeforeSummary.compaction_steps, 1)
  assert.equal(failedBeforeSummary.metered_compaction_steps, 0)
  assert.equal(failedBeforeSummary.complete, false)
})

test('Worker token fold excludes inherited compaction and charges only the live suffix', () => {
  const events = [
    {
      seq: 0,
      type: 'compaction/start',
      data: { compactionId: 'seed-compaction', turn: 1 },
    },
    {
      seq: 1,
      type: 'compaction/summary',
      data: {
        compactionId: 'seed-compaction',
        usage: { inputTokens: 1_000, outputTokens: 100 },
      },
    },
    {
      seq: 2,
      type: 'compaction/start',
      data: { compactionId: 'worker-compaction', turn: 2 },
    },
    {
      seq: 3,
      type: 'compaction/summary',
      data: {
        compactionId: 'worker-compaction',
        usage: { inputTokens: 7, outputTokens: 2 },
      },
    },
  ]
  const folded = foldWorkerTokenUsage({
    session: { header: { seedLength: 2 }, events },
  })
  assert.equal(folded.total_tokens, 9)
  assert.equal(folded.compaction_steps, 1)
  assert.equal(folded.complete, true)
})

test('token arithmetic overflow remains representable and fails closed', () => {
  const folded = foldTokenUsage([
    {
      type: 'assistant/message',
      data: {
        turn: 1,
        step: 1,
        usage: { inputTokens: Number.MAX_SAFE_INTEGER, outputTokens: 0 },
      },
    },
    {
      type: 'assistant/message',
      data: { turn: 1, step: 2, usage: { inputTokens: 1, outputTokens: 0 } },
    },
  ])
  assert.equal(Number.isSafeInteger(folded.total_tokens), true)
  assert.equal(folded.complete, false)
})

function nativeCall(seq, callId, name, args, turn = 1, step = 1) {
  return {
    seq,
    type: 'tool/call',
    data: { turn, step, callId, name, arguments: JSON.stringify(args) },
  }
}

function nativeResult(seq, callId, turn = 1, step = 1, isError = false) {
  return {
    seq,
    type: 'tool/result',
    data: {
      turn,
      step,
      message: {
        source: { kind: 'tool', callId },
        content: [{ type: 'tool-result', toolCallId: callId, isError, content: [] }],
      },
    },
  }
}

test('behavior trajectory keeps a strict pre-edit boundary and old edit/evaluate cycle semantics', () => {
  const events = [
    { seq: 0, type: 'step/start', data: { turn: 1, step: 1 } },
    {
      seq: 1,
      type: 'assistant/message',
      data: { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 1 } },
    },
    nativeCall(2, 'read-before', 'read', { file_path: 'src/a.ts' }),
    nativeResult(3, 'read-before'),
    nativeCall(4, 'search-before', 'grep', { pattern: 'x' }),
    nativeResult(5, 'search-before'),
    nativeCall(6, 'inspect-before', 'bash', { command: 'rg x src' }),
    nativeResult(7, 'inspect-before'),
    nativeCall(8, 'edit-a', 'write', { file_path: 'src/a.ts', content: 'x' }),
    nativeResult(9, 'edit-a'),
    nativeCall(10, 'read-after', 'read', { file_path: 'src/after.ts' }),
    nativeResult(11, 'read-after'),
    nativeCall(12, 'eval-a', 'bash', { command: 'python -m pytest -q' }),
    nativeResult(13, 'eval-a'),
    nativeCall(14, 'edit-b', 'edit', { file_path: 'src/b.ts' }),
    nativeResult(15, 'edit-b'),
    nativeCall(16, 'not-eval', 'bash', { command: 'echo pytest' }),
    nativeResult(17, 'not-eval'),
    nativeCall(18, 'eval-b', 'bash', { command: 'npm test' }),
    nativeResult(19, 'eval-b'),
  ]
  const value = foldBehaviorTrajectory(events, { cwd: '/workspace' })
  assert.equal(value.structurally_complete, true)
  assert.deepEqual(value.first_typed_workspace_edit_attempt, {
    observed: true,
    seq: 8,
    turn: 1,
    step: 1,
    path: 'src/a.ts',
  })
  assert.equal(value.pre_edit_usage.total_tokens, 11)
  assert.equal(value.pre_edit_information_attempts, 3)
  assert.deepEqual(value.pre_edit_concrete_read_paths, ['src/a.ts'])
  assert.deepEqual(value.pre_edit_search_roots, ['.'])
  assert.ok(!value.pre_edit_concrete_read_paths.includes('src/after.ts'))
  assert.deepEqual(value.attempted_workspace_edit_paths, ['src/a.ts', 'src/b.ts'])
  assert.equal(value.evaluation_command_intents, 2)
  assert.equal(value.post_edit_evaluation_command_intents, 2)
  assert.equal(value.attempted_edit_evaluate_cycles, 2)
  assert.equal(value.attempted_evaluation_to_edit_switches, 1)
})

test('pre-edit information gate counts a pending call once and lifts after typed edit', () => {
  const threeReads = [
    nativeCall(0, 'read-a', 'read', { file_path: 'src/a.ts' }),
    nativeResult(1, 'read-a'),
    nativeCall(2, 'read-b', 'grep', { pattern: 'x', path: 'src' }),
    nativeResult(3, 'read-b'),
    nativeCall(4, 'read-c', 'bash', { command: 'rg y src' }),
    nativeResult(5, 'read-c'),
  ]
  const pending = {
    callId: 'read-d',
    name: 'read',
    arguments: { file_path: 'src/d.ts' },
  }
  const denied = evaluatePreEditInformationGate(threeReads, {
    cwd: '/workspace',
    maxAttempts: 3,
    pending,
  })
  assert.equal(denied.observed_attempts, 4)
  assert.equal(denied.pending_already_recorded, false)
  assert.equal(denied.next_tool_allowed, false)

  const withPendingStart = [...threeReads, nativeCall(6, 'read-d', 'read', {
    file_path: 'src/d.ts',
  })]
  const recorded = evaluatePreEditInformationGate(withPendingStart, {
    cwd: '/workspace',
    maxAttempts: 3,
    pending,
  })
  assert.equal(recorded.observed_attempts, 4)
  assert.equal(recorded.pending_already_recorded, true)
  assert.equal(recorded.next_tool_allowed, false)

  const afterEdit = [
    ...threeReads,
    nativeCall(6, 'edit-a', 'edit', { file_path: 'src/a.ts' }),
    nativeResult(7, 'edit-a'),
  ]
  const lifted = evaluatePreEditInformationGate(afterEdit, {
    cwd: '/workspace',
    maxAttempts: 3,
    pending,
  })
  assert.equal(lifted.first_edit_observed, true)
  assert.equal(lifted.next_tool_allowed, true)
})

test('Code Mode projects inner actions once and inherits outer turn coordinates', () => {
  const events = [
    nativeCall(0, 'outer', 'run_code', { code: '...' }, 4, 2),
    {
      seq: 1,
      type: 'tool/code-dispatch-start',
      data: {
        rootCallId: 'outer', parentCallId: 'outer', subCallId: 'outer:code:1',
        name: 'read', arguments: { file_path: 'src/a.ts' },
      },
    },
    {
      seq: 2,
      type: 'tool/code-dispatch',
      data: {
        rootCallId: 'outer', parentCallId: 'outer', subCallId: 'outer:code:1',
        name: 'read', arguments: { file_path: 'src/a.ts' }, isError: false, content: [],
      },
    },
    {
      seq: 3,
      type: 'tool/code-dispatch-start',
      data: {
        rootCallId: 'outer', parentCallId: 'outer', subCallId: 'outer:code:2',
        name: 'edit', arguments: { file_path: 'src/a.ts' },
      },
    },
    {
      seq: 4,
      type: 'tool/code-dispatch',
      data: {
        rootCallId: 'outer', parentCallId: 'outer', subCallId: 'outer:code:2',
        name: 'edit', arguments: { file_path: 'src/a.ts' }, isError: false, content: [],
      },
    },
    nativeResult(5, 'outer', 4, 2),
  ]
  const value = foldBehaviorTrajectory(events, { cwd: '/workspace' })
  assert.equal(value.structurally_complete, true)
  assert.equal(value.concrete_read_attempts, 1)
  assert.equal(value.workspace_edit_attempts, 1)
  assert.equal(value.unclassified_tool_calls.length, 0)
  assert.equal(value.first_typed_workspace_edit_attempt.turn, 4)
  assert.equal(value.first_typed_workspace_edit_attempt.step, 2)
})

test('failed native and Code settlements remain explicit behavior attempts, not workspace-state claims', () => {
  const events = [
    nativeCall(0, 'failed-read', 'read', { file_path: 'src/a.ts' }),
    nativeResult(1, 'failed-read', 1, 1, true),
    nativeCall(2, 'outer-failed-edit', 'run_code', { code: '...' }),
    {
      seq: 3,
      type: 'tool/code-dispatch-start',
      data: {
        rootCallId: 'outer-failed-edit', parentCallId: 'outer-failed-edit',
        subCallId: 'outer-failed-edit:code:1', name: 'edit',
        arguments: { file_path: 'src/a.ts' },
      },
    },
    {
      seq: 4,
      type: 'tool/code-dispatch',
      data: {
        rootCallId: 'outer-failed-edit', parentCallId: 'outer-failed-edit',
        subCallId: 'outer-failed-edit:code:1', name: 'edit',
        arguments: { file_path: 'src/a.ts' }, isError: true, content: [],
      },
    },
    nativeResult(5, 'outer-failed-edit'),
  ]
  const value = foldBehaviorTrajectory(events, { cwd: '/workspace' })
  assert.equal(value.structurally_complete, true)
  assert.deepEqual(value.failed_tool_calls, [
    { name: 'edit', count: 1 },
    { name: 'read', count: 1 },
  ])
  assert.equal(value.concrete_read_attempts, 1)
  assert.equal(value.workspace_edit_attempts, 1)
  assert.deepEqual(value.attempted_workspace_edit_paths, ['src/a.ts'])
  assert.ok(value.semantic_limitations.includes(
    'tool-attempts-and-non-error-settlements-are-not-workspace-state',
  ))
})

test('trajectory marks malformed or unfinished evidence without reading outside the workspace', () => {
  const value = foldBehaviorTrajectory([
    {
      seq: 0,
      type: 'tool/call',
      data: { turn: 1, step: 1, callId: 'bad', name: 'read', arguments: '{' },
    },
    nativeCall(1, 'outside', 'write', { file_path: '../escape.ts' }),
    nativeResult(2, 'outside'),
  ], { cwd: '/workspace' })
  assert.equal(value.structurally_complete, false)
  assert.deepEqual(value.structural_issues, [
    { code: 'invalid-native-arguments', count: 1 },
    { code: 'unsettled-native-call', count: 1 },
  ])
  assert.equal(value.first_typed_workspace_edit_attempt.observed, false)
  assert.deepEqual(value.attempted_workspace_edit_paths, [])
})

test('route budget separates new and cache-read axes and blocks equality', () => {
  const router = {
    ...zeroTokenUsage(),
    uncached_input_tokens: 70,
    output_tokens: 30,
    cache_read_tokens: 49,
    total_tokens: 149,
  }
  const limits = { maxNewTokens: 101, maxCacheReadTokens: 50 }
  const within = evaluateRouteTokenBudget(router, zeroTokenUsage(), limits, {
    locallyEnforced: true,
  })
  assert.equal(within.state, 'within')
  const newReached = evaluateRouteTokenBudget(
    { ...router, output_tokens: 31, total_tokens: 150 },
    zeroTokenUsage(),
    limits,
  )
  assert.equal(newReached.state, 'limit-reached')
  const cacheReached = evaluateRouteTokenBudget(
    { ...router, cache_read_tokens: 50, total_tokens: 150 },
    zeroTokenUsage(),
    limits,
  )
  assert.equal(cacheReached.state, 'limit-reached')
  const incomplete = evaluateRouteTokenBudget(
    { ...router, complete: false },
    zeroTokenUsage(),
    limits,
  )
  assert.equal(incomplete.state, 'usage-incomplete')
})
