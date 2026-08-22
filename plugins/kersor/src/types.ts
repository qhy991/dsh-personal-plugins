/**
 * Client-safe KerSor launcher types: configured task identities, active
 * process receipts, and the forwarded active-launch frame.
 * @module @deepseek-ai/dsh-kersor/types
 */

import type { Branded } from '@deepseek-ai/dsh-brand'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** Opaque identity of one Mission registered in the plugin config. */
export type KersorTaskId = Branded<'KersorTaskId'>

/** Opaque KerSor autonomous run identity generated for one launch. */
export type KersorRunId = Branded<'KersorRunId'>

/** Stable identity of one KerSor experiment bound to a dsh conversation. */
export type KersorExperimentId = Branded<'KersorExperimentId'>

/** Immutable typed launch inputs for one KerSor experiment. */
export interface KersorLaunchContract {
  readonly backend: string
  readonly language: string
  readonly integration_pattern: string
  readonly target_speedup: number
  readonly max_workflows: number
  readonly mode: 'auto' | 'guided' | 'explore'
  readonly workflow_authoring_budget: number
  readonly retrieval_mode: 'on' | 'off'
  readonly transfer_mode: 'full' | 'measured-only' | 'off'
  readonly experience_mode: 'on' | 'off'
  readonly kernelwiki_experience_export_mode: 'on' | 'off'
  readonly correctness_command: string
  readonly benchmark_command: string
}

const LAUNCH_KEYS = new Set([
  'backend',
  'language',
  'integration_pattern',
  'target_speedup',
  'max_workflows',
  'mode',
  'workflow_authoring_budget',
  'retrieval_mode',
  'transfer_mode',
  'experience_mode',
  'kernelwiki_experience_export_mode',
  'correctness_command',
  'benchmark_command',
])

function launchRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be a plain JSON object`)
  }
  const prototype: unknown = Object.getPrototypeOf(value)
  if (prototype !== null && prototype !== Object.prototype) {
    throw new TypeError(`${label} must be a plain JSON object`)
  }
  const record = value as Record<string, unknown>
  const unknown = Object.keys(record).find(key => !LAUNCH_KEYS.has(key))
  if (unknown !== undefined) throw new TypeError(`${label} has unknown field ${JSON.stringify(unknown)}`)
  for (const key of LAUNCH_KEYS) {
    if (!Object.hasOwn(record, key)) throw new TypeError(`${label}.${key} is required`)
  }
  return record
}

function launchText(record: Record<string, unknown>, key: string, label: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${label}.${key} must be a non-empty string`)
  }
  return value
}

function launchCommand(record: Record<string, unknown>, key: string, label: string): string {
  const value = launchText(record, key, label)
  if (/[\r\n\u2028\u2029]/u.test(value)) {
    throw new TypeError(`${label}.${key} must be a single-line string`)
  }
  return value
}

function launchEnum<const T extends string>(
  record: Record<string, unknown>,
  key: string,
  values: readonly T[],
  label: string,
): T {
  const value = record[key]
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new TypeError(`${label}.${key} must be one of ${values.join(', ')}`)
  }
  return value as T
}

function launchPositiveNumber(record: Record<string, unknown>, key: string, label: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${label}.${key} must be a positive finite number`)
  }
  return value
}

function launchInteger(
  record: Record<string, unknown>,
  key: string,
  minimum: number,
  label: string,
): number {
  const value = record[key]
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new TypeError(`${label}.${key} must be a safe integer greater than or equal to ${minimum}`)
  }
  return value as number
}

/**
 * Validate and copy one launch contract into canonical field order.
 * @param value - candidate plain JSON value.
 * @param label - error-path prefix.
 * @returns the validated contract without normalizing strings or numbers.
 */
export function parseKersorLaunchContract(
  value: unknown,
  label = 'KerSor launch contract',
): KersorLaunchContract {
  const record = launchRecord(value, label)
  return {
    backend: launchText(record, 'backend', label),
    language: launchText(record, 'language', label),
    integration_pattern: launchText(record, 'integration_pattern', label),
    target_speedup: launchPositiveNumber(record, 'target_speedup', label),
    max_workflows: launchInteger(record, 'max_workflows', 1, label),
    mode: launchEnum(record, 'mode', ['auto', 'guided', 'explore'], label),
    workflow_authoring_budget: launchInteger(record, 'workflow_authoring_budget', 0, label),
    retrieval_mode: launchEnum(record, 'retrieval_mode', ['on', 'off'], label),
    transfer_mode: launchEnum(record, 'transfer_mode', ['full', 'measured-only', 'off'], label),
    experience_mode: launchEnum(record, 'experience_mode', ['on', 'off'], label),
    kernelwiki_experience_export_mode: launchEnum(
      record,
      'kernelwiki_experience_export_mode',
      ['on', 'off'],
      label,
    ),
    correctness_command: launchCommand(record, 'correctness_command', label),
    benchmark_command: launchCommand(record, 'benchmark_command', label),
  }
}

/** Durable lifecycle projected into the owning dsh conversation. */
export type KersorExperimentStatus =
  | 'provisioning'
  | 'running'
  | 'waiting'
  | 'blocked'
  | 'completed'
  | 'cancelled'

/** One artifact-derived KerSor stage rendered in the conversation. */
export interface KersorExperimentStep {
  readonly id: string
  readonly status: 'pending' | 'active' | 'completed' | 'failed'
}

/** Immutable start of one conversation-owned KerSor experiment. */
export interface KersorExperimentStartEventData {
  readonly experimentId: KersorExperimentId
  readonly childSessionId: SessionId
  readonly origin: 'created' | 'attached'
  readonly objective: string
  readonly freshSession: boolean
  /** Optional immutable typed launch authority; absent on legacy bindings. */
  readonly launch?: KersorLaunchContract
  readonly turn: number
  readonly step: number
}

/** Replayable latest-value checkpoint for one conversation-owned experiment. */
export interface KersorExperimentCheckpointEventData {
  readonly experimentId: KersorExperimentId
  readonly childSessionId: SessionId
  /** Monotonic latest-value revision within this experiment. */
  readonly revision: number
  readonly status: KersorExperimentStatus
  readonly kersorSessionId?: string
  readonly phase?: string
  readonly currentRound?: number
  readonly maxWorkflows?: number
  readonly workflow?: string
  readonly bestSpeedup?: number
  readonly targetSpeedup?: number
  readonly nextAction?: string
  readonly steps: readonly KersorExperimentStep[]
}

/** Browser-safe description of one configured Mission. */
export interface KersorTaskRef {
  readonly id: KersorTaskId
  readonly label: string
}

/** One launcher process that dsh still owns. */
export interface KersorActiveLaunch {
  readonly taskId: KersorTaskId
  readonly runId: KersorRunId
  readonly runDir: string
  readonly startedTs: string
  readonly pid: number
}

/** Replaced active-launch inventory pushed to browser consumers. */
export interface KersorActiveFrame {
  readonly kind: 'active'
  readonly launches: KersorActiveLaunch[]
}

declare module '@deepseek-ai/cordis' {
  interface Events {
    /**
     * Current KerSor processes owned by the launcher.
     * @param frame - complete replacement of the active-launch inventory.
     * @mode emit
     */
    'kersor/active'(frame: KersorActiveFrame): void
  }
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * Binds one KerSor experiment and its continuable dsh child to this
     * conversation before child materialization begins.
     * @param data - stable identities, frozen request, and Chat location.
     */
    'kersor/experiment-start': KersorExperimentStartEventData
    /**
     * Replaces the visible lifecycle projection for one earlier experiment
     * binding. Revisions increase by one and remain a projection of KerSor's
     * canonical files rather than a second experiment state authority.
     * @param data - latest controller-owned checkpoint for the experiment.
     */
    'kersor/experiment-checkpoint': KersorExperimentCheckpointEventData
  }
}
