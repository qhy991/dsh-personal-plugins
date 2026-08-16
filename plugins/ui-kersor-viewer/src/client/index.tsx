/**
 * KerSor viewer browser half: sidebar run-inventory panel fed by the forwarded
 * `kersor/event` Host frames and the `kersorViewer` remote namespace.
 * @module @deepseek-ai/dsh-client-ui-kersor-viewer/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
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

/** Required services: slot registry, locale, and the assembled KerSor remotes. */
export const inject = ['slots', 'locale', 'remote', 'remote.kersor', 'remote.kersorViewer']

/** Mount the KerSor viewer surfaces over the Host inventory and event stream. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'kersor-viewer: dictionaries')

  const store = new KersorViewerStore()

  const refreshViewer = async (): Promise<void> => {
    try {
      const answered = await ctx.remote.kersorViewer.listRuns()
      if (!answered.ok) {
        store.setError(`${answered.error.code}: ${answered.error.message}`)
        return
      }
      store.setInventory(answered.value)
      const selected = store.selectedRunDir
      if (selected !== undefined) {
        const backlog = await ctx.remote.kersorViewer.runBacklog(selected)
        if (backlog.ok) store.setBacklog(selected, backlog.value)
      }
    } catch (error) {
      store.setError(error instanceof Error ? error.message : String(error))
    }
  }

  const refreshLauncher = async (): Promise<void> => {
    try {
      const [tasks, active] = await Promise.all([
        ctx.remote.kersor.listTasks(),
        ctx.remote.kersor.listActive(),
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
    try {
      const answered = await ctx.remote.kersor.start(taskId)
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
      const answered = await ctx.remote.kersor.stop(runDir)
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

  ctx.remote.$on('kersor/event', (frame: KersorViewerFrame) => {
    store.applyFrame(frame)
  })
  ctx.remote.$on('kersor/active', (frame: KersorActiveFrame) => {
    store.applyActiveFrame(frame)
  })
  ctx.on('connection/reset', () => {
    store.reset()
    void refresh()
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
