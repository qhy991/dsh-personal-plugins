/**
 * KerSor viewer browser half: sidebar run-inventory panel refreshed through
 * generated viewer and optional launcher Remote namespaces.
 * @module @deepseek-ai/dsh-client-ui-kersor-viewer/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import launcherContribution from '@deepseek-ai/dsh-kersor/remote'
import type {} from '@deepseek-ai/dsh-kersor/remote'
import viewerContribution from '@deepseek-ai/dsh-kersor-viewer/remote'
import type {} from '@deepseek-ai/dsh-kersor-viewer/remote'
import type { KersorTaskId } from '@deepseek-ai/dsh-kersor/types'
import { KersorPanel } from './KersorPanel.tsx'
import { KersorViewerStore } from './store.ts'
import type { KersorPanelFace } from './slots.ts'
import { en, NS, zh } from './locales.ts'
import type { KersorViewerKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** KerSor viewer panel copy. */
    kersorViewer: KersorViewerKey
  }
}

export type { KersorPanelFace } from './slots.ts'
export type { KersorViewerState, KersorViewerStore, KersorRunRow } from './store.ts'
export { KersorViewerStore as KersorViewerStoreClass } from './store.ts'
export { NS }
export type { KersorViewerKey } from './locales.ts'

/** Required services: viewer UI seams and the generic Remote carrier. */
export const inject = ['slots', 'locale', 'remote']

/** Mount the KerSor viewer surfaces over Host snapshot remotes. */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  // Own the generated contributions here so a third-party install does not
  // need to edit dsh's core Remote assembly. The viewer is required; the
  // launcher remains optional and hides its controls after an unavailable call.
  const remoteDisposers = [await ctx.remote.$mount(viewerContribution)]
  try {
    remoteDisposers.push(await ctx.remote.$mount(launcherContribution))
  } catch {
    // Read-only viewer mode remains useful without a launcher namespace.
  }

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'kersor-viewer: dictionaries')

  const store = new KersorViewerStore()

  const launcherRemote = (): ClientContext['remote']['kersor'] | undefined =>
    ctx.get('remote.kersor') as ClientContext['remote']['kersor'] | undefined

  const viewerRemote = (): ClientContext['remote']['kersorViewer'] => {
    const remote = ctx.get('remote.kersorViewer') as ClientContext['remote']['kersorViewer'] | undefined
    if (remote === undefined) throw new Error('KerSor viewer Remote is not mounted')
    return remote
  }

  const refreshViewer = async (): Promise<void> => {
    try {
      const remote = viewerRemote()
      const answered = await remote.listRuns()
      if (!answered.ok) {
        store.setError(`${answered.error.code}: ${answered.error.message}`)
        return
      }
      store.setInventory(answered.value)
      const selected = store.selectedRunDir
      if (selected !== undefined) {
        const backlog = await remote.runBacklog(selected)
        if (backlog.ok) store.setBacklog(selected, backlog.value)
      }
    } catch (error) {
      store.setError(error instanceof Error ? error.message : String(error))
    }
  }

  const refreshLauncher = async (): Promise<void> => {
    const launcher = launcherRemote()
    if (launcher === undefined) {
      store.setLauncherUnavailable()
      return
    }
    try {
      const [tasks, active] = await Promise.all([
        launcher.listTasks(),
        launcher.listActive(),
      ])
      if (!tasks.ok || !active.ok) {
        store.setLauncherUnavailable()
        return
      }
      store.setLauncher(tasks.value, active.value)
    } catch {
      store.setLauncherUnavailable()
    }
  }

  const refresh = async (): Promise<void> => {
    await Promise.all([refreshViewer(), refreshLauncher()])
  }

  const start = async (taskId: KersorTaskId): Promise<void> => {
    const launcher = launcherRemote()
    if (launcher === undefined) {
      store.setLauncherUnavailable()
      return
    }
    try {
      const answered = await launcher.start(taskId)
      if (!answered.ok) {
        store.setLauncherError(`${answered.error.code}: ${answered.error.message}`)
        return
      }
      await refreshLauncher()
      await refreshViewer()
    } catch (error) {
      store.setLauncherError(error instanceof Error ? error.message : String(error))
    }
  }

  const stop = async (runDir: string): Promise<void> => {
    const launcher = launcherRemote()
    if (launcher === undefined) {
      store.setLauncherUnavailable()
      return
    }
    try {
      const answered = await launcher.stop(runDir)
      if (!answered.ok) {
        store.setLauncherError(`${answered.error.code}: ${answered.error.message}`)
        return
      }
      await refreshLauncher()
      await refreshViewer()
    } catch (error) {
      store.setLauncherError(error instanceof Error ? error.message : String(error))
    }
  }

  ctx.on('connection/reset', () => {
    store.reset()
    void refresh()
  })
  ctx.effect(() => {
    void refresh()
    const timer = setInterval(() => { void refresh() }, 2000)
    return () => { clearInterval(timer) }
  }, 'kersor-viewer: remote snapshot polling')

  const face: KersorPanelFace = { store, refresh, start, stop }
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'kersor-panel',
    locale: NS,
    inject: () => face,
  }, KersorPanel))

  return async () => {
    for (const dispose of remoteDisposers.reverse()) await dispose()
  }
}
