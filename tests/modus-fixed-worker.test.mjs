import assert from 'node:assert/strict'
import test from 'node:test'

import {
  apply,
  resolveFixedWorkerConfig,
} from '../presets/modus/plugins/modus-fixed-worker.mjs'


const EMPTY_SHA = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
const P000_SHA = '4430eff8d5b732333319f93bf0a699c3593f6e6d708296d304c76c7161f67282'

function nativeCall(seq, callId, name, args) {
  return {
    seq,
    type: 'tool/call',
    data: { turn: 1, step: 1, callId, name, arguments: JSON.stringify(args) },
  }
}

function nativeResult(seq, callId, isError = false) {
  return {
    seq,
    type: 'tool/result',
    data: {
      turn: 1,
      step: 1,
      message: {
        source: { kind: 'tool', callId },
        content: [{ type: 'tool-result', toolCallId: callId, isError, content: [] }],
      },
    },
  }
}

function harness(profile = 'p000') {
  const handlers = new Map()
  const restrictions = []
  let lifts = 0
  const agent = {
    session: {
      header: {
        agentPreset: `modus-fixed-${profile}`,
        cwd: '/workspace',
      },
      events: [],
    },
    ctx: {
      tools: {
        restrict(value) {
          restrictions.push(value)
          return () => { lifts += 1 }
        },
      },
    },
  }
  let cleanup
  const ctx = {
    tools: {
      schemas() {
        return ['read', 'edit', 'ask_user_question', 'subagent_fork'].map(name => ({ name }))
      },
    },
    agents: { list() { return [agent] } },
    effect(factory) { cleanup = factory() },
    on(event, handler) { handlers.set(event, handler) },
  }
  apply(ctx, {
    presetId: `modus-fixed-${profile}`,
    profile,
    profileDigest: profile === 'neutral' ? EMPTY_SHA : P000_SHA,
    ...(profile === 'neutral' ? {} : { maxPreEditInformationAttempts: 3 }),
  })
  return { agent, handlers, restrictions, cleanup: () => cleanup(), lifts: () => lifts }
}

test('fixed Worker config keeps neutral untreated and qualifies p000', () => {
  const neutral = resolveFixedWorkerConfig({
    presetId: 'modus-fixed-neutral',
    profile: 'neutral',
    profileDigest: EMPTY_SHA,
  })
  assert.equal(neutral.maxPreEditInformationAttempts, undefined)
  const p000 = resolveFixedWorkerConfig({
    presetId: 'modus-fixed-p000',
    profile: 'p000',
    profileDigest: P000_SHA,
    maxPreEditInformationAttempts: 3,
    tokenBudget: { maxNewTokens: 100, maxCacheReadTokens: 1_000 },
  })
  assert.equal(p000.maxPreEditInformationAttempts, 3)
  assert.equal(p000.tokenBudget.maxNewTokens, 100)
  assert.throws(
    () => resolveFixedWorkerConfig({
      presetId: 'modus-fixed-neutral', profile: 'neutral', profileDigest: EMPTY_SHA,
      maxPreEditInformationAttempts: 3,
    }),
    /neutral must not/,
  )
  assert.throws(
    () => resolveFixedWorkerConfig({
      presetId: 'modus-fixed-p000', profile: 'p000', profileDigest: P000_SHA,
    }),
    /maxPreEditInformationAttempts/,
  )
})

test('qualified fixed Worker denies the fourth pre-edit read and lifts after edit', async () => {
  const runtime = harness('p000')
  assert.deepEqual(runtime.restrictions, [{ deny: ['ask_user_question', 'subagent_fork'] }])
  runtime.agent.session.events.push(
    nativeCall(0, 'read-a', 'read', { file_path: 'src/a.ts' }),
    nativeResult(1, 'read-a'),
    nativeCall(2, 'read-b', 'read', { file_path: 'src/b.ts' }),
    nativeResult(3, 'read-b'),
    nativeCall(4, 'read-c', 'read', { file_path: 'src/c.ts' }),
    nativeResult(5, 'read-c'),
  )
  const signal = new AbortController().signal
  const denied = await runtime.handlers.get('tools/pre-execute')({
    agent: runtime.agent,
    callId: 'read-d',
    name: 'read',
    arguments: { file_path: 'src/d.ts' },
    signal,
  }, async () => ({ kind: 'allow' }))
  assert.equal(denied.kind, 'deny')
  assert.match(denied.reason, /MODUS_PRE_EDIT_INFORMATION_LIMIT/)
  assert.deepEqual(runtime.restrictions, [
    { deny: ['ask_user_question', 'subagent_fork'] },
    { deny: ['read'] },
  ])

  runtime.agent.session.events.push(
    nativeCall(6, 'edit-a', 'edit', { file_path: 'src/a.ts' }),
    nativeResult(7, 'edit-a'),
  )
  const allowed = await runtime.handlers.get('tools/pre-execute')({
    agent: runtime.agent,
    callId: 'read-after',
    name: 'read',
    arguments: { file_path: 'src/d.ts' },
    signal,
  }, async () => ({ kind: 'allow' }))
  assert.deepEqual(allowed, { kind: 'allow' })
  assert.equal(runtime.lifts(), 1)
  runtime.cleanup()
  assert.equal(runtime.lifts(), 2)
})

test('neutral fixed Worker retains the same tool surface without behavior denial', async () => {
  const runtime = harness('neutral')
  runtime.agent.session.events.push(
    nativeCall(0, 'read-a', 'read', { file_path: 'src/a.ts' }),
    nativeResult(1, 'read-a'),
    nativeCall(2, 'read-b', 'read', { file_path: 'src/b.ts' }),
    nativeResult(3, 'read-b'),
    nativeCall(4, 'read-c', 'read', { file_path: 'src/c.ts' }),
    nativeResult(5, 'read-c'),
  )
  const allowed = await runtime.handlers.get('tools/pre-execute')({
    agent: runtime.agent,
    callId: 'read-d',
    name: 'read',
    arguments: { file_path: 'src/d.ts' },
    signal: new AbortController().signal,
  }, async () => ({ kind: 'allow' }))
  assert.deepEqual(allowed, { kind: 'allow' })
})

test('fixed Worker HMR reconstructs and later lifts the information-tool lock', () => {
  const runtime = harness('p000')
  runtime.agent.session.events.push(
    nativeCall(0, 'read-a', 'read', { file_path: 'src/a.ts' }),
    nativeResult(1, 'read-a'),
    nativeCall(2, 'read-b', 'read', { file_path: 'src/b.ts' }),
    nativeResult(3, 'read-b'),
    nativeCall(4, 'read-c', 'read', { file_path: 'src/c.ts' }),
    nativeResult(5, 'read-c'),
    nativeCall(6, 'read-d', 'read', { file_path: 'src/d.ts' }),
    nativeResult(7, 'read-d', true),
  )
  runtime.handlers.get('agent/session-start')({ agent: runtime.agent })
  assert.deepEqual(runtime.restrictions.at(-1), { deny: ['read'] })

  runtime.agent.session.events.push(
    nativeCall(8, 'edit-a', 'edit', { file_path: 'src/a.ts' }),
    nativeResult(9, 'edit-a'),
  )
  runtime.handlers.get('agent/session-start')({ agent: runtime.agent })
  assert.deepEqual(runtime.restrictions.at(-1), {
    deny: ['ask_user_question', 'subagent_fork'],
  })
})
