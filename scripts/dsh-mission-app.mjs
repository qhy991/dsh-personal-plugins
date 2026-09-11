/** Run one frozen KerSor Mission inside a selected source DSH profile. */
import {randomUUID} from 'node:crypto'
import path from 'node:path'
import {pathToFileURL} from 'node:url'

export const name = 'kersor-mission-app'
export const inject = ['agents', 'sessions', 'commands', 'agentPresets', 'agentDefaultModel', 'llm']

function requiredString(config, key) {
  const value = config[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`kersor-mission-app requires ${key}`)
  }
  return value
}

export async function run(ctx, config) {
  const harnessRoot = requiredString(config, 'harnessRoot')
  const workspace = requiredString(config, 'workspace')
  const contract = requiredString(config, 'contract')
  const provider = requiredString(config, 'provider')
  const modelId = requiredString(config, 'model')
  for (const [key, value] of Object.entries({harnessRoot, workspace, contract})) {
    if (!path.isAbsolute(value)) throw new Error(`kersor-mission-app requires an absolute ${key}`)
  }
  await ctx.get('loader')?.await()
  const {installModelSelection} = await import(pathToFileURL(
    path.join(harnessRoot, 'packages/core/agent/lib/index.js'),
  ).href)
  const selection = {
    ...ctx.get('agentDefaultModel').currentSelection(),
    provider,
    model: modelId,
  }
  const model = await ctx.get('llm').resolveModelInfo(provider, modelId)
  const {agent} = await ctx.get('agents').create({
    sessionId: `session-${randomUUID()}`,
    meta: {cwd: workspace, agentPreset: 'kersor'},
    agentOptions: {provider, model: modelId},
    setup: async agentCtx => {
      installModelSelection(agentCtx, {current: selection, assembled: undefined})
      await ctx.get('agentPresets').mount(agentCtx, 'kersor')
    },
  })
  await agent.whenIdle()
  process.stderr.write(JSON.stringify({
    event: 'kersor_host_ready',
    session_id: agent.session.id,
    provider,
    model: model.id,
    context_window: model.contextWindow,
    workspace,
    contract,
  }) + '\n')
  const controller = new AbortController()
  const stop = () => controller.abort(new Error('KerSor application interrupted'))
  process.once('SIGTERM', stop)
  process.once('SIGINT', stop)
  try {
    const args = {
      contract,
      runtime: 'dsh',
      ...(config.resumeRun ? {run_dir: config.resumeRun, resume: true} : {}),
    }
    const execution = await ctx.get('commands').execute(
      agent,
      '/kersor-evolve ' + JSON.stringify(args),
      [],
      controller.signal,
    )
    if (!execution) throw new Error('KerSor preset did not register /kersor-evolve')
    const result = JSON.parse(execution.result.text)
    if (!result || typeof result.status !== 'string') {
      throw new Error('KerSor returned no terminal status')
    }
    return result
  } finally {
    process.removeListener('SIGTERM', stop)
    process.removeListener('SIGINT', stop)
    await ctx.get('sessions').flush(agent.session)
  }
}

export function apply(ctx, config) {
  ctx.get('appReady').onReady(() => {
    void run(ctx, config).then(result => {
      process.stdout.write(JSON.stringify(result) + '\n')
      ctx.get('appExit')(result.status === 'completed' ? 0 : result.status === 'waiting' ? 75 : 1)
    }).catch(error => {
      process.stderr.write(`kersor-mission-app: ${error.message}\n`)
      ctx.get('appExit')(1)
    })
  })
}
