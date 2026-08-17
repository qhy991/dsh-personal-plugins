/** KerSor runs sidebar panel: run inventory with live phase/call progress. */

import { useState, useSyncExternalStore } from 'react'
import { IconChevronRightOutline14, StateDot, type StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { KersorCallView, KersorPhaseView, KersorRunStatus, KersorRunView } from '@deepseek-ai/dsh-kersor-viewer/types'
import type { KersorClassicLifecycle, KersorClassicSession } from '@deepseek-ai/dsh-kersor-viewer/types'
import type { KersorTaskId } from '@deepseek-ai/dsh-kersor/types'
import type { KersorViewerState } from './store.ts'
import type { KersorViewerKey } from './locales.ts'
import type { KersorPanelFace } from './slots.ts'
import css from './KersorPanel.module.css'

/** Full panel props composed by the sidebar footer-action slot. */
export type KersorPanelProps =
  PropsRuntime<'sidebar.footer.action'> & InjectFace<KersorPanelFace> & PropsLocale<'kersorViewer'>

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

function classicDotState(lifecycle: KersorClassicLifecycle): StateDotState {
  switch (lifecycle) {
    case 'active': return 'ongoing'
    case 'completed': return 'done'
    case 'stalled': return 'error'
    case 'cancelled': return 'warning'
  }
}

function speedup(value: number): string {
  return Number.isInteger(value) ? value.toFixed(1) : value.toFixed(2)
}

function ClassicSessionRow({ session, t }: {
  readonly session: KersorClassicSession
  readonly t: KersorPanelProps['t']
}): React.JSX.Element {
  const round = session.current_round !== null && session.current_round !== undefined
    ? session.max_workflows !== null && session.max_workflows !== undefined
      ? t('session.round', { current: session.current_round, maximum: session.max_workflows })
      : t('session.roundOpen', { current: session.current_round })
    : undefined
  const details = [session.backend, session.mode, session.storage_kind].filter(Boolean).join(' · ')
  return (
    <li className={css.classicRow} data-session-lifecycle={session.lifecycle}>
      <div className={css.classicHead}>
        <StateDot state={classicDotState(session.lifecycle)} />
        <span className={css.sessionId} title={session.session_dir}>{session.session_id}</span>
        <span className={css.phaseBadge}>{session.phase ?? t('session.unknownPhase')}</span>
      </div>
      <div className={css.classicMetrics}>
        {round !== undefined ? <span>{round}</span> : null}
        {session.best_speedup !== null && session.best_speedup !== undefined
          ? <span data-target-met={session.target_met ?? undefined}>{t('session.best', { speedup: speedup(session.best_speedup) })}</span>
          : null}
        {session.target_speedup !== null && session.target_speedup !== undefined
          ? <span>{t('session.target', { speedup: speedup(session.target_speedup) })}</span>
          : null}
        {details.length > 0 ? <span>{details}</span> : null}
      </div>
      <div className={css.classicFoot}>
        <span className={css.workflowName}>
          {session.workflow !== null && session.workflow !== undefined
            ? t('session.workflow', { workflow: session.workflow })
            : t('session.noWorkflow')}
        </span>
        {session.warnings.length > 0
          ? <span className={css.warningCount} title={session.warnings.join('\n')}>{t('session.warnings', { count: session.warnings.length })}</span>
          : null}
      </div>
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
  readonly t: KersorPanelProps['t']
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
  readonly t: KersorPanelProps['t']
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

function RunDetail({ view, t }: {
  readonly view: KersorRunView
  readonly t: KersorPanelProps['t']
}): React.JSX.Element {
  return (
    <div className={css.runDetail}>
      <div className={css.runHead}>
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
      {view.phases.map(phase => <PhaseSection key={`${phase.index}-${phase.title}`} phase={phase} t={t} />)}
    </div>
  )
}

function LauncherControls({ launcher, busy, start, stop, t }: {
  readonly launcher: NonNullable<KersorViewerState['launcher']>
  readonly busy: string | undefined
  readonly start: (taskId: KersorTaskId) => Promise<void>
  readonly stop: (runDir: string) => Promise<void>
  readonly t: KersorPanelProps['t']
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
        {launcher.tasks.map(task => {
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

/** Sidebar footer panel: trigger row plus the fixed inventory popup. */
export function KersorPanel({ t, store, refresh, start, stop }: KersorPanelProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string>()
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const view = store.activeView

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

  return (
    <div className={css.layer}>
      <button
        type="button"
        className={css.trigger}
        aria-expanded={open}
        aria-label={t('panel.trigger')}
        onClick={() => {
          setOpen(!open)
          if (!open) void refresh()
        }}
      >
        <span className={css.triggerIcon}><IconChevronRightOutline14 /></span>
        <span className={css.triggerLabel}>{t('panel.trigger')}</span>
        {state.rows.some(row => row.discovery === 'active')
          || state.classicSessions.some(session => session.lifecycle === 'active')
          ? <span className={css.triggerBadge}><StateDot state="ongoing" /></span>
          : null}
      </button>
      {open
        ? (
          <div className={css.panel} role="dialog" aria-label={t('panel.title')}>
            <div className={css.header}>
              <span className={css.title}>{t('panel.title')}</span>
              <span className={css.note}>{t('panel.hint')}</span>
            </div>
            <div className={css.body}>
              {state.launcher !== undefined
                ? <LauncherControls launcher={state.launcher} busy={busy} start={runStart} stop={runStop} t={t} />
                : null}
              {state.error !== undefined ? <div className={css.readError}>{t('panel.readFailed', { message: state.error })}</div> : null}
              {state.classicWarning !== undefined ? <div className={css.readError}>{state.classicWarning}</div> : null}
              {state.loading ? <div className={css.note}>{t('panel.loading')}</div> : null}
              {!state.loading && state.rows.length === 0 && state.classicSessions.length === 0
                ? <div className={css.note}>{t('panel.empty')}</div>
                : null}
              {state.classicSessions.length > 0
                ? (
                  <section className={css.activitySection} aria-label={t('session.title')}>
                    <div className={css.sectionHead}>
                      <span className={css.sectionTitle}>{t('session.title')}</span>
                      <span className={css.sectionSummary}>{t('session.count', { count: state.classicSessions.length })}</span>
                    </div>
                    <ul className={css.classicRows}>
                      {state.classicSessions.map(session => <ClassicSessionRow key={session.session_dir} session={session} t={t} />)}
                    </ul>
                  </section>
                )
                : null}
              {state.rows.length > 0
                ? (
                  <section className={css.activitySection} aria-label={t('run.sectionTitle')}>
                    <div className={css.sectionHead}>
                      <span className={css.sectionTitle}>{t('run.sectionTitle')}</span>
                      <span className={css.sectionSummary}>{state.rows.length}</span>
                    </div>
                    <ul className={css.rows}>
                      {state.rows.map(row => (
                        <li key={row.runDir} className={css.row} data-run-status={row.discovery}>
                          <button
                            type="button"
                            className={css.rowHead}
                            aria-pressed={store.selectedRunDir === row.runDir}
                            onClick={() => { store.select(store.selectedRunDir === row.runDir ? undefined : row.runDir) }}
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
              {state.rows.length > 0 && view !== undefined && !state.rows.some(row => row.runDir === store.selectedRunDir)
                ? <RunDetail view={view} t={t} />
                : null}
            </div>
          </div>
        )
        : null}
    </div>
  )
}
