/**
 * Read-only adapter from the installed KerSor preset bridge to the viewer.
 * @module @deepseek-ai/dsh-kersor-viewer
 */

import { execFile } from 'node:child_process'
import { access } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { createIssue, errorCode, issueFromError } from './diagnostics.ts'
import type { KersorDiagnosticIssue } from './diagnostics.ts'

const execFileAsync = promisify(execFile)

export type KersorClassicLifecycle = 'active' | 'completed' | 'stalled' | 'cancelled'
export type KersorClassicHealth = 'active' | 'stale' | 'needs_resume' | 'terminal' | 'unknown'
export type KersorClassicGate = 'pass' | 'fail' | 'pending' | 'not_required'
export type KersorBaselineAction = 'init' | 'record_verify' | 'new_session'
export type KersorClassicStatus =
  | 'terminal-complete'
  | 'terminal-stalled'
  | 'terminal-cancelled'
  | 'resumable'
  | 'in-progress'
  | 'pre-round-1'

/** One recent optimization Session projected by the canonical KerSor stores. */
export interface KersorClassicSession {
  readonly session_id: string
  readonly session_dir: string
  readonly storage_kind: 'v2' | 'legacy'
  readonly phase?: string | null
  readonly lifecycle: KersorClassicLifecycle
  readonly status: KersorClassicStatus
  readonly health: KersorClassicHealth
  readonly started_at?: string | null
  readonly last_activity_at?: string | null
  readonly current_round?: number | null
  readonly max_workflows?: number | null
  readonly target_speedup?: number | null
  readonly target_met?: boolean | null
  readonly mode?: string | null
  readonly backend?: string | null
  readonly kernel_language?: string | null
  readonly integration_pattern?: string | null
  readonly allow_workflow_authoring?: boolean | null
  readonly workflow_authoring_budget?: number | null
  readonly kernel_name?: string | null
  readonly workflow?: string | null
  /** Outcome of the deterministic selector, separate from a Workflow name. */
  readonly selection_status?: 'pending' | 'stalled' | 'selected' | null
  /** Latest canonical COMPLETE/CONTINUE/STALLED line, when a round has decided. */
  readonly decision?: string | null
  readonly fit_confidence?: string | null
  readonly baseline_witness?: KersorClassicGate | null
  readonly baseline_next_action?: KersorBaselineAction | null
  readonly baseline_reason?: string | null
  readonly dsh_compatibility?: KersorClassicGate | null
  readonly candidate_ownership?: KersorClassicGate | null
  readonly fresh_session?: KersorClassicGate | null
  readonly best_speedup?: number | null
  readonly warningCount: number
}

/** Stable stage identifiers rendered by the classic Session inspector. */
export type KersorClassicStepId =
  | 'setup'
  | 'baseline'
  | 'profile'
  | 'selection'
  | 'authoring'
  | 'validation'
  | 'dispatch'
  | 'measurement'
  | 'decision'

/** Artifact-derived lifecycle of one inspector stage. */
export type KersorClassicStepStatus = 'pending' | 'active' | 'completed' | 'failed'

/** One artifact-derived step in a classic optimization Session. */
export interface KersorClassicStep {
  readonly id: KersorClassicStepId
  readonly status: KersorClassicStepStatus
}

/** Selector outcome kept separate from authored or released Workflow identity. */
export interface KersorClassicSelectionDetail {
  readonly status: 'pending' | 'stalled' | 'selected'
  readonly workflow?: string
  readonly reason?: string
  readonly rejectedCount: number
}

/** One sealed or persisted Workflow file. */
export interface KersorClassicArtifact {
  readonly name: string
  readonly sha256: string
  readonly bytes: number
}

/** Curated routing metadata plus sealed, read-only design text. */
export interface KersorClassicWorkflowDesign {
  readonly name?: string
  readonly technique?: string
  readonly methodCategory?: string
  readonly topology?: string
  readonly requiredArgs: readonly string[]
  readonly languages: readonly string[]
  readonly backends: readonly string[]
  readonly integrationPatterns: readonly string[]
  readonly rationale: string
  readonly source: string
}

/** Foreground authoring state. Design content is absent until the handoff is sealed. */
export interface KersorClassicAuthoringDetail {
  readonly status: 'not_started' | 'in_progress' | 'sealed' | 'saved' | 'rejected'
  readonly files: readonly KersorClassicArtifact[]
  readonly design?: KersorClassicWorkflowDesign
  readonly omittedReason?: 'too_large' | 'invalid' | 'hash_mismatch'
}

/** One deterministic Proposal validation result. */
export interface KersorClassicValidationCheck {
  readonly name: string
  readonly passed: boolean
}

/** Bounded result of the canonical Proposal save validator. */
export interface KersorClassicValidationDetail {
  readonly status: 'pending' | 'passed' | 'failed'
  readonly checks: readonly KersorClassicValidationCheck[]
}

/** Dispatch preparation and Workflow Host lifecycle for the current round. */
export interface KersorClassicDispatchDetail {
  readonly status: 'pending' | 'preparing' | 'running' | 'completed' | 'failed'
  readonly runDir?: string
  readonly runtimeStatus?: string
}

/** On-demand inspector projection for one already-discovered classic Session. */
export interface KersorClassicSessionDetail {
  readonly session_id: string
  readonly session_dir: string
  readonly current_round: number
  readonly steps: readonly KersorClassicStep[]
  readonly selection: KersorClassicSelectionDetail
  readonly authoring: KersorClassicAuthoringDetail
  readonly validation: KersorClassicValidationDetail
  readonly dispatch: KersorClassicDispatchDetail
}

/** Health of the optional classic-Session bridge. */
export interface KersorClassicSource {
  readonly state: 'disabled' | 'not_installed' | 'healthy' | 'degraded' | 'failed'
  readonly lastIssue?: KersorDiagnosticIssue
}

/** Bounded recent-session inventory and its structured source state. */
export interface KersorClassicSnapshot {
  readonly sessions: readonly KersorClassicSession[]
  readonly source: KersorClassicSource
}

/** Machine-local roots supplied by viewer configuration and DSH workspaces. */
export interface KersorClassicRoots {
  readonly includeCheckoutRoot?: boolean
  readonly sessionRoots?: readonly string[]
  readonly workspaceRoots?: readonly string[]
}

interface RawClassicSession extends Omit<KersorClassicSession, 'warningCount'> {
  readonly warnings: readonly string[]
}

function dshHome(): string {
  const configured = process.env.DSH_HOME?.trim()
  if (!configured) return path.join(homedir(), '.dsh')
  if (configured === '~') return homedir()
  return configured.startsWith('~/')
    ? path.join(homedir(), configured.slice(2))
    : path.resolve(configured)
}

/** Path copied by the portable preset installer. */
export function installedBridge(): string {
  return path.join(dshHome(), '.agent-presets', 'kersor', 'bin', 'kersor_bridge.py')
}

function kersorPython(): string {
  return process.env.KERSOR_PYTHON?.trim() || 'python3'
}

function optionalString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string'
}

function optionalDetailString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function optionalBoolean(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'boolean'
}

function optionalNumber(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'number'
}

function optionalGate(value: unknown): boolean {
  return value === undefined || value === null
    || value === 'pass' || value === 'fail' || value === 'pending' || value === 'not_required'
}

function optionalBaselineAction(value: unknown): boolean {
  return value === undefined || value === null
    || value === 'init' || value === 'record_verify' || value === 'new_session'
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isClassicArtifact(value: unknown): value is KersorClassicArtifact {
  if (value === null || typeof value !== 'object') return false
  const artifact = value as Partial<KersorClassicArtifact>
  return typeof artifact.name === 'string'
    && typeof artifact.sha256 === 'string'
    && typeof artifact.bytes === 'number' && Number.isInteger(artifact.bytes) && artifact.bytes >= 0
}

function isClassicValidationCheck(value: unknown): value is KersorClassicValidationCheck {
  if (value === null || typeof value !== 'object') return false
  const check = value as Partial<KersorClassicValidationCheck>
  return typeof check.name === 'string' && typeof check.passed === 'boolean'
}

function isClassicSessionDetail(value: unknown): value is KersorClassicSessionDetail {
  if (value === null || typeof value !== 'object') return false
  const detail = value as Partial<KersorClassicSessionDetail>
  if (typeof detail.session_id !== 'string' || typeof detail.session_dir !== 'string'
    || typeof detail.current_round !== 'number' || !Number.isInteger(detail.current_round)
    || detail.current_round < 1 || !Array.isArray(detail.steps)) return false
  const validStepIds = new Set<KersorClassicStepId>([
    'setup', 'baseline', 'profile', 'selection', 'authoring', 'validation',
    'dispatch', 'measurement', 'decision',
  ])
  const validStepStatuses = new Set<KersorClassicStepStatus>(['pending', 'active', 'completed', 'failed'])
  if (!detail.steps.every(step => step !== null && typeof step === 'object'
    && validStepIds.has((step as KersorClassicStep).id)
    && validStepStatuses.has((step as KersorClassicStep).status))) return false
  const selection = detail.selection
  if (selection === undefined || !['pending', 'stalled', 'selected'].includes(selection.status)
    || typeof selection.rejectedCount !== 'number' || !Number.isInteger(selection.rejectedCount)
    || selection.rejectedCount < 0 || !optionalDetailString(selection.workflow)
    || !optionalDetailString(selection.reason)) return false
  const authoring = detail.authoring
  if (authoring === undefined
    || !['not_started', 'in_progress', 'sealed', 'saved', 'rejected'].includes(authoring.status)
    || !Array.isArray(authoring.files)
    || !authoring.files.every(isClassicArtifact)) return false
  if (authoring.omittedReason !== undefined
    && !['too_large', 'invalid', 'hash_mismatch'].includes(authoring.omittedReason)) return false
  if (authoring.design !== undefined) {
    const design = authoring.design
    if (!optionalDetailString(design.name) || !optionalDetailString(design.technique)
      || !optionalDetailString(design.methodCategory) || !optionalDetailString(design.topology)
      || !stringArray(design.requiredArgs) || !stringArray(design.languages)
      || !stringArray(design.backends) || !stringArray(design.integrationPatterns)
      || typeof design.rationale !== 'string' || typeof design.source !== 'string') return false
  }
  const validation = detail.validation
  if (validation === undefined || !['pending', 'passed', 'failed'].includes(validation.status)
    || !Array.isArray(validation.checks)
    || !validation.checks.every(isClassicValidationCheck)) return false
  const dispatch = detail.dispatch
  return dispatch !== undefined
    && ['pending', 'preparing', 'running', 'completed', 'failed'].includes(dispatch.status)
    && optionalDetailString(dispatch.runDir)
    && optionalDetailString(dispatch.runtimeStatus)
}

function isClassicSession(value: unknown): value is RawClassicSession {
  if (value === null || typeof value !== 'object') return false
  const row = value as Partial<RawClassicSession>
  return typeof row.session_id === 'string'
    && typeof row.session_dir === 'string'
    && (row.storage_kind === 'v2' || row.storage_kind === 'legacy')
    && (row.lifecycle === 'active' || row.lifecycle === 'completed'
      || row.lifecycle === 'stalled' || row.lifecycle === 'cancelled')
    && (row.health === 'active' || row.health === 'stale' || row.health === 'needs_resume'
      || row.health === 'terminal' || row.health === 'unknown')
    && (row.status === 'terminal-complete' || row.status === 'terminal-stalled'
      || row.status === 'terminal-cancelled' || row.status === 'resumable'
      || row.status === 'in-progress' || row.status === 'pre-round-1')
    && optionalString(row.kernel_language)
    && optionalString(row.backend)
    && optionalString(row.integration_pattern)
    && optionalBoolean(row.allow_workflow_authoring)
    && optionalNumber(row.workflow_authoring_budget)
    && (row.selection_status === undefined || row.selection_status === null
      || ['pending', 'stalled', 'selected'].includes(row.selection_status))
    && optionalString(row.decision)
    && optionalString(row.fit_confidence)
    && optionalGate(row.baseline_witness)
    && optionalBaselineAction(row.baseline_next_action)
    && optionalString(row.baseline_reason)
    && optionalGate(row.dsh_compatibility)
    && optionalGate(row.candidate_ownership)
    && optionalGate(row.fresh_session)
    && Array.isArray(row.warnings)
    && row.warnings.every(item => typeof item === 'string')
}

function projectSession(row: RawClassicSession): KersorClassicSession {
  return {
    session_id: row.session_id,
    session_dir: row.session_dir,
    storage_kind: row.storage_kind,
    phase: row.phase ?? null,
    lifecycle: row.lifecycle,
    status: row.status,
    health: row.health,
    started_at: row.started_at ?? null,
    last_activity_at: row.last_activity_at ?? null,
    current_round: row.current_round ?? null,
    max_workflows: row.max_workflows ?? null,
    target_speedup: row.target_speedup ?? null,
    target_met: row.target_met ?? null,
    mode: row.mode ?? null,
    backend: row.backend ?? null,
    kernel_language: row.kernel_language ?? null,
    integration_pattern: row.integration_pattern ?? null,
    allow_workflow_authoring: row.allow_workflow_authoring ?? null,
    workflow_authoring_budget: row.workflow_authoring_budget ?? null,
    kernel_name: row.kernel_name ?? null,
    workflow: row.workflow ?? null,
    selection_status: row.selection_status ?? null,
    decision: row.decision ?? null,
    fit_confidence: row.fit_confidence ?? null,
    baseline_witness: row.baseline_witness ?? null,
    baseline_next_action: row.baseline_next_action ?? null,
    baseline_reason: row.baseline_reason ?? null,
    dsh_compatibility: row.dsh_compatibility ?? null,
    candidate_ownership: row.candidate_ownership ?? null,
    fresh_session: row.fresh_session ?? null,
    best_speedup: row.best_speedup ?? null,
    warningCount: row.warnings.length,
  }
}

/**
 * Read a sealed, bounded inspector projection for one classic Session.
 * @param sessionDir - Exact Session directory already discovered by the Host.
 * @returns Valid detail, or `undefined` when the bridge cannot provide it.
 */
export async function readClassicSessionDetail(
  sessionDir: string,
): Promise<KersorClassicSessionDetail | undefined> {
  try {
    const { stdout } = await execFileAsync(kersorPython(), [
      installedBridge(), 'session-detail', '--session', path.resolve(sessionDir),
    ], {
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
      timeout: 10_000,
    })
    const decoded: unknown = JSON.parse(stdout)
    return isClassicSessionDetail(decoded) ? decoded : undefined
  } catch {
    // A selectable Session remains usable as a summary when detail is unavailable.
    return undefined
  }
}

/** Invoke the installed bridge without a shell and return a bounded snapshot. */
export async function readClassicSessions(
  limit: number,
  staleAfterSeconds = 1800,
  roots: KersorClassicRoots = {},
): Promise<KersorClassicSnapshot> {
  const bridge = installedBridge()
  try {
    await access(bridge)
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return { sessions: [], source: { state: 'not_installed' } }
    return { sessions: [], source: { state: 'failed', lastIssue: issueFromError('classic_bridge', error) } }
  }
  try {
    const args = [
      bridge,
      'sessions',
      '--limit', String(limit),
      '--stale-after', String(staleAfterSeconds),
    ]
    for (const root of roots.sessionRoots ?? []) {
      if (root.trim()) args.push('--root', root)
    }
    for (const workspace of roots.workspaceRoots ?? []) {
      if (workspace.trim()) args.push('--workspace', workspace)
    }
    if (roots.includeCheckoutRoot === false) args.push('--no-checkout-root')
    const { stdout } = await execFileAsync(kersorPython(), args, {
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
      timeout: 10_000,
    })
    let decoded: { sessions?: unknown; warnings?: unknown }
    try {
      decoded = JSON.parse(stdout) as { sessions?: unknown; warnings?: unknown }
    } catch (error) {
      return { sessions: [], source: { state: 'failed', lastIssue: issueFromError('classic_bridge', error) } }
    }
    if (!Array.isArray(decoded.sessions) || !decoded.sessions.every(isClassicSession)) {
      return {
        sessions: [],
        source: { state: 'failed', lastIssue: createIssue('classic_bridge', 'invalid_payload') },
      }
    }
    const degraded = Array.isArray(decoded.warnings) && decoded.warnings.length > 0
    return {
      sessions: decoded.sessions.slice(0, limit).map(projectSession),
      source: degraded
        ? { state: 'degraded', lastIssue: createIssue('classic_bridge', 'io_error', 'warning') }
        : { state: 'healthy' },
    }
  } catch (error) {
    return { sessions: [], source: { state: 'failed', lastIssue: issueFromError('classic_bridge', error) } }
  }
}
