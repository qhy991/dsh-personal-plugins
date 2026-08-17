import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { KersorViewerService } from '../src/service.ts'

const dirs: string[] = []

async function fixture(events: string | undefined): Promise<{ workspace: string; runDir: string }> {
  const workspace = await mkdtemp(path.join(tmpdir(), 'kersor-viewer-service-'))
  dirs.push(workspace)
  const session = path.join(workspace, '.kersor', 'session')
  const runDir = path.join(session, 'autonomous-runs', 'run-1')
  await mkdir(path.join(runDir, '.runtime'), { recursive: true })
  await writeFile(path.join(session, 'session-config.json'), '{}')
  await writeFile(path.join(session, 'state.json'), '{}')
  await writeFile(path.join(runDir, '.runtime', 'summary.json'), '{"workflow_status":"completed"}')
  if (events !== undefined) await writeFile(path.join(runDir, '.runtime', 'events.jsonl'), events)
  return { workspace, runDir }
}

async function settleBackfill(service: KersorViewerService, runDir: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const observation = service.snapshot().diagnostics.runs.find(run => run.runDir === runDir)
    if (observation?.state !== 'waiting') return
    await new Promise((resolve) => { setTimeout(resolve, 10) })
  }
  throw new Error('backfill did not settle')
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('Host snapshot', () => {
  it('refuses detail reads outside the discovered classic Session inventory', async () => {
    const ctx = new Context()
    ctx.provide('workspaceRegistry', { list: () => [] } as never)
    const service = new KersorViewerService(ctx, {
      noDefaultRoots: true, classicSessionLimit: 0,
    })

    await expect(service.classicSessionDetail('/sessions/not-discovered')).resolves.toBeUndefined()
  })

  it('keeps terminal lifecycle while exposing a missing backfill as structured failure', async () => {
    const { workspace, runDir } = await fixture(undefined)
    const ctx = new Context()
    ctx.provide('workspaceRegistry', { list: () => [{ path: workspace }] } as never)
    const service = new KersorViewerService(ctx, {
      noDefaultRoots: true, classicSessionLimit: 0,
    })

    await service.rescan()
    await settleBackfill(service, runDir)

    expect(service.runBacklog(runDir)?.status).toBe('completed')
    expect(service.snapshot()).toMatchObject({
      runs: [{ runDir, discovery: 'completed' }],
      classic: { sessions: [], source: { state: 'disabled' } },
      diagnostics: {
        scan: { state: 'healthy', roots: [{ origin: 'workspace', runsFound: 1 }] },
        runs: [{
          runDir, mode: 'backfill', state: 'failed',
          lastIssue: { stage: 'backfill_read', code: 'not_found' },
        }],
      },
    })
  })

  it('rejects an invalid event without losing later valid events or exposing content', async () => {
    const secret = 'SECRET-EVENT-CONTENT'
    const { workspace, runDir } = await fixture([
      '{"type":"workflow.started"}',
      `{"secret":"${secret}"}`,
      '{"type":"workflow.completed"}',
      '',
    ].join('\n'))
    const ctx = new Context()
    ctx.provide('workspaceRegistry', { list: () => [{ path: workspace }] } as never)
    const service = new KersorViewerService(ctx, {
      noDefaultRoots: true, classicSessionLimit: 0,
    })

    await service.rescan()
    await settleBackfill(service, runDir)
    const snapshot = service.snapshot()

    expect(service.runBacklog(runDir)?.status).toBe('completed')
    expect(snapshot.diagnostics.runs[0]).toMatchObject({
      state: 'degraded', linesRead: 3, linesRejected: 1,
      lastIssue: { stage: 'event_parse', code: 'invalid_payload' },
    })
    expect(JSON.stringify(snapshot)).not.toContain(secret)
  })
})
