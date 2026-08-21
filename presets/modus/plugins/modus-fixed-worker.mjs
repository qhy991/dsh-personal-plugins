/** Direct fixed-action Modus Worker for matched neutral/p000/p100 experiments. */

import {
  evaluatePreEditInformationGate,
  evaluateRouteTokenBudget,
  foldTokenUsage,
  zeroTokenUsage,
} from '../lib/trajectory.mjs'
import {
  DEFAULT_WORKER_DENIED_TOOLS,
  EXPERIMENTAL_FIXED_PROFILE_IDS,
  FIXED_PRE_EDIT_GATED_PROFILE_IDS,
  PRE_EDIT_INFORMATION_TOOLS,
  QUALIFIED_PROFILE_IDS,
} from '../lib/worker-policy.mjs'


export const name = 'modus-fixed-worker'
export const inject = ['tools', 'agents']

const PROFILE_IDS = Object.freeze([
  'neutral',
  ...QUALIFIED_PROFILE_IDS,
  ...EXPERIMENTAL_FIXED_PROFILE_IDS,
])
const SHA256_PATTERN = /^[0-9a-f]{64}$/

function plainObject(value, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${where} must be an object`)
  }
  return value
}

function exactKeys(value, expected, where) {
  const object = plainObject(value, where)
  const actual = Object.keys(object).sort()
  const wanted = [...expected].sort()
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${where} fields must be exactly: ${wanted.join(', ')}`)
  }
  return object
}

function nonEmptyString(value, where) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${where} must be a non-empty string`)
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

export function resolveFixedWorkerConfig(config = {}) {
  const allowed = [
    'presetId', 'profile', 'profileDigest', 'deniedTools',
    'maxPreEditInformationAttempts', 'tokenBudget', 'evaluationPatterns',
  ]
  const unexpected = Object.keys(config).filter(key => !allowed.includes(key))
  if (unexpected.length > 0) {
    throw new Error(`fixed Worker config contains unsupported fields: ${unexpected.join(', ')}`)
  }
  const presetId = nonEmptyString(config.presetId, 'presetId')
  const profile = nonEmptyString(config.profile, 'profile')
  if (!PROFILE_IDS.includes(profile)) throw new Error(`unsupported fixed Worker profile: ${profile}`)
  const profileDigest = nonEmptyString(config.profileDigest, 'profileDigest')
  if (!SHA256_PATTERN.test(profileDigest)) {
    throw new Error('profileDigest must be a lowercase SHA-256')
  }
  const deniedTools = Object.freeze(stringList(
    config.deniedTools ?? DEFAULT_WORKER_DENIED_TOOLS,
    'deniedTools',
  ))
  let maxPreEditInformationAttempts
  if (!FIXED_PRE_EDIT_GATED_PROFILE_IDS.includes(profile)) {
    if (config.maxPreEditInformationAttempts !== undefined) {
      throw new Error(`${profile} must not configure maxPreEditInformationAttempts`)
    }
  } else {
    maxPreEditInformationAttempts = nonNegativeInteger(
      config.maxPreEditInformationAttempts,
      'maxPreEditInformationAttempts',
    )
  }
  let tokenBudget
  if (config.tokenBudget !== undefined) {
    const value = exactKeys(
      config.tokenBudget,
      ['maxNewTokens', 'maxCacheReadTokens'],
      'tokenBudget',
    )
    tokenBudget = Object.freeze({
      maxNewTokens: nonNegativeInteger(value.maxNewTokens, 'tokenBudget.maxNewTokens'),
      maxCacheReadTokens: nonNegativeInteger(
        value.maxCacheReadTokens,
        'tokenBudget.maxCacheReadTokens',
      ),
    })
  }
  const evaluationPatterns = config.evaluationPatterns === undefined
    ? undefined
    : Object.freeze(stringList(config.evaluationPatterns, 'evaluationPatterns'))
  return Object.freeze({
    presetId,
    profile,
    profileDigest,
    deniedTools,
    maxPreEditInformationAttempts,
    tokenBudget,
    evaluationPatterns,
  })
}

function enforceTokenBudget(agent, config, openStep = undefined) {
  if (config.tokenBudget === undefined) return
  const usage = foldTokenUsage(agent.session.events, { openStep })
  const decision = evaluateRouteTokenBudget(
    zeroTokenUsage(),
    usage,
    config.tokenBudget,
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

function preEditDecision(agent, state, config, exec) {
  if (config.maxPreEditInformationAttempts === undefined) return undefined
  const decision = evaluatePreEditInformationGate(agent.session.events, {
    cwd: agent.session.header?.cwd,
    evaluationPatterns: config.evaluationPatterns,
    maxAttempts: config.maxPreEditInformationAttempts,
    pending: {
      callId: exec.callId,
      name: exec.name,
      arguments: exec.arguments,
    },
  })
  if (decision.first_edit_observed || exec.name === 'edit' || exec.name === 'write') {
    state.deactivateInformationRestriction()
  }
  if (decision.next_tool_allowed) return undefined
  state.activateInformationRestriction()
  return {
    kind: 'deny',
    reason:
      `MODUS_PRE_EDIT_INFORMATION_LIMIT: ${config.profile} used `
      + `${decision.observed_attempts}/${decision.max_attempts} pre-edit information attempts; `
      + 'apply the first bounded edit now, or report that the visible evidence is insufficient',
  }
}

export function apply(ctx, inputConfig) {
  const config = resolveFixedWorkerConfig(inputConfig)
  const fixedWorkers = new WeakMap()
  const activeRestrictions = new Set()
  ctx.effect(() => () => {
    for (const cleanup of [...activeRestrictions]) cleanup()
  }, 'modus-fixed-worker: release restrictions')

  const bind = (agent) => {
    if (agent.session.header.agentPreset !== config.presetId
      || agent.session.header.origin === 'subagent') return
    fixedWorkers.get(agent)?.cleanup()
    const known = new Set(ctx.tools.schemas(agent).map(tool => tool.name))
    const deny = config.deniedTools.filter(tool => known.has(tool))
    const informationTools = PRE_EDIT_INFORMATION_TOOLS.filter(tool => known.has(tool))
    const lift = agent.ctx.tools.restrict({ deny })
    let live = true
    const state = {
      cleanup: undefined,
      informationCleanup: undefined,
      activateInformationRestriction() {
        if (this.informationCleanup !== undefined || informationTools.length === 0) return
        const release = agent.ctx.tools.restrict({ deny: informationTools })
        let active = true
        const cleanup = () => {
          if (!active) return
          active = false
          activeRestrictions.delete(cleanup)
          release()
          if (state.informationCleanup === cleanup) state.informationCleanup = undefined
        }
        this.informationCleanup = cleanup
        activeRestrictions.add(cleanup)
      },
      deactivateInformationRestriction() {
        this.informationCleanup?.()
      },
    }
    const cleanup = () => {
      if (!live) return
      live = false
      activeRestrictions.delete(cleanup)
      state.deactivateInformationRestriction()
      lift()
      if (fixedWorkers.get(agent) === state) fixedWorkers.delete(agent)
    }
    state.cleanup = cleanup
    fixedWorkers.set(agent, state)
    activeRestrictions.add(cleanup)
    if (config.maxPreEditInformationAttempts !== undefined) {
      const trajectory = evaluatePreEditInformationGate(agent.session.events, {
        cwd: agent.session.header?.cwd,
        evaluationPatterns: config.evaluationPatterns,
        maxAttempts: config.maxPreEditInformationAttempts,
        pending: { callId: '__modus_hmr__', name: '__modus_hmr__', arguments: {} },
      })
      if (!trajectory.first_edit_observed
        && trajectory.observed_attempts > trajectory.max_attempts) {
        state.activateInformationRestriction()
      }
    }
  }

  ctx.on('agent/session-start', ({ agent }) => bind(agent))
  ctx.on('agent/disposed', ({ agent }) => fixedWorkers.get(agent)?.cleanup())
  ctx.on('agent/pre-step', async ({ agent }, next) => {
    if (fixedWorkers.has(agent)) enforceTokenBudget(agent, config)
    return next()
  }, { prepend: true })
  ctx.on('agent/request', async ({ agent, turn, step }, next) => {
    if (fixedWorkers.has(agent)) {
      const openStep = Number.isSafeInteger(turn) && turn > 0
        && Number.isSafeInteger(step) && step > 0
        ? { turn, step }
        : undefined
      enforceTokenBudget(agent, config, openStep)
    }
    return next()
  })
  ctx.on('tools/pre-execute', async (exec, next) => {
    if (exec.agent === undefined || !fixedWorkers.has(exec.agent)) return next()
    const decision = preEditDecision(exec.agent, fixedWorkers.get(exec.agent), config, exec)
    return decision ?? next()
  })

  for (const agent of ctx.agents.list()) bind(agent)
}
