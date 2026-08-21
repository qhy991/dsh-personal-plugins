// @vitest-environment jsdom
/** KerSor is a first-class conversation view beside Chat and Trajectory. */

import { Context, Service } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import type { KersorViewerSnapshot } from '@deepseek-ai/dsh-kersor-viewer/types'
import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import { apply, inject } from '../src/client/index.ts'
import { KersorView } from '../src/client/KersorView.tsx'
import { zh } from '../src/client/locales.ts'
import { KersorViewerStore } from '../src/client/store.ts'

const EMPTY_SNAPSHOT: KersorViewerSnapshot = {
  asOf: '2026-08-21T00:00:00.000Z',
  runs: [],
  classic: { sessions: [], source: { state: 'healthy' } },
  diagnostics: {
    scan: {
      state: 'healthy',
      startedAt: '2026-08-21T00:00:00.000Z',
      completedAt: '2026-08-21T00:00:00.001Z',
      lastSuccessfulAt: '2026-08-21T00:00:00.001Z',
      roots: [],
    },
    runs: [],
  },
}

class RemoteService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'remote')
  }

  $on(): () => void {
    return () => {}
  }
}

afterEach(cleanup)

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'conversation.view': { kind: 'list', scope: 'session' },
      'sidebar.footer.action': { kind: 'list', scope: 'root' },
    },
  } as never, (() => null) as never)
  ctx.provide('locale', new LocaleRuntime(ctx))
  new RemoteService(ctx)
  ctx.provide('remote.pluginInventory', {
    list: () => Promise.resolve({ ok: true, value: { entries: [] } }),
  })
  ctx.provide('remote.kersorViewer', {
    snapshot: () => Promise.resolve({ ok: true, value: EMPTY_SNAPSHOT }),
    runBacklog: () => Promise.resolve({ ok: true, value: undefined }),
    classicSessionDetail: () => Promise.resolve({ ok: true, value: undefined }),
  })
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, fiber }
}

describe('KerSor conversation view registration', () => {
  it('registers beside Chat and Trajectory instead of in the sidebar footer', async () => {
    const b = await bench()
    const entry = b.ctx.slots.entries('conversation.view')[0]
    expect(entry?.options).toMatchObject({ id: 'kersor', order: 20 })
    expect(resolveSlotLabel(entry?.options.label)).toBe('KerSor')
    expect(b.ctx.slots.entries('sidebar.footer.action')).toHaveLength(0)

    await b.fiber.dispose()
    expect(b.ctx.slots.entries('conversation.view')).toHaveLength(0)
  })

  it('visualizes the runtime pipeline, parallel calls, and selected candidate', async () => {
    const store = new KersorViewerStore()
    const runDir = '/sessions/s1/run-1'
    store.setSnapshot({
      ...EMPTY_SNAPSHOT,
      runs: [{
        runId: 'run-1', runDir, sessionDir: '/sessions/s1', root: '/sessions',
        kind: 'classic-round', round: 1, discovery: 'completed',
      }],
    })
    store.applyFrame({
      kind: 'run',
      run: {
        runId: 'run-1', runDir, sessionDir: '/sessions/s1', status: 'completed',
        workflow: 'vliw-bundle-packing-optimization', scriptHash: 'sha256:abc',
        currentPhase: 'Report',
        phases: [
          {
            title: 'Author', index: 0, status: 'completed',
            calls: [
              { seq: 1, callId: 'author/a', label: 'pack-scalar', kind: 'agent', status: 'completed' },
              { seq: 2, callId: 'author/b', label: 'simd-batch', kind: 'agent', status: 'completed' },
              { seq: 3, callId: 'author/c', label: 'simd-pipelined', kind: 'agent', status: 'completed' },
            ],
          },
          { title: 'Review', index: 1, status: 'completed', calls: [] },
        ],
        totals: { calls: 3, completed: 3, failed: 0, tokens: 1000 },
        result: {
          stage: 'awaiting_host_verification', selectedCandidateId: 'simd-batch-v1',
          expectedCycles: 2140, estimatedSpeedup: 69.03, measuredSpeedup: null,
          candidates: [
            { id: 'pack-scalar-v1', expectedCycles: 8700 },
            { id: 'simd-batch-v1', expectedCycles: 2140 },
          ],
        },
      },
    })
    const loadRun = vi.fn(() => Promise.resolve())
    render(<KersorView {...({
      t: makeTranslate(zh, commonZh), store,
      refresh: vi.fn(() => Promise.resolve()),
      loadRun,
      loadClassic: vi.fn(() => Promise.resolve()),
      start: vi.fn(() => Promise.resolve()),
      stop: vi.fn(() => Promise.resolve()),
    } as never)} />)

    expect(screen.getByRole('list', { name: 'Workflow 执行图' })).toBeTruthy()
    expect(screen.getByText('vliw-bundle-packing-optimization')).toBeTruthy()
    expect(screen.getAllByText('pack-scalar').length).toBeGreaterThan(0)
    expect(screen.getAllByText('simd-batch-v1').length).toBeGreaterThan(0)
    expect(screen.getByText('69.03x 预估')).toBeTruthy()
    await waitFor(() => { expect(loadRun).toHaveBeenCalledWith(runDir) })
  })
})
