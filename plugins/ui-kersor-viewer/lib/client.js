window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-kersor-viewer",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region lib/types/client/readiness.js
		/** Terminal-aware presentation policy for a Session's historical fit verdict. */
		/** A terminal veto outranks any fit result produced before the Session stopped. */
		function visibleFitConfidence(session) {
			if (session.lifecycle === "stalled" || session.lifecycle === "cancelled") return void 0;
			return session.fit_confidence ?? void 0;
		}
		//#endregion
		//#region \0dsh-css:1466f4ea44b824f4.mjs
		const css = ".FSQJCq_layer{flex:none;align-items:center;width:100%;height:49px;margin:8px 0 0;display:flex;position:relative}.FSQJCq_trigger{width:100%;height:49px;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border:none;border-radius:12px;align-items:center;gap:8px;padding:0 8px 0 6px;font-family:inherit;font-size:13px;display:flex}.FSQJCq_trigger:hover{background:var(--dsw-alias-bg-hover-secondary)}.FSQJCq_trigger[aria-expanded=true]{background:var(--dsw-alias-bg-active-secondary)}.FSQJCq_triggerIcon{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);flex:none;justify-content:center;align-items:center;display:inline-flex}.FSQJCq_triggerLabel{text-align:left;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.FSQJCq_triggerBadge{flex:none;align-items:center;display:inline-flex}.FSQJCq_panel{z-index:30;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);width:460px;max-width:calc(100vw - 24px);max-height:60vh;box-shadow:var(--dsw-shadow-lv2);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:12px;flex-direction:column;display:flex;position:fixed;bottom:128px;left:12px;overflow:hidden}.FSQJCq_header{box-sizing:border-box;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);flex:none;justify-content:space-between;align-items:center;gap:8px;min-height:44px;padding:10px 12px;display:flex}.FSQJCq_title{color:var(--dsw-alias-label-primary);flex:none;font-size:13px;font-weight:500;line-height:20px}.FSQJCq_note,.FSQJCq_readError{color:var(--dsw-alias-label-tertiary);margin:4px 0;font-size:12px;line-height:18px}.FSQJCq_note{text-align:right;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.FSQJCq_readError{color:var(--dsw-alias-state-error-primary)}.FSQJCq_body{flex:1;min-height:0;padding:4px 12px 12px;overflow-y:auto}.FSQJCq_launcher{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);border-radius:12px;flex-direction:column;gap:8px;margin:4px 0 10px;padding:10px 12px;display:flex}.FSQJCq_launcherHead,.FSQJCq_taskRow,.FSQJCq_activeRow{align-items:center;gap:8px;display:flex}.FSQJCq_launcherHead{justify-content:space-between}.FSQJCq_launcherTitle,.FSQJCq_taskLabel{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:510;line-height:18px}.FSQJCq_launcherSummary,.FSQJCq_activeRunId{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.FSQJCq_taskList,.FSQJCq_activeList{flex-direction:column;gap:4px;display:flex}.FSQJCq_taskRow,.FSQJCq_activeRow{min-height:28px}.FSQJCq_taskLabel,.FSQJCq_activeLabel{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.FSQJCq_activeLabel{color:var(--dsw-alias-label-secondary);flex-direction:column;font-size:12px;line-height:16px;display:flex}.FSQJCq_activeRunId{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.FSQJCq_controlButton{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);min-width:52px;height:26px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:7px;flex:none;padding:0 10px;font-family:inherit;font-size:11px}.FSQJCq_controlButton:hover:not(:disabled){background:var(--dsw-alias-bg-hover-secondary)}.FSQJCq_controlButton:disabled{cursor:default;opacity:.55}.FSQJCq_controlButton[data-busy=true]{color:var(--dsw-alias-state-business-primary)}.FSQJCq_activitySection{flex-direction:column;gap:6px;margin-top:8px;display:flex}.FSQJCq_sectionHead,.FSQJCq_classicHead,.FSQJCq_classicFoot{align-items:center;gap:8px;display:flex}.FSQJCq_sectionHead{justify-content:space-between;min-height:24px;padding:0 2px}.FSQJCq_sectionTitle{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:510;line-height:18px}.FSQJCq_sectionSummary{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.FSQJCq_classicRows{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0;padding:0;list-style:none;display:grid}.FSQJCq_classicRow{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);border-radius:10px;flex-direction:column;gap:6px;min-width:0;padding:10px;display:flex}.FSQJCq_classicRow[data-session-health=active]{border-color:var(--dsw-alias-state-business-primary)}.FSQJCq_classicRow[data-session-health=stale],.FSQJCq_classicRow[data-session-health=needs_resume],.FSQJCq_classicRow[data-session-health=unknown]{border-color:var(--dsw-alias-state-warn-secondary)}.FSQJCq_classicHead{min-width:0}.FSQJCq_sessionId{min-width:0;color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-weight:510;line-height:16px;overflow:hidden}.FSQJCq_phaseBadge{background:var(--dsw-alias-bg-base);max-width:42%;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;border-radius:5px;flex:none;padding:1px 5px;font-size:10px;line-height:15px;overflow:hidden}.FSQJCq_classicMetrics{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;gap:2px 8px;font-size:10px;line-height:15px;display:flex}.FSQJCq_classicMetrics [data-target-met=true]{color:var(--dsw-alias-state-success-primary)}.FSQJCq_routeBadge,.FSQJCq_authoringBadge{background:var(--dsw-alias-bg-base);border-radius:5px;padding:0 5px}.FSQJCq_routeBadge{color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.FSQJCq_authoringBadge{color:var(--dsw-alias-state-business-primary)}.FSQJCq_classicFoot{min-width:0;color:var(--dsw-alias-label-secondary);justify-content:space-between;font-size:10px;line-height:15px}.FSQJCq_workflowName{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.FSQJCq_fitBadge{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);border-radius:5px;flex:none;padding:0 5px}.FSQJCq_fitBadge[data-fit-confidence=high]{color:var(--dsw-alias-state-success-primary)}.FSQJCq_fitBadge[data-fit-confidence=low]{color:var(--dsw-alias-state-warn-label)}.FSQJCq_warningCount{color:var(--dsw-alias-state-warn-label);cursor:help;flex:none}.FSQJCq_decisionReason{border-top:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;-webkit-line-clamp:2;-webkit-box-orient:vertical;padding-top:5px;font-size:10px;line-height:15px;display:-webkit-box;overflow:hidden}@media (width<=520px){.FSQJCq_classicRows{grid-template-columns:1fr}}.FSQJCq_rows{flex-direction:column;gap:8px;margin:0;padding:0;list-style:none;display:flex}.FSQJCq_row{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:12px;flex-direction:column;gap:6px;padding:10px 12px;display:flex}.FSQJCq_row[data-run-status=active]{border-color:var(--dsw-alias-state-business-primary)}.FSQJCq_rowHead{width:100%;color:inherit;text-align:left;cursor:pointer;background:0 0;border:none;border-radius:8px;align-items:center;gap:8px;padding:2px;font-family:inherit;display:flex}.FSQJCq_rowHead:hover{background:var(--dsw-alias-bg-hover-secondary)}.FSQJCq_rowHead[aria-pressed=true]{background:var(--dsw-alias-bg-active-secondary)}.FSQJCq_runId{max-width:45%;color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;flex:none;font-size:13px;font-weight:510;line-height:20px;overflow:hidden}.FSQJCq_rowPath{min-width:0;color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;direction:rtl;flex:1;font-size:11px;line-height:16px;overflow:hidden}.FSQJCq_runDetail{border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:4px;padding:4px 2px 2px;display:flex}.FSQJCq_runHead{justify-content:space-between;align-items:center;gap:8px;display:flex}.FSQJCq_statusTail{height:20px;color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none;align-items:center;gap:4px;font-size:11px;font-weight:510;line-height:16px;display:inline-flex;overflow:hidden}.FSQJCq_runMeta{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;gap:4px 12px;font-size:11px;line-height:16px;display:flex}.FSQJCq_runError{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}.FSQJCq_phaseSection{flex-direction:column;margin-top:4px;display:flex}.FSQJCq_phaseHeader{box-sizing:border-box;background:var(--dsw-alias-bg-module-platform);border-radius:8px;align-items:center;gap:6px;width:100%;min-width:0;height:28px;padding:0 8px;display:flex}.FSQJCq_dotSlot{flex:none;justify-content:center;align-items:center;width:16px;display:inline-flex}.FSQJCq_phaseTitle{max-width:55%;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:none;font-size:13px;font-weight:510;line-height:22px;overflow:hidden}.FSQJCq_phaseSummary{min-width:0;color:var(--dsw-alias-label-tertiary);text-align:right;text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:11px;line-height:16px;overflow:hidden}.FSQJCq_callRow{align-items:center;gap:6px;min-height:24px;padding:0 0 0 8px;display:flex}.FSQJCq_callLabel{min-width:0;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:12px;line-height:18px;overflow:hidden}.FSQJCq_callMeta{color:var(--dsw-alias-label-tertiary);flex:none;align-items:center;gap:6px;font-size:11px;line-height:16px;display:inline-flex}.FSQJCq_badge{border:1px solid var(--dsw-alias-border-l2);border-radius:4px;padding:0 4px}.FSQJCq_callStatus{color:var(--dsw-alias-label-tertiary);flex:none;font-size:11px;font-weight:510;line-height:16px}.FSQJCq_callRow[data-call-status=failed] .FSQJCq_callStatus{color:var(--dsw-alias-state-error-primary)}";
		const tagId = "@deepseek-ai/dsh-client-ui-kersor-viewer/KersorPanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-kersor-viewer";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var _dsh_css_1466f4ea44b824f4_default = {
			"activeLabel": "FSQJCq_activeLabel",
			"callMeta": "FSQJCq_callMeta",
			"controlButton": "FSQJCq_controlButton",
			"runDetail": "FSQJCq_runDetail",
			"launcherSummary": "FSQJCq_launcherSummary",
			"triggerLabel": "FSQJCq_triggerLabel",
			"runMeta": "FSQJCq_runMeta",
			"authoringBadge": "FSQJCq_authoringBadge",
			"row": "FSQJCq_row",
			"callRow": "FSQJCq_callRow",
			"classicHead": "FSQJCq_classicHead",
			"phaseSummary": "FSQJCq_phaseSummary",
			"activeList": "FSQJCq_activeList",
			"launcherTitle": "FSQJCq_launcherTitle",
			"warningCount": "FSQJCq_warningCount",
			"layer": "FSQJCq_layer",
			"classicFoot": "FSQJCq_classicFoot",
			"title": "FSQJCq_title",
			"note": "FSQJCq_note",
			"sectionSummary": "FSQJCq_sectionSummary",
			"runError": "FSQJCq_runError",
			"taskLabel": "FSQJCq_taskLabel",
			"sectionHead": "FSQJCq_sectionHead",
			"phaseHeader": "FSQJCq_phaseHeader",
			"fitBadge": "FSQJCq_fitBadge",
			"header": "FSQJCq_header",
			"activeRunId": "FSQJCq_activeRunId",
			"rowHead": "FSQJCq_rowHead",
			"runId": "FSQJCq_runId",
			"sessionId": "FSQJCq_sessionId",
			"decisionReason": "FSQJCq_decisionReason",
			"rows": "FSQJCq_rows",
			"phaseTitle": "FSQJCq_phaseTitle",
			"callStatus": "FSQJCq_callStatus",
			"activeRow": "FSQJCq_activeRow",
			"launcher": "FSQJCq_launcher",
			"runHead": "FSQJCq_runHead",
			"body": "FSQJCq_body",
			"trigger": "FSQJCq_trigger",
			"classicRows": "FSQJCq_classicRows",
			"readError": "FSQJCq_readError",
			"taskRow": "FSQJCq_taskRow",
			"phaseBadge": "FSQJCq_phaseBadge",
			"sectionTitle": "FSQJCq_sectionTitle",
			"activitySection": "FSQJCq_activitySection",
			"phaseSection": "FSQJCq_phaseSection",
			"triggerIcon": "FSQJCq_triggerIcon",
			"rowPath": "FSQJCq_rowPath",
			"workflowName": "FSQJCq_workflowName",
			"classicMetrics": "FSQJCq_classicMetrics",
			"classicRow": "FSQJCq_classicRow",
			"triggerBadge": "FSQJCq_triggerBadge",
			"panel": "FSQJCq_panel",
			"dotSlot": "FSQJCq_dotSlot",
			"callLabel": "FSQJCq_callLabel",
			"badge": "FSQJCq_badge",
			"statusTail": "FSQJCq_statusTail",
			"taskList": "FSQJCq_taskList",
			"routeBadge": "FSQJCq_routeBadge",
			"launcherHead": "FSQJCq_launcherHead"
		};
		//#endregion
		//#region lib/types/client/KersorPanel.js
		/** KerSor runs sidebar panel: run inventory with live phase/call progress. */
		const RUN_STATUS_KEYS = {
			running: "run.active",
			completed: "run.completed",
			failed: "run.failed",
			unknown: "run.unknown"
		};
		const CALL_STATUS_KEYS = {
			queued: "call.queued",
			running: "call.running",
			completed: "call.completed",
			failed: "call.failed"
		};
		function runDotState(status) {
			switch (status) {
				case "running": return "ongoing";
				case "completed": return "done";
				case "failed": return "error";
				/* v8 ignore next -- KersorRunStatus is closed and every variant is handled above. */
				default: return "warning";
			}
		}
		function callDotState(status) {
			switch (status) {
				case "queued": return "warning";
				case "running": return "ongoing";
				case "completed": return "done";
				case "failed": return "error";
			}
		}
		function phaseDotState(status) {
			switch (status) {
				case "running": return "ongoing";
				case "completed": return "done";
				case "failed": return "error";
			}
		}
		const CLASSIC_HEALTH_KEYS = {
			active: "session.health.active",
			stale: "session.health.stale",
			needs_resume: "session.health.needsResume",
			terminal: "session.health.terminal",
			unknown: "session.health.unknown"
		};
		function classicDotState(health, lifecycle) {
			if (health === "active") return "ongoing";
			if (health !== "terminal") return "warning";
			switch (lifecycle) {
				case "completed": return "done";
				case "stalled": return "error";
				case "cancelled": return "warning";
				case "active": return "warning";
			}
		}
		function speedup(value) {
			return Number.isInteger(value) ? value.toFixed(1) : value.toFixed(2);
		}
		function displayTime(value) {
			const date = new Date(value);
			if (Number.isNaN(date.getTime())) return void 0;
			return new Intl.DateTimeFormat(void 0, {
				dateStyle: "medium",
				timeStyle: "short"
			}).format(date);
		}
		function ClassicSessionRow({ session, t }) {
			const round = session.current_round !== null && session.current_round !== void 0 ? session.max_workflows !== null && session.max_workflows !== void 0 ? t("session.round", {
				current: session.current_round,
				maximum: session.max_workflows
			}) : t("session.roundOpen", { current: session.current_round }) : void 0;
			const details = [
				session.kernel_language !== null && session.kernel_language !== void 0 ? session.backend !== null && session.backend !== void 0 ? `${session.kernel_language}/${session.backend}` : session.kernel_language : session.backend ?? void 0,
				session.mode,
				session.storage_kind
			].filter(Boolean).join(" · ");
			const activity = session.last_activity_at !== null && session.last_activity_at !== void 0 ? displayTime(session.last_activity_at) : void 0;
			const fitConfidence = visibleFitConfidence(session);
			return (0, react_jsx_runtime.jsxs)("li", {
				className: _dsh_css_1466f4ea44b824f4_default.classicRow,
				"data-session-health": session.health,
				"data-session-lifecycle": session.lifecycle,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.classicHead,
						children: [
							(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: classicDotState(session.health, session.lifecycle) }),
							(0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.sessionId,
								title: session.session_dir,
								children: session.session_id
							}),
							(0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.phaseBadge,
								children: t(CLASSIC_HEALTH_KEYS[session.health])
							})
						]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.classicMetrics,
						children: [
							round !== void 0 ? (0, react_jsx_runtime.jsx)("span", { children: round }) : null,
							session.best_speedup !== null && session.best_speedup !== void 0 ? (0, react_jsx_runtime.jsx)("span", {
								"data-target-met": session.target_met ?? void 0,
								children: t("session.best", { speedup: speedup(session.best_speedup) })
							}) : null,
							session.target_speedup !== null && session.target_speedup !== void 0 ? (0, react_jsx_runtime.jsx)("span", { children: t("session.target", { speedup: speedup(session.target_speedup) }) }) : null,
							(0, react_jsx_runtime.jsx)("span", { children: session.phase ?? t("session.unknownPhase") }),
							details.length > 0 ? (0, react_jsx_runtime.jsx)("span", { children: details }) : null,
							session.integration_pattern !== null && session.integration_pattern !== void 0 ? (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.routeBadge,
								children: session.integration_pattern
							}) : null,
							session.allow_workflow_authoring === true ? (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.authoringBadge,
								children: t("session.authoring", { budget: session.workflow_authoring_budget ?? "—" })
							}) : null,
							activity !== void 0 ? (0, react_jsx_runtime.jsx)("span", { children: t("session.lastActivity", { time: activity }) }) : null
						]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.classicFoot,
						children: [
							(0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.workflowName,
								children: session.workflow !== null && session.workflow !== void 0 ? t("session.workflow", { workflow: session.workflow }) : t("session.noWorkflow")
							}),
							fitConfidence !== void 0 ? (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.fitBadge,
								"data-fit-confidence": fitConfidence,
								children: t("session.fit", { confidence: fitConfidence })
							}) : null,
							session.warningCount > 0 ? (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.warningCount,
								children: t("session.warnings", { count: session.warningCount })
							}) : null
						]
					}),
					session.decision !== null && session.decision !== void 0 ? (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.decisionReason,
						title: session.decision,
						children: session.decision
					}) : null
				]
			});
		}
		function durationSeconds(startedTs, endedTs) {
			if (startedTs === void 0 || endedTs === void 0) return void 0;
			const start = Date.parse(startedTs);
			const end = Date.parse(endedTs);
			if (Number.isNaN(start) || Number.isNaN(end) || end < start) return void 0;
			return `${((end - start) / 1e3).toFixed(1)}s`;
		}
		function CallRow({ call, t }) {
			const duration = durationSeconds(call.startedTs, call.endedTs);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_css_1466f4ea44b824f4_default.callRow,
				"data-call-status": call.status,
				children: [
					(0, react_jsx_runtime.jsx)("span", {
						className: _dsh_css_1466f4ea44b824f4_default.dotSlot,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: callDotState(call.status) })
					}),
					(0, react_jsx_runtime.jsx)("span", {
						className: _dsh_css_1466f4ea44b824f4_default.callLabel,
						title: call.callId,
						children: call.label
					}),
					(0, react_jsx_runtime.jsxs)("span", {
						className: _dsh_css_1466f4ea44b824f4_default.callMeta,
						children: [
							call.kind === "evaluation" ? t("call.evaluation") : null,
							call.rolledBack ? (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.badge,
								children: t("call.rolledBack")
							}) : null,
							duration !== void 0 ? (0, react_jsx_runtime.jsx)("span", { children: duration }) : null,
							call.tokens !== void 0 ? (0, react_jsx_runtime.jsxs)("span", { children: [call.tokens.toLocaleString(), " tk"] }) : null
						]
					}),
					(0, react_jsx_runtime.jsx)("span", {
						className: _dsh_css_1466f4ea44b824f4_default.callStatus,
						children: t(CALL_STATUS_KEYS[call.status])
					})
				]
			});
		}
		function PhaseSection({ phase, t }) {
			const title = phase.title.length > 0 ? phase.title : t("phase.empty");
			return (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_css_1466f4ea44b824f4_default.phaseSection,
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: _dsh_css_1466f4ea44b824f4_default.phaseHeader,
					children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.dotSlot,
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: phaseDotState(phase.status) })
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.phaseTitle,
							children: title
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.phaseSummary,
							children: phase.calls.length
						})
					]
				}), phase.calls.map((call) => (0, react_jsx_runtime.jsx)(CallRow, {
					call,
					t
				}, call.callId))]
			});
		}
		function RunDetail({ view, t }) {
			return (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_css_1466f4ea44b824f4_default.runDetail,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.runHead,
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.runId,
							title: view.runDir,
							children: view.runId
						}), (0, react_jsx_runtime.jsxs)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.statusTail,
							"data-status": view.status,
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: runDotState(view.status) }), (0, react_jsx_runtime.jsx)("span", { children: t(RUN_STATUS_KEYS[view.status]) })]
						})]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.runMeta,
						children: [
							view.currentPhase.length > 0 ? (0, react_jsx_runtime.jsx)("span", { children: t("run.currentPhase", { phase: view.currentPhase }) }) : null,
							(0, react_jsx_runtime.jsx)("span", { children: t("run.calls", { calls: view.totals.calls }) }),
							view.totals.tokens > 0 ? (0, react_jsx_runtime.jsx)("span", { children: t("run.tokens", { tokens: view.totals.tokens.toLocaleString() }) }) : null
						]
					}),
					view.error !== void 0 ? (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.runError,
						children: t("run.error", { message: view.error })
					}) : null,
					view.phases.map((phase) => (0, react_jsx_runtime.jsx)(PhaseSection, {
						phase,
						t
					}, `${phase.index}-${phase.title}`))
				]
			});
		}
		function LauncherControls({ launcher, busy, start, stop, t }) {
			const labels = new Map(launcher.tasks.map((task) => [task.id, task.label]));
			return (0, react_jsx_runtime.jsxs)("section", {
				className: _dsh_css_1466f4ea44b824f4_default.launcher,
				"aria-label": t("launcher.title"),
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.launcherHead,
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.launcherTitle,
							children: t("launcher.title")
						}), launcher.active.length > 0 ? (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.launcherSummary,
							children: t("launcher.running", { count: launcher.active.length })
						}) : null]
					}),
					(0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.taskList,
						children: launcher.tasks.map((task) => {
							const key = `start:${task.id}`;
							return (0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_css_1466f4ea44b824f4_default.taskRow,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: _dsh_css_1466f4ea44b824f4_default.taskLabel,
									children: task.label
								}), (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: _dsh_css_1466f4ea44b824f4_default.controlButton,
									disabled: busy !== void 0,
									onClick: () => {
										start(task.id);
									},
									"data-busy": busy === key,
									children: t("launcher.start")
								})]
							}, task.id);
						})
					}),
					launcher.active.length > 0 ? (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.activeList,
						children: launcher.active.map((launch) => (0, react_jsx_runtime.jsxs)("div", {
							className: _dsh_css_1466f4ea44b824f4_default.activeRow,
							children: [
								(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "ongoing" }),
								(0, react_jsx_runtime.jsxs)("span", {
									className: _dsh_css_1466f4ea44b824f4_default.activeLabel,
									title: launch.runDir,
									children: [labels.get(launch.taskId) ?? launch.taskId, (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.activeRunId,
										children: launch.runId
									})]
								}),
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: _dsh_css_1466f4ea44b824f4_default.controlButton,
									disabled: busy !== void 0,
									onClick: () => {
										stop(launch.runDir);
									},
									"data-busy": busy === `stop:${launch.runDir}`,
									children: t("launcher.stop")
								})
							]
						}, launch.runDir))
					}) : null,
					launcher.error !== void 0 ? (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.readError,
						children: t("launcher.error", { message: launcher.error })
					}) : null
				]
			});
		}
		function viewerHealth(snapshot) {
			const roots = snapshot.diagnostics.scan.roots;
			const readers = snapshot.diagnostics.runs;
			const rootIssues = roots.flatMap((root) => root.lastIssue === void 0 ? [] : [root.lastIssue]);
			const runIssues = readers.flatMap((run) => run.lastIssue === void 0 ? [] : [run.lastIssue]);
			const classicIssue = snapshot.classic.source.lastIssue;
			const issues = [
				...rootIssues,
				...runIssues,
				...classicIssue === void 0 ? [] : [classicIssue]
			];
			const classicFailed = snapshot.classic.source.state === "failed";
			const degraded = snapshot.diagnostics.scan.state === "degraded" || snapshot.diagnostics.scan.state === "failed" || classicFailed || snapshot.classic.source.state === "degraded" || readers.some((run) => run.state === "degraded" || run.state === "failed");
			const noReadableSource = snapshot.diagnostics.scan.state === "failed" && snapshot.classic.source.state !== "healthy" && snapshot.classic.source.state !== "degraded";
			const issue = snapshot.diagnostics.scan.lastIssue ?? classicIssue ?? runIssues.at(-1);
			return {
				state: noReadableSource ? "failed" : degraded ? "degraded" : "healthy",
				roots: roots.length,
				readers: readers.length,
				sources: issues.length,
				...issue === void 0 ? {} : { issue }
			};
		}
		/** Sidebar footer panel: trigger row plus the fixed inventory popup. */
		function KersorPanel({ t, store, refresh, start, stop }) {
			const [open, setOpen] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)();
			const state = (0, react.useSyncExternalStore)(store.subscribe, store.getSnapshot);
			const rows = store.rows;
			const classicSessions = state.snapshot?.classic.sessions ?? [];
			const health = state.snapshot === void 0 ? void 0 : viewerHealth(state.snapshot);
			const view = store.activeView;
			const runStart = async (taskId) => {
				setBusy(`start:${taskId}`);
				try {
					await start(taskId);
				} finally {
					setBusy(void 0);
				}
			};
			const runStop = async (runDir) => {
				setBusy(`stop:${runDir}`);
				try {
					await stop(runDir);
				} finally {
					setBusy(void 0);
				}
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_css_1466f4ea44b824f4_default.layer,
				children: [(0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: _dsh_css_1466f4ea44b824f4_default.trigger,
					"aria-expanded": open,
					"aria-label": t("panel.trigger"),
					onClick: () => {
						setOpen(!open);
						if (!open) refresh();
					},
					children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.triggerIcon,
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.triggerLabel,
							children: t("panel.trigger")
						}),
						rows.some((row) => row.discovery === "active") || classicSessions.some((session) => session.health === "active") ? (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.triggerBadge,
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "ongoing" })
						}) : null
					]
				}), open ? (0, react_jsx_runtime.jsxs)("div", {
					className: _dsh_css_1466f4ea44b824f4_default.panel,
					role: "dialog",
					"aria-label": t("panel.title"),
					children: [(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.header,
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.title,
							children: t("panel.title")
						}), (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.note,
							children: t("panel.hint")
						})]
					}), (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.body,
						children: [
							state.launcher !== void 0 ? (0, react_jsx_runtime.jsx)(LauncherControls, {
								launcher: state.launcher,
								busy,
								start: runStart,
								stop: runStop,
								t
							}) : null,
							state.transportError !== void 0 ? (0, react_jsx_runtime.jsx)("div", {
								className: _dsh_css_1466f4ea44b824f4_default.readError,
								children: t("panel.readFailed", { message: state.transportError })
							}) : null,
							health !== void 0 && health.state !== "healthy" ? (0, react_jsx_runtime.jsx)("div", {
								className: _dsh_css_1466f4ea44b824f4_default.readError,
								"data-source-health": health.state,
								children: t(health.state === "failed" ? "panel.sourcesFailed" : "panel.sourcesDegraded", {
									roots: health.roots,
									readers: health.readers,
									sources: health.sources,
									stage: health.issue?.stage ?? "source",
									code: health.issue?.code ?? "unavailable",
									occurrences: health.issue?.occurrences ?? 1
								})
							}) : null,
							state.loading ? (0, react_jsx_runtime.jsx)("div", {
								className: _dsh_css_1466f4ea44b824f4_default.note,
								children: t("panel.loading")
							}) : null,
							!state.loading && state.transportError === void 0 && health?.state === "healthy" && rows.length === 0 && classicSessions.length === 0 ? (0, react_jsx_runtime.jsx)("div", {
								className: _dsh_css_1466f4ea44b824f4_default.note,
								children: t("panel.empty", { roots: health.roots })
							}) : null,
							classicSessions.length > 0 ? (0, react_jsx_runtime.jsxs)("section", {
								className: _dsh_css_1466f4ea44b824f4_default.activitySection,
								"aria-label": t("session.title"),
								children: [(0, react_jsx_runtime.jsxs)("div", {
									className: _dsh_css_1466f4ea44b824f4_default.sectionHead,
									children: [(0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.sectionTitle,
										children: t("session.title")
									}), (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.sectionSummary,
										children: t("session.summary", {
											count: classicSessions.length,
											active: classicSessions.filter((session) => session.health === "active").length
										})
									})]
								}), (0, react_jsx_runtime.jsx)("ul", {
									className: _dsh_css_1466f4ea44b824f4_default.classicRows,
									children: classicSessions.map((session) => (0, react_jsx_runtime.jsx)(ClassicSessionRow, {
										session,
										t
									}, session.session_dir))
								})]
							}) : null,
							rows.length > 0 ? (0, react_jsx_runtime.jsxs)("section", {
								className: _dsh_css_1466f4ea44b824f4_default.activitySection,
								"aria-label": t("run.sectionTitle"),
								children: [(0, react_jsx_runtime.jsxs)("div", {
									className: _dsh_css_1466f4ea44b824f4_default.sectionHead,
									children: [(0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.sectionTitle,
										children: t("run.sectionTitle")
									}), (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.sectionSummary,
										children: rows.length
									})]
								}), (0, react_jsx_runtime.jsx)("ul", {
									className: _dsh_css_1466f4ea44b824f4_default.rows,
									children: rows.map((row) => (0, react_jsx_runtime.jsxs)("li", {
										className: _dsh_css_1466f4ea44b824f4_default.row,
										"data-run-status": row.discovery,
										children: [(0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: _dsh_css_1466f4ea44b824f4_default.rowHead,
											"aria-pressed": store.selectedRunDir === row.runDir,
											onClick: () => {
												store.select(store.selectedRunDir === row.runDir ? void 0 : row.runDir);
											},
											children: [
												(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: row.discovery === "active" ? "ongoing" : row.discovery === "failed" ? "error" : "done" }),
												(0, react_jsx_runtime.jsx)("span", {
													className: _dsh_css_1466f4ea44b824f4_default.runId,
													children: row.runId
												}),
												(0, react_jsx_runtime.jsx)("span", {
													className: _dsh_css_1466f4ea44b824f4_default.rowPath,
													title: row.runDir,
													children: row.sessionDir
												})
											]
										}), store.selectedRunDir === row.runDir && row.view !== void 0 ? (0, react_jsx_runtime.jsx)(RunDetail, {
											view: row.view,
											t
										}) : null]
									}, row.runDir))
								})]
							}) : null,
							rows.length > 0 && view !== void 0 && !rows.some((row) => row.runDir === store.selectedRunDir) ? (0, react_jsx_runtime.jsx)(RunDetail, {
								view,
								t
							}) : null
						]
					})]
				}) : null]
			});
		}
		//#endregion
		//#region lib/types/client/store.js
		/**
		* Browser-side KerSor viewer store. One Host snapshot owns inventory,
		* classic Sessions, and source health; folded run views and launcher process
		* ownership remain orthogonal client-side accounts.
		* @module @deepseek-ai/dsh-client-ui-kersor-viewer/client
		*/
		/** Snapshot store over the Host projection and per-run folded views. */
		var KersorViewerStore = class {
			state = {
				views: /* @__PURE__ */ new Map(),
				loading: true
			};
			listeners = /* @__PURE__ */ new Set();
			selected;
			/** Stable snapshot for useSyncExternalStore. */
			getSnapshot = () => this.state;
			/** Subscribe to snapshot replacements. */
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			/** Latest run inventory joined with independently folded views. */
			get rows() {
				return (this.state.snapshot?.runs ?? []).map((ref) => ({
					...ref,
					view: this.state.views.get(ref.runDir)
				}));
			}
			/** Currently selected run directory (panel-local choice). */
			get selectedRunDir() {
				return this.selected;
			}
			/** Select a run for the detail view; persists across Host snapshots. */
			select(runDir) {
				this.selected = runDir;
				this.emit();
			}
			/** Selected folded view, falling back to a real available run view. */
			get activeView() {
				if (this.selected !== void 0) return this.state.views.get(this.selected);
				const active = this.state.snapshot?.runs.find((ref) => ref.discovery === "active");
				if (active !== void 0) return this.state.views.get(active.runDir);
				for (const ref of this.state.snapshot?.runs ?? []) {
					const view = this.state.views.get(ref.runDir);
					if (view !== void 0) return view;
				}
			}
			/** Atomically replace inventory, classic Sessions, and diagnostics. */
			setSnapshot(snapshot) {
				const live = new Set(snapshot.runs.map((ref) => ref.runDir));
				const views = new Map([...this.state.views].filter(([runDir]) => live.has(runDir)));
				const { transportError: _, ...state } = this.state;
				const loading = snapshot.diagnostics.scan.state === "never" || snapshot.diagnostics.scan.state === "running";
				this.state = {
					...state,
					snapshot,
					views,
					loading
				};
				this.emit();
			}
			/** Record a Remote/connection failure without overwriting Host diagnostics. */
			setTransportError(message) {
				this.state = {
					...this.state,
					loading: false,
					transportError: message
				};
				this.emit();
			}
			/** Replace the optional launcher's configured-task and owned-process inventory. */
			setLauncher(tasks, active) {
				this.state = {
					...this.state,
					launcher: {
						tasks,
						active
					}
				};
				this.emit();
			}
			/** Hide controls when the Host launcher plugin is not loaded. */
			setLauncherUnavailable() {
				if (this.state.launcher === void 0) return;
				const { launcher: _, ...state } = this.state;
				this.state = state;
				this.emit();
			}
			/** Record a launch/stop failure without contaminating viewer read state. */
			setLauncherError(message) {
				if (this.state.launcher === void 0) return;
				this.state = {
					...this.state,
					launcher: {
						...this.state.launcher,
						error: message
					}
				};
				this.emit();
			}
			/** Apply the Host launcher's complete owned-process replacement frame. */
			applyActiveFrame(frame) {
				if (this.state.launcher === void 0) return;
				this.state = {
					...this.state,
					launcher: {
						...this.state.launcher,
						active: frame.launches
					}
				};
				this.emit();
			}
			/** Apply one forwarded Host frame. */
			applyFrame(frame) {
				if (frame.kind === "snapshot") {
					this.setSnapshot(frame.snapshot);
					return;
				}
				const views = new Map(this.state.views);
				views.set(frame.run.runDir, frame.run);
				this.state = {
					...this.state,
					views,
					loading: false
				};
				this.emit();
			}
			/** Store a successful `runBacklog` answer. Undefined never fabricates zeros. */
			setBacklog(runDir, view) {
				if (view === void 0) return;
				const views = new Map(this.state.views);
				views.set(runDir, view);
				this.state = {
					...this.state,
					views,
					loading: false
				};
				this.emit();
			}
			/** Drop connection-scoped state. */
			reset() {
				this.state = {
					views: /* @__PURE__ */ new Map(),
					loading: true
				};
				this.selected = void 0;
				this.emit();
			}
			emit() {
				for (const listener of this.listeners) listener();
			}
		};
		//#endregion
		//#region lib/types/client/locales.js
		/** KerSor viewer UI dictionaries. */
		const NS = "kersorViewer";
		/** Simplified Chinese KerSor viewer messages. */
		const zh = {
			"panel.trigger": "KerSor 活动",
			"panel.title": "KerSor 活动",
			"panel.empty": "已扫描 {roots} 个来源，未发现 KerSor 优化会话或 Workflow 运行",
			"panel.loading": "读取中…",
			"panel.readFailed": "读取运行清单失败：{message}",
			"panel.sourcesDegraded": "仅显示可读取数据：{roots} 个根、{readers} 个 run reader、{sources} 个异常来源；最近 {stage}/{code}（{occurrences} 次）",
			"panel.sourcesFailed": "KerSor 来源读取失败：{roots} 个根、{readers} 个 run reader；最近 {stage}/{code}（{occurrences} 次）",
			"panel.hint": "优化会话摘要与 Workflow 实时进度",
			"session.title": "优化会话",
			"session.summary": "最近 {count} 个 · {active} 个活跃",
			"session.round": "第 {current}/{maximum} 轮",
			"session.roundOpen": "第 {current} 轮",
			"session.best": "最佳 {speedup}x",
			"session.target": "目标 {speedup}x",
			"session.authoring": "可创作 · 预算 {budget}",
			"session.workflow": "Workflow：{workflow}",
			"session.fit": "适配度：{confidence}",
			"session.noWorkflow": "尚未选择 Workflow",
			"session.unknownPhase": "未知阶段",
			"session.lastActivity": "活动于 {time}",
			"session.health.active": "活跃",
			"session.health.stale": "已陈旧",
			"session.health.needsResume": "可恢复",
			"session.health.terminal": "已结束",
			"session.health.unknown": "状态未知",
			"session.warnings": "{count} 个状态提醒",
			"run.sectionTitle": "Autonomous Workflow",
			"launcher.title": "任务控制",
			"launcher.start": "启动",
			"launcher.stop": "停止",
			"launcher.running": "dsh 正在托管 {count} 个启动进程",
			"launcher.error": "任务控制失败：{message}",
			"run.active": "运行中",
			"run.completed": "已完成",
			"run.failed": "已失败",
			"run.unknown": "未知",
			"run.currentPhase": "当前阶段：{phase}",
			"run.calls": "{calls} 个调用",
			"run.tokens": "{tokens} tokens",
			"run.startedAt": "开始于 {time}",
			"run.error": "错误：{message}",
			"phase.empty": "（无事件）",
			"call.queued": "排队中",
			"call.running": "运行中",
			"call.completed": "已完成",
			"call.failed": "已失败",
			"call.rolledBack": "已回滚",
			"call.evaluation": "评测",
			"call.agent": "代理",
			"call.duration": "{seconds}"
		};
		/** English KerSor viewer messages. */
		const en = {
			"panel.trigger": "KerSor activity",
			"panel.title": "KerSor activity",
			"panel.empty": "Scanned {roots} sources; no KerSor optimization Sessions or Workflow runs were discovered",
			"panel.loading": "Loading…",
			"panel.readFailed": "Reading the run inventory failed: {message}",
			"panel.sourcesDegraded": "Showing readable data only: {roots} roots, {readers} run readers, {sources} unhealthy sources; latest {stage}/{code} ({occurrences} occurrence(s))",
			"panel.sourcesFailed": "KerSor sources failed: {roots} roots, {readers} run readers; latest {stage}/{code} ({occurrences} occurrence(s))",
			"panel.hint": "Optimization summaries and live Workflow progress",
			"session.title": "Optimization Sessions",
			"session.summary": "Latest {count} · {active} active",
			"session.round": "Round {current}/{maximum}",
			"session.roundOpen": "Round {current}",
			"session.best": "Best {speedup}x",
			"session.target": "Target {speedup}x",
			"session.authoring": "Authoring · budget {budget}",
			"session.workflow": "Workflow: {workflow}",
			"session.fit": "Fit: {confidence}",
			"session.noWorkflow": "No Workflow selected yet",
			"session.unknownPhase": "Unknown phase",
			"session.lastActivity": "Active {time}",
			"session.health.active": "Active",
			"session.health.stale": "Stale",
			"session.health.needsResume": "Needs resume",
			"session.health.terminal": "Terminal",
			"session.health.unknown": "Unknown",
			"session.warnings": "{count} status warning(s)",
			"run.sectionTitle": "Autonomous Workflows",
			"launcher.title": "Task controls",
			"launcher.start": "Start",
			"launcher.stop": "Stop",
			"launcher.running": "dsh owns {count} launcher process(es)",
			"launcher.error": "Task control failed: {message}",
			"run.active": "Running",
			"run.completed": "Completed",
			"run.failed": "Failed",
			"run.unknown": "Unknown",
			"run.currentPhase": "Current phase: {phase}",
			"run.calls": "{calls} calls",
			"run.tokens": "{tokens} tokens",
			"run.startedAt": "Started {time}",
			"run.error": "Error: {message}",
			"phase.empty": "(no events)",
			"call.queued": "Queued",
			"call.running": "Running",
			"call.completed": "Completed",
			"call.failed": "Failed",
			"call.rolledBack": "rolled back",
			"call.evaluation": "evaluation",
			"call.agent": "agent",
			"call.duration": "{seconds}"
		};
		//#endregion
		//#region lib/types/client/index.js
		/**
		* KerSor viewer browser half: one atomic Host snapshot plus optional launcher
		* process ownership, rendered in the sidebar.
		* @module @deepseek-ai/dsh-client-ui-kersor-viewer/client
		*/
		/** Required services: viewer UI seams, assembled Remotes, and Host inventory. */
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.pluginInventory"
		];
		/** Mount the KerSor viewer surfaces over the API assembly's Remote namespaces. */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "kersor-viewer: dictionaries");
			const store = new KersorViewerStore();
			const launcherRemote = () => ctx.get("remote.kersor");
			const viewerRemote = () => {
				const remote = ctx.get("remote.kersorViewer");
				if (remote === void 0) throw new Error("KerSor viewer Remote is not mounted");
				return remote;
			};
			const launcherHostAvailable = async () => {
				const answered = await ctx.remote.pluginInventory.list();
				if (!answered.ok) return false;
				return answered.value.entries.some((entry) => entry.moduleName === "@deepseek-ai/dsh-kersor" && entry.enabled && entry.fiberPhase === "active");
			};
			const refreshViewer = async () => {
				try {
					const remote = viewerRemote();
					const answered = await remote.snapshot();
					if (!answered.ok) {
						store.setTransportError(`${answered.error.code}: ${answered.error.message}`);
						return;
					}
					store.setSnapshot(answered.value);
					const selected = store.selectedRunDir;
					if (selected !== void 0) {
						const backlog = await remote.runBacklog(selected);
						if (!backlog.ok) {
							store.setTransportError(`${backlog.error.code}: ${backlog.error.message}`);
							return;
						}
						store.setBacklog(selected, backlog.value);
					}
				} catch (error) {
					store.setTransportError(error instanceof Error ? error.message : String(error));
				}
			};
			const refreshLauncher = async () => {
				try {
					const launcher = launcherRemote();
					if (!await launcherHostAvailable() || launcher === void 0) {
						store.setLauncherUnavailable();
						return;
					}
					const [tasks, active] = await Promise.all([launcher.listTasks(), launcher.listActive()]);
					if (!tasks.ok || !active.ok) {
						store.setLauncherUnavailable();
						return;
					}
					store.setLauncher(tasks.value, active.value);
				} catch {
					store.setLauncherUnavailable();
				}
			};
			const refresh = async () => {
				await Promise.all([refreshViewer(), refreshLauncher()]);
			};
			const start = async (taskId) => {
				try {
					const launcher = launcherRemote();
					if (!await launcherHostAvailable() || launcher === void 0) {
						store.setLauncherUnavailable();
						return;
					}
					const answered = await launcher.start(taskId);
					if (!answered.ok) {
						store.setLauncherError(`${answered.error.code}: ${answered.error.message}`);
						return;
					}
					await refreshLauncher();
					await refreshViewer();
				} catch (error) {
					store.setLauncherError(error instanceof Error ? error.message : String(error));
				}
			};
			const stop = async (runDir) => {
				try {
					const launcher = launcherRemote();
					if (!await launcherHostAvailable() || launcher === void 0) {
						store.setLauncherUnavailable();
						return;
					}
					const answered = await launcher.stop(runDir);
					if (!answered.ok) {
						store.setLauncherError(`${answered.error.code}: ${answered.error.message}`);
						return;
					}
					await refreshLauncher();
					await refreshViewer();
				} catch (error) {
					store.setLauncherError(error instanceof Error ? error.message : String(error));
				}
			};
			ctx.on("connection/reset", () => {
				store.reset();
				refresh();
			});
			ctx.remote.$on("kersor/event", (frame) => {
				store.applyFrame(frame);
			});
			ctx.remote.$on("kersor/active", (frame) => {
				store.applyActiveFrame(frame);
			});
			refresh();
			const face = {
				store,
				refresh,
				start,
				stop
			};
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "kersor-panel",
				locale: NS,
				inject: () => face
			}, KersorPanel));
		}
		//#endregion
		exports.KersorViewerStoreClass = KersorViewerStore;
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map