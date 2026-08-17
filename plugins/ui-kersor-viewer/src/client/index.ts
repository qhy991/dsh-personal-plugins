/**
 * KerSor viewer browser half: one atomic Host snapshot plus optional launcher
 * process ownership, rendered in the sidebar.
 * @module @deepseek-ai/dsh-client-ui-kersor-viewer/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-kersor/remote'
import type {} from '@deepseek-ai/dsh-kersor-viewer/remote'
import type { KersorViewerFrame } from '@deepseek-ai/dsh-kersor-viewer/types'
import type { KersorActiveFrame, KersorTaskId } from '@deepseek-ai/dsh-kersor/types'
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

/** Required services: viewer UI seams, assembled Remotes, and Host inventory. */
export const inject = ['slots', 'locale', 'remote', 'remote.pluginInventory']

/** Mount the KerSor viewer surfaces over the API assembly's Remote namespaces. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'kersor-viewer: dictionaries')

  const store = new KersorViewerStore()

  const launcherRemote = (): ClientContext['remote']['kersor'] | undefined =>
    ctx.get('remote.kersor') as ClientContext['remote']['kersor'] | undefined

  const viewerRemote = (): ClientContext['remote']['kersorViewer'] => {
    const remote = ctx.get('remote.kersorViewer') as ClientContext['remote']['kersorViewer'] | undefined
    if (remote === undefined) throw new Error('KerSor viewer Remote is not mounted')
    return remote
  }

  const launcherHostAvailable = async (): Promise<boolean> => {
    const answered = await ctx.remote.pluginInventory.list()
    if (!answered.ok) return false
    return answered.value.entries.some(entry =>
      entry.moduleName === '@deepseek-ai/dsh-kersor'
      && entry.enabled
      && entry.fiberPhase === 'active')
  }

  const refreshViewer = async (): Promise<void> => {
    try {
      const remote = viewerRemote()
      const answered = await remote.snapshot()
      if (!answered.ok) {
        store.setTransportError(`${answered.error.code}: ${answered.error.message}`)
        return
      }
      store.setSnapshot(answered.value)
      const selected = store.selectedRunDir
      if (selected !== undefined) {
        const backlog = await remote.runBacklog(selected)
        if (!backlog.ok) {
          store.setTransportError(`${backlog.error.code}: ${backlog.error.message}`)
          return
        }
        store.setBacklog(selected, backlog.value)
      }
    } catch (error) {
      store.setTransportError(error instanceof Error ? error.message : String(error))
    }
  }

  const refreshLauncher = async (): Promise<void> => {
    try {
      const launcher = launcherRemote()
      if (!await launcherHostAvailable() || launcher === undefined) {
        store.setLauncherUnavailable()
        return
      }
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
      // Optional launcher discovery must not disable the read-only viewer.
      store.setLauncherUnavailable()
    }
  }

  const refresh = async (): Promise<void> => {
    await Promise.all([refreshViewer(), refreshLauncher()])
  }

  const start = async (taskId: KersorTaskId): Promise<void> => {
    try {
      const launcher = launcherRemote()
      if (!await launcherHostAvailable() || launcher === undefined) {
        store.setLauncherUnavailable()
        return
      }
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
    try {
      const launcher = launcherRemote()
      if (!await launcherHostAvailable() || launcher === undefined) {
        store.setLauncherUnavailable()
        return
      }
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
  ctx.remote.$on('kersor/event', (frame: KersorViewerFrame) => {
    store.applyFrame(frame)
  })
  ctx.remote.$on('kersor/active', (frame: KersorActiveFrame) => {
    store.applyActiveFrame(frame)
  })
  void refresh()

  const face: KersorPanelFace = { store, refresh, start, stop }
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'kersor-panel',
    locale: NS,
    inject: () => face,
  }, KersorPanel))

}
