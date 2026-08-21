/** KerSor conversation view: Session inventory with live Workflow progress. */

import { useEffect, useState, useSyncExternalStore } from 'react'
import { IconChevronRightOutline14, StateDot, type StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {
  KersorBaselineAction,
  KersorClassicGate,
  KersorClassicSessionDetail,
  KersorClassicStepId,
  KersorClassicStepStatus,
  KersorCallView,
  KersorDiagnosticIssue,
  KersorPhaseView,
  KersorRunStatus,
  KersorRunView,
  KersorWorkflowResultView,
  KersorViewerSnapshot,
} from '@deepseek-ai/dsh-kersor-viewer/types'
import type { KersorClassicHealth, KersorClassicLifecycle, KersorClassicSession } from '@deepseek-ai/dsh-kersor-viewer/types'
import type { KersorTaskId } from '@deepseek-ai/dsh-kersor/types'
import type { KersorViewerState } from './store.ts'
import type { KersorViewerKey } from './locales.ts'
import type { KersorViewFace } from './slots.ts'
import { visibleFitConfidence } from './readiness.ts'
import css from './KersorView.module.css'

/** Full view props composed by the conversation view slot. */
export type KersorViewProps =
  PropsRuntime<'conversation.view'> & InjectFace<KersorViewFace> & PropsLocale<'kersorViewer'>

const RUN_STATUS_KEYS = {
  running: 'run.active',
  completed: 'run.completed',
  failed: 'run.failed',
  unknown: 'run.unknown',
} as const satisfies Record<KersorRunStatus, KersorViewerKey>

const CALL_STATUS_KEYS = {
  queued: 'call.queued',
  running: 'call.running',
  completed: 'call.completed',
  failed: 'call.failed',
} as const satisfies Record<KersorCallView['status'], KersorViewerKey>

function runDotState(status: KersorRunStatus): StateDotState {
  switch (status) {
    case 'running': return 'ongoing'
    case 'completed': return 'done'
    case 'failed': return 'error'
    /* v8 ignore next -- KersorRunStatus is closed and every variant is handled above. */
    default: return 'warning'
  }
}

function callDotState(status: KersorCallView['status']): StateDotState {
  switch (status) {
    case 'queued': return 'warning'
    case 'running': return 'ongoing'
    case 'completed': return 'done'
    case 'failed': return 'error'
  }
}

function phaseDotState(status: KersorPhaseView['status']): StateDotState {
  switch (status) {
    case 'running': return 'ongoing'
    case 'completed': return 'done'
    case 'failed': return 'error'
  }
}

const CLASSIC_HEALTH_KEYS = {
  active: 'session.health.active',
  stale: 'session.health.stale',
  needs_resume: 'session.health.needsResume',
  terminal: 'session.health.terminal',
  unknown: 'session.health.unknown',
} as const satisfies Record<KersorClassicHealth, KersorViewerKey>

const CLASSIC_STEP_KEYS = {
  setup: 'detail.step.setup',
  baseline: 'detail.step.baseline',
  profile: 'detail.step.profile',
  selection: 'detail.step.selection',
  authoring: 'detail.step.authoring',
  validation: 'detail.step.validation',
  dispatch: 'detail.step.dispatch',
  measurement: 'detail.step.measurement',
  decision: 'detail.step.decision',
} as const satisfies Record<KersorClassicStepId, KersorViewerKey>

function classicStepDotState(status: KersorClassicStepStatus): StateDotState {
  switch (status) {
    case 'pending': return 'warning'
    case 'active': return 'ongoing'
    case 'completed': return 'done'
    case 'failed': return 'error'
  }
}

function classicDotState(health: KersorClassicHealth, lifecycle: KersorClassicLifecycle): StateDotState {
  if (health === 'active') return 'ongoing'
  if (health !== 'terminal') return 'warning'
  switch (lifecycle) {
    case 'completed': return 'done'
    case 'stalled': return 'error'
    case 'cancelled': return 'warning'
    case 'active': return 'warning'
  }
}

function speedup(value: number): string {
  return Number.isInteger(value) ? value.toFixed(1) : value.toFixed(2)
}

const GATE_KEYS = {
  pass: 'session.gate.pass',
  fail: 'session.gate.fail',
  pending: 'session.gate.pending',
  not_required: 'session.gate.notRequired',
} as const satisfies Record<KersorClassicGate, KersorViewerKey>

const BASELINE_ACTION_KEYS = {
  init: 'session.baselineAction.init',
  record_verify: 'session.baselineAction.recordVerify',
  new_session: 'session.baselineAction.newSession',
} as const satisfies Record<KersorBaselineAction, KersorViewerKey>

function displayTime(value: string): string | undefined {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function ClassicSessionDetail({ detail, t }: {
  readonly detail: KersorClassicSessionDetail
  readonly t: KersorViewProps['t']
}): React.JSX.Element {
  const design = detail.authoring.design
  return (
    <div className={css.classicDetail}>
      <ol className={css.timeline} aria-label={t('detail.timeline')}>
        {detail.steps.map(step => (
          <li key={step.id} className={css.timelineStep} data-step-status={step.status}>
            <StateDot state={classicStepDotState(step.status)} />
            <span>{t(CLASSIC_STEP_KEYS[step.id])}</span>
          </li>
        ))}
      </ol>
      <div className={css.detailGrid}>
        <section className={css.detailSection}>
          <span className={css.detailTitle}>{t('detail.selection')}</span>
          <span>{t(`detail.selection.${detail.selection.status}`)}</span>
          {detail.selection.workflow !== undefined
            ? <span className={css.mono}>{detail.selection.workflow}</span>
            : null}
          {detail.selection.reason !== undefined
            ? <span className={css.detailReason}>{detail.selection.reason}</span>
            : null}
          <span>{t('detail.rejected', { count: detail.selection.rejectedCount })}</span>
        </section>
        <section className={css.detailSection}>
          <span className={css.detailTitle}>{t('detail.authoring')}</span>
          <span>{t(`detail.authoring.${detail.authoring.status}`)}</span>
          {detail.authoring.omittedReason !== undefined
            ? <span className={css.detailError}>{t('detail.omitted', { reason: detail.authoring.omittedReason })}</span>
            : null}
        </section>
        <section className={css.detailSection}>
          <span className={css.detailTitle}>{t('detail.validation')}</span>
          <span>{t(`detail.validation.${detail.validation.status}`)}</span>
          {detail.validation.checks.length > 0
            ? (
              <ul className={css.checks}>
                {detail.validation.checks.map(check => (
                  <li key={check.name} data-check-passed={check.passed}>
                    {check.passed ? '✓' : '×'} {check.name}
                  </li>
                ))}
              </ul>
            )
            : null}
        </section>
        <section className={css.detailSection}>
          <span className={css.detailTitle}>{t('detail.dispatch')}</span>
          <span>{t(`detail.dispatch.${detail.dispatch.status}`)}</span>
          {detail.dispatch.runtimeStatus !== undefined
            ? <span className={css.mono}>{detail.dispatch.runtimeStatus}</span>
            : null}
          {detail.dispatch.runDir !== undefined
            ? <span className={css.detailPath} title={detail.dispatch.runDir}>{detail.dispatch.runDir}</span>
            : null}
        </section>
      </div>
      {detail.authoring.files.length > 0
        ? (
          <div className={css.artifacts}>
            {detail.authoring.files.map(file => (
              <span key={file.name} title={file.sha256}>
                <span className={css.mono}>{file.name}</span> · {file.bytes} B · {file.sha256.slice(0, 18)}…
              </span>
            ))}
          </div>
        )
        : null}
      {design !== undefined
        ? (
          <div className={css.design}>
            <div className={css.designMeta}>
              {design.name !== undefined ? <span className={css.mono}>{design.name}</span> : null}
              {design.technique !== undefined ? <span>{design.technique}</span> : null}
              {design.methodCategory !== undefined ? <span>{design.methodCategory}</span> : null}
              {design.topology !== undefined ? <span>{design.topology}</span> : null}
              {design.languages.map(value => <span key={`language:${value}`}>{value}</span>)}
              {design.backends.map(value => <span key={`backend:${value}`}>{value}</span>)}
              {design.integrationPatterns.map(value => <span key={`integration:${value}`}>{value}</span>)}
            </div>
            {design.requiredArgs.length > 0
              ? <div className={css.requiredArgs}>{t('detail.requiredArgs')}: <span className={css.mono}>{design.requiredArgs.join(', ')}</span></div>
              : null}
            <details className={css.designDisclosure}>
              <summary>{t('detail.rationale')}</summary>
              <pre>{design.rationale}</pre>
            </details>
            <details className={css.designDisclosure}>
              <summary>{t('detail.source')}</summary>
              <pre>{design.source}</pre>
            </details>
          </div>
        )
        : <div className={css.detailNote}>{t('detail.sealRequired')}</div>}
    </div>
  )
}

function ClassicSessionRow({ session, selected, detail, loading, error, onToggle, t }: {
  readonly session: KersorClassicSession
  readonly selected: boolean
  readonly detail?: KersorClassicSessionDetail | undefined
  readonly loading: boolean
  readonly error?: string | undefined
  readonly onToggle: () => void
  readonly t: KersorViewProps['t']
}): React.JSX.Element {
  const round = session.current_round !== null && session.current_round !== undefined
    ? session.max_workflows !== null && session.max_workflows !== undefined
      ? t('session.round', { current: session.current_round, maximum: session.max_workflows })
      : t('session.roundOpen', { current: session.current_round })
    : undefined
  const languageBackend = session.kernel_language !== null && session.kernel_language !== undefined
    ? session.backend !== null && session.backend !== undefined
      ? `${session.kernel_language}/${session.backend}`
      : session.kernel_language
    : session.backend ?? undefined
  const details = [languageBackend, session.mode, session.storage_kind].filter(Boolean).join(' · ')
  const activity = session.last_activity_at !== null && session.last_activity_at !== undefined
    ? displayTime(session.last_activity_at)
    : undefined
  const fitConfidence = visibleFitConfidence(session)
  return (
    <li
      className={css.classicRow}
      data-session-health={session.health}
      data-session-lifecycle={session.lifecycle}
      data-expanded={selected}
    >
      <div className={css.classicHead}>
        <StateDot state={classicDotState(session.health, session.lifecycle)} />
        <span className={css.sessionId} title={session.session_dir}>{session.session_id}</span>
        <span className={css.phaseBadge}>{t(CLASSIC_HEALTH_KEYS[session.health])}</span>
        <button
          type="button"
          className={css.classicExpand}
          aria-expanded={selected}
          aria-label={selected ? t('detail.collapse') : t('detail.expand')}
          onClick={onToggle}
        >
          <IconChevronRightOutline14 />
        </button>
      </div>
      <div className={css.classicMetrics}>
        {round !== undefined ? <span>{round}</span> : null}
        {session.best_speedup !== null && session.best_speedup !== undefined
          ? <span data-target-met={session.target_met ?? undefined}>{t('session.best', { speedup: speedup(session.best_speedup) })}</span>
          : null}
        {session.target_speedup !== null && session.target_speedup !== undefined
          ? <span>{t('session.target', { speedup: speedup(session.target_speedup) })}</span>
          : null}
        <span>{session.phase ?? t('session.unknownPhase')}</span>
        {details.length > 0 ? <span>{details}</span> : null}
        {session.integration_pattern !== null && session.integration_pattern !== undefined
          ? <span className={css.routeBadge}>{session.integration_pattern}</span>
          : null}
        {session.allow_workflow_authoring === true
          ? <span className={css.authoringBadge}>{t('session.authoring', {
            budget: session.workflow_authoring_budget ?? '—',
          })}</span>
          : null}
        {session.fresh_session != null
          ? <span className={css.gateBadge} data-gate={session.fresh_session}>{t('session.freshGate', {
            status: t(GATE_KEYS[session.fresh_session]),
          })}</span>
          : null}
        {session.allow_workflow_authoring === true && session.baseline_witness != null
          ? <span className={css.gateBadge} data-gate={session.baseline_witness}>{t('session.baselineGate', {
            status: t(GATE_KEYS[session.baseline_witness]),
          })}</span>
          : null}
        {session.allow_workflow_authoring === true && session.profile_evidence != null
          ? <span className={css.gateBadge} data-gate={session.profile_evidence}>{t('session.profileGate', {
            status: t(GATE_KEYS[session.profile_evidence]),
          })}</span>
          : null}
        {session.allow_workflow_authoring === true && session.profile_owner != null
          ? <span className={css.routeBadge} data-profile-owner={session.profile_owner}>{t('session.profileOwner', {
            owner: session.profile_owner,
          })}</span>
          : null}
        {session.allow_workflow_authoring === true && session.dsh_compatibility != null
          ? <span className={css.gateBadge} data-gate={session.dsh_compatibility}>{t('session.dshGate', {
            status: t(GATE_KEYS[session.dsh_compatibility]),
          })}</span>
          : null}
        {session.allow_workflow_authoring === true && session.candidate_ownership != null
          ? <span className={css.gateBadge} data-gate={session.candidate_ownership}>{t('session.ownershipGate', {
            status: t(GATE_KEYS[session.candidate_ownership]),
          })}</span>
          : null}
        {activity !== undefined ? <span>{t('session.lastActivity', { time: activity })}</span> : null}
      </div>
      {session.allow_workflow_authoring === true && session.baseline_next_action != null
        ? <div
          className={css.baselineAction}
          data-baseline-action={session.baseline_next_action}
          title={session.baseline_reason ?? undefined}
        >
          <span className={css.baselineActionLabel}>{t(BASELINE_ACTION_KEYS[session.baseline_next_action])}</span>
          {session.baseline_reason != null
            ? <span className={css.baselineActionReason}>{session.baseline_reason}</span>
            : null}
        </div>
        : null}
      {session.allow_workflow_authoring === true && session.profile_evidence === 'fail'
        && session.profile_reason != null
        ? <div className={css.profileBlock} data-profile-gate="fail" title={session.profile_reason}>
          <span className={css.profileBlockLabel}>{t('session.profileBlocked')}</span>
          <span className={css.profileBlockReason}>{session.profile_reason}</span>
        </div>
        : null}
      <div className={css.classicFoot}>
        <span className={css.workflowName}>
          {session.selection_status === 'stalled'
            ? t('session.selectorStalled')
            : session.workflow !== null && session.workflow !== undefined
              ? t('session.workflow', { workflow: session.workflow })
              : t('session.noWorkflow')}
        </span>
        {fitConfidence !== undefined
          ? <span className={css.fitBadge} data-fit-confidence={fitConfidence}>{t('session.fit', { confidence: fitConfidence })}</span>
          : null}
        {session.warningCount > 0
          ? <span className={css.warningCount}>{t('session.warnings', { count: session.warningCount })}</span>
          : null}
      </div>
      {session.decision !== null && session.decision !== undefined
        ? <div className={css.decisionReason} title={session.decision}>{session.decision}</div>
        : null}
      {selected && loading ? <div className={css.detailNote}>{t('detail.loading')}</div> : null}
      {selected && error !== undefined ? <div className={css.detailError}>{error}</div> : null}
      {selected && !loading && detail !== undefined ? <ClassicSessionDetail detail={detail} t={t} /> : null}
    </li>
  )
}

function durationSeconds(startedTs?: string, endedTs?: string): string | undefined {
  if (startedTs === undefined || endedTs === undefined) return undefined
  const start = Date.parse(startedTs)
  const end = Date.parse(endedTs)
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return undefined
  return `${((end - start) / 1000).toFixed(1)}s`
}

function CallRow({ call, t }: {
  readonly call: KersorCallView
  readonly t: KersorViewProps['t']
}): React.JSX.Element {
  const duration = durationSeconds(call.startedTs, call.endedTs)
  return (
    <div className={css.callRow} data-call-status={call.status}>
      <span className={css.dotSlot}><StateDot state={callDotState(call.status)} /></span>
      <span className={css.callLabel} title={call.callId}>{call.label}</span>
      <span className={css.callMeta}>
        {call.kind === 'evaluation' ? t('call.evaluation') : null}
        {call.rolledBack ? <span className={css.badge}>{t('call.rolledBack')}</span> : null}
        {duration !== undefined ? <span>{duration}</span> : null}
        {call.tokens !== undefined ? <span>{call.tokens.toLocaleString()} tk</span> : null}
      </span>
      <span className={css.callStatus}>{t(CALL_STATUS_KEYS[call.status])}</span>
    </div>
  )
}

function PhaseSection({ phase, t }: {
  readonly phase: KersorPhaseView
  readonly t: KersorViewProps['t']
}): React.JSX.Element {
  const title = phase.title.length > 0 ? phase.title : t('phase.empty')
  return (
    <div className={css.phaseSection}>
      <div className={css.phaseHeader}>
        <span className={css.dotSlot}><StateDot state={phaseDotState(phase.status)} /></span>
        <span className={css.phaseTitle}>{title}</span>
        <span className={css.phaseSummary}>{phase.calls.length}</span>
      </div>
      {phase.calls.map(call => <CallRow key={call.callId} call={call} t={t} />)}
    </div>
  )
}

function WorkflowPipeline({ view, t }: {
  readonly view: KersorRunView
  readonly t: KersorViewProps['t']
}): React.JSX.Element {
  return (
    <ol className={css.pipeline} aria-label={t('run.pipeline')}>
      {view.phases.map(phase => (
        <li key={`${phase.index}-${phase.title}`} className={css.pipelineNode} data-phase-status={phase.status}>
          <div className={css.pipelineNodeHead}>
            <StateDot state={phaseDotState(phase.status)} />
            <span>{phase.title.length > 0 ? phase.title : t('phase.empty')}</span>
          </div>
          <span className={css.pipelineCount}>{t('run.calls', { calls: phase.calls.length })}</span>
          {phase.calls.length > 0
            ? (
              <div className={css.pipelineCalls}>
                {phase.calls.map(call => (
                  <span key={call.callId} className={css.pipelineCall} data-call-status={call.status} title={call.callId}>
                    <StateDot state={callDotState(call.status)} />
                    <span>{call.label}</span>
                  </span>
                ))}
              </div>
            )
            : null}
        </li>
      ))}
    </ol>
  )
}

function WorkflowResult({ result, t }: {
  readonly result: KersorWorkflowResultView
  readonly t: KersorViewProps['t']
}): React.JSX.Element {
  return (
    <section className={css.workflowResult} aria-label={t('run.result.title')}>
      <div className={css.resultHead}>
        <span className={css.detailTitle}>{t('run.result.title')}</span>
        {result.stage !== undefined
          ? <span className={css.resultStage}>{t('run.result.stage', { stage: result.stage })}</span>
          : null}
      </div>
      <div className={css.resultMetrics}>
        {result.selectedCandidateId !== undefined
          ? <span>{t('run.result.selected', { candidate: result.selectedCandidateId })}</span>
          : null}
        {result.expectedCycles !== undefined
          ? <span>{t('run.result.cycles', { cycles: result.expectedCycles.toLocaleString() })}</span>
          : null}
        {result.measuredSpeedup !== undefined && result.measuredSpeedup !== null
          ? <span data-measurement="measured">{t('run.result.measured', { speedup: speedup(result.measuredSpeedup) })}</span>
          : result.estimatedSpeedup !== undefined
            ? <span data-measurement="estimated">{t('run.result.estimated', { speedup: speedup(result.estimatedSpeedup) })}</span>
            : <span data-measurement="pending">{t('run.result.unmeasured')}</span>}
      </div>
      {result.candidates.length > 0
        ? (
          <ul className={css.candidates}>
            {result.candidates.map(candidate => (
              <li
                key={candidate.id}
                className={css.candidate}
                data-selected={candidate.id === result.selectedCandidateId}
              >
                <span className={css.mono}>{candidate.id}</span>
                {candidate.expectedCycles !== undefined
                  ? <span>{t('run.result.cycles', { cycles: candidate.expectedCycles.toLocaleString() })}</span>
                  : null}
                {candidate.id === result.selectedCandidateId ? <span>{t('run.result.chosen')}</span> : null}
              </li>
            ))}
          </ul>
        )
        : null}
    </section>
  )
}

function workflowResultOf(view: KersorRunView): KersorWorkflowResultView | undefined {
  const nested = view.result
  const candidates = view.candidates ?? nested?.candidates ?? []
  const stage = view.candidateStage ?? nested?.stage
  const selectedCandidateId = view.selectedCandidateId ?? nested?.selectedCandidateId
  const expectedCycles = view.expectedCycles ?? nested?.expectedCycles
  const estimatedSpeedup = view.estimatedSpeedup ?? nested?.estimatedSpeedup
  const measuredSpeedup = view.measuredSpeedup ?? nested?.measuredSpeedup
  if (
    stage === undefined && selectedCandidateId === undefined && expectedCycles === undefined
    && estimatedSpeedup === undefined && measuredSpeedup === undefined && candidates.length === 0
  ) return undefined
  return {
    ...(stage === undefined ? {} : { stage }),
    ...(selectedCandidateId === undefined ? {} : { selectedCandidateId }),
    ...(expectedCycles === undefined ? {} : { expectedCycles }),
    ...(estimatedSpeedup === undefined ? {} : { estimatedSpeedup }),
    ...(measuredSpeedup === undefined ? {} : { measuredSpeedup }),
    candidates,
  }
}

function RunDetail({ view, t }: {
  readonly view: KersorRunView
  readonly t: KersorViewProps['t']
}): React.JSX.Element {
  const result = workflowResultOf(view)
  return (
    <div className={css.runDetail}>
      <div className={css.runHead}>
        <span className={css.workflowIdentity} title={view.scriptHash}>{view.workflow ?? view.runId}</span>
        <span className={css.runId} title={view.runDir}>{view.runId}</span>
        <span className={css.statusTail} data-status={view.status}>
          <StateDot state={runDotState(view.status)} />
          <span>{t(RUN_STATUS_KEYS[view.status])}</span>
        </span>
      </div>
      <div className={css.runMeta}>
        {view.currentPhase.length > 0 ? <span>{t('run.currentPhase', { phase: view.currentPhase })}</span> : null}
        <span>{t('run.calls', { calls: view.totals.calls })}</span>
        {view.totals.tokens > 0 ? <span>{t('run.tokens', { tokens: view.totals.tokens.toLocaleString() })}</span> : null}
      </div>
      {view.error !== undefined ? <div className={css.runError}>{t('run.error', { message: view.error })}</div> : null}
      {view.phases.length > 0 ? <WorkflowPipeline view={view} t={t} /> : null}
      {result !== undefined ? <WorkflowResult result={result} t={t} /> : null}
      {view.phases.map(phase => <PhaseSection key={`${phase.index}-${phase.title}`} phase={phase} t={t} />)}
    </div>
  )
}

function LauncherControls({ launcher, busy, start, stop, t }: {
  readonly launcher: NonNullable<KersorViewerState['launcher']>
  readonly busy: string | undefined
  readonly start: (taskId: KersorTaskId) => Promise<void>
  readonly stop: (runDir: string) => Promise<void>
  readonly t: KersorViewProps['t']
}): React.JSX.Element {
  const labels = new Map(launcher.tasks.map(task => [task.id, task.label]))
  return (
    <section className={css.launcher} aria-label={t('launcher.title')}>
      <div className={css.launcherHead}>
        <span className={css.launcherTitle}>{t('launcher.title')}</span>
        {launcher.active.length > 0
          ? <span className={css.launcherSummary}>{t('launcher.running', { count: launcher.active.length })}</span>
          : null}
      </div>
      <div className={css.taskList}>
        {launcher.tasks.map((task) => {
          const key = `start:${task.id}`
          return (
            <div key={task.id} className={css.taskRow}>
              <span className={css.taskLabel}>{task.label}</span>
              <button
                type="button"
                className={css.controlButton}
                disabled={busy !== undefined}
                onClick={() => { void start(task.id) }}
                data-busy={busy === key}
              >
                {t('launcher.start')}
              </button>
            </div>
          )
        })}
      </div>
      {launcher.active.length > 0
        ? (
          <div className={css.activeList}>
            {launcher.active.map(launch => (
              <div key={launch.runDir} className={css.activeRow}>
                <StateDot state="ongoing" />
                <span className={css.activeLabel} title={launch.runDir}>
                  {labels.get(launch.taskId) ?? launch.taskId}
                  <span className={css.activeRunId}>{launch.runId}</span>
                </span>
                <button
                  type="button"
                  className={css.controlButton}
                  disabled={busy !== undefined}
                  onClick={() => { void stop(launch.runDir) }}
                  data-busy={busy === `stop:${launch.runDir}`}
                >
                  {t('launcher.stop')}
                </button>
              </div>
            ))}
          </div>
        )
        : null}
      {launcher.error !== undefined
        ? <div className={css.readError}>{t('launcher.error', { message: launcher.error })}</div>
        : null}
    </section>
  )
}

interface ViewerHealth {
  readonly state: 'healthy' | 'degraded' | 'failed'
  readonly roots: number
  readonly readers: number
  readonly sources: number
  readonly issue?: KersorDiagnosticIssue
}

function viewerHealth(snapshot: KersorViewerSnapshot): ViewerHealth {
  const roots = snapshot.diagnostics.scan.roots
  const readers = snapshot.diagnostics.runs
  const rootIssues = roots.flatMap(root => root.lastIssue === undefined ? [] : [root.lastIssue])
  const runIssues = readers.flatMap(run => run.lastIssue === undefined ? [] : [run.lastIssue])
  const classicIssue = snapshot.classic.source.lastIssue
  const issues = [...rootIssues, ...runIssues, ...(classicIssue === undefined ? [] : [classicIssue])]
  const classicFailed = snapshot.classic.source.state === 'failed'
  const degraded = snapshot.diagnostics.scan.state === 'degraded'
    || snapshot.diagnostics.scan.state === 'failed'
    || classicFailed
    || snapshot.classic.source.state === 'degraded'
    || readers.some(run => run.state === 'degraded' || run.state === 'failed')
  const noReadableSource = snapshot.diagnostics.scan.state === 'failed'
    && snapshot.classic.source.state !== 'healthy'
    && snapshot.classic.source.state !== 'degraded'
  const issue = snapshot.diagnostics.scan.lastIssue ?? classicIssue ?? runIssues.at(-1)
  return {
    state: noReadableSource ? 'failed' : degraded ? 'degraded' : 'healthy',
    roots: roots.length,
    readers: readers.length,
    sources: issues.length,
    ...(issue === undefined ? {} : { issue }),
  }
}

/** First-class KerSor view rendered beside Chat and Trajectory. */
export function KersorView({
  t, store, refresh, loadRun, loadClassic, start, stop,
}: KersorViewProps): React.JSX.Element {
  const [busy, setBusy] = useState<string>()
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const rows = store.rows
  const classicSessions = state.snapshot?.classic.sessions ?? []
  const health = state.snapshot === undefined ? undefined : viewerHealth(state.snapshot)
  const view = store.activeView

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (store.selectedRunDir !== undefined || rows.length === 0) return
    const preferredSession = classicSessions.find(session => session.health === 'active') ?? classicSessions[0]
    const matching = preferredSession === undefined
      ? []
      : rows.filter(row => row.sessionDir === preferredSession.session_dir)
    const target = matching.sort((left, right) => (right.round ?? 0) - (left.round ?? 0))[0]
      ?? rows.find(row => row.discovery === 'active')
      ?? rows[0]
    if (target === undefined) return
    store.select(target.runDir)
    void loadRun(target.runDir)
  }, [classicSessions, loadRun, rows, store])

  const runStart = async (taskId: KersorTaskId): Promise<void> => {
    setBusy(`start:${taskId}`)
    try {
      await start(taskId)
    } finally {
      setBusy(undefined)
    }
  }

  const runStop = async (runDir: string): Promise<void> => {
    setBusy(`stop:${runDir}`)
    try {
      await stop(runDir)
    } finally {
      setBusy(undefined)
    }
  }

  const toggleClassic = (sessionDir: string): void => {
    if (store.selectedClassicSessionDir === sessionDir) {
      store.selectClassic(undefined)
      return
    }
    store.selectClassic(sessionDir)
    void loadClassic(sessionDir)
  }

  return (
    <section
      className={css.view}
      data-conversation-composer-overlay=""
      aria-label={t('panel.title')}
    >
      <div className={css.header}>
        <span className={css.title}>{t('panel.title')}</span>
        <span className={css.note}>{t('panel.hint')}</span>
      </div>
      <div className={css.body}>
        {state.launcher !== undefined
          ? <LauncherControls launcher={state.launcher} busy={busy} start={runStart} stop={runStop} t={t} />
          : null}
        {state.transportError !== undefined
          ? <div className={css.readError}>{t('panel.readFailed', { message: state.transportError })}</div>
          : null}
        {health !== undefined && health.state !== 'healthy'
          ? (
            <div className={css.readError} data-source-health={health.state}>
              {t(health.state === 'failed' ? 'panel.sourcesFailed' : 'panel.sourcesDegraded', {
                roots: health.roots,
                readers: health.readers,
                sources: health.sources,
                stage: health.issue?.stage ?? 'source',
                code: health.issue?.code ?? 'unavailable',
                occurrences: health.issue?.occurrences ?? 1,
              })}
            </div>
          )
          : null}
        {state.loading ? <div className={css.note}>{t('panel.loading')}</div> : null}
        {!state.loading
                && state.transportError === undefined
                && health?.state === 'healthy'
                && rows.length === 0
                && classicSessions.length === 0
          ? <div className={css.note}>{t('panel.empty', { roots: health.roots })}</div>
          : null}
        {classicSessions.length > 0
          ? (
            <section className={css.activitySection} aria-label={t('session.title')}>
              <div className={css.sectionHead}>
                <span className={css.sectionTitle}>{t('session.title')}</span>
                <span className={css.sectionSummary}>{t('session.summary', {
                  count: classicSessions.length,
                  active: classicSessions.filter(session => session.health === 'active').length,
                })}</span>
              </div>
              <ul className={css.classicRows}>
                {classicSessions.map(session => (
                  <ClassicSessionRow
                    key={session.session_dir}
                    session={session}
                    selected={store.selectedClassicSessionDir === session.session_dir}
                    loading={state.classicDetailLoading === session.session_dir}
                    {...(state.classicDetails.get(session.session_dir) === undefined
                      ? {}
                      : { detail: state.classicDetails.get(session.session_dir) })}
                    {...(state.classicDetailError?.startsWith(`${session.session_dir}: `) === true
                      ? { error: state.classicDetailError.slice(session.session_dir.length + 2) }
                      : {})}
                    onToggle={() => { toggleClassic(session.session_dir) }}
                    t={t}
                  />
                ))}
              </ul>
            </section>
          )
          : null}
        {rows.length > 0
          ? (
            <section className={css.activitySection} aria-label={t('run.sectionTitle')}>
              <div className={css.sectionHead}>
                <span className={css.sectionTitle}>{t('run.sectionTitle')}</span>
                <span className={css.sectionSummary}>{rows.length}</span>
              </div>
              <ul className={css.rows}>
                {rows.map(row => (
                  <li key={row.runDir} className={css.row} data-run-status={row.discovery}>
                    <button
                      type="button"
                      className={css.rowHead}
                      aria-pressed={store.selectedRunDir === row.runDir}
                      onClick={() => {
                        const next = store.selectedRunDir === row.runDir ? undefined : row.runDir
                        store.select(next)
                        if (next !== undefined) void loadRun(next)
                      }}
                    >
                      <StateDot state={row.discovery === 'active' ? 'ongoing' : row.discovery === 'failed' ? 'error' : 'done'} />
                      <span className={css.runId}>{row.runId}</span>
                      <span className={css.rowPath} title={row.runDir}>{row.sessionDir}</span>
                    </button>
                    {store.selectedRunDir === row.runDir && row.view !== undefined
                      ? <RunDetail view={row.view} t={t} />
                      : null}
                  </li>
                ))}
              </ul>
            </section>
          )
          : null}
        {rows.length > 0 && view !== undefined && !rows.some(row => row.runDir === store.selectedRunDir)
          ? <RunDetail view={view} t={t} />
          : null}
      </div>
    </section>
  )
}
