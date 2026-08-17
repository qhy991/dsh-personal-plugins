/** Slot face types for the KerSor viewer panel. */

import type { KersorViewerStore } from './store.ts'
import type { KersorTaskId } from '@deepseek-ai/dsh-kersor/types'

/** Business props the sidebar footer-action slot injects into the panel. */
export interface KersorPanelFace {
  /** Shared viewer store: inventory + folded run views. */
  readonly store: KersorViewerStore
  /** Re-read the run inventory over the remote. */
  readonly refresh: () => Promise<void>
  /** Load or refresh the sealed inspector projection for one classic Session. */
  readonly loadClassic: (sessionDir: string) => Promise<void>
  /** Start one Host-configured Mission task. */
  readonly start: (taskId: KersorTaskId) => Promise<void>
  /** Stop one launcher process owned by dsh. */
  readonly stop: (runDir: string) => Promise<void>
}
