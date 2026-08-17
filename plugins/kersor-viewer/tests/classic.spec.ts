import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { installedBridge, readClassicSessions } from '../src/classic.ts'

const dirs: string[] = []
const originalDshHome = process.env.DSH_HOME
const originalArgvCapture = process.env.KERSOR_ARGV_CAPTURE

async function tempDshHome(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'kersor-classic-'))
  dirs.push(dir)
  return dir
}

afterEach(async () => {
  if (originalDshHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = originalDshHome
  if (originalArgvCapture === undefined) delete process.env.KERSOR_ARGV_CAPTURE
  else process.env.KERSOR_ARGV_CAPTURE = originalArgvCapture
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('classic Session bridge', () => {
  it('is optional when the portable preset is not installed', async () => {
    process.env.DSH_HOME = await tempDshHome()
    expect(await readClassicSessions(20)).toEqual({ sessions: [] })
  })

  it('invokes the installed bridge without a shell and validates rows', async () => {
    process.env.DSH_HOME = await tempDshHome()
    const bridge = installedBridge()
    const capture = path.join(process.env.DSH_HOME, 'argv.json')
    process.env.KERSOR_ARGV_CAPTURE = capture
    await mkdir(path.dirname(bridge), { recursive: true })
    await writeFile(bridge, `
import json
import os
import sys
open(os.environ["KERSOR_ARGV_CAPTURE"], "w").write(json.dumps(sys.argv[1:]))
print(json.dumps({"sessions": [{
  "session_id": "s1", "session_dir": "/sessions/s1", "storage_kind": "legacy",
  "phase": "optimizing", "lifecycle": "active", "status": "pre-round-1",
  "health": "active", "current_round": 1,
  "warnings": []
}]}))
`)
    await chmod(bridge, 0o755)
    const snapshot = await readClassicSessions(1, 45, {
      includeCheckoutRoot: false,
      sessionRoots: ['/configured/sessions'],
      workspaceRoots: ['/registered/workspace'],
    })
    expect(snapshot.sessions).toHaveLength(1)
    expect(snapshot.sessions[0]).toMatchObject({
      session_id: 's1', lifecycle: 'active', status: 'pre-round-1', health: 'active',
    })
    expect(JSON.parse(await readFile(capture, 'utf8'))).toEqual([
      'sessions', '--limit', '1', '--stale-after', '45',
      '--root', '/configured/sessions', '--workspace', '/registered/workspace',
      '--no-checkout-root',
    ])
  })

  it('rejects malformed bridge projections', async () => {
    process.env.DSH_HOME = await tempDshHome()
    const bridge = installedBridge()
    await mkdir(path.dirname(bridge), { recursive: true })
    await writeFile(bridge, 'print(\'{"sessions":[{"session_id":1}]}\')\n')
    const snapshot = await readClassicSessions(1)
    expect(snapshot.sessions).toEqual([])
    expect(snapshot.warning).toMatch(/invalid session inventory/)
  })

  it('forwards the bridge adapter warning without dropping valid rows', async () => {
    process.env.DSH_HOME = await tempDshHome()
    const bridge = installedBridge()
    await mkdir(path.dirname(bridge), { recursive: true })
    await writeFile(bridge, `
import json
print(json.dumps({"sessions": [], "warnings": ["session root unavailable"]}))
`)
    expect(await readClassicSessions(1)).toEqual({
      sessions: [], warning: 'session root unavailable',
    })
  })
})
