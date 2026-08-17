import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { installedBridge, readClassicSessions } from '../src/classic.ts'

const dirs: string[] = []
const originalDshHome = process.env.DSH_HOME
const originalKersorPython = process.env.KERSOR_PYTHON

async function tempDshHome(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'kersor-classic-'))
  dirs.push(dir)
  return dir
}

afterEach(async () => {
  if (originalDshHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = originalDshHome
  if (originalKersorPython === undefined) delete process.env.KERSOR_PYTHON
  else process.env.KERSOR_PYTHON = originalKersorPython
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('classic Session bridge diagnostics', () => {
  it('distinguishes a bridge that is not installed from an empty inventory', async () => {
    process.env.DSH_HOME = await tempDshHome()
    expect(await readClassicSessions(20)).toEqual({
      sessions: [], source: { state: 'not_installed' },
    })
  })

  it('projects warning counts without forwarding warning content', async () => {
    process.env.DSH_HOME = await tempDshHome()
    process.env.KERSOR_PYTHON = 'python3'
    const bridge = installedBridge()
    await mkdir(path.dirname(bridge), { recursive: true })
    await writeFile(bridge, `
import json
print(json.dumps({"sessions": [{
  "session_id": "s1", "session_dir": "/sessions/s1", "storage_kind": "v2",
  "lifecycle": "active", "status": "in-progress", "health": "active",
  "kernel_language": "python_reference", "backend": "python",
  "integration_pattern": "custom_simulator",
  "allow_workflow_authoring": True, "workflow_authoring_budget": 1,
  "workflow": "vliw-schedule", "fit_confidence": "high",
  "decision": "CONTINUE: measure the candidate",
  "warnings": ["SECRET-SESSION-WARNING"], "extra": "SECRET-EXTRA-FIELD"
}], "warnings": ["SECRET-BRIDGE-WARNING"]}))
`)

    const snapshot = await readClassicSessions(1)
    expect(snapshot).toMatchObject({
      sessions: [{
        session_id: 's1',
        kernel_language: 'python_reference',
        backend: 'python',
        integration_pattern: 'custom_simulator',
        allow_workflow_authoring: true,
        workflow_authoring_budget: 1,
        workflow: 'vliw-schedule',
        fit_confidence: 'high',
        decision: 'CONTINUE: measure the candidate',
        warningCount: 1,
      }],
      source: { state: 'degraded', lastIssue: { stage: 'classic_bridge', code: 'io_error' } },
    })
    expect(JSON.stringify(snapshot)).not.toContain('SECRET')
  })

  it('classifies malformed bridge output without forwarding stdout', async () => {
    process.env.DSH_HOME = await tempDshHome()
    process.env.KERSOR_PYTHON = 'python3'
    const bridge = installedBridge()
    await mkdir(path.dirname(bridge), { recursive: true })
    await writeFile(bridge, 'print("{SECRET-MALFORMED")\n')

    const snapshot = await readClassicSessions(1)
    expect(snapshot.source).toMatchObject({
      state: 'failed', lastIssue: { stage: 'classic_bridge', code: 'invalid_json' },
    })
    expect(JSON.stringify(snapshot)).not.toContain('SECRET')
  })

  it('contains invalid task-routing fields at the classic source boundary', async () => {
    process.env.DSH_HOME = await tempDshHome()
    process.env.KERSOR_PYTHON = 'python3'
    const bridge = installedBridge()
    await mkdir(path.dirname(bridge), { recursive: true })
    await writeFile(bridge, `
import json
print(json.dumps({"sessions": [{
  "session_id": "s1", "session_dir": "/sessions/s1", "storage_kind": "v2",
  "lifecycle": "active", "status": "in-progress", "health": "active",
  "decision": {"raw": "SECRET-DECISION"}, "warnings": []
}]}))
`)

    const snapshot = await readClassicSessions(1)
    expect(snapshot).toEqual({
      sessions: [],
      source: {
        state: 'failed',
        lastIssue: expect.objectContaining({ stage: 'classic_bridge', code: 'invalid_payload' }),
      },
    })
    expect(JSON.stringify(snapshot)).not.toContain('SECRET')
  })
})
