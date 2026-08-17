/**
 * Type face of the KerSor viewer: the wire frame and the cordis event the
 * Host half emits. Types only — no runtime code.
 * @module @deepseek-ai/dsh-kersor-viewer/types
 */

import type { KersorRunView } from './fold.ts'
import type { KersorRunRef } from './scanner.ts'

// Re-exported here so every `@Remote` boundary type resolves from the public
// `./types` subpath, as the Typert generator's boundary rule requires.
export type { KersorRunStatus, KersorCallStatus, KersorCallKind, KersorCallView, KersorPhaseView, KersorRunView } from './fold.ts'
export type { KersorRunDiscovery, KersorRunRef } from './scanner.ts'
export type { KersorClassicHealth, KersorClassicLifecycle, KersorClassicSession, KersorClassicSnapshot, KersorClassicStatus } from './classic.ts'

/** Inventory or folded-run frame pushed to browser consumers. */
export type KersorViewerFrame =
  | { kind: 'runs'; runs: KersorRunRef[] }
  | { kind: 'run'; run: KersorRunView }

declare module '@deepseek-ai/cordis' {
  interface Events {
    /**
     * One viewer update: a replaced run inventory or one run's folded view.
     * @param frame - inventory list or folded run view model.
     * @mode emit
     */
    'kersor/event'(frame: KersorViewerFrame): void
  }
}
