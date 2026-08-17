import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** KerSor runs sidebar panel: run inventory with live phase/call progress. */
import { useState, useSyncExternalStore } from 'react';
import { IconChevronRightOutline14, StateDot } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './KersorPanel.module.css';
const RUN_STATUS_KEYS = {
    running: 'run.active',
    completed: 'run.completed',
    failed: 'run.failed',
    unknown: 'run.unknown',
};
const CALL_STATUS_KEYS = {
    queued: 'call.queued',
    running: 'call.running',
    completed: 'call.completed',
    failed: 'call.failed',
};
function runDotState(status) {
    switch (status) {
        case 'running': return 'ongoing';
        case 'completed': return 'done';
        case 'failed': return 'error';
        /* v8 ignore next -- KersorRunStatus is closed and every variant is handled above. */
        default: return 'warning';
    }
}
function callDotState(status) {
    switch (status) {
        case 'queued': return 'warning';
        case 'running': return 'ongoing';
        case 'completed': return 'done';
        case 'failed': return 'error';
    }
}
function phaseDotState(status) {
    switch (status) {
        case 'running': return 'ongoing';
        case 'completed': return 'done';
        case 'failed': return 'error';
    }
}
const CLASSIC_HEALTH_KEYS = {
    active: 'session.health.active',
    stale: 'session.health.stale',
    needs_resume: 'session.health.needsResume',
    terminal: 'session.health.terminal',
    unknown: 'session.health.unknown',
};
function classicDotState(health, lifecycle) {
    if (health === 'active')
        return 'ongoing';
    if (health !== 'terminal')
        return 'warning';
    switch (lifecycle) {
        case 'completed': return 'done';
        case 'stalled': return 'error';
        case 'cancelled': return 'warning';
        case 'active': return 'warning';
    }
}
function speedup(value) {
    return Number.isInteger(value) ? value.toFixed(1) : value.toFixed(2);
}
const GATE_KEYS = {
    pass: 'session.gate.pass',
    fail: 'session.gate.fail',
    pending: 'session.gate.pending',
    not_required: 'session.gate.notRequired',
};
function displayTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return undefined;
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}
function ClassicSessionRow({ session, t }) {
    const round = session.current_round !== null && session.current_round !== undefined
        ? session.max_workflows !== null && session.max_workflows !== undefined
            ? t('session.round', { current: session.current_round, maximum: session.max_workflows })
            : t('session.roundOpen', { current: session.current_round })
        : undefined;
    const languageBackend = session.kernel_language !== null && session.kernel_language !== undefined
        ? session.backend !== null && session.backend !== undefined
            ? `${session.kernel_language}/${session.backend}`
            : session.kernel_language
        : session.backend ?? undefined;
    const details = [languageBackend, session.mode, session.storage_kind].filter(Boolean).join(' · ');
    const activity = session.last_activity_at !== null && session.last_activity_at !== undefined
        ? displayTime(session.last_activity_at)
        : undefined;
    return (_jsxs("li", { className: css.classicRow, "data-session-health": session.health, "data-session-lifecycle": session.lifecycle, children: [_jsxs("div", { className: css.classicHead, children: [_jsx(StateDot, { state: classicDotState(session.health, session.lifecycle) }), _jsx("span", { className: css.sessionId, title: session.session_dir, children: session.session_id }), _jsx("span", { className: css.phaseBadge, children: t(CLASSIC_HEALTH_KEYS[session.health]) })] }), _jsxs("div", { className: css.classicMetrics, children: [round !== undefined ? _jsx("span", { children: round }) : null, session.best_speedup !== null && session.best_speedup !== undefined
                        ? _jsx("span", { "data-target-met": session.target_met ?? undefined, children: t('session.best', { speedup: speedup(session.best_speedup) }) })
                        : null, session.target_speedup !== null && session.target_speedup !== undefined
                        ? _jsx("span", { children: t('session.target', { speedup: speedup(session.target_speedup) }) })
                        : null, _jsx("span", { children: session.phase ?? t('session.unknownPhase') }), details.length > 0 ? _jsx("span", { children: details }) : null, session.integration_pattern !== null && session.integration_pattern !== undefined
                        ? _jsx("span", { className: css.routeBadge, children: session.integration_pattern })
                        : null, session.allow_workflow_authoring === true
                        ? _jsx("span", { className: css.authoringBadge, children: t('session.authoring', {
                                budget: session.workflow_authoring_budget ?? '—',
                            }) })
                        : null, session.allow_workflow_authoring === true && session.baseline_witness != null
                        ? _jsx("span", { className: css.gateBadge, "data-gate": session.baseline_witness, children: t('session.baselineGate', {
                                status: t(GATE_KEYS[session.baseline_witness]),
                            }) })
                        : null, session.allow_workflow_authoring === true && session.dsh_compatibility != null
                        ? _jsx("span", { className: css.gateBadge, "data-gate": session.dsh_compatibility, children: t('session.dshGate', {
                                status: t(GATE_KEYS[session.dsh_compatibility]),
                            }) })
                        : null, activity !== undefined ? _jsx("span", { children: t('session.lastActivity', { time: activity }) }) : null] }), _jsxs("div", { className: css.classicFoot, children: [_jsx("span", { className: css.workflowName, children: session.workflow !== null && session.workflow !== undefined
                            ? t('session.workflow', { workflow: session.workflow })
                            : t('session.noWorkflow') }), session.lifecycle !== 'stalled' && session.lifecycle !== 'cancelled'
                        && session.fit_confidence !== null && session.fit_confidence !== undefined
                        ? _jsx("span", { className: css.fitBadge, "data-fit-confidence": session.fit_confidence, children: t('session.fit', { confidence: session.fit_confidence }) })
                        : null, session.warnings.length > 0
                        ? _jsx("span", { className: css.warningCount, title: session.warnings.join('\n'), children: t('session.warnings', { count: session.warnings.length }) })
                        : null] }), session.decision !== null && session.decision !== undefined
                ? _jsx("div", { className: css.decisionReason, title: session.decision, children: session.decision })
                : null] }));
}
function durationSeconds(startedTs, endedTs) {
    if (startedTs === undefined || endedTs === undefined)
        return undefined;
    const start = Date.parse(startedTs);
    const end = Date.parse(endedTs);
    if (Number.isNaN(start) || Number.isNaN(end) || end < start)
        return undefined;
    return `${((end - start) / 1000).toFixed(1)}s`;
}
function CallRow({ call, t }) {
    const duration = durationSeconds(call.startedTs, call.endedTs);
    return (_jsxs("div", { className: css.callRow, "data-call-status": call.status, children: [_jsx("span", { className: css.dotSlot, children: _jsx(StateDot, { state: callDotState(call.status) }) }), _jsx("span", { className: css.callLabel, title: call.callId, children: call.label }), _jsxs("span", { className: css.callMeta, children: [call.kind === 'evaluation' ? t('call.evaluation') : null, call.rolledBack ? _jsx("span", { className: css.badge, children: t('call.rolledBack') }) : null, duration !== undefined ? _jsx("span", { children: duration }) : null, call.tokens !== undefined ? _jsxs("span", { children: [call.tokens.toLocaleString(), " tk"] }) : null] }), _jsx("span", { className: css.callStatus, children: t(CALL_STATUS_KEYS[call.status]) })] }));
}
function PhaseSection({ phase, t }) {
    const title = phase.title.length > 0 ? phase.title : t('phase.empty');
    return (_jsxs("div", { className: css.phaseSection, children: [_jsxs("div", { className: css.phaseHeader, children: [_jsx("span", { className: css.dotSlot, children: _jsx(StateDot, { state: phaseDotState(phase.status) }) }), _jsx("span", { className: css.phaseTitle, children: title }), _jsx("span", { className: css.phaseSummary, children: phase.calls.length })] }), phase.calls.map(call => _jsx(CallRow, { call: call, t: t }, call.callId))] }));
}
function RunDetail({ view, t }) {
    return (_jsxs("div", { className: css.runDetail, children: [_jsxs("div", { className: css.runHead, children: [_jsx("span", { className: css.runId, title: view.runDir, children: view.runId }), _jsxs("span", { className: css.statusTail, "data-status": view.status, children: [_jsx(StateDot, { state: runDotState(view.status) }), _jsx("span", { children: t(RUN_STATUS_KEYS[view.status]) })] })] }), _jsxs("div", { className: css.runMeta, children: [view.currentPhase.length > 0 ? _jsx("span", { children: t('run.currentPhase', { phase: view.currentPhase }) }) : null, _jsx("span", { children: t('run.calls', { calls: view.totals.calls }) }), view.totals.tokens > 0 ? _jsx("span", { children: t('run.tokens', { tokens: view.totals.tokens.toLocaleString() }) }) : null] }), view.error !== undefined ? _jsx("div", { className: css.runError, children: t('run.error', { message: view.error }) }) : null, view.phases.map(phase => _jsx(PhaseSection, { phase: phase, t: t }, `${phase.index}-${phase.title}`))] }));
}
function LauncherControls({ launcher, busy, start, stop, t }) {
    const labels = new Map(launcher.tasks.map(task => [task.id, task.label]));
    return (_jsxs("section", { className: css.launcher, "aria-label": t('launcher.title'), children: [_jsxs("div", { className: css.launcherHead, children: [_jsx("span", { className: css.launcherTitle, children: t('launcher.title') }), launcher.active.length > 0
                        ? _jsx("span", { className: css.launcherSummary, children: t('launcher.running', { count: launcher.active.length }) })
                        : null] }), _jsx("div", { className: css.taskList, children: launcher.tasks.map(task => {
                    const key = `start:${task.id}`;
                    return (_jsxs("div", { className: css.taskRow, children: [_jsx("span", { className: css.taskLabel, children: task.label }), _jsx("button", { type: "button", className: css.controlButton, disabled: busy !== undefined, onClick: () => { void start(task.id); }, "data-busy": busy === key, children: t('launcher.start') })] }, task.id));
                }) }), launcher.active.length > 0
                ? (_jsx("div", { className: css.activeList, children: launcher.active.map(launch => (_jsxs("div", { className: css.activeRow, children: [_jsx(StateDot, { state: "ongoing" }), _jsxs("span", { className: css.activeLabel, title: launch.runDir, children: [labels.get(launch.taskId) ?? launch.taskId, _jsx("span", { className: css.activeRunId, children: launch.runId })] }), _jsx("button", { type: "button", className: css.controlButton, disabled: busy !== undefined, onClick: () => { void stop(launch.runDir); }, "data-busy": busy === `stop:${launch.runDir}`, children: t('launcher.stop') })] }, launch.runDir))) }))
                : null, launcher.error !== undefined
                ? _jsx("div", { className: css.readError, children: t('launcher.error', { message: launcher.error }) })
                : null] }));
}
/** Sidebar footer panel: trigger row plus the fixed inventory popup. */
export function KersorPanel({ t, store, refresh, start, stop }) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState();
    const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
    const view = store.activeView;
    const runStart = async (taskId) => {
        setBusy(`start:${taskId}`);
        try {
            await start(taskId);
        }
        finally {
            setBusy(undefined);
        }
    };
    const runStop = async (runDir) => {
        setBusy(`stop:${runDir}`);
        try {
            await stop(runDir);
        }
        finally {
            setBusy(undefined);
        }
    };
    return (_jsxs("div", { className: css.layer, children: [_jsxs("button", { type: "button", className: css.trigger, "aria-expanded": open, "aria-label": t('panel.trigger'), onClick: () => {
                    setOpen(!open);
                    if (!open)
                        void refresh();
                }, children: [_jsx("span", { className: css.triggerIcon, children: _jsx(IconChevronRightOutline14, {}) }), _jsx("span", { className: css.triggerLabel, children: t('panel.trigger') }), state.rows.some(row => row.discovery === 'active')
                        || state.classicSessions.some(session => session.health === 'active')
                        ? _jsx("span", { className: css.triggerBadge, children: _jsx(StateDot, { state: "ongoing" }) })
                        : null] }), open
                ? (_jsxs("div", { className: css.panel, role: "dialog", "aria-label": t('panel.title'), children: [_jsxs("div", { className: css.header, children: [_jsx("span", { className: css.title, children: t('panel.title') }), _jsx("span", { className: css.note, children: t('panel.hint') })] }), _jsxs("div", { className: css.body, children: [state.launcher !== undefined
                                    ? _jsx(LauncherControls, { launcher: state.launcher, busy: busy, start: runStart, stop: runStop, t: t })
                                    : null, state.error !== undefined ? _jsx("div", { className: css.readError, children: t('panel.readFailed', { message: state.error }) }) : null, state.classicWarning !== undefined ? _jsx("div", { className: css.readError, children: state.classicWarning }) : null, state.loading ? _jsx("div", { className: css.note, children: t('panel.loading') }) : null, !state.loading && state.rows.length === 0 && state.classicSessions.length === 0
                                    ? _jsx("div", { className: css.note, children: t('panel.empty') })
                                    : null, state.classicSessions.length > 0
                                    ? (_jsxs("section", { className: css.activitySection, "aria-label": t('session.title'), children: [_jsxs("div", { className: css.sectionHead, children: [_jsx("span", { className: css.sectionTitle, children: t('session.title') }), _jsx("span", { className: css.sectionSummary, children: t('session.summary', {
                                                            count: state.classicSessions.length,
                                                            active: state.classicSessions.filter(session => session.health === 'active').length,
                                                        }) })] }), _jsx("ul", { className: css.classicRows, children: state.classicSessions.map(session => _jsx(ClassicSessionRow, { session: session, t: t }, session.session_dir)) })] }))
                                    : null, state.rows.length > 0
                                    ? (_jsxs("section", { className: css.activitySection, "aria-label": t('run.sectionTitle'), children: [_jsxs("div", { className: css.sectionHead, children: [_jsx("span", { className: css.sectionTitle, children: t('run.sectionTitle') }), _jsx("span", { className: css.sectionSummary, children: state.rows.length })] }), _jsx("ul", { className: css.rows, children: state.rows.map(row => (_jsxs("li", { className: css.row, "data-run-status": row.discovery, children: [_jsxs("button", { type: "button", className: css.rowHead, "aria-pressed": store.selectedRunDir === row.runDir, onClick: () => { store.select(store.selectedRunDir === row.runDir ? undefined : row.runDir); }, children: [_jsx(StateDot, { state: row.discovery === 'active' ? 'ongoing' : row.discovery === 'failed' ? 'error' : 'done' }), _jsx("span", { className: css.runId, children: row.runId }), _jsx("span", { className: css.rowPath, title: row.runDir, children: row.sessionDir })] }), store.selectedRunDir === row.runDir && row.view !== undefined
                                                            ? _jsx(RunDetail, { view: row.view, t: t })
                                                            : null] }, row.runDir))) })] }))
                                    : null, state.rows.length > 0 && view !== undefined && !state.rows.some(row => row.runDir === store.selectedRunDir)
                                    ? _jsx(RunDetail, { view: view, t: t })
                                    : null] })] }))
                : null] }));
}
//# sourceMappingURL=KersorPanel.js.map