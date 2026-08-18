/** Pure, replay-safe folds over DSH durable events used by Modus evidence. */

import { createHash } from 'node:crypto'
import { isAbsolute, normalize, relative, resolve, sep } from 'node:path'


export const BEHAVIOR_CLASSIFIER = 'dsh-typed-fs-lexical-eval-v1'
export const PATH_SEMANTICS = 'workspace-relative-lexical-v1'

export const DEFAULT_EVALUATION_PATTERNS = Object.freeze([
  String.raw`(?:^|[;&|]\s*)(?:[A-Za-z_][A-Za-z0-9_]*=[^\s]+\s+)*(?:(?:python(?:3(?:\.\d+)?)?)\s+-m\s+)?(?:pytest|unittest)(?:\s|$)`,
  String.raw`(?:^|[;&|]\s*)(?:\.?\/?(?:[^\s;&|]+/)*)?(?:local_)?run_tests\.sh(?:\s|$)`,
  String.raw`(?:^|[;&|]\s*)(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test(?:\s|$)`,
  String.raw`(?:^|[;&|]\s*)(?:cargo|go)\s+test(?:\s|$)`,
  String.raw`(?:^|[;&|]\s*)make\s+(?:test|check)(?:\s|$)`,
])

const INSPECTION_COMMAND = /(?:^|[;&|]\s*)(?:ls|find|fd|rg|grep|sed|head|tail|cat|wc|tree)(?:\s|$)/i
const CONCRETE_READ_TOOLS = new Set(['read', 'read_image'])
const SEARCH_TOOLS = new Set(['glob', 'grep'])
const EDIT_TOOLS = new Set(['edit', 'write'])
const CLASSIFIED_TOOLS = new Set([
  ...CONCRETE_READ_TOOLS,
  ...SEARCH_TOOLS,
  ...EDIT_TOOLS,
  'bash',
])


export function zeroTokenUsage() {
  return {
    uncached_input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    total_tokens: 0,
    proposed_steps: 0,
    assistant_steps: 0,
    metered_steps: 0,
    compaction_steps: 0,
    metered_compaction_steps: 0,
    complete: true,
  }
}

function tokenBuckets(usage) {
  if (!usage || typeof usage !== 'object') return undefined
  const values = [
    usage.inputTokens,
    usage.outputTokens,
    usage.cacheReadTokens ?? 0,
    usage.cacheWriteTokens ?? 0,
  ]
  if (values.some(value => !Number.isSafeInteger(value) || value < 0)) return undefined
  return {
    uncached_input_tokens: values[0],
    output_tokens: values[1],
    cache_read_tokens: values[2],
    cache_write_tokens: values[3],
  }
}

function sampleOf(event) {
  if (event?.type === 'assistant/message' && event.data?.usage !== undefined) {
    return {
      key: `${String(event.data.turn)}:${String(event.data.step)}`,
      buckets: tokenBuckets(event.data.usage),
    }
  }
  return undefined
}

function eventSeq(event, index) {
  return Number.isSafeInteger(event?.seq) ? event.seq : index
}

function isSurfaceReplacement(event) {
  return event?.surfaceOp !== null
    && typeof event?.surfaceOp === 'object'
    && event.surfaceOp.op === 'replace'
}

function checkedSum(values) {
  let result = 0
  for (const value of values) {
    const next = result + value
    if (!Number.isSafeInteger(next) || next < 0) return undefined
    result = next
  }
  return result
}

/**
 * Fold finalized provider usage. This includes ordinary assistant messages and
 * durable compaction summaries. Streaming samples and failed attempts without
 * either finalized record are outside this completed-response estimand. A
 * finalized record without valid usage makes the ledger incomplete.
 */
export function foldTokenUsage(events, options = {}) {
  if (!Array.isArray(events)) throw new Error('events must be an array')
  const minSeq = options.minSeq ?? 0
  if (!Number.isSafeInteger(minSeq) || minSeq < 0) {
    throw new Error('minSeq must be a non-negative safe integer')
  }
  const maxSeq = options.maxSeq ?? Number.POSITIVE_INFINITY
  if (maxSeq !== Number.POSITIVE_INFINITY
    && (!Number.isSafeInteger(maxSeq) || maxSeq < minSeq)) {
    throw new Error('maxSeq must be a safe integer no smaller than minSeq')
  }
  const turn = options.turn
  if (turn !== undefined && (!Number.isSafeInteger(turn) || turn < 1)) {
    throw new Error('turn must be a positive safe integer when provided')
  }
  const openStep = options.openStep
  if (openStep !== undefined && (
    !Number.isSafeInteger(openStep?.turn) || openStep.turn < 1
    || !Number.isSafeInteger(openStep?.step) || openStep.step < 1
  )) {
    throw new Error('openStep must contain positive safe turn and step integers')
  }

  const requestSteps = new Set()
  const assistantSteps = new Set()
  const assistantSamples = new Map()
  const compactionSteps = new Set()
  const compactionSummaries = new Set()
  const compactionSamples = new Map()
  const compactionStarts = new Map()
  const lastStepByTurn = new Map()
  const budgetBlockedSteps = new Set()
  let duplicateAssistantStep = false
  let duplicateCompactionStep = false
  let unattributedCompaction = false
  let invalidCompactionTrace = false
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]
    if (event?.type !== 'compaction/start') continue
    const id = event.data?.compactionId
    if (id === undefined || compactionStarts.has(id)) {
      invalidCompactionTrace = true
      continue
    }
    const start = {
      seq: eventSeq(event, index),
      turn: event.data?.turn,
    }
    compactionStarts.set(id, start)
    if (start.seq >= minSeq && start.seq < maxSeq
      && (turn === undefined || start.turn === turn)) {
      compactionSteps.add(String(id))
    }
  }
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]
    const seq = eventSeq(event, index)
    if (seq < minSeq || seq >= maxSeq) continue
    // Surface replacements are model-free projections over an earlier durable
    // event. The original append remains the accounting authority.
    if (isSurfaceReplacement(event)) continue
    if (event?.type === 'compaction/summary') {
      const key = String(event.data?.compactionId)
      const owner = compactionStarts.get(event.data?.compactionId)
      if (turn !== undefined) {
        if (owner === undefined) {
          unattributedCompaction = true
          continue
        }
        if (owner.turn !== turn) continue
      }
      if (owner === undefined || owner.seq >= seq || !compactionSteps.has(key)) {
        unattributedCompaction = true
        continue
      }
      if (compactionSummaries.has(key)) duplicateCompactionStep = true
      compactionSummaries.add(key)
      const buckets = tokenBuckets(event.data?.usage)
      if (buckets !== undefined) compactionSamples.set(key, buckets)
      continue
    }
    if (turn !== undefined && event?.data?.turn !== turn) continue
    if (event?.type === 'step/start') {
      const key = `${String(event.data.turn)}:${String(event.data.step)}`
      requestSteps.add(key)
      lastStepByTurn.set(event.data.turn, key)
    }
    if (event?.type === 'turn/end'
      && event.data?.reason?.kind === 'error'
      && typeof event.data.reason.error?.message === 'string'
      && /MODUS_TOKEN_(?:BUDGET_EXHAUSTED|USAGE_INCOMPLETE)/
        .test(event.data.reason.error.message)) {
      const key = lastStepByTurn.get(event.data.turn)
      if (key !== undefined) budgetBlockedSteps.add(key)
    }
    if (event?.type === 'assistant/message') {
      const key = `${String(event.data.turn)}:${String(event.data.step)}`
      requestSteps.add(key)
      if (assistantSteps.has(key)) duplicateAssistantStep = true
      assistantSteps.add(key)
    }
    const sample = sampleOf(event)
    if (sample?.buckets !== undefined) assistantSamples.set(sample.key, sample.buckets)
  }

  const result = zeroTokenUsage()
  let arithmeticComplete = true
  for (const samples of [assistantSamples, compactionSamples]) {
    for (const buckets of samples.values()) {
      for (const field of [
        'uncached_input_tokens',
        'output_tokens',
        'cache_read_tokens',
        'cache_write_tokens',
      ]) {
        const value = checkedSum([result[field], buckets[field]])
        if (value === undefined) arithmeticComplete = false
        else result[field] = value
      }
    }
  }
  const total = checkedSum([
    result.uncached_input_tokens,
    result.output_tokens,
    result.cache_read_tokens,
    result.cache_write_tokens,
  ])
  if (total === undefined) arithmeticComplete = false
  else result.total_tokens = total
  result.proposed_steps = requestSteps.size
  result.assistant_steps = assistantSteps.size
  result.metered_steps = [...assistantSteps]
    .filter(key => assistantSamples.has(key)).length
  result.compaction_steps = compactionSteps.size
  result.metered_compaction_steps = [...compactionSteps]
    .filter(key => compactionSamples.has(key)).length
  const unmatchedRequestSteps = [...requestSteps]
    .filter(key => !assistantSteps.has(key))
  const openStepKey = openStep === undefined
    ? undefined
    : `${String(openStep.turn)}:${String(openStep.step)}`
  const requestStepsComplete = unmatchedRequestSteps.every(
    key => key === openStepKey || budgetBlockedSteps.has(key),
  )
  result.complete = requestStepsComplete
    && result.assistant_steps === result.metered_steps
    && result.compaction_steps === result.metered_compaction_steps
    && arithmeticComplete
    && !duplicateAssistantStep
    && !duplicateCompactionStep
    && !unattributedCompaction
    && !invalidCompactionTrace
  return result
}

/** Sum disjoint usage buckets while retaining whether every constituent was metered. */
export function sumTokenUsage(...items) {
  const result = zeroTokenUsage()
  let arithmeticComplete = true
  for (const item of items) {
    if (!item) {
      result.complete = false
      continue
    }
    for (const field of [
      'uncached_input_tokens',
      'output_tokens',
      'cache_read_tokens',
      'cache_write_tokens',
      'proposed_steps',
      'assistant_steps',
      'metered_steps',
      'compaction_steps',
      'metered_compaction_steps',
    ]) {
      const value = checkedSum([result[field], item[field]])
      if (value === undefined) arithmeticComplete = false
      else result[field] = value
    }
    result.complete = result.complete && item.complete === true
  }
  const total = checkedSum([
    result.uncached_input_tokens,
    result.output_tokens,
    result.cache_read_tokens,
    result.cache_write_tokens,
  ])
  if (total === undefined) arithmeticComplete = false
  else result.total_tokens = total
  result.complete = result.complete && arithmeticComplete
  return result
}

/** Fold only events created by a fork Worker, excluding its inherited parent seed. */
export function foldWorkerTokenUsage(agent, options = {}) {
  if (!agent?.session || !Array.isArray(agent.session.events)) return null
  const minSeq = agent.session.header?.seedLength ?? 0
  return foldTokenUsage(agent.session.events, { ...options, minSeq })
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined
}

function parseNativeArguments(raw) {
  if (typeof raw !== 'string') return undefined
  try {
    return plainObject(JSON.parse(raw))
  } catch {
    return undefined
  }
}

function workspacePath(raw, cwd) {
  if (typeof raw !== 'string' || raw.length === 0
    || typeof cwd !== 'string' || !isAbsolute(cwd)) return undefined
  const target = isAbsolute(raw) ? normalize(raw) : resolve(cwd, raw)
  const rel = relative(cwd, target)
  if (rel === '') return '.'
  if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`)) return undefined
  return rel.split(sep).join('/')
}

function issueCounter() {
  const issues = new Map()
  return {
    add(code) { issues.set(code, (issues.get(code) ?? 0) + 1) },
    values() {
      return [...issues.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([code, count]) => ({ code, count }))
    },
  }
}

function normalizeActions(events, minSeq) {
  const issues = issueCounter()
  const native = new Map()
  const code = new Map()
  const outer = new Map()
  const actions = []

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]
    const seq = eventSeq(event, index)
    if (seq < minSeq || event?.type !== 'tool/call') continue
    const { callId, name, turn, step } = event.data ?? {}
    if (native.has(callId)) issues.add('duplicate-native-start')
    const args = parseNativeArguments(event.data?.arguments)
    if (args === undefined) issues.add('invalid-native-arguments')
    const action = {
      id: String(callId),
      transport: 'native',
      seq,
      turn: Number.isSafeInteger(turn) ? turn : null,
      step: Number.isSafeInteger(step) ? step : null,
      name: String(name ?? ''),
      args: args ?? {},
      settled: false,
      is_error: null,
    }
    native.set(callId, action)
    if (action.name === 'run_code') outer.set(callId, action)
    else actions.push(action)
  }

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]
    const seq = eventSeq(event, index)
    if (seq < minSeq) continue
    if (event?.type === 'tool/result') {
      // Compaction may append a smaller model-facing replacement for an
      // already-settled result. It is not a second tool execution.
      if (isSurfaceReplacement(event)) continue
      const callId = event.data?.message?.source?.callId
      const start = native.get(callId)
      if (start === undefined) issues.add('unmatched-native-result')
      else if (start.settled) issues.add('duplicate-native-result')
      else {
        const block = event.data?.message?.content?.[0]
        start.settled = true
        if (block?.type !== 'tool-result') issues.add('invalid-native-result')
        else start.is_error = block.isError === true
      }
    } else if (event?.type === 'tool/code-dispatch-start') {
      const { subCallId, rootCallId, name } = event.data ?? {}
      if (code.has(subCallId)) issues.add('duplicate-code-start')
      const root = outer.get(rootCallId)
      if (root === undefined) issues.add('missing-code-root')
      const args = plainObject(event.data?.arguments)
      if (args === undefined) issues.add('invalid-code-arguments')
      const action = {
        id: String(subCallId),
        transport: 'code',
        seq,
        turn: root?.turn ?? null,
        step: root?.step ?? null,
        name: String(name ?? ''),
        args: args ?? {},
        settled: false,
        is_error: null,
      }
      code.set(subCallId, action)
      if (action.name !== 'run_code') actions.push(action)
    } else if (event?.type === 'tool/code-dispatch') {
      const start = code.get(event.data?.subCallId)
      if (start === undefined) issues.add('unmatched-code-result')
      else if (start.settled) issues.add('duplicate-code-result')
      else {
        start.settled = true
        if (typeof event.data?.isError !== 'boolean') issues.add('invalid-code-result')
        else start.is_error = event.data.isError
      }
    }
  }
  for (const start of [...native.values(), ...code.values()]) {
    if (!start.settled) issues.add(`unsettled-${start.transport}-call`)
  }
  actions.sort((left, right) => left.seq - right.seq || left.id.localeCompare(right.id))
  return { actions, issues: issues.values() }
}

function compilePatterns(patterns) {
  if (!Array.isArray(patterns) || patterns.length === 0
    || patterns.some(pattern => typeof pattern !== 'string' || pattern.length === 0)) {
    throw new Error('evaluationPatterns must be a non-empty array of regex source strings')
  }
  return patterns.map((source) => {
    try {
      return new RegExp(source, 'i')
    } catch (error) {
      throw new Error(`invalid evaluation pattern ${JSON.stringify(source)}: ${String(error)}`)
    }
  })
}

function countByName(actions) {
  const counts = new Map()
  for (const action of actions) counts.set(action.name, (counts.get(action.name) ?? 0) + 1)
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, count]) => ({ name, count }))
}

function isWorkspaceInformationAttempt(name, args, cwd) {
  if (CONCRETE_READ_TOOLS.has(name)) {
    return workspacePath(args?.file_path, cwd) !== undefined
  }
  if (SEARCH_TOOLS.has(name)) {
    return workspacePath(args?.path ?? '.', cwd) !== undefined
  }
  if (name !== 'bash') return false
  const command = typeof args?.command === 'string' ? args.command : ''
  return INSPECTION_COMMAND.test(command)
}

/**
 * Project transport-neutral behavior evidence from one durable session log.
 * This function performs lexical parsing only: it never reads, imports, stats,
 * or executes anything in the recorded workspace.
 */
export function foldBehaviorTrajectory(events, options = {}) {
  if (!Array.isArray(events)) throw new Error('events must be an array')
  const minSeq = options.minSeq ?? 0
  if (!Number.isSafeInteger(minSeq) || minSeq < 0) {
    throw new Error('minSeq must be a non-negative safe integer')
  }
  const cwd = options.cwd
  const patternSources = options.evaluationPatterns ?? DEFAULT_EVALUATION_PATTERNS
  const evaluationPatterns = compilePatterns(patternSources)
  const evaluationPatternDigest = createHash('sha256')
    .update(JSON.stringify(patternSources))
    .digest('hex')
  const normalized = normalizeActions(events, minSeq)
  const actions = normalized.actions
  const unclassified = actions.filter(action => !CLASSIFIED_TOOLS.has(action.name))
  const failed = actions.filter(action => action.is_error === true)
  const unsettled = actions.filter(action => !action.settled)

  let firstEdit
  const preEditConcretePaths = new Set()
  const preEditSearchRoots = new Set()
  const editedPaths = new Set()
  let concreteReadCalls = 0
  let searchCalls = 0
  let shellCalls = 0
  let editToolAttempts = 0
  let workspaceEditAttempts = 0
  let preEditWorkspaceInformationAttempts = 0
  let preEditInspectionCandidates = 0
  let evaluationIntents = 0
  let postEditEvaluationIntents = 0
  let editEvaluateCycles = 0
  let evaluationToEditSwitches = 0
  let dirtySinceEvaluation = false
  let evaluationSinceEdit = false

  for (const action of actions) {
    const beforeFirstEdit = firstEdit === undefined
    if (CONCRETE_READ_TOOLS.has(action.name)) {
      concreteReadCalls += 1
      const path = workspacePath(action.args.file_path, cwd)
      if (beforeFirstEdit && path !== undefined) {
        preEditWorkspaceInformationAttempts += 1
        preEditConcretePaths.add(path)
      }
      continue
    }
    if (SEARCH_TOOLS.has(action.name)) {
      searchCalls += 1
      const root = workspacePath(action.args.path ?? '.', cwd)
      if (beforeFirstEdit && root !== undefined) {
        preEditWorkspaceInformationAttempts += 1
        preEditSearchRoots.add(root)
      }
      continue
    }
    if (action.name === 'bash') {
      shellCalls += 1
      const command = typeof action.args.command === 'string' ? action.args.command : ''
      if (beforeFirstEdit && INSPECTION_COMMAND.test(command)) preEditInspectionCandidates += 1
      if (!evaluationPatterns.some(pattern => pattern.test(command))) continue
      evaluationIntents += 1
      if (firstEdit !== undefined) postEditEvaluationIntents += 1
      if (dirtySinceEvaluation) {
        editEvaluateCycles += 1
        dirtySinceEvaluation = false
      }
      evaluationSinceEdit = true
      continue
    }
    if (EDIT_TOOLS.has(action.name)) {
      editToolAttempts += 1
      const path = workspacePath(action.args.file_path, cwd)
      if (path === undefined) continue
      if (firstEdit === undefined) firstEdit = { ...action, path }
      workspaceEditAttempts += 1
      editedPaths.add(path)
      if (evaluationSinceEdit) evaluationToEditSwitches += 1
      dirtySinceEvaluation = true
      evaluationSinceEdit = false
    }
  }

  const firstEditSeq = firstEdit?.seq ?? Number.POSITIVE_INFINITY
  const preEditUsage = foldTokenUsage(events, { minSeq, maxSeq: firstEditSeq })
  return {
    schema: 'dsh-modus-behavior-trajectory-v1',
    classifier: BEHAVIOR_CLASSIFIER,
    evaluation_patterns_sha256: evaluationPatternDigest,
    path_semantics: PATH_SEMANTICS,
    structurally_complete: normalized.issues.length === 0,
    structural_issues: normalized.issues,
    semantic_limitations: [
      'bash-mutations-are-not-observable',
      'paths-are-lexical-not-realpath-qualified',
      'evaluation-is-command-intent-not-test-outcome',
      'tool-attempts-and-non-error-settlements-are-not-workspace-state',
    ],
    unclassified_tool_calls: countByName(unclassified),
    failed_tool_calls: countByName(failed),
    unsettled_tool_calls: countByName(unsettled),
    first_typed_workspace_edit_attempt: {
      observed: firstEdit !== undefined,
      seq: firstEdit?.seq ?? null,
      turn: firstEdit?.turn ?? null,
      step: firstEdit?.step ?? null,
      path: firstEdit?.path ?? null,
    },
    pre_edit_usage: preEditUsage,
    pre_edit_workspace_information_attempts: preEditWorkspaceInformationAttempts,
    pre_edit_inspection_command_candidates: preEditInspectionCandidates,
    pre_edit_information_attempts:
      preEditWorkspaceInformationAttempts + preEditInspectionCandidates,
    pre_edit_concrete_read_paths: [...preEditConcretePaths].sort(),
    pre_edit_search_roots: [...preEditSearchRoots].sort(),
    concrete_read_attempts: concreteReadCalls,
    search_attempts: searchCalls,
    shell_attempts: shellCalls,
    edit_tool_attempts: editToolAttempts,
    workspace_edit_attempts: workspaceEditAttempts,
    attempted_workspace_edit_paths: [...editedPaths].sort(),
    evaluation_command_intents: evaluationIntents,
    post_edit_evaluation_command_intents: postEditEvaluationIntents,
    attempted_edit_evaluate_cycles: editEvaluateCycles,
    attempted_evaluation_to_edit_switches: evaluationToEditSwitches,
  }
}

/** Project only behavior created by a fork Worker, excluding its parent seed. */
export function foldWorkerBehaviorTrajectory(agent, options = {}) {
  if (!agent?.session || !Array.isArray(agent.session.events)) return null
  const minSeq = agent.session.header?.seedLength ?? 0
  return foldBehaviorTrajectory(agent.session.events, {
    minSeq,
    cwd: agent.session.header?.cwd,
    ...options,
  })
}

/**
 * Decide whether one pending information call may run before the first typed
 * workspace edit. Durable actions are the authority; the pending call is
 * counted exactly once whether or not its transport start was already logged.
 */
export function evaluatePreEditInformationGate(events, options = {}) {
  if (!Array.isArray(events)) throw new Error('events must be an array')
  const minSeq = options.minSeq ?? 0
  if (!Number.isSafeInteger(minSeq) || minSeq < 0) {
    throw new Error('minSeq must be a non-negative safe integer')
  }
  const maxAttempts = options.maxAttempts
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 0) {
    throw new Error('maxAttempts must be a non-negative safe integer')
  }
  const pending = plainObject(options.pending)
  if (pending === undefined || typeof pending.name !== 'string') {
    throw new Error('pending must contain a tool name')
  }
  const pendingArgs = plainObject(pending.arguments) ?? {}
  const trajectory = foldBehaviorTrajectory(events, {
    minSeq,
    cwd: options.cwd,
    evaluationPatterns: options.evaluationPatterns,
  })
  const normalized = normalizeActions(events, minSeq)
  const pendingId = pending.callId === undefined ? '' : String(pending.callId)
  const alreadyRecorded = pendingId.length > 0
    && normalized.actions.some(action => action.id === pendingId)
  const pendingInformation = isWorkspaceInformationAttempt(
    pending.name,
    pendingArgs,
    options.cwd,
  )
  const editObserved = trajectory.first_typed_workspace_edit_attempt.observed
  const attempts = trajectory.pre_edit_information_attempts
    + (!editObserved && pendingInformation && !alreadyRecorded ? 1 : 0)
  const limitReached = !editObserved && pendingInformation && attempts > maxAttempts
  return {
    schema: 'dsh-modus-pre-edit-information-gate-v1',
    max_attempts: maxAttempts,
    observed_attempts: attempts,
    first_edit_observed: editObserved,
    pending_is_information: pendingInformation,
    pending_already_recorded: alreadyRecorded,
    next_tool_allowed: !limitReached,
    state: limitReached ? 'limit-reached' : 'within',
  }
}

/** Evaluate a configured Router+Worker budget from already-folded usage. */
export function evaluateRouteTokenBudget(router, worker, limits, options = {}) {
  const observed = sumTokenUsage(router, worker)
  const newTokensValue = checkedSum([
    observed.uncached_input_tokens,
    observed.output_tokens,
  ])
  const newTokens = newTokensValue ?? Number.MAX_SAFE_INTEGER
  let state = 'within'
  if (!observed.complete || newTokensValue === undefined) state = 'usage-incomplete'
  else if (newTokens >= limits.maxNewTokens
    || observed.cache_read_tokens >= limits.maxCacheReadTokens) state = 'limit-reached'
  return {
    schema: 'dsh-modus-route-token-budget-v1',
    limits: {
      new_tokens: limits.maxNewTokens,
      cache_read_tokens: limits.maxCacheReadTokens,
    },
    observed: {
      new_tokens: newTokens,
      cache_read_tokens: observed.cache_read_tokens,
      complete: observed.complete && newTokensValue !== undefined,
    },
    state,
    next_request_allowed: state === 'within',
    locally_enforced: options.locallyEnforced === true,
  }
}
