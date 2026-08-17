// The browser store: how inventory frames, folded run frames, and backlog
// answers compose into the panel's snapshot.

import { describe, expect, it } from 'vitest'
import type { KersorViewerFrame } from '@deepseek-ai/dsh-kersor-viewer/types'
import type { KersorRunView } from '@deepseek-ai/dsh-kersor-viewer/types'
import type { KersorActiveFrame, KersorRunId, KersorTaskId } from '@deepseek-ai/dsh-kersor/types'
import { KersorViewerStore } from '../src/client/store.ts'

const REF = {
  runId: 'r1', runDir: '/runs/r1', sessionDir: '/sessions/s1', root: '/root', discovery: 'active',
} as const

function runFrame(status: 'running' | 'completed' | 'failed' = 'running'): KersorViewerFrame {
  return { kind: 'run', run: runView(status) }
}

function runView(status: 'running' | 'completed' | 'failed' = 'running'): KersorRunView {
  return {
    runId: 'r1', runDir: '/runs/r1', sessionDir: '/sessions/s1',
    status, currentPhase: 'Setup',
    phases: [{ title: 'Setup', index: 0, status: 'running', calls: [] }],
    totals: { calls: 0, completed: 0, failed: 0, tokens: 0 },
  }
}

describe('inventory', () => {
  it('starts loading; setInventory replaces rows and clears loading', () => {
    const store = new KersorViewerStore()
    expect(store.getSnapshot().loading).toBe(true)
    store.setInventory([REF])
    expect(store.getSnapshot().rows).toHaveLength(1)
    expect(store.getSnapshot().loading).toBe(false)
  })

  it('keeps classic optimization Sessions separate from autonomous runs', () => {
    const store = new KersorViewerStore()
    store.setClassic({
      sessions: [{
        session_id: '20260817-120000',
        session_dir: '/sessions/20260817-120000',
        storage_kind: 'legacy',
        phase: 'optimizing',
        lifecycle: 'active',
        current_round: 2,
        max_workflows: 4,
        best_speedup: 1.25,
        warnings: [],
      }],
    })
    expect(store.getSnapshot().classicSessions[0]).toMatchObject({
      session_id: '20260817-120000', lifecycle: 'active', best_speedup: 1.25,
    })
    expect(store.getSnapshot().rows).toEqual([])
  })

  it('replaces and clears the non-fatal classic bridge warning', () => {
    const store = new KersorViewerStore()
    store.setClassic({ sessions: [], warning: 'bridge unavailable' })
    expect(store.getSnapshot().classicWarning).toBe('bridge unavailable')
    store.setClassic({ sessions: [] })
    expect(store.getSnapshot().classicWarning).toBeUndefined()
  })

  it('a runs frame replaces the inventory but keeps folded views', () => {
    const store = new KersorViewerStore()
    store.applyFrame(runFrame())
    store.applyFrame({ kind: 'runs', runs: [REF] })
    const row = store.getSnapshot().rows[0]!
    expect(row.discovery).toBe('active')
    expect(row.view?.currentPhase).toBe('Setup')
  })
})

describe('folded run frames', () => {
  it('a run frame for an unknown run appends a row', () => {
    const store = new KersorViewerStore()
    store.applyFrame(runFrame())
    expect(store.getSnapshot().rows).toHaveLength(1)
    expect(store.activeView?.runDir).toBe('/runs/r1')
  })

  it('selecting a run pins the detail view', () => {
    const store = new KersorViewerStore()
    store.setInventory([REF, { ...REF, runId: 'r2', runDir: '/runs/r2' }])
    store.select('/runs/r2')
    expect(store.selectedRunDir).toBe('/runs/r2')
    store.applyFrame({ kind: 'run', run: { ...runView('completed'), runId: 'r2', runDir: '/runs/r2' } })
    expect(store.activeView?.runId).toBe('r2')
    expect(store.activeView?.status).toBe('completed')
  })
})

describe('backlog and reset', () => {
  it('setBacklog attaches the view without dropping the inventory', () => {
    const store = new KersorViewerStore()
    store.setInventory([REF])
    store.setBacklog('/runs/r1', runView('completed'))
    expect(store.getSnapshot().rows[0]!.view?.status).toBe('completed')
  })

  it('reset returns to the loading state', () => {
    const store = new KersorViewerStore()
    store.setInventory([REF])
    store.select('/runs/r1')
    store.reset()
    expect(store.getSnapshot().loading).toBe(true)
    expect(store.selectedRunDir).toBeUndefined()
  })
})

describe('optional launcher composition', () => {
  it('keeps configured tasks separate from the viewer run inventory', () => {
    const store = new KersorViewerStore()
    store.setInventory([REF])
    store.setLauncher([{ id: 'memo' as KersorTaskId, label: 'Memo' }], [])
    expect(store.getSnapshot()).toMatchObject({
      rows: [{ runId: 'r1' }],
      launcher: { tasks: [{ id: 'memo', label: 'Memo' }], active: [] },
    })
  })

  it('replaces owned processes from an active frame and hides unavailable controls', () => {
    const store = new KersorViewerStore()
    store.setLauncher([{ id: 'memo' as KersorTaskId, label: 'Memo' }], [])
    store.applyActiveFrame({
      kind: 'active',
      launches: [{
        taskId: 'memo' as KersorTaskId,
        runId: 'r2' as KersorRunId,
        runDir: '/runs/r2',
        startedTs: '2026-08-16T00:00:00.000Z',
        pid: 42,
      }],
    } satisfies KersorActiveFrame)
    expect(store.getSnapshot().launcher?.active[0]?.runId).toBe('r2')
    store.setLauncherUnavailable()
    expect(store.getSnapshot().launcher).toBeUndefined()
  })

  it('ignores active frames until the optional launcher is confirmed', () => {
    const store = new KersorViewerStore()
    store.applyActiveFrame({ kind: 'active', launches: [] })
    expect(store.getSnapshot().launcher).toBeUndefined()
  })
})

describe('errors', () => {
  it('records the message and clears loading', () => {
    const store = new KersorViewerStore()
    store.setError('ECONNREFUSED')
    expect(store.getSnapshot().error).toBe('ECONNREFUSED')
    expect(store.getSnapshot().loading).toBe(false)
  })

  it('keeps launcher failures out of viewer read state', () => {
    const store = new KersorViewerStore()
    store.setLauncher([{ id: 'memo' as KersorTaskId, label: 'Memo' }], [])
    store.setLauncherError('spawn failed')
    expect(store.getSnapshot().launcher?.error).toBe('spawn failed')
    expect(store.getSnapshot().error).toBeUndefined()
  })
})
