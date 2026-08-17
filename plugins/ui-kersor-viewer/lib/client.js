window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-kersor-viewer",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/readiness.ts
		/** A terminal veto outranks any fit result produced before the Session stopped. */
		function visibleFitConfidence(session) {
			if (session.lifecycle === "stalled" || session.lifecycle === "cancelled") return void 0;
			return session.fit_confidence ?? void 0;
		}
		//#endregion
		//#region \0dsh-css:1466f4ea44b824f4.mjs
		const css = ".FSQJCq_layer{flex:none;align-items:center;width:100%;height:49px;margin:8px 0 0;display:flex;position:relative}.FSQJCq_trigger{width:100%;height:49px;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border:none;border-radius:12px;align-items:center;gap:8px;padding:0 8px 0 6px;font-family:inherit;font-size:13px;display:flex}.FSQJCq_trigger:hover{background:var(--dsw-alias-bg-hover-secondary)}.FSQJCq_trigger[aria-expanded=true]{background:var(--dsw-alias-bg-active-secondary)}.FSQJCq_triggerIcon{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);flex:none;justify-content:center;align-items:center;display:inline-flex}.FSQJCq_triggerLabel{text-align:left;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.FSQJCq_triggerBadge{flex:none;align-items:center;display:inline-flex}.FSQJCq_panel{z-index:30;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);width:460px;max-width:calc(100vw - 24px);max-height:60vh;box-shadow:var(--dsw-shadow-lv2);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:12px;flex-direction:column;display:flex;position:fixed;bottom:128px;left:12px;overflow:hidden}.FSQJCq_header{box-sizing:border-box;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);flex:none;justify-content:space-between;align-items:center;gap:8px;min-height:44px;padding:10px 12px;display:flex}.FSQJCq_title{color:var(--dsw-alias-label-primary);flex:none;font-size:13px;font-weight:500;line-height:20px}.FSQJCq_note,.FSQJCq_readError{color:var(--dsw-alias-label-tertiary);margin:4px 0;font-size:12px;line-height:18px}.FSQJCq_note{text-align:right;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.FSQJCq_readError{color:var(--dsw-alias-state-error-primary)}.FSQJCq_body{flex:1;min-height:0;padding:4px 12px 12px;overflow-y:auto}.FSQJCq_launcher{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);border-radius:12px;flex-direction:column;gap:8px;margin:4px 0 10px;padding:10px 12px;display:flex}.FSQJCq_launcherHead,.FSQJCq_taskRow,.FSQJCq_activeRow{align-items:center;gap:8px;display:flex}.FSQJCq_launcherHead{justify-content:space-between}.FSQJCq_launcherTitle,.FSQJCq_taskLabel{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:510;line-height:18px}.FSQJCq_launcherSummary,.FSQJCq_activeRunId{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.FSQJCq_taskList,.FSQJCq_activeList{flex-direction:column;gap:4px;display:flex}.FSQJCq_taskRow,.FSQJCq_activeRow{min-height:28px}.FSQJCq_taskLabel,.FSQJCq_activeLabel{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.FSQJCq_activeLabel{color:var(--dsw-alias-label-secondary);flex-direction:column;font-size:12px;line-height:16px;display:flex}.FSQJCq_activeRunId{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.FSQJCq_controlButton{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);min-width:52px;height:26px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:7px;flex:none;padding:0 10px;font-family:inherit;font-size:11px}.FSQJCq_controlButton:hover:not(:disabled){background:var(--dsw-alias-bg-hover-secondary)}.FSQJCq_controlButton:disabled{cursor:default;opacity:.55}.FSQJCq_controlButton[data-busy=true]{color:var(--dsw-alias-state-business-primary)}.FSQJCq_activitySection{flex-direction:column;gap:6px;margin-top:8px;display:flex}.FSQJCq_sectionHead,.FSQJCq_classicHead,.FSQJCq_classicFoot{align-items:center;gap:8px;display:flex}.FSQJCq_sectionHead{justify-content:space-between;min-height:24px;padding:0 2px}.FSQJCq_sectionTitle{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:510;line-height:18px}.FSQJCq_sectionSummary{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.FSQJCq_classicRows{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0;padding:0;list-style:none;display:grid}.FSQJCq_classicRow{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);border-radius:10px;flex-direction:column;gap:6px;min-width:0;padding:10px;display:flex}.FSQJCq_classicRow[data-session-health=active]{border-color:var(--dsw-alias-state-business-primary)}.FSQJCq_classicRow[data-session-health=stale],.FSQJCq_classicRow[data-session-health=needs_resume],.FSQJCq_classicRow[data-session-health=unknown]{border-color:var(--dsw-alias-state-warn-secondary)}.FSQJCq_classicRow[data-expanded=true]{grid-column:1/-1}.FSQJCq_classicHead{min-width:0}.FSQJCq_classicExpand{width:20px;height:20px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;border-radius:5px;flex:none;justify-content:center;align-items:center;padding:0;transition:transform .12s,background .12s;display:inline-flex}.FSQJCq_classicExpand:hover{background:var(--dsw-alias-bg-base)}.FSQJCq_classicExpand[aria-expanded=true]{transform:rotate(90deg)}.FSQJCq_sessionId{min-width:0;color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-weight:510;line-height:16px;overflow:hidden}.FSQJCq_phaseBadge{background:var(--dsw-alias-bg-base);max-width:42%;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;border-radius:5px;flex:none;padding:1px 5px;font-size:10px;line-height:15px;overflow:hidden}.FSQJCq_classicMetrics{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;gap:2px 8px;font-size:10px;line-height:15px;display:flex}.FSQJCq_classicMetrics [data-target-met=true]{color:var(--dsw-alias-state-success-primary)}.FSQJCq_routeBadge,.FSQJCq_authoringBadge,.FSQJCq_gateBadge{background:var(--dsw-alias-bg-base);border-radius:5px;padding:0 5px}.FSQJCq_routeBadge{color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.FSQJCq_authoringBadge{color:var(--dsw-alias-state-business-primary)}.FSQJCq_gateBadge[data-gate=pass]{color:var(--dsw-alias-state-success-primary)}.FSQJCq_gateBadge[data-gate=fail]{color:var(--dsw-alias-state-error-primary)}.FSQJCq_gateBadge[data-gate=pending]{color:var(--dsw-alias-state-warn-label)}.FSQJCq_baselineAction{border-left:2px solid var(--dsw-alias-state-warn-label);background:var(--dsw-alias-bg-base);border-radius:5px;flex-direction:column;gap:1px;padding:4px 7px;font-size:10px;line-height:15px;display:flex}.FSQJCq_baselineAction[data-baseline-action=new_session]{border-left-color:var(--dsw-alias-state-error-primary)}.FSQJCq_baselineActionLabel{color:var(--dsw-alias-label-secondary);font-weight:510}.FSQJCq_baselineAction[data-baseline-action=new_session] .FSQJCq_baselineActionLabel{color:var(--dsw-alias-state-error-primary)}.FSQJCq_baselineActionReason{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.FSQJCq_classicFoot{min-width:0;color:var(--dsw-alias-label-secondary);justify-content:space-between;font-size:10px;line-height:15px}.FSQJCq_workflowName{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.FSQJCq_fitBadge{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);border-radius:5px;flex:none;padding:0 5px}.FSQJCq_fitBadge[data-fit-confidence=high]{color:var(--dsw-alias-state-success-primary)}.FSQJCq_fitBadge[data-fit-confidence=low]{color:var(--dsw-alias-state-warn-label)}.FSQJCq_warningCount{color:var(--dsw-alias-state-warn-label);cursor:help;flex:none}.FSQJCq_decisionReason{border-top:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;-webkit-line-clamp:2;-webkit-box-orient:vertical;padding-top:5px;font-size:10px;line-height:15px;display:-webkit-box;overflow:hidden}.FSQJCq_classicDetail{border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:10px;padding-top:8px;display:flex}.FSQJCq_timeline{grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 8px;margin:0;padding:0;list-style:none;display:grid}.FSQJCq_timelineStep{min-width:0;color:var(--dsw-alias-label-tertiary);align-items:center;gap:5px;font-size:10px;line-height:15px;display:flex}.FSQJCq_timelineStep[data-step-status=active]{color:var(--dsw-alias-state-business-primary)}.FSQJCq_timelineStep[data-step-status=failed]{color:var(--dsw-alias-state-error-primary)}.FSQJCq_detailGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;display:grid}.FSQJCq_detailSection{background:var(--dsw-alias-bg-base);min-width:0;color:var(--dsw-alias-label-tertiary);border-radius:8px;flex-direction:column;gap:3px;padding:8px;font-size:10px;line-height:15px;display:flex}.FSQJCq_detailTitle{color:var(--dsw-alias-label-primary);font-weight:510}.FSQJCq_detailReason,.FSQJCq_detailPath{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.FSQJCq_detailPath{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.FSQJCq_detailNote,.FSQJCq_detailError{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px}.FSQJCq_detailError{color:var(--dsw-alias-state-error-primary)}.FSQJCq_mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.FSQJCq_checks{flex-wrap:wrap;gap:2px 8px;margin:0;padding:0;list-style:none;display:flex}.FSQJCq_checks [data-check-passed=true]{color:var(--dsw-alias-state-success-primary)}.FSQJCq_checks [data-check-passed=false]{color:var(--dsw-alias-state-error-primary)}.FSQJCq_artifacts{color:var(--dsw-alias-label-tertiary);flex-direction:column;gap:2px;font-size:10px;line-height:15px;display:flex}.FSQJCq_design{flex-direction:column;gap:6px;display:flex}.FSQJCq_designMeta{flex-wrap:wrap;gap:4px;display:flex}.FSQJCq_designMeta>span{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);border-radius:5px;padding:1px 5px;font-size:10px;line-height:15px}.FSQJCq_requiredArgs{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px}.FSQJCq_designDisclosure{background:var(--dsw-alias-bg-base);border-radius:8px}.FSQJCq_designDisclosure>summary{color:var(--dsw-alias-label-secondary);cursor:pointer;padding:7px 8px;font-size:10px;line-height:15px}.FSQJCq_designDisclosure>pre{border-top:1px solid var(--dsw-alias-border-l2);max-height:320px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word;margin:0;padding:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:9px;line-height:14px;overflow:auto}@media (width<=520px){.FSQJCq_classicRows,.FSQJCq_timeline,.FSQJCq_detailGrid{grid-template-columns:1fr}}.FSQJCq_rows{flex-direction:column;gap:8px;margin:0;padding:0;list-style:none;display:flex}.FSQJCq_row{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:12px;flex-direction:column;gap:6px;padding:10px 12px;display:flex}.FSQJCq_row[data-run-status=active]{border-color:var(--dsw-alias-state-business-primary)}.FSQJCq_rowHead{width:100%;color:inherit;text-align:left;cursor:pointer;background:0 0;border:none;border-radius:8px;align-items:center;gap:8px;padding:2px;font-family:inherit;display:flex}.FSQJCq_rowHead:hover{background:var(--dsw-alias-bg-hover-secondary)}.FSQJCq_rowHead[aria-pressed=true]{background:var(--dsw-alias-bg-active-secondary)}.FSQJCq_runId{max-width:45%;color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;flex:none;font-size:13px;font-weight:510;line-height:20px;overflow:hidden}.FSQJCq_rowPath{min-width:0;color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;direction:rtl;flex:1;font-size:11px;line-height:16px;overflow:hidden}.FSQJCq_runDetail{border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:4px;padding:4px 2px 2px;display:flex}.FSQJCq_runHead{justify-content:space-between;align-items:center;gap:8px;display:flex}.FSQJCq_statusTail{height:20px;color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none;align-items:center;gap:4px;font-size:11px;font-weight:510;line-height:16px;display:inline-flex;overflow:hidden}.FSQJCq_runMeta{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;gap:4px 12px;font-size:11px;line-height:16px;display:flex}.FSQJCq_runError{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}.FSQJCq_phaseSection{flex-direction:column;margin-top:4px;display:flex}.FSQJCq_phaseHeader{box-sizing:border-box;background:var(--dsw-alias-bg-module-platform);border-radius:8px;align-items:center;gap:6px;width:100%;min-width:0;height:28px;padding:0 8px;display:flex}.FSQJCq_dotSlot{flex:none;justify-content:center;align-items:center;width:16px;display:inline-flex}.FSQJCq_phaseTitle{max-width:55%;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:none;font-size:13px;font-weight:510;line-height:22px;overflow:hidden}.FSQJCq_phaseSummary{min-width:0;color:var(--dsw-alias-label-tertiary);text-align:right;text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:11px;line-height:16px;overflow:hidden}.FSQJCq_callRow{align-items:center;gap:6px;min-height:24px;padding:0 0 0 8px;display:flex}.FSQJCq_callLabel{min-width:0;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:12px;line-height:18px;overflow:hidden}.FSQJCq_callMeta{color:var(--dsw-alias-label-tertiary);flex:none;align-items:center;gap:6px;font-size:11px;line-height:16px;display:inline-flex}.FSQJCq_badge{border:1px solid var(--dsw-alias-border-l2);border-radius:4px;padding:0 4px}.FSQJCq_callStatus{color:var(--dsw-alias-label-tertiary);flex:none;font-size:11px;font-weight:510;line-height:16px}.FSQJCq_callRow[data-call-status=failed] .FSQJCq_callStatus{color:var(--dsw-alias-state-error-primary)}";
		const tagId = "@deepseek-ai/dsh-client-ui-kersor-viewer/KersorPanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-kersor-viewer";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var _dsh_css_1466f4ea44b824f4_default = {
			"phaseBadge": "FSQJCq_phaseBadge",
			"classicFoot": "FSQJCq_classicFoot",
			"taskRow": "FSQJCq_taskRow",
			"detailError": "FSQJCq_detailError",
			"sectionHead": "FSQJCq_sectionHead",
			"sessionId": "FSQJCq_sessionId",
			"body": "FSQJCq_body",
			"launcherHead": "FSQJCq_launcherHead",
			"launcherSummary": "FSQJCq_launcherSummary",
			"activeLabel": "FSQJCq_activeLabel",
			"sectionTitle": "FSQJCq_sectionTitle",
			"detailTitle": "FSQJCq_detailTitle",
			"rows": "FSQJCq_rows",
			"badge": "FSQJCq_badge",
			"rowPath": "FSQJCq_rowPath",
			"gateBadge": "FSQJCq_gateBadge",
			"readError": "FSQJCq_readError",
			"workflowName": "FSQJCq_workflowName",
			"detailPath": "FSQJCq_detailPath",
			"classicMetrics": "FSQJCq_classicMetrics",
			"callLabel": "FSQJCq_callLabel",
			"layer": "FSQJCq_layer",
			"detailReason": "FSQJCq_detailReason",
			"launcher": "FSQJCq_launcher",
			"triggerIcon": "FSQJCq_triggerIcon",
			"detailSection": "FSQJCq_detailSection",
			"runHead": "FSQJCq_runHead",
			"phaseHeader": "FSQJCq_phaseHeader",
			"design": "FSQJCq_design",
			"controlButton": "FSQJCq_controlButton",
			"header": "FSQJCq_header",
			"baselineActionReason": "FSQJCq_baselineActionReason",
			"trigger": "FSQJCq_trigger",
			"classicExpand": "FSQJCq_classicExpand",
			"classicDetail": "FSQJCq_classicDetail",
			"baselineActionLabel": "FSQJCq_baselineActionLabel",
			"timelineStep": "FSQJCq_timelineStep",
			"baselineAction": "FSQJCq_baselineAction",
			"runMeta": "FSQJCq_runMeta",
			"timeline": "FSQJCq_timeline",
			"launcherTitle": "FSQJCq_launcherTitle",
			"routeBadge": "FSQJCq_routeBadge",
			"mono": "FSQJCq_mono",
			"detailNote": "FSQJCq_detailNote",
			"taskLabel": "FSQJCq_taskLabel",
			"activeRow": "FSQJCq_activeRow",
			"detailGrid": "FSQJCq_detailGrid",
			"checks": "FSQJCq_checks",
			"designMeta": "FSQJCq_designMeta",
			"row": "FSQJCq_row",
			"triggerLabel": "FSQJCq_triggerLabel",
			"authoringBadge": "FSQJCq_authoringBadge",
			"rowHead": "FSQJCq_rowHead",
			"activitySection": "FSQJCq_activitySection",
			"activeRunId": "FSQJCq_activeRunId",
			"runDetail": "FSQJCq_runDetail",
			"classicHead": "FSQJCq_classicHead",
			"sectionSummary": "FSQJCq_sectionSummary",
			"statusTail": "FSQJCq_statusTail",
			"classicRows": "FSQJCq_classicRows",
			"classicRow": "FSQJCq_classicRow",
			"dotSlot": "FSQJCq_dotSlot",
			"artifacts": "FSQJCq_artifacts",
			"designDisclosure": "FSQJCq_designDisclosure",
			"runError": "FSQJCq_runError",
			"phaseSection": "FSQJCq_phaseSection",
			"callRow": "FSQJCq_callRow",
			"callStatus": "FSQJCq_callStatus",
			"title": "FSQJCq_title",
			"panel": "FSQJCq_panel",
			"warningCount": "FSQJCq_warningCount",
			"note": "FSQJCq_note",
			"taskList": "FSQJCq_taskList",
			"callMeta": "FSQJCq_callMeta",
			"triggerBadge": "FSQJCq_triggerBadge",
			"requiredArgs": "FSQJCq_requiredArgs",
			"decisionReason": "FSQJCq_decisionReason",
			"fitBadge": "FSQJCq_fitBadge",
			"phaseSummary": "FSQJCq_phaseSummary",
			"activeList": "FSQJCq_activeList",
			"runId": "FSQJCq_runId",
			"phaseTitle": "FSQJCq_phaseTitle"
		};
		//#endregion
		//#region src/client/KersorPanel.tsx
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
		const CLASSIC_STEP_KEYS = {
			setup: "detail.step.setup",
			baseline: "detail.step.baseline",
			profile: "detail.step.profile",
			selection: "detail.step.selection",
			authoring: "detail.step.authoring",
			validation: "detail.step.validation",
			dispatch: "detail.step.dispatch",
			measurement: "detail.step.measurement",
			decision: "detail.step.decision"
		};
		function classicStepDotState(status) {
			switch (status) {
				case "pending": return "warning";
				case "active": return "ongoing";
				case "completed": return "done";
				case "failed": return "error";
			}
		}
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
		const GATE_KEYS = {
			pass: "session.gate.pass",
			fail: "session.gate.fail",
			pending: "session.gate.pending",
			not_required: "session.gate.notRequired"
		};
		const BASELINE_ACTION_KEYS = {
			init: "session.baselineAction.init",
			record_verify: "session.baselineAction.recordVerify",
			new_session: "session.baselineAction.newSession"
		};
		function displayTime(value) {
			const date = new Date(value);
			if (Number.isNaN(date.getTime())) return void 0;
			return new Intl.DateTimeFormat(void 0, {
				dateStyle: "medium",
				timeStyle: "short"
			}).format(date);
		}
		function ClassicSessionDetail({ detail, t }) {
			const design = detail.authoring.design;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_css_1466f4ea44b824f4_default.classicDetail,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
						className: _dsh_css_1466f4ea44b824f4_default.timeline,
						"aria-label": t("detail.timeline"),
						children: detail.steps.map((step) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: _dsh_css_1466f4ea44b824f4_default.timelineStep,
							"data-step-status": step.status,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: classicStepDotState(step.status) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(CLASSIC_STEP_KEYS[step.id]) })]
						}, step.id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.detailGrid,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: _dsh_css_1466f4ea44b824f4_default.detailSection,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.detailTitle,
										children: t("detail.selection")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`detail.selection.${detail.selection.status}`) }),
									detail.selection.workflow !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.mono,
										children: detail.selection.workflow
									}) : null,
									detail.selection.reason !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.detailReason,
										children: detail.selection.reason
									}) : null,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("detail.rejected", { count: detail.selection.rejectedCount }) })
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: _dsh_css_1466f4ea44b824f4_default.detailSection,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.detailTitle,
										children: t("detail.authoring")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`detail.authoring.${detail.authoring.status}`) }),
									detail.authoring.omittedReason !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.detailError,
										children: t("detail.omitted", { reason: detail.authoring.omittedReason })
									}) : null
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: _dsh_css_1466f4ea44b824f4_default.detailSection,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.detailTitle,
										children: t("detail.validation")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`detail.validation.${detail.validation.status}`) }),
									detail.validation.checks.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
										className: _dsh_css_1466f4ea44b824f4_default.checks,
										children: detail.validation.checks.map((check) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
											"data-check-passed": check.passed,
											children: [
												check.passed ? "✓" : "×",
												" ",
												check.name
											]
										}, check.name))
									}) : null
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: _dsh_css_1466f4ea44b824f4_default.detailSection,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.detailTitle,
										children: t("detail.dispatch")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`detail.dispatch.${detail.dispatch.status}`) }),
									detail.dispatch.runtimeStatus !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.mono,
										children: detail.dispatch.runtimeStatus
									}) : null,
									detail.dispatch.runDir !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.detailPath,
										title: detail.dispatch.runDir,
										children: detail.dispatch.runDir
									}) : null
								]
							})
						]
					}),
					detail.authoring.files.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.artifacts,
						children: detail.authoring.files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							title: file.sha256,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: _dsh_css_1466f4ea44b824f4_default.mono,
									children: file.name
								}),
								" · ",
								file.bytes,
								" B · ",
								file.sha256.slice(0, 18),
								"…"
							]
						}, file.name))
					}) : null,
					design !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.design,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_css_1466f4ea44b824f4_default.designMeta,
								children: [
									design.name !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.mono,
										children: design.name
									}) : null,
									design.technique !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: design.technique }) : null,
									design.methodCategory !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: design.methodCategory }) : null,
									design.topology !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: design.topology }) : null,
									design.languages.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: value }, `language:${value}`)),
									design.backends.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: value }, `backend:${value}`)),
									design.integrationPatterns.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: value }, `integration:${value}`))
								]
							}),
							design.requiredArgs.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_css_1466f4ea44b824f4_default.requiredArgs,
								children: [
									t("detail.requiredArgs"),
									": ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.mono,
										children: design.requiredArgs.join(", ")
									})
								]
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								className: _dsh_css_1466f4ea44b824f4_default.designDisclosure,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: t("detail.rationale") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: design.rationale })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								className: _dsh_css_1466f4ea44b824f4_default.designDisclosure,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: t("detail.source") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: design.source })]
							})
						]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.detailNote,
						children: t("detail.sealRequired")
					})
				]
			});
		}
		function ClassicSessionRow({ session, selected, detail, loading, error, onToggle, t }) {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: _dsh_css_1466f4ea44b824f4_default.classicRow,
				"data-session-health": session.health,
				"data-session-lifecycle": session.lifecycle,
				"data-expanded": selected,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.classicHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: classicDotState(session.health, session.lifecycle) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.sessionId,
								title: session.session_dir,
								children: session.session_id
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.phaseBadge,
								children: t(CLASSIC_HEALTH_KEYS[session.health])
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: _dsh_css_1466f4ea44b824f4_default.classicExpand,
								"aria-expanded": selected,
								"aria-label": selected ? t("detail.collapse") : t("detail.expand"),
								onClick: onToggle,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.classicMetrics,
						children: [
							round !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: round }) : null,
							session.best_speedup !== null && session.best_speedup !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"data-target-met": session.target_met ?? void 0,
								children: t("session.best", { speedup: speedup(session.best_speedup) })
							}) : null,
							session.target_speedup !== null && session.target_speedup !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("session.target", { speedup: speedup(session.target_speedup) }) }) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: session.phase ?? t("session.unknownPhase") }),
							details.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: details }) : null,
							session.integration_pattern !== null && session.integration_pattern !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.routeBadge,
								children: session.integration_pattern
							}) : null,
							session.allow_workflow_authoring === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.authoringBadge,
								children: t("session.authoring", { budget: session.workflow_authoring_budget ?? "—" })
							}) : null,
							session.fresh_session != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.gateBadge,
								"data-gate": session.fresh_session,
								children: t("session.freshGate", { status: t(GATE_KEYS[session.fresh_session]) })
							}) : null,
							session.allow_workflow_authoring === true && session.baseline_witness != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.gateBadge,
								"data-gate": session.baseline_witness,
								children: t("session.baselineGate", { status: t(GATE_KEYS[session.baseline_witness]) })
							}) : null,
							session.allow_workflow_authoring === true && session.dsh_compatibility != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.gateBadge,
								"data-gate": session.dsh_compatibility,
								children: t("session.dshGate", { status: t(GATE_KEYS[session.dsh_compatibility]) })
							}) : null,
							session.allow_workflow_authoring === true && session.candidate_ownership != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.gateBadge,
								"data-gate": session.candidate_ownership,
								children: t("session.ownershipGate", { status: t(GATE_KEYS[session.candidate_ownership]) })
							}) : null,
							activity !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("session.lastActivity", { time: activity }) }) : null
						]
					}),
					session.allow_workflow_authoring === true && session.baseline_next_action != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.baselineAction,
						"data-baseline-action": session.baseline_next_action,
						title: session.baseline_reason ?? void 0,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.baselineActionLabel,
							children: t(BASELINE_ACTION_KEYS[session.baseline_next_action])
						}), session.baseline_reason != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.baselineActionReason,
							children: session.baseline_reason
						}) : null]
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.classicFoot,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.workflowName,
								children: session.selection_status === "stalled" ? t("session.selectorStalled") : session.workflow !== null && session.workflow !== void 0 ? t("session.workflow", { workflow: session.workflow }) : t("session.noWorkflow")
							}),
							fitConfidence !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.fitBadge,
								"data-fit-confidence": fitConfidence,
								children: t("session.fit", { confidence: fitConfidence })
							}) : null,
							session.warningCount > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.warningCount,
								children: t("session.warnings", { count: session.warningCount })
							}) : null
						]
					}),
					session.decision !== null && session.decision !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.decisionReason,
						title: session.decision,
						children: session.decision
					}) : null,
					selected && loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.detailNote,
						children: t("detail.loading")
					}) : null,
					selected && error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.detailError,
						children: error
					}) : null,
					selected && !loading && detail !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ClassicSessionDetail, {
						detail,
						t
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_css_1466f4ea44b824f4_default.callRow,
				"data-call-status": call.status,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: _dsh_css_1466f4ea44b824f4_default.dotSlot,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: callDotState(call.status) })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: _dsh_css_1466f4ea44b824f4_default.callLabel,
						title: call.callId,
						children: call.label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: _dsh_css_1466f4ea44b824f4_default.callMeta,
						children: [
							call.kind === "evaluation" ? t("call.evaluation") : null,
							call.rolledBack ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_1466f4ea44b824f4_default.badge,
								children: t("call.rolledBack")
							}) : null,
							duration !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: duration }) : null,
							call.tokens !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [call.tokens.toLocaleString(), " tk"] }) : null
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: _dsh_css_1466f4ea44b824f4_default.callStatus,
						children: t(CALL_STATUS_KEYS[call.status])
					})
				]
			});
		}
		function PhaseSection({ phase, t }) {
			const title = phase.title.length > 0 ? phase.title : t("phase.empty");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_css_1466f4ea44b824f4_default.phaseSection,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: _dsh_css_1466f4ea44b824f4_default.phaseHeader,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.dotSlot,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: phaseDotState(phase.status) })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.phaseTitle,
							children: title
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.phaseSummary,
							children: phase.calls.length
						})
					]
				}), phase.calls.map((call) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CallRow, {
					call,
					t
				}, call.callId))]
			});
		}
		function RunDetail({ view, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_css_1466f4ea44b824f4_default.runDetail,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.runHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.runId,
							title: view.runDir,
							children: view.runId
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.statusTail,
							"data-status": view.status,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: runDotState(view.status) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(RUN_STATUS_KEYS[view.status]) })]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.runMeta,
						children: [
							view.currentPhase.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("run.currentPhase", { phase: view.currentPhase }) }) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("run.calls", { calls: view.totals.calls }) }),
							view.totals.tokens > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("run.tokens", { tokens: view.totals.tokens.toLocaleString() }) }) : null
						]
					}),
					view.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.runError,
						children: t("run.error", { message: view.error })
					}) : null,
					view.phases.map((phase) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PhaseSection, {
						phase,
						t
					}, `${phase.index}-${phase.title}`))
				]
			});
		}
		function LauncherControls({ launcher, busy, start, stop, t }) {
			const labels = new Map(launcher.tasks.map((task) => [task.id, task.label]));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: _dsh_css_1466f4ea44b824f4_default.launcher,
				"aria-label": t("launcher.title"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.launcherHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.launcherTitle,
							children: t("launcher.title")
						}), launcher.active.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.launcherSummary,
							children: t("launcher.running", { count: launcher.active.length })
						}) : null]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.taskList,
						children: launcher.tasks.map((task) => {
							const key = `start:${task.id}`;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_css_1466f4ea44b824f4_default.taskRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: _dsh_css_1466f4ea44b824f4_default.taskLabel,
									children: task.label
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
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
					launcher.active.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.activeList,
						children: launcher.active.map((launch) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: _dsh_css_1466f4ea44b824f4_default.activeRow,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "ongoing" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: _dsh_css_1466f4ea44b824f4_default.activeLabel,
									title: launch.runDir,
									children: [labels.get(launch.taskId) ?? launch.taskId, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.activeRunId,
										children: launch.runId
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
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
					launcher.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
		function KersorPanel({ t, store, refresh, loadClassic, start, stop }) {
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
			const toggleClassic = (sessionDir) => {
				if (store.selectedClassicSessionDir === sessionDir) {
					store.selectClassic(void 0);
					return;
				}
				store.selectClassic(sessionDir);
				loadClassic(sessionDir);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_css_1466f4ea44b824f4_default.layer,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: _dsh_css_1466f4ea44b824f4_default.trigger,
					"aria-expanded": open,
					"aria-label": t("panel.trigger"),
					onClick: () => {
						setOpen(!open);
						if (!open) refresh();
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.triggerIcon,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.triggerLabel,
							children: t("panel.trigger")
						}),
						rows.some((row) => row.discovery === "active") || classicSessions.some((session) => session.health === "active") ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.triggerBadge,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "ongoing" })
						}) : null
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: _dsh_css_1466f4ea44b824f4_default.panel,
					role: "dialog",
					"aria-label": t("panel.title"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.header,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.title,
							children: t("panel.title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_1466f4ea44b824f4_default.note,
							children: t("panel.hint")
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_1466f4ea44b824f4_default.body,
						children: [
							state.launcher !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LauncherControls, {
								launcher: state.launcher,
								busy,
								start: runStart,
								stop: runStop,
								t
							}) : null,
							state.transportError !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: _dsh_css_1466f4ea44b824f4_default.readError,
								children: t("panel.readFailed", { message: state.transportError })
							}) : null,
							health !== void 0 && health.state !== "healthy" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
							state.loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: _dsh_css_1466f4ea44b824f4_default.note,
								children: t("panel.loading")
							}) : null,
							!state.loading && state.transportError === void 0 && health?.state === "healthy" && rows.length === 0 && classicSessions.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: _dsh_css_1466f4ea44b824f4_default.note,
								children: t("panel.empty", { roots: health.roots })
							}) : null,
							classicSessions.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: _dsh_css_1466f4ea44b824f4_default.activitySection,
								"aria-label": t("session.title"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: _dsh_css_1466f4ea44b824f4_default.sectionHead,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.sectionTitle,
										children: t("session.title")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.sectionSummary,
										children: t("session.summary", {
											count: classicSessions.length,
											active: classicSessions.filter((session) => session.health === "active").length
										})
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
									className: _dsh_css_1466f4ea44b824f4_default.classicRows,
									children: classicSessions.map((session) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ClassicSessionRow, {
										session,
										selected: store.selectedClassicSessionDir === session.session_dir,
										loading: state.classicDetailLoading === session.session_dir,
										...state.classicDetails.get(session.session_dir) === void 0 ? {} : { detail: state.classicDetails.get(session.session_dir) },
										...state.classicDetailError?.startsWith(`${session.session_dir}: `) === true ? { error: state.classicDetailError.slice(session.session_dir.length + 2) } : {},
										onToggle: () => {
											toggleClassic(session.session_dir);
										},
										t
									}, session.session_dir))
								})]
							}) : null,
							rows.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: _dsh_css_1466f4ea44b824f4_default.activitySection,
								"aria-label": t("run.sectionTitle"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: _dsh_css_1466f4ea44b824f4_default.sectionHead,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.sectionTitle,
										children: t("run.sectionTitle")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_1466f4ea44b824f4_default.sectionSummary,
										children: rows.length
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
									className: _dsh_css_1466f4ea44b824f4_default.rows,
									children: rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
										className: _dsh_css_1466f4ea44b824f4_default.row,
										"data-run-status": row.discovery,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: _dsh_css_1466f4ea44b824f4_default.rowHead,
											"aria-pressed": store.selectedRunDir === row.runDir,
											onClick: () => {
												store.select(store.selectedRunDir === row.runDir ? void 0 : row.runDir);
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: row.discovery === "active" ? "ongoing" : row.discovery === "failed" ? "error" : "done" }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: _dsh_css_1466f4ea44b824f4_default.runId,
													children: row.runId
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: _dsh_css_1466f4ea44b824f4_default.rowPath,
													title: row.runDir,
													children: row.sessionDir
												})
											]
										}), store.selectedRunDir === row.runDir && row.view !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RunDetail, {
											view: row.view,
											t
										}) : null]
									}, row.runDir))
								})]
							}) : null,
							rows.length > 0 && view !== void 0 && !rows.some((row) => row.runDir === store.selectedRunDir) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RunDetail, {
								view,
								t
							}) : null
						]
					})]
				}) : null]
			});
		}
		//#endregion
		//#region src/client/store.ts
		/** Snapshot store over the Host projection and per-run folded views. */
		var KersorViewerStore = class {
			state = {
				views: /* @__PURE__ */ new Map(),
				classicDetails: /* @__PURE__ */ new Map(),
				loading: true
			};
			listeners = /* @__PURE__ */ new Set();
			selected;
			selectedClassic;
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
			/** Currently expanded classic Session directory. */
			get selectedClassicSessionDir() {
				return this.selectedClassic;
			}
			/**
			* Expand or collapse one classic Session inspector.
			* @param sessionDir - Selected Session directory, or `undefined` to collapse.
			*/
			selectClassic(sessionDir) {
				this.selectedClassic = sessionDir;
				this.emit();
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
				const liveClassic = new Set(snapshot.classic.sessions.map((session) => session.session_dir));
				const classicDetails = new Map([...this.state.classicDetails].filter(([sessionDir]) => liveClassic.has(sessionDir)));
				if (this.selectedClassic !== void 0 && !liveClassic.has(this.selectedClassic)) this.selectedClassic = void 0;
				const { transportError: _, ...state } = this.state;
				const loading = snapshot.diagnostics.scan.state === "never" || snapshot.diagnostics.scan.state === "running";
				this.state = {
					...state,
					snapshot,
					views,
					classicDetails,
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
			/**
			* Mark one selected classic Session detail as loading.
			* @param sessionDir - Session whose on-demand detail is loading.
			*/
			setClassicDetailLoading(sessionDir) {
				const { classicDetailError: _, ...state } = this.state;
				this.state = {
					...state,
					classicDetailLoading: sessionDir
				};
				this.emit();
			}
			/**
			* Store one successful classic Session detail answer.
			* @param sessionDir - Session owning the answer.
			* @param detail - Valid inspector detail, or `undefined` when unavailable.
			*/
			setClassicDetail(sessionDir, detail) {
				const { classicDetailLoading: _, classicDetailError: __, ...state } = this.state;
				const classicDetails = new Map(state.classicDetails);
				if (detail === void 0) classicDetails.delete(sessionDir);
				else classicDetails.set(sessionDir, detail);
				this.state = {
					...state,
					classicDetails
				};
				this.emit();
			}
			/**
			* Record a bounded detail-read failure without replacing the summary snapshot.
			* @param sessionDir - Session whose detail failed.
			* @param message - Remote transport diagnostic.
			*/
			setClassicDetailError(sessionDir, message) {
				const { classicDetailLoading: _, ...state } = this.state;
				this.state = {
					...state,
					classicDetailError: `${sessionDir}: ${message}`
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
					classicDetails: /* @__PURE__ */ new Map(),
					loading: true
				};
				this.selected = void 0;
				this.selectedClassic = void 0;
				this.emit();
			}
			emit() {
				for (const listener of this.listeners) listener();
			}
		};
		//#endregion
		//#region src/client/locales.ts
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
			"session.freshGate": "从零隔离：{status}",
			"session.baselineGate": "基线见证：{status}",
			"session.baselineAction.init": "下一步：初始化基线方法",
			"session.baselineAction.recordVerify": "下一步：记录并验证基线",
			"session.baselineAction.newSession": "下一步：新建 Session 后重试",
			"session.dshGate": "DSH 兼容：{status}",
			"session.ownershipGate": "候选所有权：{status}",
			"session.gate.pass": "通过",
			"session.gate.fail": "失败",
			"session.gate.pending": "待验证",
			"session.gate.notRequired": "无需",
			"session.workflow": "Workflow：{workflow}",
			"session.fit": "适配度：{confidence}",
			"session.noWorkflow": "尚未选择 Workflow",
			"session.selectorStalled": "Selector：STALLED · 正在寻找逃生路径",
			"session.unknownPhase": "未知阶段",
			"session.lastActivity": "活动于 {time}",
			"session.health.active": "活跃",
			"session.health.stale": "已陈旧",
			"session.health.needsResume": "可恢复",
			"session.health.terminal": "已结束",
			"session.health.unknown": "状态未知",
			"session.warnings": "{count} 个状态提醒",
			"detail.expand": "展开 Session 详情",
			"detail.collapse": "收起 Session 详情",
			"detail.loading": "读取 Session 详情…",
			"detail.timeline": "Session 阶段时间线",
			"detail.step.setup": "Setup",
			"detail.step.baseline": "Baseline",
			"detail.step.profile": "Profile",
			"detail.step.selection": "Selection",
			"detail.step.authoring": "Authoring",
			"detail.step.validation": "Validation",
			"detail.step.dispatch": "Dispatch",
			"detail.step.measurement": "Measurement",
			"detail.step.decision": "Decision",
			"detail.selection": "Selector",
			"detail.selection.pending": "尚未运行",
			"detail.selection.stalled": "没有 released Workflow，转入 authoring",
			"detail.selection.selected": "已选择 Workflow",
			"detail.rejected": "拒绝 {count} 个候选",
			"detail.authoring": "Workflow authoring",
			"detail.authoring.not_started": "尚未开始",
			"detail.authoring.in_progress": "前台 author 正在写入；seal 前不公开设计",
			"detail.authoring.sealed": "handoff 已密封，可只读审查",
			"detail.authoring.saved": "Proposal 已保存",
			"detail.authoring.rejected": "Proposal 被拒绝",
			"detail.validation": "Proposal validation",
			"detail.validation.pending": "等待 seal/save",
			"detail.validation.passed": "全部通过",
			"detail.validation.failed": "验证失败",
			"detail.dispatch": "Workflow dispatch",
			"detail.dispatch.pending": "等待 dispatch",
			"detail.dispatch.preparing": "正在合成参数与 provenance",
			"detail.dispatch.running": "Workflow Host 运行中",
			"detail.dispatch.completed": "Workflow Host 已完成",
			"detail.dispatch.failed": "Workflow Host 失败",
			"detail.requiredArgs": "必需参数",
			"detail.rationale": "查看 rationale.md",
			"detail.source": "查看密封的 workflow.js",
			"detail.sealRequired": "设计内容会在 author handoff 密封后出现。",
			"detail.omitted": "设计内容不可显示：{reason}",
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
			"session.freshGate": "Fresh isolation: {status}",
			"session.baselineGate": "Baseline witness: {status}",
			"session.baselineAction.init": "Initialize the baseline method",
			"session.baselineAction.recordVerify": "Record and verify the baseline",
			"session.baselineAction.newSession": "Start a new Session before retrying",
			"session.dshGate": "DSH compatibility: {status}",
			"session.ownershipGate": "Candidate ownership: {status}",
			"session.gate.pass": "pass",
			"session.gate.fail": "fail",
			"session.gate.pending": "pending",
			"session.gate.notRequired": "not required",
			"session.workflow": "Workflow: {workflow}",
			"session.fit": "Fit: {confidence}",
			"session.noWorkflow": "No Workflow selected yet",
			"session.selectorStalled": "Selector: STALLED · resolving an escape path",
			"session.unknownPhase": "Unknown phase",
			"session.lastActivity": "Active {time}",
			"session.health.active": "Active",
			"session.health.stale": "Stale",
			"session.health.needsResume": "Needs resume",
			"session.health.terminal": "Terminal",
			"session.health.unknown": "Unknown",
			"session.warnings": "{count} status warning(s)",
			"detail.expand": "Expand Session details",
			"detail.collapse": "Collapse Session details",
			"detail.loading": "Loading Session detail…",
			"detail.timeline": "Session stage timeline",
			"detail.step.setup": "Setup",
			"detail.step.baseline": "Baseline",
			"detail.step.profile": "Profile",
			"detail.step.selection": "Selection",
			"detail.step.authoring": "Authoring",
			"detail.step.validation": "Validation",
			"detail.step.dispatch": "Dispatch",
			"detail.step.measurement": "Measurement",
			"detail.step.decision": "Decision",
			"detail.selection": "Selector",
			"detail.selection.pending": "Not started",
			"detail.selection.stalled": "No released Workflow; authoring an escape path",
			"detail.selection.selected": "Workflow selected",
			"detail.rejected": "{count} candidate(s) rejected",
			"detail.authoring": "Workflow authoring",
			"detail.authoring.not_started": "Not started",
			"detail.authoring.in_progress": "Foreground author is writing; design stays hidden until seal",
			"detail.authoring.sealed": "Handoff sealed and available for read-only review",
			"detail.authoring.saved": "Proposal saved",
			"detail.authoring.rejected": "Proposal rejected",
			"detail.validation": "Proposal validation",
			"detail.validation.pending": "Waiting for seal/save",
			"detail.validation.passed": "All checks passed",
			"detail.validation.failed": "Validation failed",
			"detail.dispatch": "Workflow dispatch",
			"detail.dispatch.pending": "Waiting for dispatch",
			"detail.dispatch.preparing": "Synthesizing args and provenance",
			"detail.dispatch.running": "Workflow Host running",
			"detail.dispatch.completed": "Workflow Host completed",
			"detail.dispatch.failed": "Workflow Host failed",
			"detail.requiredArgs": "Required args",
			"detail.rationale": "View rationale.md",
			"detail.source": "View sealed workflow.js",
			"detail.sealRequired": "Design content appears after the author handoff is sealed.",
			"detail.omitted": "Design content is unavailable: {reason}",
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
		//#region src/client/index.ts
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
					const selectedClassic = store.selectedClassicSessionDir;
					if (selectedClassic !== void 0) await loadClassic(selectedClassic);
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
			const loadClassic = async (sessionDir) => {
				store.setClassicDetailLoading(sessionDir);
				try {
					const answered = await viewerRemote().classicSessionDetail(sessionDir);
					if (!answered.ok) {
						store.setClassicDetailError(sessionDir, `${answered.error.code}: ${answered.error.message}`);
						return;
					}
					store.setClassicDetail(sessionDir, answered.value);
				} catch (error) {
					store.setClassicDetailError(sessionDir, error instanceof Error ? error.message : String(error));
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
				if (frame.kind === "snapshot" && store.selectedClassicSessionDir !== void 0) loadClassic(store.selectedClassicSessionDir);
			});
			ctx.remote.$on("kersor/active", (frame) => {
				store.applyActiveFrame(frame);
			});
			refresh();
			const face = {
				store,
				refresh,
				loadClassic,
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