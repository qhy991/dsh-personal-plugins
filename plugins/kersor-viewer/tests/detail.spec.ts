import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readCallDetail } from '../src/detail.ts'
import type { KersorCallView } from '../src/fold.ts'

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('bounded Workflow call detail', () => {
  it('projects messages and tool names without forwarding tool payloads', async () => {
    const runDir = await mkdtemp(path.join(tmpdir(), 'kersor-call-detail-'))
    dirs.push(runDir)
    const resultsDir = path.join(runDir, '.runtime', 'agent-results')
    await mkdir(resultsDir, { recursive: true })
    const stem = '00002-author-simd-batch-v1'
    await writeFile(path.join(resultsDir, `${stem}.json`), JSON.stringify({
      thread_id: 'thread-123',
      model_role: null,
      isolation: { effective: 'fresh-process' },
      usage: { input_tokens: 12, cached_input_tokens: 3, output_tokens: 4, total_tokens: 16 },
    }))
    await writeFile(path.join(resultsDir, `${stem}.codex-events.jsonl`), [
      JSON.stringify({ type: 'thread.started', thread_id: 'thread-123' }),
      JSON.stringify({
        type: 'item.completed',
        item: { id: 'm1', type: 'agent_message', text: 'candidate analysis' },
      }),
      JSON.stringify({
        type: 'item.completed',
        item: {
          id: 't1', type: 'mcp_tool_call', server: 'node_repl', tool: 'js', status: 'completed',
          arguments: { token: 'SECRET-ARGUMENT' }, result: { text: 'SECRET-RESULT' },
        },
      }),
      JSON.stringify({
        type: 'item.completed',
        item: { id: 'w1', type: 'web_search', query: 'VLIW scheduling' },
      }),
      JSON.stringify({
        type: 'turn.completed',
        usage: { input_tokens: 12, cached_input_tokens: 3, output_tokens: 4 },
      }),
      '',
    ].join('\n'))
    const call: KersorCallView = {
      seq: 2,
      callId: 'Author/author-simd-batch-v1/2',
      label: 'author-simd-batch-v1',
      kind: 'agent',
      status: 'completed',
    }

    const detail = await readCallDetail(runDir, call)

    expect(detail).toMatchObject({
      callId: call.callId,
      runner: 'codex-exec',
      threadId: 'thread-123',
      model: null,
      isolation: 'fresh-process',
      messages: [{ id: 'm1', text: 'candidate analysis' }],
      activities: [
        { id: 't1', kind: 'tool', label: 'node_repl/js', status: 'completed' },
        { id: 'w1', kind: 'web-search', label: 'VLIW scheduling', status: 'completed' },
      ],
      usage: { inputTokens: 12, cachedInputTokens: 3, outputTokens: 4, totalTokens: 16 },
      truncated: false,
    })
    expect(JSON.stringify(detail)).not.toContain('SECRET-ARGUMENT')
    expect(JSON.stringify(detail)).not.toContain('SECRET-RESULT')
  })
})


describe('live worker detail', () => {
  it('keeps recent messages and replaces started tool activity with its completion', async () => {
    const runDir = await mkdtemp(path.join(tmpdir(), 'kersor-live-detail-'))
    dirs.push(runDir)
    const results = path.join(runDir, '.runtime', 'agent-results')
    await mkdir(results, { recursive: true })
    const file = path.join(results, '00001-live.codex-events.jsonl')
    const call: KersorCallView = { seq: 1, callId: 'live/1', label: 'live', kind: 'agent', status: 'running' }
    const events = [
      JSON.stringify({ type: 'thread.started', thread_id: 'live-thread' }),
      ...Array.from({ length: 15 }, (_, n) => JSON.stringify({ type: 'item.completed', item: {
        id: `m${n}`, type: 'agent_message', text: `progress ${n}`,
      } })),
      JSON.stringify({ type: 'item.started', item: {
        id: 'c', type: 'command_execution', command: 'PRIVATE-COMMAND',
      } }),
      '',
    ].join('\n')
    await writeFile(file, events)
    const during = await readCallDetail(runDir, call)
    expect(during?.threadId).toBe('live-thread')
    expect(during?.messages).toHaveLength(12)
    expect(during?.messages.at(-1)?.text).toBe('progress 14')
    expect(during?.activities).toEqual([{ id: 'c', kind: 'tool', label: 'command_execution', status: 'in_progress' }])
    expect(JSON.stringify(during)).not.toContain('PRIVATE-COMMAND')
    await writeFile(file, events + JSON.stringify({ type: 'item.completed', item: {
      id: 'c', type: 'command_execution', status: 'completed', aggregated_output: 'PRIVATE-OUTPUT',
    } }) + '\n' + '{"type":"item.com')
    const after = await readCallDetail(runDir, call)
    expect(after?.activities).toEqual([{ id: 'c', kind: 'tool', label: 'command_execution', status: 'completed' }])
    expect(JSON.stringify(after)).not.toContain('PRIVATE-OUTPUT')
  })

  it('reads the newest complete event after the bounded byte window fills', async () => {
    const runDir = await mkdtemp(path.join(tmpdir(), 'kersor-live-tail-'))
    dirs.push(runDir)
    const results = path.join(runDir, '.runtime', 'agent-results')
    await mkdir(results, { recursive: true })
    await writeFile(path.join(results, '00001-live.codex-events.jsonl'),
      JSON.stringify({ type: 'diagnostic', text: 'x'.repeat(2 * 1024 * 1024) }) + '\n' +
      JSON.stringify({ type: 'item.completed', item: { id: 'latest', type: 'agent_message', text: 'latest progress' } }) + '\n')
    const detail = await readCallDetail(runDir, { seq: 1, callId: 'live/1', label: 'live', kind: 'agent', status: 'running' })
    expect(detail?.messages).toEqual([{ id: 'latest', text: 'latest progress' }])
    expect(detail?.truncated).toBe(true)
  })
})
