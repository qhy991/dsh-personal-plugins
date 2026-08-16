// The scanner: session-v2 recognition (session-config.json + state.json),
// autonomous-runs discovery, summary-based classification, and quiet skips
// for absent roots.

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { scanRoots } from '../src/scanner.ts'

const dirs: string[] = []

async function tempRoot(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'kersor-scan-'))
  dirs.push(dir)
  return dir
}

async function makeSession(root: string, name: string): Promise<string> {
  const sessionDir = path.join(root, name)
  await mkdir(sessionDir, { recursive: true })
  await writeFile(path.join(sessionDir, 'session-config.json'), '{}')
  await writeFile(path.join(sessionDir, 'state.json'), '{}')
  return sessionDir
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('run discovery', () => {
  it('finds runs under session-v2 directories and classifies by summary', async () => {
    const root = await tempRoot()
    const active = await makeSession(root, 'sess-active')
    const done = await makeSession(root, 'sess-done')
    const waiting = await makeSession(root, 'sess-waiting')
    const failed = await makeSession(root, 'sess-failed')

    const activeRun = path.join(active, 'autonomous-runs', '20260814T100000Z')
    await mkdir(path.join(activeRun, '.runtime'), { recursive: true })
    await writeFile(path.join(activeRun, '.runtime', 'events.jsonl'), '{"type":"workflow.started"}\n')

    const doneRun = path.join(done, 'autonomous-runs', '20260813T090000Z')
    await mkdir(path.join(doneRun, '.runtime'), { recursive: true })
    await writeFile(path.join(doneRun, '.runtime', 'summary.json'), JSON.stringify({ workflow_status: 'completed' }))

    // Controller can also stop 'waiting' (awaiting external input); the host
    // summary is written either way, so the run is terminal, not active.
    const waitingRun = path.join(waiting, 'autonomous-runs', '20260813T093000Z')
    await mkdir(path.join(waitingRun, '.runtime'), { recursive: true })
    await writeFile(path.join(waitingRun, '.runtime', 'summary.json'), JSON.stringify({ status: 'completed', workflow_status: 'waiting' }))

    const failedRun = path.join(failed, 'autonomous-runs', '20260813T080000Z')
    await mkdir(path.join(failedRun, '.runtime'), { recursive: true })
    // workflow-host's failure summary writes `status: 'error'` (no workflow_status).
    await writeFile(path.join(failedRun, '.runtime', 'summary.json'), JSON.stringify({ status: 'error' }))

    const found = await scanRoots([root], false)
    const byDir = new Map(found.map(ref => [ref.runDir, ref]))
    expect(byDir.size).toBe(4)
    expect(byDir.get(activeRun)!.discovery).toBe('active')
    expect(byDir.get(doneRun)!.discovery).toBe('completed')
    expect(byDir.get(waitingRun)!.discovery).toBe('completed')
    expect(byDir.get(failedRun)!.discovery).toBe('failed')
    expect(byDir.get(activeRun)!.runId).toBe('20260814T100000Z')
    expect(byDir.get(activeRun)!.sessionDir).toBe(active)
  })

  it('skips directories that are not session v2', async () => {
    const root = await tempRoot()
    const plain = path.join(root, 'plain-dir')
    const legacy = path.join(root, 'legacy')
    await mkdir(path.join(plain, 'autonomous-runs'), { recursive: true })
    await mkdir(path.join(legacy, 'autonomous-runs'), { recursive: true })
    await writeFile(path.join(legacy, 'state.json'), '{}') // config missing
    const found = await scanRoots([root], false)
    expect(found).toEqual([])
  })

  it('stays quiet for an absent root', async () => {
    const found = await scanRoots([path.join(tmpdir(), 'kersor-no-such-root-xyz')], false)
    expect(found).toEqual([])
  })

  it('reuses the checkout pointer written by the installed KerSor preset', async () => {
    const dshHome = await tempRoot()
    const checkout = await tempRoot()
    const session = await makeSession(path.join(checkout, '.kersor'), 'sess-recorded')
    const runDir = path.join(session, 'autonomous-runs', '20260817T010000Z')
    await mkdir(path.join(runDir, '.runtime'), { recursive: true })
    const pointer = path.join(dshHome, '.agent-presets', 'kersor', '.local')
    await mkdir(pointer, { recursive: true })
    await writeFile(path.join(pointer, 'kersor-root'), `${checkout}\n`)

    const previous = process.env.DSH_HOME
    process.env.DSH_HOME = dshHome
    try {
      const found = await scanRoots([], true)
      expect(found.some(ref => ref.runDir === runDir)).toBe(true)
    } finally {
      if (previous === undefined) delete process.env.DSH_HOME
      else process.env.DSH_HOME = previous
    }
  })
})
