/**
 * Client-safe KerSor launcher types: configured task identities, active
 * process receipts, and the forwarded active-launch frame.
 * @module @deepseek-ai/dsh-kersor/types
 */
import type { Branded } from '@deepseek-ai/dsh-brand';
/** Opaque identity of one Mission registered in the plugin config. */
export type KersorTaskId = Branded<'KersorTaskId'>;
/** Opaque KerSor autonomous run identity generated for one launch. */
export type KersorRunId = Branded<'KersorRunId'>;
/** Browser-safe description of one configured Mission. */
export interface KersorTaskRef {
    readonly id: KersorTaskId;
    readonly label: string;
}
/** One launcher process that dsh still owns. */
export interface KersorActiveLaunch {
    readonly taskId: KersorTaskId;
    readonly runId: KersorRunId;
    readonly runDir: string;
    readonly startedTs: string;
    readonly pid: number;
}
/** Replaced active-launch inventory pushed to browser consumers. */
export interface KersorActiveFrame {
    readonly kind: 'active';
    readonly launches: KersorActiveLaunch[];
}
declare module '@deepseek-ai/cordis' {
    interface Events {
        /**
         * Current KerSor processes owned by the launcher.
         * @param frame - complete replacement of the active-launch inventory.
         * @mode emit
         */
        'kersor/active'(frame: KersorActiveFrame): void;
    }
}
//# sourceMappingURL=types.d.ts.map