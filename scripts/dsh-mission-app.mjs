/** One frozen KerSor command, hosted by the selected source DSH profile. */
import {randomUUID} from 'node:crypto'
import path from 'node:path'
import {pathToFileURL} from 'node:url'

export const name = 'kersor-mission-app'
export const inject = ['agents', 'sessions', 'commands', 'agentPresets', 'agentDefaultModel', 'llm']

export async function run(ctx, config) {
  for (const key of ['harnessRoot', 'workspace', 'contract']) {
    if (typeof config[key] !== 'string' || !path.isAbsolute(config[key])) {
      throw new Error(`kersor-mission-app requires an absolute ${key}`)
    }
  }
  await ctx.get('loader')?.await()
  // Import the public Agent helper from this selected source checkout, not the
  // removed headless runDirectCommand export or an older profile dependency.
  const {installModelSelection} = await import(pathToFileURL(
    path.join(config.harnessRoot, 'packages/core/agent/lib/index.js'),
  ).href)
  const selection = {...ctx.get('agentDefaultModel').currentSelection(),
    provider: 'infini-ai', model: 'kimi-k3'}
  const model = await ctx.get('llm').resolveModelInfo(selection.provider, selection.model)
  const {agent} = await ctx.get('agents').create({
    sessionId: `session-${randomUUID()}`,
    meta: {cwd: config.workspace, agentPreset: 'kersor'},
    agentOptions: {provider: selection.provider, model: selection.model},
    setup: async agentCtx => {
      installModelSelection(agentCtx, {current: selection, assembled: undefined})
      await ctx.get('agentPresets').mount(agentCtx, 'kersor')
    },
  })
  await agent.whenIdle()
  process.stderr.write(JSON.stringify({event: 'kersor_host_ready', session_id: agent.session.id,
    provider: selection.provider, model: model.id, context_window: model.contextWindow,
    workspace: config.workspace, contract: config.contract}) + '\n')
  const controller = new AbortController()
  const stop = () => controller.abort(new Error('KerSor application interrupted'))
  process.once('SIGTERM', stop)
  process.once('SIGINT', stop)
  try {
    const args = {contract: config.contract, runtime: 'dsh',
      ...(config.resumeRun ? {run_dir: config.resumeRun, resume: true} : {})}
    const execution = await ctx.get('commands').execute(agent,
      '/kersor-evolve ' + JSON.stringify(args), [], controller.signal)
    if (!execution) throw new Error('KerSor preset did not register /kersor-evolve')
    const result = JSON.parse(execution.result.text)
    if (!result || typeof result.status !== 'string') throw new Error('KerSor returned no terminal status')
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
