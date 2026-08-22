/**
 * Client-safe KerSor launcher types: configured task identities, active
 * process receipts, and the forwarded active-launch frame.
 * @module @deepseek-ai/dsh-kersor/types
 */
import type { Branded } from '@deepseek-ai/dsh-brand';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** Opaque identity of one Mission registered in the plugin config. */
export type KersorTaskId = Branded<'KersorTaskId'>;
/** Opaque KerSor autonomous run identity generated for one launch. */
export type KersorRunId = Branded<'KersorRunId'>;
/** Stable identity of one KerSor experiment bound to a dsh conversation. */
export type KersorExperimentId = Branded<'KersorExperimentId'>;
/** Immutable typed launch inputs for one KerSor experiment. */
export interface KersorLaunchContract {
    readonly backend: string;
    readonly language: string;
    readonly integration_pattern: string;
    readonly target_speedup: number;
    readonly max_workflows: number;
    readonly mode: 'auto' | 'guided' | 'explore';
    readonly workflow_authoring_budget: number;
    readonly retrieval_mode: 'on' | 'off';
    readonly transfer_mode: 'full' | 'measured-only' | 'off';
    readonly experience_mode: 'on' | 'off';
    readonly kernelwiki_experience_export_mode: 'on' | 'off';
    readonly correctness_command: string;
    readonly benchmark_command: string;
}
/**
 * Validate and copy one launch contract into canonical field order.
 * @param value - candidate plain JSON value.
 * @param label - error-path prefix.
 * @returns the validated contract without normalizing strings or numbers.
 */
export declare function parseKersorLaunchContract(value: unknown, label?: string): KersorLaunchContract;
/** Durable lifecycle projected into the owning dsh conversation. */
export type KersorExperimentStatus = 'provisioning' | 'running' | 'waiting' | 'blocked' | 'completed' | 'cancelled';
/** One artifact-derived KerSor stage rendered in the conversation. */
export interface KersorExperimentStep {
    readonly id: string;
    readonly status: 'pending' | 'active' | 'completed' | 'failed';
}
/** Immutable start of one conversation-owned KerSor experiment. */
export interface KersorExperimentStartEventData {
    readonly experimentId: KersorExperimentId;
    readonly childSessionId: SessionId;
    readonly origin: 'created' | 'attached';
    readonly objective: string;
    readonly freshSession: boolean;
    /** Optional immutable typed launch authority; absent on legacy bindings. */
    readonly launch?: KersorLaunchContract;
    readonly turn: number;
    readonly step: number;
}
/** Replayable latest-value checkpoint for one conversation-owned experiment. */
export interface KersorExperimentCheckpointEventData {
    readonly experimentId: KersorExperimentId;
    readonly childSessionId: SessionId;
    /** Monotonic latest-value revision within this experiment. */
    readonly revision: number;
    readonly status: KersorExperimentStatus;
    readonly kersorSessionId?: string;
    readonly phase?: string;
    readonly currentRound?: number;
    readonly maxWorkflows?: number;
    readonly workflow?: string;
    readonly bestSpeedup?: number;
    readonly targetSpeedup?: number;
    readonly nextAction?: string;
    readonly steps: readonly KersorExperimentStep[];
}
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
declare module '@deepseek-ai/dsh-session/types' {
    interface SessionEventMap {
        /**
         * Binds one KerSor experiment and its continuable dsh child to this
         * conversation before child materialization begins.
         * @param data - stable identities, frozen request, and Chat location.
         */
        'kersor/experiment-start': KersorExperimentStartEventData;
        /**
         * Replaces the visible lifecycle projection for one earlier experiment
         * binding. Revisions increase by one and remain a projection of KerSor's
         * canonical files rather than a second experiment state authority.
         * @param data - latest controller-owned checkpoint for the experiment.
         */
        'kersor/experiment-checkpoint': KersorExperimentCheckpointEventData;
    }
}
//# sourceMappingURL=types.d.ts.map