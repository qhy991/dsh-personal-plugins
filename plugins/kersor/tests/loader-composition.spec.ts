import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import LocalCredentialProvider from '@deepseek-ai/dsh-credentials-local'
import LocalSubprocessRuntime from '@deepseek-ai/dsh-subprocess-local'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import KersorService from '../src/index.ts'
import type { KersorTaskId } from '../src/types.ts'

let root: string | undefined
let ctx: Context | undefined

afterEach(async () => {
  await ctx?.fiber.dispose()
  ctx = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

describe('KerSor launcher through a real Loader composition', () => {
  it('resolves a stored credential, starts an owned process tree, and stops it', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dsh-kersor-loader-'))
    const kersorRoot = path.join(root, 'kersor')
    const workspace = path.join(root, 'workspace')
    const session = path.join(root, 'session')
    const receipt = path.join(root, 'receipt.txt')
    const credentials = path.join(root, 'credentials.yaml')
    const mission = path.join(root, 'mission.json')
    const config = path.join(root, 'cordis.yml')
    await Promise.all([
      mkdir(path.join(kersorRoot, 'scripts'), { recursive: true }),
      mkdir(workspace),
      mkdir(session),
    ])
    const runner = path.join(kersorRoot, 'scripts', 'run-autonomous-workflow.py')
    await writeFile(runner, [
      '#!/bin/sh',
      'if [ "$TEST_API_KEY" = "loader-secret" ]; then forwarded=yes; else forwarded=no; fi',
      '{',
      '  printf "credential=%s\\n" "$forwarded"',
      '  printf "%s\\n" "$@"',
      '} > "$FAKE_RECEIPT"',
      "trap 'exit 0' TERM INT",
      'while :; do sleep 1; done',
      '',
    ].join('\n'))
    await writeFile(credentials, 'TEST_API_KEY: loader-secret\n', { mode: 0o600 })
    await chmod(credentials, 0o600)
    await writeFile(mission, JSON.stringify({
      contract_version: 'kersor-mission-v1',
      workspace,
      session,
      runtime: 'codex',
    }))
    await writeFile(config, [
      "- name: '@deepseek-ai/dsh-credentials-local'",
      '  config:',
      `    path: ${JSON.stringify(credentials)}`,
      '    watch: false',
      "- name: '@deepseek-ai/dsh-subprocess-local'",
      "- name: '@deepseek-ai/dsh-kersor'",
      '  config:',
      `    root: ${JSON.stringify(kersorRoot)}`,
      '    python: /bin/sh',
      '    tasks:',
      '      - id: memo',
      '        label: Memo',
      `        mission: ${JSON.stringify(mission)}`,
      '    credentialRefs:',
      '      - TEST_API_KEY',
      '    env:',
      `      FAKE_RECEIPT: ${JSON.stringify(receipt)}`,
      '    stopGraceMs: 100',
      '',
    ].join('\n'))

    ctx = await loadComposition(config)
    expect(remoteMethods(ctx.kersor).map(marker => marker.method))
      .toEqual(['listTasks', 'listActive', 'start', 'stop'])
    const launch = await ctx.kersor.start('memo' as KersorTaskId)
    await vi.waitFor(async () => {
      expect(await readFile(receipt, 'utf8')).toContain('credential=yes')
    }, { timeout: 5_000 })
    const received = await readFile(receipt, 'utf8')
    expect(received).toContain(`--mission\n${mission}\n`)
    expect(received).toContain(`--session\n${session}\n`)
    expect(received).toContain(`--project-root\n${workspace}\n`)
    expect(ctx.kersor.listActive()).toEqual([launch])

    await expect(ctx.kersor.stop(launch.runDir)).resolves.toBe(true)
    expect(ctx.kersor.listActive()).toEqual([])
  })
})

async function loadComposition(configPath: string): Promise<Context> {
  const result = new Context()
  result.baseUrl = pathToFileURL(root as string).href + '/'
  await result.plugin(Loader)
  result.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-credentials-local', LocalCredentialProvider],
    ['@deepseek-ai/dsh-subprocess-local', LocalSubprocessRuntime],
    ['@deepseek-ai/dsh-kersor', KersorService],
  ])
  result.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof result.loader.internal>
  await result.loader.create({
    name: 'cordis:include',
    config: { path: pathToFileURL(configPath).href },
  })
  await result.loader.await()
  const unloaded = [...result.loader.entries()]
    .filter(entry => entry.fiber === undefined && !entry.disabled)
    .map(entry => entry.options.name)
  expect(unloaded).toEqual([])
  return result
}
