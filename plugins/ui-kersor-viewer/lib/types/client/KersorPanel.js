import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** KerSor runs sidebar panel: run inventory with live phase/call progress. */
import { useState, useSyncExternalStore } from 'react';
import { IconChevronRightOutline14, StateDot } from '@deepseek-ai/dsh-client-ui-primitives';
import { visibleFitConfidence } from "./readiness.js";
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
};
function classicStepDotState(status) {
    switch (status) {
        case 'pending': return 'warning';
        case 'active': return 'ongoing';
        case 'completed': return 'done';
        case 'failed': return 'error';
    }
}
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
const BASELINE_ACTION_KEYS = {
    init: 'session.baselineAction.init',
    record_verify: 'session.baselineAction.recordVerify',
    new_session: 'session.baselineAction.newSession',
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
function ClassicSessionDetail({ detail, t }) {
    const design = detail.authoring.design;
    return (_jsxs("div", { className: css.classicDetail, children: [_jsx("ol", { className: css.timeline, "aria-label": t('detail.timeline'), children: detail.steps.map(step => (_jsxs("li", { className: css.timelineStep, "data-step-status": step.status, children: [_jsx(StateDot, { state: classicStepDotState(step.status) }), _jsx("span", { children: t(CLASSIC_STEP_KEYS[step.id]) })] }, step.id))) }), _jsxs("div", { className: css.detailGrid, children: [_jsxs("section", { className: css.detailSection, children: [_jsx("span", { className: css.detailTitle, children: t('detail.selection') }), _jsx("span", { children: t(`detail.selection.${detail.selection.status}`) }), detail.selection.workflow !== undefined
                                ? _jsx("span", { className: css.mono, children: detail.selection.workflow })
                                : null, detail.selection.reason !== undefined
                                ? _jsx("span", { className: css.detailReason, children: detail.selection.reason })
                                : null, _jsx("span", { children: t('detail.rejected', { count: detail.selection.rejectedCount }) })] }), _jsxs("section", { className: css.detailSection, children: [_jsx("span", { className: css.detailTitle, children: t('detail.authoring') }), _jsx("span", { children: t(`detail.authoring.${detail.authoring.status}`) }), detail.authoring.omittedReason !== undefined
                                ? _jsx("span", { className: css.detailError, children: t('detail.omitted', { reason: detail.authoring.omittedReason }) })
                                : null] }), _jsxs("section", { className: css.detailSection, children: [_jsx("span", { className: css.detailTitle, children: t('detail.validation') }), _jsx("span", { children: t(`detail.validation.${detail.validation.status}`) }), detail.validation.checks.length > 0
                                ? (_jsx("ul", { className: css.checks, children: detail.validation.checks.map(check => (_jsxs("li", { "data-check-passed": check.passed, children: [check.passed ? '✓' : '×', " ", check.name] }, check.name))) }))
                                : null] }), _jsxs("section", { className: css.detailSection, children: [_jsx("span", { className: css.detailTitle, children: t('detail.dispatch') }), _jsx("span", { children: t(`detail.dispatch.${detail.dispatch.status}`) }), detail.dispatch.runtimeStatus !== undefined
                                ? _jsx("span", { className: css.mono, children: detail.dispatch.runtimeStatus })
                                : null, detail.dispatch.runDir !== undefined
                                ? _jsx("span", { className: css.detailPath, title: detail.dispatch.runDir, children: detail.dispatch.runDir })
                                : null] })] }), detail.authoring.files.length > 0
                ? (_jsx("div", { className: css.artifacts, children: detail.authoring.files.map(file => (_jsxs("span", { title: file.sha256, children: [_jsx("span", { className: css.mono, children: file.name }), " \u00B7 ", file.bytes, " B \u00B7 ", file.sha256.slice(0, 18), "\u2026"] }, file.name))) }))
                : null, design !== undefined
                ? (_jsxs("div", { className: css.design, children: [_jsxs("div", { className: css.designMeta, children: [design.name !== undefined ? _jsx("span", { className: css.mono, children: design.name }) : null, design.technique !== undefined ? _jsx("span", { children: design.technique }) : null, design.methodCategory !== undefined ? _jsx("span", { children: design.methodCategory }) : null, design.topology !== undefined ? _jsx("span", { children: design.topology }) : null, design.languages.map(value => _jsx("span", { children: value }, `language:${value}`)), design.backends.map(value => _jsx("span", { children: value }, `backend:${value}`)), design.integrationPatterns.map(value => _jsx("span", { children: value }, `integration:${value}`))] }), design.requiredArgs.length > 0
                            ? _jsxs("div", { className: css.requiredArgs, children: [t('detail.requiredArgs'), ": ", _jsx("span", { className: css.mono, children: design.requiredArgs.join(', ') })] })
                            : null, _jsxs("details", { className: css.designDisclosure, children: [_jsx("summary", { children: t('detail.rationale') }), _jsx("pre", { children: design.rationale })] }), _jsxs("details", { className: css.designDisclosure, children: [_jsx("summary", { children: t('detail.source') }), _jsx("pre", { children: design.source })] })] }))
                : _jsx("div", { className: css.detailNote, children: t('detail.sealRequired') })] }));
}
function ClassicSessionRow({ session, selected, detail, loading, error, onToggle, t }) {
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
    const fitConfidence = visibleFitConfidence(session);
    return (_jsxs("li", { className: css.classicRow, "data-session-health": session.health, "data-session-lifecycle": session.lifecycle, "data-expanded": selected, children: [_jsxs("div", { className: css.classicHead, children: [_jsx(StateDot, { state: classicDotState(session.health, session.lifecycle) }), _jsx("span", { className: css.sessionId, title: session.session_dir, children: session.session_id }), _jsx("span", { className: css.phaseBadge, children: t(CLASSIC_HEALTH_KEYS[session.health]) }), _jsx("button", { type: "button", className: css.classicExpand, "aria-expanded": selected, "aria-label": selected ? t('detail.collapse') : t('detail.expand'), onClick: onToggle, children: _jsx(IconChevronRightOutline14, {}) })] }), _jsxs("div", { className: css.classicMetrics, children: [round !== undefined ? _jsx("span", { children: round }) : null, session.best_speedup !== null && session.best_speedup !== undefined
                        ? _jsx("span", { "data-target-met": session.target_met ?? undefined, children: t('session.best', { speedup: speedup(session.best_speedup) }) })
                        : null, session.target_speedup !== null && session.target_speedup !== undefined
                        ? _jsx("span", { children: t('session.target', { speedup: speedup(session.target_speedup) }) })
                        : null, _jsx("span", { children: session.phase ?? t('session.unknownPhase') }), details.length > 0 ? _jsx("span", { children: details }) : null, session.integration_pattern !== null && session.integration_pattern !== undefined
                        ? _jsx("span", { className: css.routeBadge, children: session.integration_pattern })
                        : null, session.allow_workflow_authoring === true
                        ? _jsx("span", { className: css.authoringBadge, children: t('session.authoring', {
                                budget: session.workflow_authoring_budget ?? '—',
                            }) })
                        : null, session.fresh_session != null
                        ? _jsx("span", { className: css.gateBadge, "data-gate": session.fresh_session, children: t('session.freshGate', {
                                status: t(GATE_KEYS[session.fresh_session]),
                            }) })
                        : null, session.allow_workflow_authoring === true && session.baseline_witness != null
                        ? _jsx("span", { className: css.gateBadge, "data-gate": session.baseline_witness, children: t('session.baselineGate', {
                                status: t(GATE_KEYS[session.baseline_witness]),
                            }) })
                        : null, session.allow_workflow_authoring === true && session.dsh_compatibility != null
                        ? _jsx("span", { className: css.gateBadge, "data-gate": session.dsh_compatibility, children: t('session.dshGate', {
                                status: t(GATE_KEYS[session.dsh_compatibility]),
                            }) })
                        : null, session.allow_workflow_authoring === true && session.candidate_ownership != null
                        ? _jsx("span", { className: css.gateBadge, "data-gate": session.candidate_ownership, children: t('session.ownershipGate', {
                                status: t(GATE_KEYS[session.candidate_ownership]),
                            }) })
                        : null, activity !== undefined ? _jsx("span", { children: t('session.lastActivity', { time: activity }) }) : null] }), session.allow_workflow_authoring === true && session.baseline_next_action != null
                ? _jsxs("div", { className: css.baselineAction, "data-baseline-action": session.baseline_next_action, title: session.baseline_reason ?? undefined, children: [_jsx("span", { className: css.baselineActionLabel, children: t(BASELINE_ACTION_KEYS[session.baseline_next_action]) }), session.baseline_reason != null
                            ? _jsx("span", { className: css.baselineActionReason, children: session.baseline_reason })
                            : null] })
                : null, _jsxs("div", { className: css.classicFoot, children: [_jsx("span", { className: css.workflowName, children: session.selection_status === 'stalled'
                            ? t('session.selectorStalled')
                            : session.workflow !== null && session.workflow !== undefined
                                ? t('session.workflow', { workflow: session.workflow })
                                : t('session.noWorkflow') }), fitConfidence !== undefined
                        ? _jsx("span", { className: css.fitBadge, "data-fit-confidence": fitConfidence, children: t('session.fit', { confidence: fitConfidence }) })
                        : null, session.warningCount > 0
                        ? _jsx("span", { className: css.warningCount, children: t('session.warnings', { count: session.warningCount }) })
                        : null] }), session.decision !== null && session.decision !== undefined
                ? _jsx("div", { className: css.decisionReason, title: session.decision, children: session.decision })
                : null, selected && loading ? _jsx("div", { className: css.detailNote, children: t('detail.loading') }) : null, selected && error !== undefined ? _jsx("div", { className: css.detailError, children: error }) : null, selected && !loading && detail !== undefined ? _jsx(ClassicSessionDetail, { detail: detail, t: t }) : null] }));
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
                        : null] }), _jsx("div", { className: css.taskList, children: launcher.tasks.map((task) => {
                    const key = `start:${task.id}`;
                    return (_jsxs("div", { className: css.taskRow, children: [_jsx("span", { className: css.taskLabel, children: task.label }), _jsx("button", { type: "button", className: css.controlButton, disabled: busy !== undefined, onClick: () => { void start(task.id); }, "data-busy": busy === key, children: t('launcher.start') })] }, task.id));
                }) }), launcher.active.length > 0
                ? (_jsx("div", { className: css.activeList, children: launcher.active.map(launch => (_jsxs("div", { className: css.activeRow, children: [_jsx(StateDot, { state: "ongoing" }), _jsxs("span", { className: css.activeLabel, title: launch.runDir, children: [labels.get(launch.taskId) ?? launch.taskId, _jsx("span", { className: css.activeRunId, children: launch.runId })] }), _jsx("button", { type: "button", className: css.controlButton, disabled: busy !== undefined, onClick: () => { void stop(launch.runDir); }, "data-busy": busy === `stop:${launch.runDir}`, children: t('launcher.stop') })] }, launch.runDir))) }))
                : null, launcher.error !== undefined
                ? _jsx("div", { className: css.readError, children: t('launcher.error', { message: launcher.error }) })
                : null] }));
}
function viewerHealth(snapshot) {
    const roots = snapshot.diagnostics.scan.roots;
    const readers = snapshot.diagnostics.runs;
    const rootIssues = roots.flatMap(root => root.lastIssue === undefined ? [] : [root.lastIssue]);
    const runIssues = readers.flatMap(run => run.lastIssue === undefined ? [] : [run.lastIssue]);
    const classicIssue = snapshot.classic.source.lastIssue;
    const issues = [...rootIssues, ...runIssues, ...(classicIssue === undefined ? [] : [classicIssue])];
    const classicFailed = snapshot.classic.source.state === 'failed';
    const degraded = snapshot.diagnostics.scan.state === 'degraded'
        || snapshot.diagnostics.scan.state === 'failed'
        || classicFailed
        || snapshot.classic.source.state === 'degraded'
        || readers.some(run => run.state === 'degraded' || run.state === 'failed');
    const noReadableSource = snapshot.diagnostics.scan.state === 'failed'
        && snapshot.classic.source.state !== 'healthy'
        && snapshot.classic.source.state !== 'degraded';
    const issue = snapshot.diagnostics.scan.lastIssue ?? classicIssue ?? runIssues.at(-1);
    return {
        state: noReadableSource ? 'failed' : degraded ? 'degraded' : 'healthy',
        roots: roots.length,
        readers: readers.length,
        sources: issues.length,
        ...(issue === undefined ? {} : { issue }),
    };
}
/** Sidebar footer panel: trigger row plus the fixed inventory popup. */
export function KersorPanel({ t, store, refresh, loadClassic, start, stop }) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState();
    const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
    const rows = store.rows;
    const classicSessions = state.snapshot?.classic.sessions ?? [];
    const health = state.snapshot === undefined ? undefined : viewerHealth(state.snapshot);
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
    const toggleClassic = (sessionDir) => {
        if (store.selectedClassicSessionDir === sessionDir) {
            store.selectClassic(undefined);
            return;
        }
        store.selectClassic(sessionDir);
        void loadClassic(sessionDir);
    };
    return (_jsxs("div", { className: css.layer, children: [_jsxs("button", { type: "button", className: css.trigger, "aria-expanded": open, "aria-label": t('panel.trigger'), onClick: () => {
                    setOpen(!open);
                    if (!open)
                        void refresh();
                }, children: [_jsx("span", { className: css.triggerIcon, children: _jsx(IconChevronRightOutline14, {}) }), _jsx("span", { className: css.triggerLabel, children: t('panel.trigger') }), rows.some(row => row.discovery === 'active')
                        || classicSessions.some(session => session.health === 'active')
                        ? _jsx("span", { className: css.triggerBadge, children: _jsx(StateDot, { state: "ongoing" }) })
                        : null] }), open
                ? (_jsxs("div", { className: css.panel, role: "dialog", "aria-label": t('panel.title'), children: [_jsxs("div", { className: css.header, children: [_jsx("span", { className: css.title, children: t('panel.title') }), _jsx("span", { className: css.note, children: t('panel.hint') })] }), _jsxs("div", { className: css.body, children: [state.launcher !== undefined
                                    ? _jsx(LauncherControls, { launcher: state.launcher, busy: busy, start: runStart, stop: runStop, t: t })
                                    : null, state.transportError !== undefined
                                    ? _jsx("div", { className: css.readError, children: t('panel.readFailed', { message: state.transportError }) })
                                    : null, health !== undefined && health.state !== 'healthy'
                                    ? (_jsx("div", { className: css.readError, "data-source-health": health.state, children: t(health.state === 'failed' ? 'panel.sourcesFailed' : 'panel.sourcesDegraded', {
                                            roots: health.roots,
                                            readers: health.readers,
                                            sources: health.sources,
                                            stage: health.issue?.stage ?? 'source',
                                            code: health.issue?.code ?? 'unavailable',
                                            occurrences: health.issue?.occurrences ?? 1,
                                        }) }))
                                    : null, state.loading ? _jsx("div", { className: css.note, children: t('panel.loading') }) : null, !state.loading
                                    && state.transportError === undefined
                                    && health?.state === 'healthy'
                                    && rows.length === 0
                                    && classicSessions.length === 0
                                    ? _jsx("div", { className: css.note, children: t('panel.empty', { roots: health.roots }) })
                                    : null, classicSessions.length > 0
                                    ? (_jsxs("section", { className: css.activitySection, "aria-label": t('session.title'), children: [_jsxs("div", { className: css.sectionHead, children: [_jsx("span", { className: css.sectionTitle, children: t('session.title') }), _jsx("span", { className: css.sectionSummary, children: t('session.summary', {
                                                            count: classicSessions.length,
                                                            active: classicSessions.filter(session => session.health === 'active').length,
                                                        }) })] }), _jsx("ul", { className: css.classicRows, children: classicSessions.map(session => (_jsx(ClassicSessionRow, { session: session, selected: store.selectedClassicSessionDir === session.session_dir, loading: state.classicDetailLoading === session.session_dir, ...(state.classicDetails.get(session.session_dir) === undefined
                                                        ? {}
                                                        : { detail: state.classicDetails.get(session.session_dir) }), ...(state.classicDetailError?.startsWith(`${session.session_dir}: `) === true
                                                        ? { error: state.classicDetailError.slice(session.session_dir.length + 2) }
                                                        : {}), onToggle: () => { toggleClassic(session.session_dir); }, t: t }, session.session_dir))) })] }))
                                    : null, rows.length > 0
                                    ? (_jsxs("section", { className: css.activitySection, "aria-label": t('run.sectionTitle'), children: [_jsxs("div", { className: css.sectionHead, children: [_jsx("span", { className: css.sectionTitle, children: t('run.sectionTitle') }), _jsx("span", { className: css.sectionSummary, children: rows.length })] }), _jsx("ul", { className: css.rows, children: rows.map(row => (_jsxs("li", { className: css.row, "data-run-status": row.discovery, children: [_jsxs("button", { type: "button", className: css.rowHead, "aria-pressed": store.selectedRunDir === row.runDir, onClick: () => { store.select(store.selectedRunDir === row.runDir ? undefined : row.runDir); }, children: [_jsx(StateDot, { state: row.discovery === 'active' ? 'ongoing' : row.discovery === 'failed' ? 'error' : 'done' }), _jsx("span", { className: css.runId, children: row.runId }), _jsx("span", { className: css.rowPath, title: row.runDir, children: row.sessionDir })] }), store.selectedRunDir === row.runDir && row.view !== undefined
                                                            ? _jsx(RunDetail, { view: row.view, t: t })
                                                            : null] }, row.runDir))) })] }))
                                    : null, rows.length > 0 && view !== undefined && !rows.some(row => row.runDir === store.selectedRunDir)
                                    ? _jsx(RunDetail, { view: view, t: t })
                                    : null] })] }))
                : null] }));
}
//# sourceMappingURL=KersorPanel.js.map