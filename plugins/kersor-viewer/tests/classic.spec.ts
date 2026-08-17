import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { installedBridge, readClassicSessions } from '../src/classic.ts'

const dirs: string[] = []
const originalDshHome = process.env.DSH_HOME

async function tempDshHome(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'kersor-classic-'))
  dirs.push(dir)
  return dir
}

afterEach(async () => {
  if (originalDshHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = originalDshHome
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
    await mkdir(path.dirname(bridge), { recursive: true })
    await writeFile(bridge, `
import json
print(json.dumps({"sessions": [{
  "session_id": "s1", "session_dir": "/sessions/s1", "storage_kind": "legacy",
  "phase": "optimizing", "lifecycle": "active", "status": "pre-round-1",
  "health": "active", "current_round": 1,
  "warnings": []
}]}))
`)
    await chmod(bridge, 0o755)
    const snapshot = await readClassicSessions(1)
    expect(snapshot.sessions).toHaveLength(1)
    expect(snapshot.sessions[0]).toMatchObject({
      session_id: 's1', lifecycle: 'active', status: 'pre-round-1', health: 'active',
    })
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
