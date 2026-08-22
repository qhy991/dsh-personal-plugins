/**
 * Conversation-scoped KerSor controls. One tool reserves a durable
 * experiment-to-child binding before starting a continuable dsh child; the
 * other delivers a later turn to that same child or binds an existing KerSor
 * Session when the conversation has no binding yet.
 * @module @deepseek-ai/dsh-kersor/control
 */

import { randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { access, link, lstat, open, realpath, stat, unlink } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { CallId, type ContentBlock } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { JsonValue, Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-subagent'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { parseKersorLaunchContract } from './types.ts'
import type {
  KersorExperimentCheckpointEventData,
  KersorExperimentId,
  KersorExperimentStartEventData,
  KersorExperimentStatus,
  KersorExperimentStep,
  KersorLaunchContract,
} from './types.ts'

const MAX_OBJECTIVE_CHARS = 4_000
const MAX_DSH_WORKFLOW_ENVELOPE_BYTES = 2 * 1024 * 1024
const MAX_WORKFLOW_OUTPUT_BYTES = 4 * 1024 * 1024
const PARENT_HANDOFF = 'The KerSor controller owns all further execution. End this parent turn immediately. Do not poll kersor_status or list_agents, call subagent, subagent_fork, workflow, or job tools, or read/search the workspace from the parent.'

type ExperimentClosure = 'blocked (stalled)' | 'completed' | 'cancelled'

interface ExperimentBinding {
  readonly start: KersorExperimentStartEventData
  readonly checkpoint?: KersorExperimentCheckpointEventData
  readonly closure?: ExperimentClosure
}

interface StartArgs {
  readonly objective: string
  readonly fresh_session?: boolean
  readonly launch?: unknown
}

interface ResumeArgs {
  readonly experiment_id?: string
  readonly instruction?: string
}

interface AttachArgs {
  readonly objective?: string
}

interface StartResult {
  readonly experimentId: KersorExperimentId
  readonly childSessionId: SessionId
  readonly action: 'started'
}

interface ResumeResult {
  readonly experimentId: KersorExperimentId
  readonly childSessionId: SessionId
  readonly action: 'resumed'
}

interface AttachResult {
  readonly experimentId: KersorExperimentId
  readonly childSessionId: SessionId
  readonly action: 'attached'
}

type CheckpointProjection = Omit<
  KersorExperimentCheckpointEventData,
  'experimentId' | 'childSessionId' | 'revision' | 'status'
>

/** Required host services: tools, durable sessions, and continuable subagents. */
export const name = 'kersor-control'
export const inject = ['tools', 'sessions', 'subagents']

function callLocation(session: Session, callId: string): { turn: number; step: number } {
  for (let index = session.events.length - 1; index >= 0; index -= 1) {
    const event = session.events[index]
    if (event?.type === 'tool/call' && event.data.callId === callId) {
      return { turn: event.data.turn, step: event.data.step }
    }
  }
  throw new Error(`KerSor experiment control call ${callId} is not present in its dsh Session`)
}

function normalizedObjective(value: string): string {
  const objective = value.trim()
  if (objective.length === 0) throw new Error('KerSor experiment objective must not be empty')
  if (objective.length > MAX_OBJECTIVE_CHARS) {
    throw new Error(`KerSor experiment objective exceeds ${MAX_OBJECTIVE_CHARS} characters`)
  }
  return objective
}

async function frozenKersorPython(): Promise<string> {
  const configured = process.env.KERSOR_PYTHON
  if (configured === undefined || configured.trim().length === 0) {
    throw new Error('KERSOR_PYTHON must be a non-empty absolute path to the Host KerSor Python executable')
  }
  if (!isAbsolute(configured)) {
    throw new Error(`KERSOR_PYTHON must be an absolute path, received ${JSON.stringify(configured)}`)
  }
  try {
    const resolved = await realpath(configured)
    const metadata = await stat(resolved)
    if (!metadata.isFile()) {
      throw new Error('resolved path is not a file')
    }
    await access(resolved, constants.X_OK)
    return resolved
  } catch (cause) {
    throw new Error(
      `KERSOR_PYTHON ${JSON.stringify(configured)} must resolve to an executable file`,
      { cause },
    )
  }
}

function shellQuote(value: string): string {
  return `'${value.replaceAll('\'', '\'\\\'\'')}'`
}

function frozenPythonPrefix(kersorPython: string): string {
  return `KERSOR_PYTHON=${shellQuote(kersorPython)}; export KERSOR_PYTHON;`
}

function frozenPythonPrompt(kersorPython: string): string[] {
  const prefix = frozenPythonPrefix(kersorPython)
  return [
    `The Host-frozen KerSor Python executable is ${JSON.stringify(kersorPython)}.`,
    `Every shell command that touches the KerSor bridge, any KerSor helper, or setup-session.sh must begin with exactly ${prefix} When Python is invoked after that prefix, invoke it only as "$KERSOR_PYTHON".`,
    'Never use which, command -v, PATH lookup, a filesystem search, python, python3, or a versioned Python name to discover or substitute another interpreter.',
  ]
}

function typedLaunchPrompt(launch: KersorLaunchContract | undefined): string[] {
  if (launch === undefined) return []
  return [
    `Typed launch contract (canonical JSON): ${JSON.stringify(launch)}`,
    'This immutable typed launch contract is authoritative and overrides conflicting objective or continuation prose. Runtime is always dsh and is intentionally not a launch field.',
    `backend = ${JSON.stringify(launch.backend)} (use verbatim).`,
    `language = ${JSON.stringify(launch.language)} (use verbatim).`,
    `integration_pattern = ${JSON.stringify(launch.integration_pattern)} (use verbatim).`,
    `target_speedup = ${launch.target_speedup} (JSON number only; never append x, %, or another suffix).`,
    `max_workflows = ${launch.max_workflows} (positive integer).`,
    `mode = ${JSON.stringify(launch.mode)}.`,
    `workflow_authoring_budget = ${launch.workflow_authoring_budget} (nonnegative integer).`,
    `retrieval_mode = ${JSON.stringify(launch.retrieval_mode)}.`,
    `transfer_mode = ${JSON.stringify(launch.transfer_mode)}.`,
    `experience_mode = ${JSON.stringify(launch.experience_mode)}.`,
    `kernelwiki_experience_export_mode = ${JSON.stringify(launch.kernelwiki_experience_export_mode)}.`,
    `correctness_command = ${JSON.stringify(launch.correctness_command)} (copy and execute verbatim; do not rewrite, prepend, or append text).`,
    `benchmark_command = ${JSON.stringify(launch.benchmark_command)} (copy and execute verbatim; do not rewrite, prepend, or append text).`,
  ]
}

function workflowCustodyPrompt(): string[] {
  return [
    'A round selection whose selected_workflow.name is STALLED is a recoverable routing gap, not a canonical terminal phase.',
    'When Workflow authoring is enabled and saved-Proposal budget remains, complete Phase 3.6 and the full same-round selection sequence (select, strategy decision when required, finalize), then dispatch any non-STALLED commit before synthesizing a terminal STALLED decision.',
    'Dispatch the selected run only with kersor_workflow({exp_dir: <exact absolute run-N directory>}). The Host reads and validates dsh-workflow.json and invokes the native DSH Workflow with its exact meta/script/args; never call workflow directly or reconstruct, normalize, summarize, hash-check, extract, or retype that envelope.',
    'For every successful workflow call, pass the exact absolute KerSor run directory as args.exp_dir. Before the result is shown, the Host atomically writes the complete raw workflow result object to that run\'s output.json.',
    'Treat an existing run-N/output.json as Host-owned and read-only: read it after workflow success and never call write or edit on it. The rendered workflow result may be truncated, but output.json is not.',
    'If a workflow call fails, the Host writes no output.json; only then may you use write once to create a missing failure stub. Once output.json exists it cannot be overwritten or edited.',
    'The foreground session-synthesizer is the sole writer of round-N-summary.md and round-N-transfer.json. If it fails or either file is missing, end this controller turn at the unchanged canonical round and resume later; never write, edit, reconstruct, or repair either artifact in the controller.',
    'Never call kersor-state.sh set current_round or kersor-state.sh advance. Only the deterministic normalize-transfer.py gate may commit a DSH CONTINUE round boundary.',
    'For an exact COMPLETE decision, normalize-transfer.py runs KerSor\'s deterministic acceptance rule gate: branch only on PHASE_COMMITTED=complete, advanced, or stalled. A prose COMPLETE while canonical phase remains optimizing is not terminal.',
    'Never manually transition the Session to stalled to compensate for a failed synthesizer, a missing transfer object, or a repeated Workflow that remains selected. Preserve the evidence and stop at the unchanged recoverable boundary.',
  ]
}

interface SealedWorkflowArgs {
  readonly exp_dir: string
}

function experimentBindings(events: readonly SessionEvent[]): ExperimentBinding[] {
  const ordered: ExperimentBinding[] = []
  const byId = new Map<string, number>()
  for (const event of events) {
    if (event.type === 'kersor/experiment-start') {
      const id = String(event.data.experimentId)
      if (byId.has(id)) continue
      byId.set(id, ordered.length)
      ordered.push({ start: event.data })
      continue
    }
    if (event.type !== 'kersor/experiment-checkpoint') continue
    const index = byId.get(String(event.data.experimentId))
    if (index === undefined) continue
    const binding = ordered[index]
    if (binding === undefined || binding.start.childSessionId !== event.data.childSessionId) continue
    // A stalled checkpoint was historically written as `waiting`; preserve the
    // first closed boundary and ignore the invalid parent-authored reopen tail.
    if (binding.closure !== undefined) continue
    const closure = experimentClosure(event.data)
    ordered[index] = {
      ...binding,
      checkpoint: event.data,
      ...(closure === undefined ? {} : { closure }),
    }
  }
  return ordered
}

function experimentClosure(checkpoint: KersorExperimentCheckpointEventData): ExperimentClosure | undefined {
  if (checkpoint.phase === 'stalled' || checkpoint.status === 'blocked') return 'blocked (stalled)'
  if (checkpoint.status === 'completed' || checkpoint.status === 'cancelled') return checkpoint.status
  return undefined
}

function latestOpenBinding(session: Session): ExperimentBinding | undefined {
  const bindings = experimentBindings(session.events)
  return bindings.findLast(binding => binding.closure === undefined)
}

function resumeBinding(session: Session, requested?: string): ExperimentBinding | undefined {
  const bindings = experimentBindings(session.events)
  return requested === undefined
    ? bindings.at(-1)
    : bindings.find(binding => binding.start.experimentId === requested)
}

async function checkpoint(
  ctx: Context,
  session: Session,
  start: KersorExperimentStartEventData,
  status: KersorExperimentStatus,
  nextAction?: string | null,
  projection: Partial<CheckpointProjection> = {},
): Promise<void> {
  const previous = experimentBindings(session.events)
    .find(binding => binding.start.experimentId === start.experimentId)
    ?.checkpoint
  const candidate: Omit<KersorExperimentCheckpointEventData, 'revision'> = {
    experimentId: start.experimentId,
    childSessionId: start.childSessionId,
    status,
    ...previous?.kersorSessionId === undefined ? {} : { kersorSessionId: previous.kersorSessionId },
    ...previous?.phase === undefined ? {} : { phase: previous.phase },
    ...previous?.currentRound === undefined ? {} : { currentRound: previous.currentRound },
    ...previous?.maxWorkflows === undefined ? {} : { maxWorkflows: previous.maxWorkflows },
    ...previous?.workflow === undefined ? {} : { workflow: previous.workflow },
    ...previous?.bestSpeedup === undefined ? {} : { bestSpeedup: previous.bestSpeedup },
    ...previous?.targetSpeedup === undefined ? {} : { targetSpeedup: previous.targetSpeedup },
    ...(nextAction === null
      ? {}
      : nextAction === undefined
        ? previous?.nextAction === undefined ? {} : { nextAction: previous.nextAction }
        : { nextAction }),
    steps: previous?.steps ?? [],
    ...projection,
  }
  if (previous !== undefined) {
    const { revision: _revision, ...priorProjection } = previous
    if (JSON.stringify(priorProjection) === JSON.stringify(candidate)) return
  }
  session.append('kersor/experiment-checkpoint', {
    ...candidate,
    revision: (previous?.revision ?? 0) + 1,
  })
  await ctx.sessions.flush(session)
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function gateStatus(value: unknown): KersorExperimentStep['status'] {
  if (value === 'pass' || value === 'not_required') return 'completed'
  if (value === 'fail') return 'failed'
  return 'pending'
}

function milestoneSteps(value: Record<string, unknown>): KersorExperimentStep[] {
  if (Array.isArray(value.steps)) {
    const projected = value.steps.flatMap((candidate): KersorExperimentStep[] => {
      const step = record(candidate)
      const id = optionalString(step?.id)
      const status = step?.status
      if (id === undefined || (status !== 'pending' && status !== 'active'
        && status !== 'completed' && status !== 'failed')) return []
      return [{ id, status }]
    })
    if (projected.length > 0) return projected
  }
  return [
    { id: 'baseline', status: gateStatus(value.baseline_witness) },
    { id: 'profile', status: gateStatus(value.profile_evidence) },
    { id: 'workflow', status: gateStatus(value.dsh_compatibility) },
    { id: 'ownership', status: gateStatus(value.candidate_ownership) },
  ]
}

function experimentStatus(phase: unknown): KersorExperimentStatus {
  if (phase === 'complete' || phase === 'single_run') return 'completed'
  if (phase === 'stalled') return 'blocked'
  if (phase === 'cancelled') return 'cancelled'
  return 'running'
}

function terminalProjection(status: KersorExperimentStatus): boolean {
  return status === 'blocked' || status === 'completed' || status === 'cancelled'
}

function statusProjection(meta: unknown): {
  readonly status: KersorExperimentStatus
  readonly nextAction: string | null
  readonly projection: Partial<CheckpointProjection>
} | undefined {
  const value = record(meta)
  if (value === undefined || value.kind !== 'kersor-status' || typeof value.found !== 'boolean') return undefined
  const phase = optionalString(value.phase)
  const sessionDir = optionalString(value.session_dir)
  const baselineAction = optionalString(value.baseline_next_action)
  const blocker = optionalString(value.baseline_reason) ?? optionalString(value.profile_reason)
  const workflow = optionalString(value.workflow)
  const bestSpeedup = optionalNumber(value.best_speedup)
  const targetSpeedup = optionalNumber(value.target_speedup)
  return {
    status: experimentStatus(phase),
    nextAction: baselineAction !== undefined
      ? `Baseline: ${baselineAction}`
      : blocker !== undefined
        ? blocker
        : phase === 'stalled' || phase === 'complete' || phase === 'single_run' || phase === 'cancelled'
          ? null
          : 'Continue in the bound dsh execution conversation.',
    projection: {
      ...(sessionDir === undefined
        ? {}
        : { kersorSessionId: sessionDir.replaceAll('\\', '/').split('/').at(-1) as string }),
      ...(phase === undefined ? {} : { phase }),
      ...(Number.isInteger(value.current_round) ? { currentRound: value.current_round as number } : {}),
      ...(Number.isInteger(value.max_workflows) ? { maxWorkflows: value.max_workflows as number } : {}),
      ...(workflow === undefined ? {} : { workflow }),
      ...(bestSpeedup === undefined ? {} : { bestSpeedup }),
      ...(targetSpeedup === undefined ? {} : { targetSpeedup }),
      steps: milestoneSteps(value),
    },
  }
}

function startPrompt(
  start: KersorExperimentStartEventData,
  workspace: string,
  kersorPython: string,
): string {
  return [
    `You are the dsh-owned controller for KerSor experiment ${start.experimentId}.`,
    `Work only in the current workspace ${workspace}.`,
    ...frozenPythonPrompt(kersorPython),
    'Load the installed kersor skill before acting, then call kersor_status with an empty object.',
    'Start one KerSor optimization through the current optimize protocol.',
    'Use the explicit KerSor runtime dsh. Never select, invoke, or fall back to Claude or Codex.',
    start.freshSession ? 'Require a fresh KerSor Session and preserve all fresh-session gates.' : '',
    `Objective: ${start.objective}`,
    ...typedLaunchPrompt(start.launch),
    ...workflowCustodyPrompt(),
    'Continue until the canonical KerSor phase is terminal or a genuine user decision is required.',
    'Call kersor_status after each major phase transition so the owning conversation receives durable progress.',
    'Do not call kersor_start or kersor_resume from this child.',
  ].filter(Boolean).join('\n')
}

function resumePrompt(
  binding: ExperimentBinding,
  workspace: string,
  kersorPython: string,
  instruction?: string,
): string {
  const extra = instruction?.trim()
  return [
    `Continue KerSor experiment ${binding.start.experimentId} in workspace ${workspace}.`,
    ...frozenPythonPrompt(kersorPython),
    ...typedLaunchPrompt(binding.start.launch),
    ...workflowCustodyPrompt(),
    'Load the installed kersor skill and call kersor_status first.',
    'Resume the same canonical KerSor Session. Do not create a new Session and do not repeat a completed dispatch.',
    'Use the explicit KerSor runtime dsh. Never select, invoke, or fall back to Claude or Codex.',
    'Continue from the on-disk next action until terminal state or a genuine user decision is required.',
    'Call kersor_status after each major phase transition.',
    extra === undefined || extra.length === 0 ? '' : `Additional user instruction: ${extra}`,
  ].filter(Boolean).join('\n')
}

async function materialize(
  ctx: Context,
  parent: Agent,
  start: KersorExperimentStartEventData,
  prompt: string,
  signal: AbortSignal,
): Promise<void> {
  const children = await ctx.subagents.listChildren(parent.id, signal)
  const existing = children.find(child => child.id === start.childSessionId)
  if (existing !== undefined) {
    if (existing.kind !== 'child') {
      throw new Error(`KerSor dsh child ${start.childSessionId} is unavailable (${existing.reason})`)
    }
    if (existing.mode !== 'continuable') {
      throw new Error(`KerSor dsh child ${start.childSessionId} is not continuable`)
    }
    await ctx.subagents.followup(parent, start.childSessionId, [{ type: 'text', text: prompt }], {
      source: {
        kind: 'coordinator',
        form: 'relay',
        senderSessionId: parent.id,
      },
      signal,
    })
    return
  }
  await ctx.subagents.startContinuable({
    provider: 'spawn',
    label: 'KerSor experiment',
    childId: start.childSessionId,
    request: {
      parent,
      prompt: [{ type: 'text', text: prompt }] as ContentBlock[],
      toolFilter: { deny: ['kersor_start', 'kersor_attach', 'kersor_resume'] },
    },
    signal,
  })
}

function parentOf(exec: { readonly agent?: Agent }): Agent {
  if (exec.agent === undefined) throw new Error('KerSor experiment controls require a calling dsh agent')
  if (exec.agent.session.header.origin === 'subagent') {
    throw new Error('KerSor experiment controls are available only in a top-level dsh conversation')
  }
  return exec.agent
}

function workspaceOf(parent: Agent): string {
  const workspace = parent.session.header.cwd
  if (workspace === undefined) throw new Error('KerSor experiment controls require a dsh workspace')
  return workspace
}

function createStart(ctx: Context) {
  return defineTool({
    name: 'kersor_start',
    description: 'Start one KerSor optimization as a durable dsh child bound to this conversation. The current dsh workspace is the only target; runtime is always dsh.',
    parameters: {
      objective: {
        type: 'string',
        required: true,
        description: 'The concrete optimization objective and acceptance condition.',
      },
      fresh_session: {
        type: 'boolean',
        description: 'Require KerSor fresh-session isolation. Defaults to false.',
      },
      launch: {
        type: 'object',
        additionalProperties: false,
        description: 'Optional immutable typed launch contract. When present, every nested field is required and overrides conflicting objective prose; runtime remains dsh.',
        properties: {
          backend: {
            type: 'string', required: true,
            description: 'Exact non-empty KerSor backend name.',
          },
          language: {
            type: 'string', required: true,
            description: 'Exact non-empty implementation language.',
          },
          integration_pattern: {
            type: 'string', required: true,
            description: 'Exact non-empty integration pattern.',
          },
          target_speedup: {
            type: 'number', required: true,
            description: 'Positive numeric target speedup. Submit a JSON number such as 8, never a string such as "8x".',
          },
          max_workflows: {
            type: 'integer', required: true,
            description: 'Positive integer maximum number of Workflows.',
          },
          mode: {
            type: 'string', required: true, enum: ['auto', 'guided', 'explore'],
            description: 'KerSor optimization mode.',
          },
          workflow_authoring_budget: {
            type: 'integer', required: true,
            description: 'Nonnegative integer Workflow authoring budget.',
          },
          retrieval_mode: {
            type: 'string', required: true, enum: ['on', 'off'],
            description: 'Explicit retrieval mode.',
          },
          transfer_mode: {
            type: 'string', required: true, enum: ['full', 'measured-only', 'off'],
            description: 'Explicit transfer mode.',
          },
          experience_mode: {
            type: 'string', required: true, enum: ['on', 'off'],
            description: 'Explicit experience mode.',
          },
          kernelwiki_experience_export_mode: {
            type: 'string', required: true, enum: ['on', 'off'],
            description: 'Explicit KernelWiki experience export mode.',
          },
          correctness_command: {
            type: 'string', required: true,
            description: 'Exact non-empty single-line correctness command; the controller must execute it verbatim.',
          },
          benchmark_command: {
            type: 'string', required: true,
            description: 'Exact non-empty single-line benchmark command; the controller must execute it verbatim.',
          },
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          experimentId: { type: 'string', required: true },
          childSessionId: { type: 'string', required: true },
          action: { type: 'string', required: true, const: 'started' },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `started KerSor experiment ${value.experimentId} in dsh child ${value.childSessionId}. ${PARENT_HANDOFF}`,
      }],
    },
    async execute(args: StartArgs, exec): Promise<StartResult> {
      const parent = parentOf(exec)
      const existing = latestOpenBinding(parent.session)
      if (existing !== undefined) {
        throw new Error(`KerSor experiment ${existing.start.experimentId} already belongs to this conversation; use kersor_resume`)
      }
      const workspace = workspaceOf(parent)
      const kersorPython = await frozenKersorPython()
      const launch = args.launch === undefined
        ? undefined
        : parseKersorLaunchContract(args.launch)
      const experimentId = `kersor-${randomUUID()}` as KersorExperimentId
      const childSessionId = SessionId(`kersor-${randomUUID()}`)
      const start: KersorExperimentStartEventData = {
        experimentId,
        childSessionId,
        origin: 'created',
        objective: normalizedObjective(args.objective),
        freshSession: args.fresh_session ?? false,
        ...launch === undefined ? {} : { launch },
        ...callLocation(parent.session, exec.callId),
      }
      parent.session.append('kersor/experiment-start', start)
      await ctx.sessions.flush(parent.session)
      try {
        await materialize(
          ctx,
          parent,
          start,
          startPrompt(start, workspace, kersorPython),
          exec.signal,
        )
        await checkpoint(ctx, parent.session, start, 'running', null)
      } catch (error) {
        await checkpoint(
          ctx,
          parent.session,
          start,
          'waiting',
          error instanceof Error ? error.message : String(error),
        )
        throw error
      }
      exec.concludeTurn()
      return { experimentId, childSessionId, action: 'started' }
    },
    presentCall: () => ({ card: 'generic', title: 'Start KerSor experiment', kind: 'execute' }),
  })
}

function createResume(ctx: Context) {
  return defineTool({
    name: 'kersor_resume',
    description: 'Resume the conversation-bound KerSor experiment in its original durable dsh child. This never creates another experiment or child.',
    parameters: {
      experiment_id: {
        type: 'string',
        description: 'Existing experiment id. Omit to select the latest binding; terminal bindings are rejected explicitly.',
      },
      instruction: {
        type: 'string',
        description: 'Optional additional user direction for this continuation.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          experimentId: { type: 'string', required: true },
          childSessionId: { type: 'string', required: true },
          action: { type: 'string', required: true, const: 'resumed' },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `resumed KerSor experiment ${value.experimentId} in dsh child ${value.childSessionId}. ${PARENT_HANDOFF}`,
      }],
    },
    async execute(args: ResumeArgs, exec): Promise<ResumeResult> {
      const parent = parentOf(exec)
      const binding = resumeBinding(parent.session, args.experiment_id)
      if (binding?.closure !== undefined) {
        throw new Error(binding.closure === 'blocked (stalled)'
          ? `KerSor experiment ${binding.start.experimentId} is blocked (stalled) and cannot be resumed; start a new Experiment after resolving the blocker`
          : `KerSor experiment ${binding.start.experimentId} is terminal (${binding.closure})`)
      }
      if (binding === undefined) {
        throw new Error(args.experiment_id === undefined
          ? 'No KerSor experiment is bound to this conversation; use kersor_attach for an existing KerSor Session'
          : `KerSor experiment ${JSON.stringify(args.experiment_id)} is not bound to this conversation`)
      }
      const workspace = workspaceOf(parent)
      const kersorPython = await frozenKersorPython()
      try {
        await materialize(
          ctx,
          parent,
          binding.start,
          resumePrompt(binding, workspace, kersorPython, args.instruction),
          exec.signal,
        )
        await checkpoint(ctx, parent.session, binding.start, 'running', null)
      } catch (error) {
        await checkpoint(
          ctx,
          parent.session,
          binding.start,
          'waiting',
          error instanceof Error ? error.message : String(error),
        )
        throw error
      }
      exec.concludeTurn()
      return {
        experimentId: binding.start.experimentId,
        childSessionId: binding.start.childSessionId,
        action: 'resumed',
      }
    },
    presentCall: () => ({ card: 'generic', title: 'Resume KerSor experiment', kind: 'execute' }),
  })
}

function createAttach(ctx: Context) {
  return defineTool({
    name: 'kersor_attach',
    description: 'Bind the current workspace\'s existing KerSor Session to one durable dsh child, then resume it. Use only when this conversation has no experiment binding.',
    parameters: {
      objective: {
        type: 'string',
        description: 'Optional continuation objective. The existing KerSor Session remains authoritative.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          experimentId: { type: 'string', required: true },
          childSessionId: { type: 'string', required: true },
          action: { type: 'string', required: true, const: 'attached' },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `attached KerSor experiment ${value.experimentId} to dsh child ${value.childSessionId}. ${PARENT_HANDOFF}`,
      }],
    },
    async execute(args: AttachArgs, exec): Promise<AttachResult> {
      const parent = parentOf(exec)
      const existing = latestOpenBinding(parent.session)
      if (existing !== undefined) {
        throw new Error(`KerSor experiment ${existing.start.experimentId} already belongs to this conversation; use kersor_resume`)
      }
      const workspace = workspaceOf(parent)
      const kersorPython = await frozenKersorPython()
      const start: KersorExperimentStartEventData = {
        experimentId: `kersor-${randomUUID()}` as KersorExperimentId,
        childSessionId: SessionId(`kersor-${randomUUID()}`),
        origin: 'attached',
        objective: normalizedObjective(args.objective ?? 'Resume the existing KerSor optimization to its next canonical boundary.'),
        freshSession: false,
        ...callLocation(parent.session, exec.callId),
      }
      parent.session.append('kersor/experiment-start', start)
      await ctx.sessions.flush(parent.session)
      const binding = { start }
      try {
        await materialize(
          ctx,
          parent,
          start,
          resumePrompt(binding, workspace, kersorPython, args.objective),
          exec.signal,
        )
        await checkpoint(ctx, parent.session, start, 'running', null)
      } catch (error) {
        await checkpoint(
          ctx,
          parent.session,
          start,
          'waiting',
          error instanceof Error ? error.message : String(error),
        )
        throw error
      }
      exec.concludeTurn()
      return { experimentId: start.experimentId, childSessionId: start.childSessionId, action: 'attached' }
    },
    presentCall: () => ({ card: 'generic', title: 'Attach KerSor experiment', kind: 'execute' }),
  })
}

function controllerBinding(ctx: Context, child: Agent): { parent: Session; binding: ExperimentBinding } | undefined {
  const parentId = child.session.header.parentSession
  if (parentId === undefined) return undefined
  const parent = ctx.sessions.get(parentId)
  if (parent === undefined) return undefined
  const binding = experimentBindings(parent.events)
    .find(candidate => candidate.start.childSessionId === child.id)
  return binding === undefined ? undefined : { parent, binding }
}

function experimentControllerAncestor(ctx: Context, descendant: Agent): ExperimentBinding | undefined {
  let child = descendant.session
  const visited = new Set<string>()
  while (child.header.parentSession !== undefined) {
    if (visited.has(child.id)) return undefined
    visited.add(child.id)
    const parent = ctx.sessions.get(child.header.parentSession)
    if (parent === undefined) return undefined
    const binding = experimentBindings(parent.events)
      .find(candidate => candidate.start.childSessionId === child.id)
    if (binding !== undefined) return binding
    child = parent
  }
  return undefined
}

function bashCommand(argumentsValue: unknown): string | undefined {
  const argumentsRecord = record(argumentsValue)
  return typeof argumentsRecord?.command === 'string' ? argumentsRecord.command : undefined
}

function touchesKersorRuntime(command: string): boolean {
  return /(?:^|\b)KerSor\/scripts\//.test(command)
    || /\$(?:kersor_root|\{kersor_root\})\/scripts\//i.test(command)
    || /\b(?:run-kersor-python\.sh|setup-session\.sh|kersor_bridge\.py)\b/i.test(command)
}

function discoversPython(command: string): boolean {
  return /\b(?:which|whereis)\s+(?:-[^\s]+\s+)*python(?:\d+(?:\.\d+)*)?\b/i.test(command)
    || /\bcommand\s+-v\s+python(?:\d+(?:\.\d+)*)?\b/i.test(command)
    || /\btype\s+(?:-[^\s]+\s+)*python(?:\d+(?:\.\d+)*)?\b/i.test(command)
    || /(?:["']?(?:[^\s;|&"']*\/)?python(?:\d+(?:\.\d+)*)?["']?|["']?\$\{?KERSOR_PYTHON\}?["']?)\s+(?:--version|-V)\b/i.test(command)
    || /\b(?:find|fd|fdfind|locate)\b[^\n;|&]*\bpython(?:\d+(?:\.\d+)*)?[?*]?/i.test(command)
    || /\b(?:rg|grep|ls)\b[^\n;|&]*(?:\/python(?:\d+(?:\.\d+)*)?|python[?*])/i.test(command)
    || /\b(?:sys\.executable|shutil\.which\s*\([^)]*python)/i.test(command)
}

function invokesAlternatePython(command: string): boolean {
  // Python must be the executable at a shell command boundary. Treating every
  // whitespace-delimited `python` token as an invocation also rejects typed
  // values such as `--backend python` and benchmark-command arguments.
  const pattern = [
    String.raw`(?:^|&&|\|\||[;|\n({])\s*`,
    String.raw`(?:[a-z_][a-z0-9_]*=(?:'[^']*'|"[^"]*"|[^\s;&|]+)\s+)*`,
    String.raw`(?:(?:if|then|while|until|do|!|time|command|exec|env|sudo)(?:\s+-[^\s;|&]+)*\s+)*`,
    String.raw`(?:["']?[^\s;|&"']*\/)?python(?:\d+(?:\.\d+)*)?["']?(?=\s|$)`,
  ].join('')
  return new RegExp(pattern, 'i').test(command)
}

async function kersorBashDenial(command: string): Promise<string | undefined> {
  const runtimeCommand = touchesKersorRuntime(command)
  const discovery = discoversPython(command)
  if (!runtimeCommand && !discovery) return undefined
  const prefix = frozenPythonPrefix(await frozenKersorPython())
  if (discovery) {
    return `KerSor Experiment descendants may not discover or substitute Python; use the Host-frozen interpreter through the exact prefix ${prefix}`
  }
  if (!command.startsWith(prefix)) {
    return `KerSor bridge/helper/setup commands must begin with the exact Host-frozen prefix ${prefix}`
  }
  if (invokesAlternatePython(command.slice(prefix.length).trimStart())) {
    return `KerSor bridge/helper/setup commands may not substitute python/python3; after the exact prefix ${prefix} invoke Python only as "$KERSOR_PYTHON"`
  }
  return undefined
}

function nodeErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    && typeof error.code === 'string'
    ? error.code
    : undefined
}

function runPathParts(root: string, target: string, output: boolean): string[] | undefined {
  const path = relative(root, target)
  if (path.length === 0 || isAbsolute(path) || path === '..' || path.startsWith(`..${sep}`)) {
    return undefined
  }
  const parts = path.split(sep)
  const expectedLength = output ? 4 : 3
  if (parts.length !== expectedLength
    || parts[0] !== '.kersor'
    || parts[1]?.length === 0
    || !/^run-[1-9]\d*$/.test(parts[2] ?? '')
    || (output && parts[3] !== 'output.json')) {
    return undefined
  }
  return parts
}

async function canonicalRunDirectory(agent: Agent, expDir: unknown): Promise<string> {
  if (typeof expDir !== 'string' || expDir.length === 0 || !isAbsolute(expDir)) {
    throw new Error('workflow args.exp_dir must be a non-empty absolute path')
  }
  const workspace = workspaceOf(agent)
  const lexicalWorkspace = resolve(workspace)
  const lexicalRun = resolve(expDir)
  const parts = runPathParts(lexicalWorkspace, lexicalRun, false)
  if (parts === undefined) {
    throw new Error('workflow args.exp_dir must resolve exactly under <workspace>/.kersor/<session>/run-N')
  }
  let realWorkspace: string
  let realRun: string
  try {
    [realWorkspace, realRun] = await Promise.all([realpath(lexicalWorkspace), realpath(lexicalRun)])
  } catch (error: unknown) {
    throw new Error(`workflow args.exp_dir must name an existing run directory: ${error instanceof Error ? error.message : String(error)}`)
  }
  const expectedRealRun = join(realWorkspace, ...parts)
  if (realRun !== expectedRealRun || runPathParts(realWorkspace, realRun, false) === undefined) {
    throw new Error('workflow args.exp_dir contains a symlink escape or does not identify its exact run-N directory')
  }
  if (!(await stat(realRun)).isDirectory()) {
    throw new Error('workflow args.exp_dir must identify a directory')
  }
  return realRun
}

interface WorkflowCallContract {
  readonly meta: Record<string, unknown>
  readonly script: string
  readonly args: Record<string, unknown>
}

function workflowCallContract(argumentsValue: unknown): WorkflowCallContract {
  const call = record(argumentsValue)
  const meta = record(call?.meta)
  const args = record(call?.args)
  if (meta === undefined || args === undefined || typeof call?.script !== 'string') {
    throw new Error('workflow call must carry object meta, string script, and object args')
  }
  return { meta, script: call.script, args }
}

async function readDshWorkflowEnvelope(runDir: string): Promise<Record<string, unknown>> {
  const envelopePath = join(runDir, 'dsh-workflow.json')
  let identity: Awaited<ReturnType<typeof lstat>>
  try {
    identity = await lstat(envelopePath)
  } catch (error: unknown) {
    if (nodeErrorCode(error) === 'ENOENT') {
      throw new Error(`required Workflow envelope is missing: ${envelopePath}`)
    }
    throw new Error(`Workflow envelope cannot be inspected: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (identity.isSymbolicLink()) throw new Error('Workflow envelope dsh-workflow.json must not be a symlink')
  if (!identity.isFile()) throw new Error('Workflow envelope dsh-workflow.json must be a regular file')
  if (identity.size > MAX_DSH_WORKFLOW_ENVELOPE_BYTES) {
    throw new Error(`Workflow envelope exceeds the ${MAX_DSH_WORKFLOW_ENVELOPE_BYTES}-byte limit`)
  }
  const realEnvelope = await realpath(envelopePath)
  if (realEnvelope !== envelopePath) {
    throw new Error('Workflow envelope dsh-workflow.json contains a symlink or path alias')
  }
  const handle = await open(
    envelopePath,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  )
  try {
    const current = await handle.stat()
    if (!current.isFile()) throw new Error('Workflow envelope dsh-workflow.json must be a regular file')
    if (current.size > MAX_DSH_WORKFLOW_ENVELOPE_BYTES) {
      throw new Error(`Workflow envelope exceeds the ${MAX_DSH_WORKFLOW_ENVELOPE_BYTES}-byte limit`)
    }
    const bytes = Buffer.alloc(MAX_DSH_WORKFLOW_ENVELOPE_BYTES + 1)
    let length = 0
    while (length < bytes.length) {
      const read = await handle.read(bytes, length, bytes.length - length, length)
      if (read.bytesRead === 0) break
      length += read.bytesRead
    }
    if (length > MAX_DSH_WORKFLOW_ENVELOPE_BYTES) {
      throw new Error(`Workflow envelope exceeds the ${MAX_DSH_WORKFLOW_ENVELOPE_BYTES}-byte limit`)
    }
    let decoded: unknown
    try {
      decoded = JSON.parse(bytes.subarray(0, length).toString('utf8'))
    } catch {
      throw new Error('Workflow envelope dsh-workflow.json is malformed JSON')
    }
    const envelope = record(decoded)
    if (envelope === undefined
      || envelope.schema_version !== 1
      || envelope.contract !== 'dsh_workflow_v1'
      || record(envelope.meta) === undefined
      || typeof envelope.script !== 'string'
      || record(envelope.args) === undefined) {
      throw new Error('Workflow envelope must be a dsh_workflow_v1 object with meta, script, and args')
    }
    return envelope
  } finally {
    await handle.close()
  }
}

function createSealedWorkflow(ctx: Context) {
  return defineTool({
    name: 'kersor_workflow',
    description: 'Execute one prepared KerSor run from its Host-validated dsh-workflow.json. Pass only the exact absolute run-N directory; the Host owns envelope loading and raw output custody.',
    parameters: {
      exp_dir: {
        type: 'string',
        required: true,
        description: 'Exact absolute <workspace>/.kersor/<session>/run-N directory containing dsh-workflow.json.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          runId: { type: 'string', required: true },
          agentsStarted: { type: 'integer', required: true },
          result: { type: 'json', required: true },
        },
      },
      render: (args, value) => [{
        type: 'text',
        text: `sealed KerSor Workflow ${value.runId} completed with ${value.agentsStarted} member(s); Host raw output custody completed for ${args.exp_dir}/output.json`,
      }],
    },
    async execute(args: SealedWorkflowArgs, exec) {
      const agent = exec.agent
      if (agent === undefined || controllerBinding(ctx, agent) === undefined) {
        throw new Error('kersor_workflow is available only to the conversation-bound KerSor controller')
      }
      const runDir = await canonicalRunDirectory(agent, args.exp_dir)
      const envelope = await readDshWorkflowEnvelope(runDir)
      const call = workflowCallContract(envelope)
      const result = await ctx.tools.execute({
        callId: CallId(`${exec.callId}:sealed-workflow`),
        rootCallId: exec.rootCallId,
        name: 'workflow',
        arguments: call,
        agent,
        signal: exec.signal,
      })
      if (result.isError) throw new Error(result.error.message)
      const value = record(result.value)
      if (value === undefined
        || typeof value.runId !== 'string'
        || !Number.isSafeInteger(value.agentsStarted)
        || !Object.hasOwn(value, 'result')) {
        throw new Error('native workflow returned a non-canonical result envelope')
      }
      return {
        runId: value.runId,
        agentsStarted: value.agentsStarted as number,
        result: value.result as JsonValue,
      }
    },
    presentCall: args => ({ card: 'generic', title: `Run sealed KerSor Workflow: ${args.exp_dir}`, kind: 'execute' }),
  })
}

async function workflowEnvelopeDenial(
  agent: Agent,
  argumentsValue: unknown,
): Promise<string | undefined> {
  try {
    const call = workflowCallContract(argumentsValue)
    const runDir = await canonicalRunDirectory(agent, call.args.exp_dir)
    const envelope = await readDshWorkflowEnvelope(runDir)
    if (!isDeepStrictEqual(call.meta, envelope.meta)) {
      throw new Error('workflow meta differs from dsh-workflow.json')
    }
    if (call.script !== envelope.script) {
      throw new Error('workflow script differs from dsh-workflow.json')
    }
    if (!isDeepStrictEqual(call.args, envelope.args)) {
      throw new Error('workflow args differ from dsh-workflow.json')
    }
    return undefined
  } catch (error: unknown) {
    return `KerSor Workflow envelope gate denied before execution: ${error instanceof Error ? error.message : String(error)}. Pass the exact dsh-workflow.json meta/script/args; do not reconstruct them.`
  }
}

function rawWorkflowResult(value: unknown): Record<string, unknown> {
  const wrapper = record(value)
  if (wrapper === undefined
    || Object.keys(wrapper).length !== 3
    || typeof wrapper.runId !== 'string'
    || wrapper.runId.length === 0
    || !Number.isSafeInteger(wrapper.agentsStarted)
    || (wrapper.agentsStarted as number) < 0
    || !Object.hasOwn(wrapper, 'result')) {
    throw new Error('workflow result.value must have canonical {runId, agentsStarted, result} shape')
  }
  const raw = record(wrapper.result)
  if (raw === undefined) {
    throw new Error('workflow result.value.result must be a JSON object')
  }
  return raw
}

function workflowExpDir(argumentsValue: unknown): unknown {
  return record(record(argumentsValue)?.args)?.exp_dir
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return true
  } catch (error: unknown) {
    if (nodeErrorCode(error) === 'ENOENT') return false
    throw error
  }
}

async function commitExclusiveOutput(runDir: string, serialized: string): Promise<void> {
  const outputPath = join(runDir, 'output.json')
  if (await pathExists(outputPath)) {
    throw new Error(`workflow output already exists and will not be overwritten: ${outputPath}`)
  }
  const temporaryPath = join(runDir, `.output.json.${randomUUID()}.tmp`)
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporaryPath, 'wx', 0o600)
    await handle.writeFile(serialized, 'utf8')
    await handle.sync()
    await handle.close()
    handle = undefined
    await link(temporaryPath, outputPath)
  } catch (error: unknown) {
    if (nodeErrorCode(error) === 'EEXIST') {
      throw new Error(`workflow output already exists and will not be overwritten: ${outputPath}`)
    }
    throw new Error(`workflow output could not be atomically committed: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await handle?.close().catch(() => { /* best-effort cleanup after a failed write */ })
    await unlink(temporaryPath).catch(() => { /* absent after cleanup or retained only on an external filesystem fault */ })
  }
}

async function commitWorkflowOutput(agent: Agent, argumentsValue: unknown, value: unknown): Promise<void> {
  const raw = rawWorkflowResult(value)
  const serialized = `${JSON.stringify(raw, null, 2)}\n`
  const bytes = Buffer.byteLength(serialized, 'utf8')
  if (bytes > MAX_WORKFLOW_OUTPUT_BYTES) {
    throw new Error(`workflow raw result is ${bytes} bytes, exceeding the ${MAX_WORKFLOW_OUTPUT_BYTES}-byte output.json limit`)
  }
  const runDir = await canonicalRunDirectory(agent, workflowExpDir(argumentsValue))
  await commitExclusiveOutput(runDir, serialized)
}

function filePathArgument(argumentsValue: unknown): string | undefined {
  const argumentsRecord = record(argumentsValue)
  return typeof argumentsRecord?.file_path === 'string' ? argumentsRecord.file_path : undefined
}

function roundSynthesisPathParts(root: string, target: string): string[] | undefined {
  const path = relative(root, target)
  if (path.length === 0 || isAbsolute(path) || path === '..' || path.startsWith(`..${sep}`)) {
    return undefined
  }
  const parts = path.split(sep)
  return parts.length === 3
    && parts[0] === '.kersor'
    && parts[1]?.length !== 0
    && /^round-[1-9]\d*-(?:summary\.md|transfer\.json)$/.test(parts[2] ?? '')
    ? parts
    : undefined
}

async function isRoundSynthesisArtifact(agent: Agent, filePath: string): Promise<boolean> {
  const workspace = agent.session.header.cwd
  if (workspace === undefined) return false
  const lexicalWorkspace = resolve(workspace)
  const lexicalTarget = isAbsolute(filePath) ? resolve(filePath) : resolve(lexicalWorkspace, filePath)
  if (roundSynthesisPathParts(lexicalWorkspace, lexicalTarget) !== undefined) return true
  if (!(await pathExists(lexicalTarget))) return false
  try {
    const [realWorkspace, realTarget] = await Promise.all([
      realpath(lexicalWorkspace),
      realpath(lexicalTarget),
    ])
    return roundSynthesisPathParts(realWorkspace, realTarget) !== undefined
  } catch {
    return false
  }
}

function hasRoundSynthesisMutation(command: string): boolean {
  const artifact = String.raw`round-[1-9]\d*-(?:summary\.md|transfer\.json)`
  if (!new RegExp(artifact, 'i').test(command)) return false
  return new RegExp(String.raw`(?:>|>>|>\|)\s*[^\n;|&]*${artifact}`, 'i').test(command)
    || new RegExp(String.raw`\b(?:tee|cp|mv|rm|install)\b[^\n;|&]*${artifact}`, 'i').test(command)
    || new RegExp(String.raw`\bopen\s*\([^)]*${artifact}[^)]*,\s*["'][wax+][^"']*["']`, 'i').test(command)
    || new RegExp(String.raw`\b(?:write_text|write_bytes)\s*\([^)]*${artifact}`, 'i').test(command)
    || new RegExp(String.raw`\bos\.(?:remove|unlink|replace|rename)\s*\([^)]*${artifact}`, 'i').test(command)
}

function manuallyAdvancesRound(command: string): boolean {
  if (!/\bkersor-state\.sh\b/i.test(command)) return false
  return /\bkersor-state\.sh\b[^\n;|&]*\bset\s+current_round\b/i.test(command)
    || /\bkersor-state\.sh\b[^\n;|&]*\badvance(?:\s|["'])/i.test(command)
}

async function isExistingRunOutput(agent: Agent, filePath: string): Promise<boolean> {
  const workspace = agent.session.header.cwd
  if (workspace === undefined) return false
  const lexicalWorkspace = resolve(workspace)
  const lexicalTarget = isAbsolute(filePath) ? resolve(filePath) : resolve(lexicalWorkspace, filePath)
  if (!(await pathExists(lexicalTarget))) return false
  if (runPathParts(lexicalWorkspace, lexicalTarget, true) !== undefined) return true
  try {
    const [realWorkspace, realTarget] = await Promise.all([
      realpath(lexicalWorkspace),
      realpath(lexicalTarget),
    ])
    return runPathParts(realWorkspace, realTarget, true) !== undefined
  } catch {
    return false
  }
}

function hasRunOutputMutation(command: string): boolean {
  return /(?:>|>>|>\|)\s*[^\n;]*output\.json/i.test(command)
    || /\b(?:tee|cp|mv|rm|install)\b[^\n;]*output\.json/i.test(command)
    || /\bopen\s*\([^)]*output\.json[^)]*,\s*["'][wax+][^"']*["']/i.test(command)
    || /\b(?:write_text|write_bytes)\s*\([^)]*\)/i.test(command)
      && /output\.json/i.test(command)
    || /\bos\.(?:remove|unlink|replace|rename)\s*\([^)]*output\.json/i.test(command)
}

async function bashMutatesExistingRunOutput(agent: Agent, command: string): Promise<boolean> {
  if (!/output\.json/i.test(command) || !hasRunOutputMutation(command)) return false
  if (/\$(?:[a-z_][a-z0-9_]*|\{[a-z_][a-z0-9_]*\})[\\/]output\.json/i.test(command)) {
    // A shell/Python variable hides the target from path validation. Refuse
    // mutation rather than let an existing Host-owned file be an alias away.
    return true
  }
  const candidates = command.match(/(?:\/|\.\.?\/)[^\s"'();|&<>]*[\\/]run-[1-9]\d*[\\/]output\.json/gi) ?? []
  for (const candidate of candidates) {
    if (await isExistingRunOutput(agent, candidate)) return true
  }
  return false
}

function reportAsync(ctx: Context, operation: Promise<void>): void {
  void operation.catch((error: unknown) => {
    ctx.logger.warn('kersor-control: checkpoint persistence failed: %s', error instanceof Error ? error.message : String(error))
  })
}

/** Register the start/resume tools and project child settlement into the parent log. */
export function apply(ctx: Context): void {
  ctx.tools.register(createStart(ctx))
  ctx.tools.register(createAttach(ctx))
  ctx.tools.register(createResume(ctx))
  ctx.tools.register(createSealedWorkflow(ctx))
  const forbiddenControllerTools = new Set([
    'kersor_start', 'kersor_attach', 'kersor_resume',
    'subagent_codex', 'subagent_claude_code',
  ])
  const forbiddenParentTools = new Set([
    'kersor_status',
    'subagent', 'subagent_fork', 'subagent_codex', 'subagent_claude_code',
    'workflow', 'ralph',
    'list_agents', 'send_message', 'interrupt_agent',
    'job_output', 'job_list', 'job_kill',
  ])
  ctx.on('tools/pre-execute', async (exec, next) => {
    const agent = exec.agent
    if (agent === undefined) return next()
    const owned = controllerBinding(ctx, agent)
    if (owned !== undefined) {
      if (exec.name !== 'kersor_status' && owned.binding.closure !== undefined) {
        return Promise.resolve({
          kind: 'deny' as const,
          reason: `KerSor controller ${agent.id} is ${owned.binding.closure}; only kersor_status may run after this closed boundary`,
        })
      }
      if (forbiddenControllerTools.has(exec.name)) {
        return {
          kind: 'deny' as const,
          reason: `KerSor controller children cannot execute ${exec.name}; use dsh-native spawn/workflow capabilities`,
        }
      }
      if (exec.name === 'bash') {
        const command = bashCommand(exec.arguments)
        if (command !== undefined && manuallyAdvancesRound(command)) {
          return {
            kind: 'deny' as const,
            reason: 'The KerSor controller may not set current_round or call kersor-state.sh advance. Only normalize-transfer.py may atomically commit a DSH CONTINUE boundary.',
          }
        }
        if (command !== undefined && hasRoundSynthesisMutation(command)) {
          return {
            kind: 'deny' as const,
            reason: 'The direct KerSor controller may not create or mutate round-N-summary.md or round-N-transfer.json; the foreground session-synthesizer is their sole writer.',
          }
        }
      }
      if (exec.name === 'write' || exec.name === 'edit') {
        const filePath = filePathArgument(exec.arguments)
        if (filePath !== undefined && await isRoundSynthesisArtifact(agent, filePath)) {
          return {
            kind: 'deny' as const,
            reason: 'The direct KerSor controller may not create or mutate round-N-summary.md or round-N-transfer.json; the foreground session-synthesizer is their sole writer.',
          }
        }
      }
    }
    if (agent.session.header.origin !== 'subagent'
      && experimentBindings(agent.session.events).length > 0
      && forbiddenParentTools.has(exec.name)) {
      return {
        kind: 'deny' as const,
        reason: `KerSor delegation in this parent is reserved to its declared controller child; use kersor_resume instead of ${exec.name}`,
      }
    }
    const experimentDescendant = experimentControllerAncestor(ctx, agent) !== undefined
    if (exec.name === 'workflow' && experimentDescendant) {
      const denial = await workflowEnvelopeDenial(agent, exec.arguments)
      if (denial !== undefined) return { kind: 'deny' as const, reason: denial }
    }
    if (exec.name === 'bash' && experimentDescendant) {
      const command = bashCommand(exec.arguments)
      if (command !== undefined) {
        if (await bashMutatesExistingRunOutput(agent, command)) {
          return {
            kind: 'deny' as const,
            reason: 'Existing KerSor run-N/output.json is immutable and Host-owned; Bash redirection, tee/cp/mv/rm, and Python open/write mutation paths are forbidden.',
          }
        }
        const denial = await kersorBashDenial(command)
        if (denial !== undefined) return { kind: 'deny' as const, reason: denial }
      }
    }
    if ((exec.name === 'write' || exec.name === 'edit') && experimentDescendant) {
      const filePath = filePathArgument(exec.arguments)
      if (filePath !== undefined && await isExistingRunOutput(agent, filePath)) {
        return {
          kind: 'deny' as const,
          reason: 'Existing KerSor run-N/output.json is immutable. Successful Workflow output is Host-owned; after a Workflow error, create a failure stub only while output.json is absent.',
        }
      }
    }
    return next()
  })
  ctx.on('tools/post-execute', async (exec, result, next) => {
    const decision = await next()
    if (decision.kind !== 'accept' || result.isError || exec.agent === undefined) return decision
    if (exec.name === 'workflow'
      && experimentControllerAncestor(ctx, exec.agent) !== undefined) {
      try {
        await commitWorkflowOutput(exec.agent, exec.arguments, result.value)
      } catch (error: unknown) {
        return {
          kind: 'block' as const,
          feedback: [{
            type: 'text' as const,
            text: `Workflow raw result custody failed: ${error instanceof Error ? error.message : String(error)}. The Host did not publish this Workflow result; do not write or repair output.json manually.`,
          }],
        }
      }
      return decision
    }
    if (exec.name !== 'kersor_status') return decision
    const owned = controllerBinding(ctx, exec.agent)
    if (owned === undefined) return decision
    if (owned.binding.closure !== undefined) return { ...decision, concludesTurn: true as const }
    const projected = statusProjection(result.meta)
    if (projected === undefined) return decision
    await checkpoint(
      ctx,
      owned.parent,
      owned.binding.start,
      projected.status,
      projected.nextAction,
      projected.projection,
    )
    return terminalProjection(projected.status)
      ? { ...decision, concludesTurn: true as const }
      : decision
  })
  ctx.on('subagent/end', (info) => {
    for (const session of ctx.sessions.list()) {
      const binding = experimentBindings(session.events)
        .find(candidate => candidate.start.childSessionId === info.id)
      if (binding === undefined || binding.closure !== undefined) continue
      reportAsync(ctx, checkpoint(
        ctx,
        session,
        binding.start,
        'waiting',
        info.stopReason === 'completed'
          ? 'The dsh child is idle; resume this experiment to continue from the persisted KerSor Session.'
          : `The dsh child ended with ${info.stopReason}; inspect the persisted KerSor Session before resuming.`,
      ))
    }
  })
}
