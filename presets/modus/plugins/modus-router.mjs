/** DSH-native Modus Router -> profile-constrained Worker vertical slice. */

import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  evaluateRouteTokenBudget,
  foldWorkerBehaviorTrajectory,
  foldTokenUsage,
  foldWorkerTokenUsage,
  sumTokenUsage,
  zeroTokenUsage,
} from '../lib/trajectory.mjs'


export const name = 'modus-router'
export const inject = ['tools', 'subagents', 'agents']

const PROFILE_IDS = ['neutral', 'p000', 'p100']
const ADVANTAGES = ['token', 'performance', 'balanced']
const DEFAULT_ROUTER_MAX_OUTPUT_TOKENS = 4096
const DEFAULT_MAX_ROUTE_REMINDERS = 1
const DEFAULT_WORKER_MAX_DEPTH = 1
const MAX_RATIONALE_CHARS = 1000
const MAX_EVIDENCE_ITEMS = 6
const MAX_EVIDENCE_CHARS = 500
const MAX_ERROR_CHARS = 4000
const PLUGIN_SOURCE = { kind: 'plugin', plugin: 'dsh-modus-router' }
const ROUTE_FIELDS = ['profile', 'rationale', 'evidence', 'expected_advantage', 'abstain']
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const COMMIT_PATTERN = /^[0-9a-f]{40}$/

const TOKEN_USAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    uncached_input_tokens: { type: 'integer' },
    output_tokens: { type: 'integer' },
    cache_read_tokens: { type: 'integer' },
    cache_write_tokens: { type: 'integer' },
    total_tokens: { type: 'integer' },
    proposed_steps: { type: 'integer' },
    assistant_steps: { type: 'integer' },
    metered_steps: { type: 'integer' },
    compaction_steps: { type: 'integer' },
    metered_compaction_steps: { type: 'integer' },
    complete: { type: 'boolean' },
  },
  required: [
    'uncached_input_tokens', 'output_tokens', 'cache_read_tokens',
    'cache_write_tokens', 'total_tokens', 'proposed_steps', 'assistant_steps',
    'metered_steps', 'compaction_steps', 'metered_compaction_steps', 'complete',
  ],
}

const NULLABLE_INTEGER_SCHEMA = { oneOf: [{ type: 'integer' }, { type: 'null' }] }
const NULLABLE_STRING_SCHEMA = { oneOf: [{ type: 'string' }, { type: 'null' }] }
const NAMED_COUNT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { name: { type: 'string' }, count: { type: 'integer' } },
  required: ['name', 'count'],
}
const STRUCTURAL_ISSUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { code: { type: 'string' }, count: { type: 'integer' } },
  required: ['code', 'count'],
}
const TRAJECTORY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    schema: { type: 'string' },
    classifier: { type: 'string' },
    evaluation_patterns_sha256: { type: 'string' },
    path_semantics: { type: 'string' },
    structurally_complete: { type: 'boolean' },
    structural_issues: { type: 'array', items: STRUCTURAL_ISSUE_SCHEMA },
    semantic_limitations: { type: 'array', items: { type: 'string' } },
    unclassified_tool_calls: { type: 'array', items: NAMED_COUNT_SCHEMA },
    failed_tool_calls: { type: 'array', items: NAMED_COUNT_SCHEMA },
    unsettled_tool_calls: { type: 'array', items: NAMED_COUNT_SCHEMA },
    first_typed_workspace_edit_attempt: {
      type: 'object',
      additionalProperties: false,
      properties: {
        observed: { type: 'boolean' },
        seq: NULLABLE_INTEGER_SCHEMA,
        turn: NULLABLE_INTEGER_SCHEMA,
        step: NULLABLE_INTEGER_SCHEMA,
        path: NULLABLE_STRING_SCHEMA,
      },
      required: ['observed', 'seq', 'turn', 'step', 'path'],
    },
    pre_edit_usage: TOKEN_USAGE_SCHEMA,
    pre_edit_workspace_information_attempts: { type: 'integer' },
    pre_edit_inspection_command_candidates: { type: 'integer' },
    pre_edit_information_attempts: { type: 'integer' },
    pre_edit_concrete_read_paths: { type: 'array', items: { type: 'string' } },
    pre_edit_search_roots: { type: 'array', items: { type: 'string' } },
    concrete_read_attempts: { type: 'integer' },
    search_attempts: { type: 'integer' },
    shell_attempts: { type: 'integer' },
    edit_tool_attempts: { type: 'integer' },
    workspace_edit_attempts: { type: 'integer' },
    attempted_workspace_edit_paths: { type: 'array', items: { type: 'string' } },
    evaluation_command_intents: { type: 'integer' },
    post_edit_evaluation_command_intents: { type: 'integer' },
    attempted_edit_evaluate_cycles: { type: 'integer' },
    attempted_evaluation_to_edit_switches: { type: 'integer' },
  },
  required: [
    'schema', 'classifier', 'evaluation_patterns_sha256', 'path_semantics',
    'structurally_complete', 'structural_issues', 'semantic_limitations',
    'unclassified_tool_calls', 'failed_tool_calls', 'unsettled_tool_calls',
    'first_typed_workspace_edit_attempt',
    'pre_edit_usage', 'pre_edit_workspace_information_attempts',
    'pre_edit_inspection_command_candidates', 'pre_edit_information_attempts',
    'pre_edit_concrete_read_paths', 'pre_edit_search_roots',
    'concrete_read_attempts', 'search_attempts', 'shell_attempts',
    'edit_tool_attempts', 'workspace_edit_attempts', 'attempted_workspace_edit_paths',
    'evaluation_command_intents', 'post_edit_evaluation_command_intents',
    'attempted_edit_evaluate_cycles', 'attempted_evaluation_to_edit_switches',
  ],
}
const BUDGET_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    schema: { type: 'string' },
    limits: {
      type: 'object',
      additionalProperties: false,
      properties: {
        new_tokens: { type: 'integer' },
        cache_read_tokens: { type: 'integer' },
      },
      required: ['new_tokens', 'cache_read_tokens'],
    },
    observed: {
      type: 'object',
      additionalProperties: false,
      properties: {
        new_tokens: { type: 'integer' },
        cache_read_tokens: { type: 'integer' },
        complete: { type: 'boolean' },
      },
      required: ['new_tokens', 'cache_read_tokens', 'complete'],
    },
    state: { type: 'string', enum: ['within', 'limit-reached', 'usage-incomplete'] },
    next_request_allowed: { type: 'boolean' },
    locally_enforced: { type: 'boolean' },
  },
  required: [
    'schema', 'limits', 'observed', 'state',
    'next_request_allowed', 'locally_enforced',
  ],
}

const RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    profile: { type: 'string', enum: PROFILE_IDS },
    profile_digest: { type: 'string' },
    input_digest: { type: 'string' },
    worker_session_id: { oneOf: [{ type: 'string' }, { type: 'null' }] },
    stop_reason: { type: 'string' },
    token_usage: {
      type: 'object',
      additionalProperties: false,
      properties: {
        router: TOKEN_USAGE_SCHEMA,
        worker: { oneOf: [TOKEN_USAGE_SCHEMA, { type: 'null' }] },
        total: TOKEN_USAGE_SCHEMA,
      },
      required: ['router', 'worker', 'total'],
    },
    trajectory: { oneOf: [TRAJECTORY_SCHEMA, { type: 'null' }] },
    budget: { oneOf: [BUDGET_SCHEMA, { type: 'null' }] },
    output: { type: 'array', items: {} },
    error: { oneOf: [{ type: 'string' }, { type: 'null' }] },
  },
  required: [
    'profile', 'profile_digest', 'input_digest', 'worker_session_id',
    'stop_reason', 'token_usage', 'trajectory', 'budget', 'output', 'error',
  ],
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

function exactKeys(value, expected, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${where} must be an object`)
  }
  const observed = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (observed.join('\0') !== wanted.join('\0')) {
    throw new Error(`${where} fields differ; expected ${wanted.join(', ')}`)
  }
  return value
}

/** Load and cryptographically verify the profile snapshot shipped beside the plugin. */
export function loadProfileCatalog(profileRoot = new URL('../profiles/', import.meta.url)) {
  const manifestPath = new URL('manifest.json', profileRoot)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  exactKeys(manifest, ['schema', 'upstream', 'profiles'], 'profile manifest')
  if (manifest.schema !== 'dsh-modus-profile-catalog-v1') {
    throw new Error(`unsupported Modus profile catalog: ${String(manifest.schema)}`)
  }
  const upstream = exactKeys(
    manifest.upstream,
    ['repository', 'commit', 'component_source', 'component_source_sha256'],
    'profile manifest upstream',
  )
  nonEmptyString(upstream.repository, 'profile manifest upstream repository')
  nonEmptyString(upstream.component_source, 'profile manifest upstream component_source')
  if (!COMMIT_PATTERN.test(upstream.commit)) {
    throw new Error('profile manifest upstream commit must be a lowercase 40-character Git hash')
  }
  if (!SHA256_PATTERN.test(upstream.component_source_sha256)) {
    throw new Error('profile manifest upstream component_source_sha256 must be a lowercase SHA-256')
  }
  exactKeys(manifest.profiles, ['p000', 'p100'], 'profile manifest profiles')

  const profiles = {
    neutral: {
      id: 'neutral',
      text: '',
      sha256: sha256(''),
    },
  }
  for (const id of ['p000', 'p100']) {
    const record = exactKeys(manifest.profiles[id], ['path', 'sha256'], `profile ${id}`)
    if (typeof record.path !== 'string' || typeof record.sha256 !== 'string') {
      throw new Error(`profile ${id} path and sha256 must be strings`)
    }
    if (record.path !== `${id}.md`) {
      throw new Error(`profile ${id} path must be exactly ${id}.md`)
    }
    if (!SHA256_PATTERN.test(record.sha256)) {
      throw new Error(`profile ${id} sha256 must be a lowercase SHA-256`)
    }
    const path = new URL(record.path, profileRoot)
    const text = readFileSync(path, 'utf8')
    const digest = sha256(text)
    if (digest !== record.sha256) {
      throw new Error(
        `profile ${id} digest mismatch for ${fileURLToPath(path)}: ${digest} != ${record.sha256}`,
      )
    }
    profiles[id] = Object.freeze({ id, text, sha256: digest })
  }
  profiles.neutral = Object.freeze(profiles.neutral)
  return Object.freeze({
    schema: manifest.schema,
    upstream: Object.freeze({ ...manifest.upstream }),
    profiles: Object.freeze(profiles),
  })
}

export const PROFILE_CATALOG = loadProfileCatalog()

function nonEmptyString(value, where) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${where} must be a non-empty string`)
  }
  return value
}

function positiveInteger(value, where) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${where} must be a positive safe integer`)
  }
  return value
}

function nonNegativeInteger(value, where) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${where} must be a non-negative safe integer`)
  }
  return value
}

function stringList(value, where) {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || item.length === 0)) {
    throw new Error(`${where} must be an array of non-empty strings`)
  }
  if (new Set(value).size !== value.length) throw new Error(`${where} contains duplicate names`)
  return [...value]
}

/** Resolve loader config once so runtime paths never hide defaults. */
export function resolveConfig(config = {}) {
  const provider = nonEmptyString(config.provider ?? 'fork', 'provider')
  const toolName = config.toolName === undefined
    ? 'modus_delegate'
    : nonEmptyString(config.toolName, 'toolName')
  const routerProbeTools = stringList(config.routerProbeTools ?? [], 'routerProbeTools')
    .filter(item => item !== toolName)
  const workerDeniedTools = stringList(
    config.workerDeniedTools ?? [
      toolName,
      'subagent',
      'subagent_fork',
      'send_message',
      'interrupt_agent',
      'list_agents',
      'workflow',
      'ralph',
    ],
    'workerDeniedTools',
  )
  if (!workerDeniedTools.includes(toolName)) workerDeniedTools.unshift(toolName)
  const workerDeniedToolsStrict = config.workerDeniedTools !== undefined
  const maxProbeCalls = nonNegativeInteger(config.maxProbeCalls ?? 0, 'maxProbeCalls')
  if (routerProbeTools.length === 0 && maxProbeCalls !== 0) {
    throw new Error('maxProbeCalls must be 0 when routerProbeTools is empty')
  }
  if (routerProbeTools.length > 0 && maxProbeCalls === 0) {
    throw new Error('maxProbeCalls must be positive when routerProbeTools are configured')
  }

  const workerAgentOptions = config.workerAgentOptions
  if (workerAgentOptions !== undefined
    && (!workerAgentOptions || typeof workerAgentOptions !== 'object' || Array.isArray(workerAgentOptions))) {
    throw new Error('workerAgentOptions must be an object when configured')
  }
  let routeTokenBudget
  if (config.routeTokenBudget !== undefined) {
    const value = exactKeys(
      config.routeTokenBudget,
      ['maxNewTokens', 'maxCacheReadTokens'],
      'routeTokenBudget',
    )
    routeTokenBudget = Object.freeze({
      maxNewTokens: nonNegativeInteger(value.maxNewTokens, 'routeTokenBudget.maxNewTokens'),
      maxCacheReadTokens: nonNegativeInteger(
        value.maxCacheReadTokens,
        'routeTokenBudget.maxCacheReadTokens',
      ),
    })
    if (provider !== 'fork') {
      throw new Error(
        'routeTokenBudget is enforceable only with the pinned in-process fork provider',
      )
    }
  }
  const evaluationPatterns = config.evaluationPatterns === undefined
    ? undefined
    : Object.freeze(stringList(config.evaluationPatterns, 'evaluationPatterns'))
  if (evaluationPatterns?.length === 0) {
    throw new Error('evaluationPatterns must contain at least one regex source')
  }
  for (const source of evaluationPatterns ?? []) {
    try {
      new RegExp(source, 'i')
    } catch (error) {
      throw new Error(`invalid evaluationPatterns entry ${JSON.stringify(source)}: ${errorText(error)}`)
    }
  }
  return Object.freeze({
    provider,
    presetId: nonEmptyString(config.presetId ?? 'modus', 'presetId'),
    toolName,
    basePersona: nonEmptyString(config.basePersona, 'basePersona'),
    routerProbeTools: Object.freeze(routerProbeTools),
    routerAllowedTools: Object.freeze([toolName, ...routerProbeTools]),
    workerDeniedTools: Object.freeze(workerDeniedTools),
    workerDeniedToolsStrict,
    maxProbeCalls,
    routerMaxOutputTokens: positiveInteger(
      config.routerMaxOutputTokens ?? DEFAULT_ROUTER_MAX_OUTPUT_TOKENS,
      'routerMaxOutputTokens',
    ),
    maxRouteReminders: nonNegativeInteger(
      config.maxRouteReminders ?? DEFAULT_MAX_ROUTE_REMINDERS,
      'maxRouteReminders',
    ),
    workerMaxDepth: nonNegativeInteger(
      config.workerMaxDepth ?? DEFAULT_WORKER_MAX_DEPTH,
      'workerMaxDepth',
    ),
    workerAgentOptions: workerAgentOptions === undefined
      ? undefined
      : Object.freeze({ ...workerAgentOptions }),
    routeTokenBudget,
    evaluationPatterns,
  })
}

function turnNumber(agent) {
  const start = agent.session.events.findLast(event => event.type === 'turn/start')
  if (!start) throw new Error('modus_delegate must run inside an open agent turn')
  return start.data.turn
}

function openTurnNumber(agent) {
  let open
  for (const event of agent.session.events) {
    if (event.type === 'turn/start') open = event.data.turn
    else if (event.type === 'turn/end' && event.data.turn === open) open = undefined
  }
  return open
}

function currentTurnPrompt(agent, turn) {
  const startIndex = agent.session.events.findLastIndex(
    event => event.type === 'turn/start' && event.data.turn === turn,
  )
  if (startIndex < 0) throw new Error(`cannot find turn ${turn} in the Router session`)
  const messages = agent.session.events
    .slice(startIndex + 1)
    .filter(event => event.type === 'user/message')
    .map(event => event.data)
    .filter(message => message.source?.kind === 'user')
  if (messages.length === 0) throw new Error('Router turn has no user task to delegate')

  const blocks = []
  messages.forEach((message, index) => {
    if (index > 0) blocks.push({ type: 'text', text: '\n\n--- next input in this turn ---\n\n' })
    blocks.push(...structuredClone(message.content))
  })
  return blocks
}

function validateDecision(args, config) {
  exactKeys(args, ROUTE_FIELDS, 'route decision')
  if (!PROFILE_IDS.includes(args.profile)) throw new Error('unsupported Modus profile')
  nonEmptyString(args.rationale, 'rationale')
  if (args.rationale.length > MAX_RATIONALE_CHARS) {
    throw new Error(`rationale exceeds ${MAX_RATIONALE_CHARS} characters`)
  }
  if (!ADVANTAGES.includes(args.expected_advantage)) {
    throw new Error(`expected_advantage must be one of ${ADVANTAGES.join(', ')}`)
  }
  if (typeof args.abstain !== 'boolean') throw new Error('abstain must be boolean')
  if (args.abstain && args.profile !== 'neutral') {
    throw new Error('an abstaining route must select neutral')
  }
  if (!Array.isArray(args.evidence)
    || args.evidence.length < 1
    || args.evidence.length > MAX_EVIDENCE_ITEMS
    || args.evidence.some(item => typeof item !== 'string'
      || item.trim().length === 0
      || item.length > MAX_EVIDENCE_CHARS)) {
    throw new Error(
      `evidence must contain 1-${MAX_EVIDENCE_ITEMS} non-empty strings, each at most ${MAX_EVIDENCE_CHARS} characters`,
    )
  }
}

function assertProviderCapabilities(provider, config) {
  const required = [
    ['depthLimit', config.workerMaxDepth !== undefined],
    ['toolFilter', true],
    ['persona', true],
  ]
    .filter(([, needed]) => needed)
    .map(([capability]) => capability)
    .filter(capability => provider.capabilities?.[capability] !== true)
  if (required.length > 0) {
    throw new Error(
      `Modus provider "${provider.name}" lacks required capabilities: ${required.join(', ')}`,
    )
  }
}

function workerPersona(config, profile) {
  return profile.text.length === 0
    ? config.basePersona
    : `${config.basePersona.trimEnd()}\n\n${profile.text}`
}

function workerToolFilter(ctx, config, scope) {
  const known = new Set(ctx.tools.schemas(scope).map(tool => tool.name))
  const unknown = config.workerDeniedTools.filter(tool => !known.has(tool))
  if (config.workerDeniedToolsStrict && unknown.length > 0) {
    throw new Error(
      `workerDeniedTools names tools outside the Router preset scope: ${unknown.join(', ')}`,
    )
  }
  const deny = config.workerDeniedToolsStrict
    ? [...config.workerDeniedTools]
    : config.workerDeniedTools.filter(tool => known.has(tool))
  if (!deny.includes(config.toolName)) {
    throw new Error(
      `${config.toolName} is not visible in the Router preset scope; refusing a recursively routable Worker`,
    )
  }
  return Object.freeze({ deny: Object.freeze(deny) })
}

function errorText(error) {
  const text = error instanceof Error ? error.message : String(error)
  return text.length <= MAX_ERROR_CHARS ? text : `${text.slice(0, MAX_ERROR_CHARS)}…`
}

function emptyTurnState() {
  return { probes: 0, routed: false, reminders: 0 }
}

/**
 * Rebuild no-redispatch and probe budgets from native and Code Mode starts.
 * Any durable route start is consumed fail-closed: DSH post-execute policy or
 * cancellation can turn a result into an error after the tool body already
 * created a Worker, so a final isError bit cannot prove the side effect did
 * not occur.
 */
export function reconstructRouterTurns(agent, config) {
  const turns = new Map()
  let openTurn
  const stateFor = turn => {
    const state = turns.get(turn) ?? emptyTurnState()
    turns.set(turn, state)
    return state
  }
  const countStart = (turn, name) => {
    if (config.routerProbeTools.includes(name)) stateFor(turn).probes += 1
    if (name === config.toolName) stateFor(turn).routed = true
  }

  for (const event of agent.session.events) {
    if (event.type === 'turn/start') {
      openTurn = event.data.turn
    } else if (event.type === 'turn/end') {
      if (openTurn === event.data.turn) openTurn = undefined
    } else if (event.type === 'tool/call') {
      countStart(event.data.turn, event.data.name)
    } else if (event.type === 'tool/code-dispatch-start' && openTurn !== undefined) {
      countStart(openTurn, event.data.name)
    } else if (event.type === 'user/message'
      && openTurn !== undefined
      && event.data.source?.kind === 'plugin'
      && event.data.source?.plugin === PLUGIN_SOURCE.plugin) {
      stateFor(openTurn).reminders += 1
    }
  }

  // steer() persists its next-step insertion before the message is claimed
  // into user/message. Account for that HMR window without double-counting.
  if (openTurn !== undefined) {
    const pendingReminders = agent.inbox?.nextStep?.filter(
      message => message.source?.kind === 'plugin'
        && message.source?.plugin === PLUGIN_SOURCE.plugin,
    ).length ?? 0
    stateFor(openTurn).reminders += pendingReminders
  }
  return turns
}

async function settleWorker(run, config) {
  const workerUsage = () => foldWorkerTokenUsage(run.localAgent)
  const workerTrajectory = () => foldWorkerBehaviorTrajectory(run.localAgent, {
    ...(config.evaluationPatterns === undefined
      ? {}
      : { evaluationPatterns: config.evaluationPatterns }),
  })
  const execution = await Promise.allSettled([run.result])
  const disposal = await Promise.allSettled([Promise.resolve().then(() => run.dispose())])
  const result = execution[0]
  const disposed = disposal[0]
  if (result.status === 'rejected') {
    const detail = disposed.status === 'rejected'
      ? `${errorText(result.reason)}; worker disposal failed: ${errorText(disposed.reason)}`
      : errorText(result.reason)
    return {
      worker_session_id: run.id,
      stop_reason: 'infrastructure-error',
      output: [],
      error: detail,
      worker_usage: workerUsage(),
      worker_trajectory: workerTrajectory(),
    }
  }
  if (disposed.status === 'rejected') {
    return {
      worker_session_id: run.id,
      stop_reason: 'infrastructure-error',
      output: result.value.output,
      error: `worker disposal failed: ${errorText(disposed.reason)}`,
      worker_usage: workerUsage(),
      worker_trajectory: workerTrajectory(),
    }
  }
  return {
    worker_session_id: run.id,
    stop_reason: String(result.value.stopReason),
    output: result.value.output,
    error: result.value.stopReason === 'completed'
      ? null
      : `worker ended with ${String(result.value.stopReason)}`,
    worker_usage: workerUsage(),
    worker_trajectory: workerTrajectory(),
  }
}

function resultContent(value) {
  const route = value.profile === 'neutral'
    ? 'neutral'
    : `${value.profile}@${value.profile_digest.slice(0, 12)}`
  const worker = value.worker_session_id ?? 'not-started'
  const metering = value.token_usage.total.complete
    ? ` ${value.token_usage.total.total_tokens} total tokens.`
    : ' Token usage incomplete.'
  const headline = `Modus route: ${route} → worker ${worker} (${value.stop_reason}).${metering}`
  const budget = value.budget === null
    ? ''
    : ` Budget ${value.budget.state}: ${value.budget.observed.new_tokens}/${value.budget.limits.new_tokens} new, ${value.budget.observed.cache_read_tokens}/${value.budget.limits.cache_read_tokens} cache-read.`
  const summary = `${headline}${budget}`
  const detail = value.error === null ? summary : `${summary}\n${value.error}`
  return [
    { type: 'text', text: detail },
    ...value.output.filter(block => block && typeof block === 'object' && typeof block.type === 'string'),
  ]
}

function enforceWorkerBudget(agent, governed, config) {
  if (governed === undefined) return
  const decision = evaluateRouteTokenBudget(
    governed.routerUsage,
    foldWorkerTokenUsage(agent),
    config.routeTokenBudget,
    { locallyEnforced: true },
  )
  if (decision.next_request_allowed) return
  const code = decision.state === 'usage-incomplete'
    ? 'MODUS_TOKEN_USAGE_INCOMPLETE'
    : 'MODUS_TOKEN_BUDGET_EXHAUSTED'
  throw new Error(
    `${code}: ${decision.observed.new_tokens}/${decision.limits.new_tokens} new tokens; `
    + `${decision.observed.cache_read_tokens}/${decision.limits.cache_read_tokens} cache-read tokens`,
  )
}

/** Build the one model-facing route-and-delegate capability. */
export function createModusDelegateTool(
  ctx,
  config,
  routerStates,
  providerState = { available: true },
  runtimeState = { workerBudgets: new WeakMap(), pendingBudgets: new Map() },
) {
  return {
    name: config.toolName,
    description:
      'Select exactly one Modus execution profile and delegate the complete current user request to its Worker. '
      + 'neutral preserves the ordinary coding policy; p000 favors a bounded local surface; p100 favors a coordinated cross-surface implementation. '
      + 'Correctness and performance eligibility precede Router-plus-Worker token cost. Call this exactly once per user turn.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        profile: {
          type: 'string',
          enum: PROFILE_IDS,
          description: 'The selected Worker action: neutral, p000, or p100.',
        },
        rationale: {
          type: 'string',
          description: 'Concise decision rationale grounded only in visible task facts.',
        },
        evidence: {
          type: 'array',
          items: { type: 'string' },
          description: 'One to six visible facts supporting the route.',
        },
        expected_advantage: {
          type: 'string',
          enum: ADVANTAGES,
          description: 'Whether the selected action is expected to help token cost, outcome performance, or both.',
        },
        abstain: {
          type: 'boolean',
          description: 'True only when evidence is insufficient; an abstention must select neutral.',
        },
      },
      required: ['profile', 'rationale', 'evidence', 'expected_advantage', 'abstain'],
    },
    output: {
      schema: RESULT_SCHEMA,
      render: (_args, value) => resultContent(value),
      presentationMeta: (_args, value) => ({
        profile: value.profile,
        profile_digest: value.profile_digest,
        input_digest: value.input_digest,
        worker_session_id: value.worker_session_id,
        stop_reason: value.stop_reason,
        token_usage: value.token_usage,
        trajectory: value.trajectory,
        budget: value.budget,
      }),
    },
    async execute(args, exec) {
      const parent = exec.agent
      const state = parent === undefined ? undefined : routerStates.get(parent)
      if (parent === undefined || state === undefined) {
        throw new Error('modus_delegate is available only to a top-level Modus Router agent')
      }
      validateDecision(args, config)
      const turn = turnNumber(parent)
      const turnState = state.turns.get(turn) ?? emptyTurnState()
      state.turns.set(turn, turnState)
      if (turnState.routed) throw new Error(`Modus turn ${turn} already has a route decision`)

      const profile = PROFILE_CATALOG.profiles[args.profile]
      const prompt = currentTurnPrompt(parent, turn)
      const inputDigest = sha256(JSON.stringify(prompt))
      const routerUsage = foldTokenUsage(parent.session.events, { turn })
      const initialBudget = config.routeTokenBudget === undefined
        ? null
        : evaluateRouteTokenBudget(
          routerUsage,
          zeroTokenUsage(),
          config.routeTokenBudget,
          { locallyEnforced: true },
        )
      // Everything above is side-effect-free preflight. From this point a
      // provider attempt is terminal for the turn, including infrastructure
      // failure, so commit before the first start call.
      turnState.routed = true
      let settled
      let locallyEnforced = config.routeTokenBudget !== undefined
      if (initialBudget !== null && !initialBudget.next_request_allowed) {
        settled = {
          worker_session_id: null,
          stop_reason: 'budget-blocked',
          output: [],
          error: initialBudget.state === 'usage-incomplete'
            ? 'Router usage is incomplete; Worker start was blocked fail-closed'
            : 'Router usage reached the configured route token budget before Worker start',
          worker_usage: zeroTokenUsage(),
          worker_trajectory: null,
        }
      } else {
        const capturedWorkerToolFilter = runtimeState.workerToolFilters === undefined
          ? workerToolFilter(ctx, config)
          : runtimeState.workerToolFilters.get(parent)
        const parentId = parent.session.header?.id ?? parent.id
        if (config.routeTokenBudget !== undefined) {
          runtimeState.pendingBudgets.set(parentId, { turn, routerUsage })
        }
        try {
          if (!providerState.available) {
            throw new Error(`Modus subagent provider "${config.provider}" is not registered`)
          }
          if (capturedWorkerToolFilter === undefined) {
            throw new Error('Worker tool filter was not captured before Router confinement')
          }
          const run = await ctx.subagents.start(config.provider, {
            label: `Modus ${args.profile}@${profile.sha256.slice(0, 12)}`,
            prompt,
            parent,
            signal: exec.signal,
            persona: workerPersona(config, profile),
            maxDepth: config.workerMaxDepth,
            toolFilter: capturedWorkerToolFilter,
            ...(config.workerAgentOptions === undefined
              ? {}
              : { agentOptions: config.workerAgentOptions }),
          })
          locallyEnforced = config.routeTokenBudget === undefined
            || (run.localAgent !== undefined && runtimeState.workerBudgets.has(run.localAgent))
          settled = await settleWorker(run, config)
          if (config.routeTokenBudget !== undefined && !locallyEnforced) {
            settled.stop_reason = 'infrastructure-error'
            settled.error = 'configured token governor was not bound before the Worker request; this run is not enforceable evidence'
          }
        } catch (error) {
          settled = {
            worker_session_id: null,
            stop_reason: 'infrastructure-error',
            output: [],
            error: errorText(error),
            worker_usage: zeroTokenUsage(),
            worker_trajectory: null,
          }
        } finally {
          if (config.routeTokenBudget !== undefined) {
            runtimeState.pendingBudgets.delete(parentId)
          }
        }
      }
      const workerUsage = settled.worker_usage
      const tokenUsage = {
        router: routerUsage,
        worker: workerUsage,
        total: sumTokenUsage(routerUsage, workerUsage),
      }
      const budget = config.routeTokenBudget === undefined
        ? null
        : evaluateRouteTokenBudget(
          routerUsage,
          workerUsage,
          config.routeTokenBudget,
          { locallyEnforced },
        )
      const trajectory = settled.worker_trajectory
      delete settled.worker_usage
      delete settled.worker_trajectory
      exec.concludeTurn()
      return {
        profile: args.profile,
        profile_digest: profile.sha256,
        input_digest: inputDigest,
        token_usage: tokenUsage,
        trajectory,
        budget,
        ...settled,
      }
    },
    presentCall(args) {
      if (!args || typeof args !== 'object' || Array.isArray(args)
        || !PROFILE_IDS.includes(args.profile)
        || typeof args.rationale !== 'string') return undefined
      return {
        card: 'generic',
        title: `Route with Modus ${args.profile}`,
        kind: 'execute',
        rawInput: args.rationale,
      }
    },
    presentResult(_args, result) {
      if (result.isError) return { card: 'generic', title: 'Modus routing failed' }
      return {
        card: 'generic',
        title: `Modus ${String(result.meta?.profile ?? '')} · ${String(result.meta?.stop_reason ?? '')}`,
        content: result.content,
      }
    },
  }
}

export function apply(ctx, inputConfig) {
  const config = resolveConfig(inputConfig)
  const routerStates = new WeakMap()
  const routersBySessionId = new Map()
  const workerBudgets = new WeakMap()
  const workerToolFilters = new WeakMap()
  const pendingBudgets = new Map()
  const runtimeState = { workerBudgets, workerToolFilters, pendingBudgets }
  const providerState = { available: false }
  const observeProvider = (provider) => {
    if (provider.name !== config.provider) return
    assertProviderCapabilities(provider, config)
    providerState.available = true
  }
  ctx.on('subagent/provider-added', observeProvider)
  ctx.on('subagent/provider-removed', (providerName) => {
    if (providerName === config.provider) providerState.available = false
  })
  const presentProvider = ctx.subagents.getProvider(config.provider)
  if (presentProvider === undefined) {
    ctx.logger.info(
      `Modus subagent provider "${config.provider}" is not registered yet; routing will fail closed until it appears`,
    )
  } else {
    observeProvider(presentProvider)
  }

  ctx.tools.register(createModusDelegateTool(
    ctx,
    config,
    routerStates,
    providerState,
    runtimeState,
  ))

  const activeRestrictions = new Set()
  ctx.effect(() => () => {
    for (const cleanup of [...activeRestrictions]) cleanup()
  }, 'modus-router: release Router restrictions')

  const bindRouter = (agent) => {
    if (agent.session.header.origin === 'subagent') return
    routerStates.get(agent)?.cleanup()
    // Snapshot the preset-visible capabilities before the Router allow-list is
    // installed. schemas() does not infer the calling Cordis scope, and the
    // confined Router view would otherwise omit delegation tools that the
    // freshly composed Worker sees.
    workerToolFilters.set(agent, workerToolFilter(ctx, config, agent))
    const liftRestriction = agent.ctx.tools.restrict({ allow: [...config.routerAllowedTools] })
    let live = true
    const state = { turns: reconstructRouterTurns(agent, config), cleanup: undefined }
    const cleanup = () => {
      if (!live) return
      live = false
      activeRestrictions.delete(cleanup)
      liftRestriction()
      if (routerStates.get(agent) === state) routerStates.delete(agent)
      workerToolFilters.delete(agent)
      if (routersBySessionId.get(agent.session.header.id) === agent) {
        routersBySessionId.delete(agent.session.header.id)
      }
    }
    state.cleanup = cleanup
    routerStates.set(agent, state)
    routersBySessionId.set(agent.session.header.id, agent)
    activeRestrictions.add(cleanup)
  }

  const bindWorkerBudget = (agent) => {
    if (config.routeTokenBudget === undefined
      || agent.session.header.origin !== 'subagent') return
    const parentId = agent.session.header.parentSession
    const parent = routersBySessionId.get(parentId)
    if (parent === undefined) return
    const pending = pendingBudgets.get(parentId)
    const turn = pending?.turn ?? openTurnNumber(parent)
    if (turn === undefined) return
    const routerUsage = pending?.routerUsage
      ?? foldTokenUsage(parent.session.events, { turn })
    workerBudgets.set(agent, { parentId, turn, routerUsage })
  }

  ctx.on('agent/session-start', ({ agent }) => {
    if (agent.session.header.origin === 'subagent') bindWorkerBudget(agent)
    else bindRouter(agent)
  })

  ctx.on('agent/disposed', ({ agent }) => {
    routerStates.get(agent)?.cleanup()
    workerBudgets.delete(agent)
  })

  // This gate is prepended ahead of standard compaction. It prevents an
  // already-exhausted Worker from spending another hidden summarization call.
  // A compaction admitted below the cap may cross it; agent/request then blocks
  // the ordinary call in the same proposed step.
  ctx.on('agent/pre-step', async ({ agent }, next) => {
    enforceWorkerBudget(agent, workerBudgets.get(agent), config)
    return next()
  }, { prepend: true })

  ctx.on('agent/request', async ({ agent }, next) => {
    enforceWorkerBudget(agent, workerBudgets.get(agent), config)
    const request = await next()
    return routerStates.has(agent)
      ? { ...request, maxTokens: config.routerMaxOutputTokens }
      : request
  })

  ctx.on('tools/pre-execute', async (exec, next) => {
    const state = exec.agent === undefined ? undefined : routerStates.get(exec.agent)
    if (state === undefined || !config.routerProbeTools.includes(exec.name)) return next()
    const turn = turnNumber(exec.agent)
    const turnState = state.turns.get(turn) ?? emptyTurnState()
    state.turns.set(turn, turnState)
    if (turnState.probes >= config.maxProbeCalls) {
      return {
        kind: 'deny',
        reason: `Modus Router probe budget exhausted (${config.maxProbeCalls}); route now or abstain with neutral`,
      }
    }
    turnState.probes += 1
    return next()
  })

  ctx.on('agent/turn-stopping', ({ agent, turn }) => {
    const state = routerStates.get(agent)
    if (state === undefined) return
    const turnState = state.turns.get(turn) ?? emptyTurnState()
    state.turns.set(turn, turnState)
    if (turnState.routed) return
    if (turnState.reminders < config.maxRouteReminders) {
      turnState.reminders += 1
      agent.steer({
        id: `modus-router-${randomUUID()}`,
        role: 'user',
        content: [{
          type: 'text',
          text: `Routing is incomplete. Call ${config.toolName} exactly once now; if evidence is insufficient, abstain with neutral.`,
        }],
        source: PLUGIN_SOURCE,
      })
      return
    }
    throw new Error(
      `MODUS_ROUTE_REQUIRED: turn ${turn} ended without a successful ${config.toolName} call`,
    )
  })

  const presentAgents = [...ctx.agents.list()]
  for (const agent of presentAgents) {
    if (agent.session.header.agentPreset === config.presetId
      && agent.session.header.origin !== 'subagent') bindRouter(agent)
  }
  for (const agent of presentAgents) {
    if (agent.session.header.agentPreset === config.presetId
      && agent.session.header.origin === 'subagent') bindWorkerBudget(agent)
  }
}
