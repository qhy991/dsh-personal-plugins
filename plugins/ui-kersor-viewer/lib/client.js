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
		//#region \0dsh-css:64557083eb0f58b9.mjs
		const css = ".sYJ4xq_view{box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);width:100%;height:100%;min-height:0;color:var(--dsw-alias-label-tertiary);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);flex-direction:column;display:flex;overflow:hidden}.sYJ4xq_header{box-sizing:border-box;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);flex:none;justify-content:space-between;align-items:center;gap:8px;min-height:44px;padding:10px 12px;display:flex}.sYJ4xq_title{color:var(--dsw-alias-label-primary);flex:none;font-size:13px;font-weight:500;line-height:20px}.sYJ4xq_note,.sYJ4xq_readError{color:var(--dsw-alias-label-tertiary);margin:4px 0;font-size:12px;line-height:18px}.sYJ4xq_note{text-align:right;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.sYJ4xq_readError{color:var(--dsw-alias-state-error-primary)}.sYJ4xq_body{flex:1;min-height:0;padding:4px 12px 12px;overflow-y:auto}.sYJ4xq_launcher{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);border-radius:12px;flex-direction:column;gap:8px;margin:4px 0 10px;padding:10px 12px;display:flex}.sYJ4xq_launcherHead,.sYJ4xq_taskRow,.sYJ4xq_activeRow{align-items:center;gap:8px;display:flex}.sYJ4xq_launcherHead{justify-content:space-between}.sYJ4xq_launcherTitle,.sYJ4xq_taskLabel{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:510;line-height:18px}.sYJ4xq_launcherSummary,.sYJ4xq_activeRunId{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.sYJ4xq_taskList,.sYJ4xq_activeList{flex-direction:column;gap:4px;display:flex}.sYJ4xq_taskRow,.sYJ4xq_activeRow{min-height:28px}.sYJ4xq_taskLabel,.sYJ4xq_activeLabel{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.sYJ4xq_activeLabel{color:var(--dsw-alias-label-secondary);flex-direction:column;font-size:12px;line-height:16px;display:flex}.sYJ4xq_activeRunId{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.sYJ4xq_controlButton{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);min-width:52px;height:26px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:7px;flex:none;padding:0 10px;font-family:inherit;font-size:11px}.sYJ4xq_controlButton:hover:not(:disabled){background:var(--dsw-alias-bg-hover-secondary)}.sYJ4xq_controlButton:disabled{cursor:default;opacity:.55}.sYJ4xq_controlButton[data-busy=true]{color:var(--dsw-alias-state-business-primary)}.sYJ4xq_activitySection{flex-direction:column;gap:6px;margin-top:8px;display:flex}.sYJ4xq_sectionHead,.sYJ4xq_classicHead,.sYJ4xq_classicFoot{align-items:center;gap:8px;display:flex}.sYJ4xq_sectionHead{justify-content:space-between;min-height:24px;padding:0 2px}.sYJ4xq_sectionTitle{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:510;line-height:18px}.sYJ4xq_sectionSummary{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.sYJ4xq_classicRows{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0;padding:0;list-style:none;display:grid}.sYJ4xq_classicRow{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);border-radius:10px;flex-direction:column;gap:6px;min-width:0;padding:10px;display:flex}.sYJ4xq_classicRow[data-session-health=active]{border-color:var(--dsw-alias-state-business-primary)}.sYJ4xq_classicRow[data-session-health=stale],.sYJ4xq_classicRow[data-session-health=needs_resume],.sYJ4xq_classicRow[data-session-health=unknown]{border-color:var(--dsw-alias-state-warn-secondary)}.sYJ4xq_classicRow[data-expanded=true]{grid-column:1/-1}.sYJ4xq_classicHead{min-width:0}.sYJ4xq_classicExpand{width:20px;height:20px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;border-radius:5px;flex:none;justify-content:center;align-items:center;padding:0;transition:transform .12s,background .12s;display:inline-flex}.sYJ4xq_classicExpand:hover{background:var(--dsw-alias-bg-base)}.sYJ4xq_classicExpand[aria-expanded=true]{transform:rotate(90deg)}.sYJ4xq_sessionId{min-width:0;color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-weight:510;line-height:16px;overflow:hidden}.sYJ4xq_phaseBadge{background:var(--dsw-alias-bg-base);max-width:42%;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;border-radius:5px;flex:none;padding:1px 5px;font-size:10px;line-height:15px;overflow:hidden}.sYJ4xq_classicMetrics{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;gap:2px 8px;font-size:10px;line-height:15px;display:flex}.sYJ4xq_classicMetrics [data-target-met=true]{color:var(--dsw-alias-state-success-primary)}.sYJ4xq_routeBadge,.sYJ4xq_authoringBadge,.sYJ4xq_gateBadge{background:var(--dsw-alias-bg-base);border-radius:5px;padding:0 5px}.sYJ4xq_routeBadge{color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.sYJ4xq_authoringBadge{color:var(--dsw-alias-state-business-primary)}.sYJ4xq_gateBadge[data-gate=pass]{color:var(--dsw-alias-state-success-primary)}.sYJ4xq_gateBadge[data-gate=fail]{color:var(--dsw-alias-state-error-primary)}.sYJ4xq_gateBadge[data-gate=pending]{color:var(--dsw-alias-state-warn-label)}.sYJ4xq_baselineAction{border-left:2px solid var(--dsw-alias-state-warn-label);background:var(--dsw-alias-bg-base);border-radius:5px;flex-direction:column;gap:1px;padding:4px 7px;font-size:10px;line-height:15px;display:flex}.sYJ4xq_baselineAction[data-baseline-action=new_session]{border-left-color:var(--dsw-alias-state-error-primary)}.sYJ4xq_baselineActionLabel{color:var(--dsw-alias-label-secondary);font-weight:510}.sYJ4xq_baselineAction[data-baseline-action=new_session] .sYJ4xq_baselineActionLabel{color:var(--dsw-alias-state-error-primary)}.sYJ4xq_baselineActionReason{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.sYJ4xq_profileBlock{border-left:2px solid var(--dsw-alias-state-error-primary);background:var(--dsw-alias-bg-base);border-radius:5px;flex-direction:column;gap:1px;padding:4px 7px;font-size:10px;line-height:15px;display:flex}.sYJ4xq_profileBlockLabel{color:var(--dsw-alias-state-error-primary);font-weight:510}.sYJ4xq_profileBlockReason{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.sYJ4xq_classicFoot{min-width:0;color:var(--dsw-alias-label-secondary);justify-content:space-between;font-size:10px;line-height:15px}.sYJ4xq_workflowName{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.sYJ4xq_fitBadge{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);border-radius:5px;flex:none;padding:0 5px}.sYJ4xq_fitBadge[data-fit-confidence=high]{color:var(--dsw-alias-state-success-primary)}.sYJ4xq_fitBadge[data-fit-confidence=low]{color:var(--dsw-alias-state-warn-label)}.sYJ4xq_warningCount{color:var(--dsw-alias-state-warn-label);cursor:help;flex:none}.sYJ4xq_decisionReason{border-top:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;-webkit-line-clamp:2;-webkit-box-orient:vertical;padding-top:5px;font-size:10px;line-height:15px;display:-webkit-box;overflow:hidden}.sYJ4xq_classicDetail{border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:10px;padding-top:8px;display:flex}.sYJ4xq_timeline{grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 8px;margin:0;padding:0;list-style:none;display:grid}.sYJ4xq_timelineStep{min-width:0;color:var(--dsw-alias-label-tertiary);align-items:center;gap:5px;font-size:10px;line-height:15px;display:flex}.sYJ4xq_timelineStep[data-step-status=active]{color:var(--dsw-alias-state-business-primary)}.sYJ4xq_timelineStep[data-step-status=failed]{color:var(--dsw-alias-state-error-primary)}.sYJ4xq_detailGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;display:grid}.sYJ4xq_detailSection{background:var(--dsw-alias-bg-base);min-width:0;color:var(--dsw-alias-label-tertiary);border-radius:8px;flex-direction:column;gap:3px;padding:8px;font-size:10px;line-height:15px;display:flex}.sYJ4xq_detailTitle{color:var(--dsw-alias-label-primary);font-weight:510}.sYJ4xq_detailReason,.sYJ4xq_detailPath{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.sYJ4xq_detailPath{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.sYJ4xq_detailNote,.sYJ4xq_detailError{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px}.sYJ4xq_detailError{color:var(--dsw-alias-state-error-primary)}.sYJ4xq_mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.sYJ4xq_checks{flex-wrap:wrap;gap:2px 8px;margin:0;padding:0;list-style:none;display:flex}.sYJ4xq_checks [data-check-passed=true]{color:var(--dsw-alias-state-success-primary)}.sYJ4xq_checks [data-check-passed=false]{color:var(--dsw-alias-state-error-primary)}.sYJ4xq_artifacts{color:var(--dsw-alias-label-tertiary);flex-direction:column;gap:2px;font-size:10px;line-height:15px;display:flex}.sYJ4xq_design{flex-direction:column;gap:6px;display:flex}.sYJ4xq_designMeta{flex-wrap:wrap;gap:4px;display:flex}.sYJ4xq_designMeta>span{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);border-radius:5px;padding:1px 5px;font-size:10px;line-height:15px}.sYJ4xq_requiredArgs{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px}.sYJ4xq_designDisclosure{background:var(--dsw-alias-bg-base);border-radius:8px}.sYJ4xq_designDisclosure>summary{color:var(--dsw-alias-label-secondary);cursor:pointer;padding:7px 8px;font-size:10px;line-height:15px}.sYJ4xq_designDisclosure>pre{border-top:1px solid var(--dsw-alias-border-l2);max-height:320px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word;margin:0;padding:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:9px;line-height:14px;overflow:auto}@media (width<=520px){.sYJ4xq_classicRows,.sYJ4xq_timeline,.sYJ4xq_detailGrid{grid-template-columns:1fr}}.sYJ4xq_rows{flex-direction:column;gap:8px;margin:0;padding:0;list-style:none;display:flex}.sYJ4xq_row{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:12px;flex-direction:column;gap:6px;padding:10px 12px;display:flex}.sYJ4xq_row[data-run-status=active]{border-color:var(--dsw-alias-state-business-primary)}.sYJ4xq_rowHead{width:100%;color:inherit;text-align:left;cursor:pointer;background:0 0;border:none;border-radius:8px;align-items:center;gap:8px;padding:2px;font-family:inherit;display:flex}.sYJ4xq_rowHead:hover{background:var(--dsw-alias-bg-hover-secondary)}.sYJ4xq_rowHead[aria-pressed=true]{background:var(--dsw-alias-bg-active-secondary)}.sYJ4xq_runId{max-width:45%;color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;flex:none;font-size:13px;font-weight:510;line-height:20px;overflow:hidden}.sYJ4xq_rowPath{min-width:0;color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;direction:rtl;flex:1;font-size:11px;line-height:16px;overflow:hidden}.sYJ4xq_runDetail{border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:4px;padding:4px 2px 2px;display:flex}.sYJ4xq_runHead{justify-content:space-between;align-items:center;gap:8px;display:flex}.sYJ4xq_workflowIdentity{min-width:0;color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:13px;font-weight:510;line-height:20px;overflow:hidden}.sYJ4xq_statusTail{height:20px;color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none;align-items:center;gap:4px;font-size:11px;font-weight:510;line-height:16px;display:inline-flex;overflow:hidden}.sYJ4xq_runMeta{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;gap:4px 12px;font-size:11px;line-height:16px;display:flex}.sYJ4xq_runError{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}.sYJ4xq_pipeline{gap:12px;margin:6px 0 2px;padding:2px 2px 8px;list-style:none;display:flex;overflow-x:auto}.sYJ4xq_pipelineNode{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);border-radius:9px;flex:1 0 150px;min-width:150px;padding:8px;position:relative}.sYJ4xq_pipelineNode:not(:last-child):after{background:var(--dsw-alias-border-l1);content:\"\";width:12px;height:1px;position:absolute;top:18px;right:-13px}.sYJ4xq_pipelineNode[data-phase-status=running]{border-color:var(--dsw-alias-state-business-primary)}.sYJ4xq_pipelineNode[data-phase-status=failed]{border-color:var(--dsw-alias-state-error-primary)}.sYJ4xq_pipelineNodeHead,.sYJ4xq_pipelineCall{align-items:center;gap:5px;min-width:0;display:flex}.sYJ4xq_pipelineNodeHead{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:510;line-height:18px}.sYJ4xq_pipelineNodeHead>span:last-child,.sYJ4xq_pipelineCall>span:last-child{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.sYJ4xq_pipelineCount{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px}.sYJ4xq_pipelineCalls{flex-direction:column;gap:3px;margin-top:6px;display:flex}.sYJ4xq_pipelineCall{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);border-radius:5px;padding:3px 5px;font-size:10px;line-height:15px}.sYJ4xq_pipelineCall[data-call-status=running]{color:var(--dsw-alias-state-business-primary)}.sYJ4xq_pipelineCall[data-call-status=failed]{color:var(--dsw-alias-state-error-primary)}.sYJ4xq_workflowResult{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);border-radius:10px;flex-direction:column;gap:8px;margin-top:4px;padding:10px;display:flex}.sYJ4xq_resultHead,.sYJ4xq_resultMetrics{flex-wrap:wrap;align-items:center;gap:6px 12px;display:flex}.sYJ4xq_resultHead{justify-content:space-between}.sYJ4xq_resultStage,.sYJ4xq_resultMetrics{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.sYJ4xq_resultMetrics [data-measurement=measured]{color:var(--dsw-alias-state-success-primary)}.sYJ4xq_resultMetrics [data-measurement=estimated]{color:var(--dsw-alias-state-warn-label)}.sYJ4xq_candidates{grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:6px;margin:0;padding:0;list-style:none;display:grid}.sYJ4xq_candidate{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);min-width:0;color:var(--dsw-alias-label-tertiary);border-radius:7px;flex-direction:column;gap:2px;padding:7px;font-size:10px;line-height:15px;display:flex}.sYJ4xq_candidate[data-selected=true]{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}.sYJ4xq_phaseSection{flex-direction:column;margin-top:4px;display:flex}.sYJ4xq_phaseHeader{box-sizing:border-box;background:var(--dsw-alias-bg-module-platform);border-radius:8px;align-items:center;gap:6px;width:100%;min-width:0;height:28px;padding:0 8px;display:flex}.sYJ4xq_dotSlot{flex:none;justify-content:center;align-items:center;width:16px;display:inline-flex}.sYJ4xq_phaseTitle{max-width:55%;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:none;font-size:13px;font-weight:510;line-height:22px;overflow:hidden}.sYJ4xq_phaseSummary{min-width:0;color:var(--dsw-alias-label-tertiary);text-align:right;text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:11px;line-height:16px;overflow:hidden}.sYJ4xq_callRow{align-items:center;gap:6px;min-height:24px;padding:0 0 0 8px;display:flex}.sYJ4xq_callLabel{min-width:0;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:12px;line-height:18px;overflow:hidden}.sYJ4xq_callMeta{color:var(--dsw-alias-label-tertiary);flex:none;align-items:center;gap:6px;font-size:11px;line-height:16px;display:inline-flex}.sYJ4xq_badge{border:1px solid var(--dsw-alias-border-l2);border-radius:4px;padding:0 4px}.sYJ4xq_callStatus{color:var(--dsw-alias-label-tertiary);flex:none;font-size:11px;font-weight:510;line-height:16px}.sYJ4xq_callRow[data-call-status=failed] .sYJ4xq_callStatus{color:var(--dsw-alias-state-error-primary)}";
		const tagId = "@deepseek-ai/dsh-client-ui-kersor-viewer/KersorView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-kersor-viewer";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var _dsh_css_64557083eb0f58b9_default = {
			"activeLabel": "sYJ4xq_activeLabel",
			"activeList": "sYJ4xq_activeList",
			"activeRow": "sYJ4xq_activeRow",
			"activeRunId": "sYJ4xq_activeRunId",
			"activitySection": "sYJ4xq_activitySection",
			"artifacts": "sYJ4xq_artifacts",
			"authoringBadge": "sYJ4xq_authoringBadge",
			"badge": "sYJ4xq_badge",
			"baselineAction": "sYJ4xq_baselineAction",
			"baselineActionLabel": "sYJ4xq_baselineActionLabel",
			"baselineActionReason": "sYJ4xq_baselineActionReason",
			"body": "sYJ4xq_body",
			"callLabel": "sYJ4xq_callLabel",
			"callMeta": "sYJ4xq_callMeta",
			"callRow": "sYJ4xq_callRow",
			"callStatus": "sYJ4xq_callStatus",
			"candidate": "sYJ4xq_candidate",
			"candidates": "sYJ4xq_candidates",
			"checks": "sYJ4xq_checks",
			"classicDetail": "sYJ4xq_classicDetail",
			"classicExpand": "sYJ4xq_classicExpand",
			"classicFoot": "sYJ4xq_classicFoot",
			"classicHead": "sYJ4xq_classicHead",
			"classicMetrics": "sYJ4xq_classicMetrics",
			"classicRow": "sYJ4xq_classicRow",
			"classicRows": "sYJ4xq_classicRows",
			"controlButton": "sYJ4xq_controlButton",
			"decisionReason": "sYJ4xq_decisionReason",
			"design": "sYJ4xq_design",
			"designDisclosure": "sYJ4xq_designDisclosure",
			"designMeta": "sYJ4xq_designMeta",
			"detailError": "sYJ4xq_detailError",
			"detailGrid": "sYJ4xq_detailGrid",
			"detailNote": "sYJ4xq_detailNote",
			"detailPath": "sYJ4xq_detailPath",
			"detailReason": "sYJ4xq_detailReason",
			"detailSection": "sYJ4xq_detailSection",
			"detailTitle": "sYJ4xq_detailTitle",
			"dotSlot": "sYJ4xq_dotSlot",
			"fitBadge": "sYJ4xq_fitBadge",
			"gateBadge": "sYJ4xq_gateBadge",
			"header": "sYJ4xq_header",
			"launcher": "sYJ4xq_launcher",
			"launcherHead": "sYJ4xq_launcherHead",
			"launcherSummary": "sYJ4xq_launcherSummary",
			"launcherTitle": "sYJ4xq_launcherTitle",
			"mono": "sYJ4xq_mono",
			"note": "sYJ4xq_note",
			"phaseBadge": "sYJ4xq_phaseBadge",
			"phaseHeader": "sYJ4xq_phaseHeader",
			"phaseSection": "sYJ4xq_phaseSection",
			"phaseSummary": "sYJ4xq_phaseSummary",
			"phaseTitle": "sYJ4xq_phaseTitle",
			"pipeline": "sYJ4xq_pipeline",
			"pipelineCall": "sYJ4xq_pipelineCall",
			"pipelineCalls": "sYJ4xq_pipelineCalls",
			"pipelineCount": "sYJ4xq_pipelineCount",
			"pipelineNode": "sYJ4xq_pipelineNode",
			"pipelineNodeHead": "sYJ4xq_pipelineNodeHead",
			"profileBlock": "sYJ4xq_profileBlock",
			"profileBlockLabel": "sYJ4xq_profileBlockLabel",
			"profileBlockReason": "sYJ4xq_profileBlockReason",
			"readError": "sYJ4xq_readError",
			"requiredArgs": "sYJ4xq_requiredArgs",
			"resultHead": "sYJ4xq_resultHead",
			"resultMetrics": "sYJ4xq_resultMetrics",
			"resultStage": "sYJ4xq_resultStage",
			"routeBadge": "sYJ4xq_routeBadge",
			"row": "sYJ4xq_row",
			"rowHead": "sYJ4xq_rowHead",
			"rowPath": "sYJ4xq_rowPath",
			"rows": "sYJ4xq_rows",
			"runDetail": "sYJ4xq_runDetail",
			"runError": "sYJ4xq_runError",
			"runHead": "sYJ4xq_runHead",
			"runId": "sYJ4xq_runId",
			"runMeta": "sYJ4xq_runMeta",
			"sectionHead": "sYJ4xq_sectionHead",
			"sectionSummary": "sYJ4xq_sectionSummary",
			"sectionTitle": "sYJ4xq_sectionTitle",
			"sessionId": "sYJ4xq_sessionId",
			"statusTail": "sYJ4xq_statusTail",
			"taskLabel": "sYJ4xq_taskLabel",
			"taskList": "sYJ4xq_taskList",
			"taskRow": "sYJ4xq_taskRow",
			"timeline": "sYJ4xq_timeline",
			"timelineStep": "sYJ4xq_timelineStep",
			"title": "sYJ4xq_title",
			"view": "sYJ4xq_view",
			"warningCount": "sYJ4xq_warningCount",
			"workflowIdentity": "sYJ4xq_workflowIdentity",
			"workflowName": "sYJ4xq_workflowName",
			"workflowResult": "sYJ4xq_workflowResult"
		};
		//#endregion
		//#region src/client/KersorView.tsx
		/** KerSor conversation view: Session inventory with live Workflow progress. */
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
				className: _dsh_css_64557083eb0f58b9_default.classicDetail,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
						className: _dsh_css_64557083eb0f58b9_default.timeline,
						"aria-label": t("detail.timeline"),
						children: detail.steps.map((step) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: _dsh_css_64557083eb0f58b9_default.timelineStep,
							"data-step-status": step.status,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: classicStepDotState(step.status) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(CLASSIC_STEP_KEYS[step.id]) })]
						}, step.id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_64557083eb0f58b9_default.detailGrid,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: _dsh_css_64557083eb0f58b9_default.detailSection,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_64557083eb0f58b9_default.detailTitle,
										children: t("detail.selection")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`detail.selection.${detail.selection.status}`) }),
									detail.selection.workflow !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_64557083eb0f58b9_default.mono,
										children: detail.selection.workflow
									}) : null,
									detail.selection.reason !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_64557083eb0f58b9_default.detailReason,
										children: detail.selection.reason
									}) : null,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("detail.rejected", { count: detail.selection.rejectedCount }) })
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: _dsh_css_64557083eb0f58b9_default.detailSection,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_64557083eb0f58b9_default.detailTitle,
										children: t("detail.authoring")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`detail.authoring.${detail.authoring.status}`) }),
									detail.authoring.omittedReason !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_64557083eb0f58b9_default.detailError,
										children: t("detail.omitted", { reason: detail.authoring.omittedReason })
									}) : null
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: _dsh_css_64557083eb0f58b9_default.detailSection,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_64557083eb0f58b9_default.detailTitle,
										children: t("detail.validation")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`detail.validation.${detail.validation.status}`) }),
									detail.validation.checks.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
										className: _dsh_css_64557083eb0f58b9_default.checks,
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
								className: _dsh_css_64557083eb0f58b9_default.detailSection,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_64557083eb0f58b9_default.detailTitle,
										children: t("detail.dispatch")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`detail.dispatch.${detail.dispatch.status}`) }),
									detail.dispatch.runtimeStatus !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_64557083eb0f58b9_default.mono,
										children: detail.dispatch.runtimeStatus
									}) : null,
									detail.dispatch.runDir !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_64557083eb0f58b9_default.detailPath,
										title: detail.dispatch.runDir,
										children: detail.dispatch.runDir
									}) : null
								]
							})
						]
					}),
					detail.authoring.files.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_64557083eb0f58b9_default.artifacts,
						children: detail.authoring.files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							title: file.sha256,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: _dsh_css_64557083eb0f58b9_default.mono,
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
						className: _dsh_css_64557083eb0f58b9_default.design,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_css_64557083eb0f58b9_default.designMeta,
								children: [
									design.name !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_64557083eb0f58b9_default.mono,
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
								className: _dsh_css_64557083eb0f58b9_default.requiredArgs,
								children: [
									t("detail.requiredArgs"),
									": ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_64557083eb0f58b9_default.mono,
										children: design.requiredArgs.join(", ")
									})
								]
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								className: _dsh_css_64557083eb0f58b9_default.designDisclosure,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: t("detail.rationale") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: design.rationale })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								className: _dsh_css_64557083eb0f58b9_default.designDisclosure,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: t("detail.source") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: design.source })]
							})
						]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_64557083eb0f58b9_default.detailNote,
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
				className: _dsh_css_64557083eb0f58b9_default.classicRow,
				"data-session-health": session.health,
				"data-session-lifecycle": session.lifecycle,
				"data-expanded": selected,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_64557083eb0f58b9_default.classicHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: classicDotState(session.health, session.lifecycle) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_64557083eb0f58b9_default.sessionId,
								title: session.session_dir,
								children: session.session_id
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_64557083eb0f58b9_default.phaseBadge,
								children: t(CLASSIC_HEALTH_KEYS[session.health])
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: _dsh_css_64557083eb0f58b9_default.classicExpand,
								"aria-expanded": selected,
								"aria-label": selected ? t("detail.collapse") : t("detail.expand"),
								onClick: onToggle,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_64557083eb0f58b9_default.classicMetrics,
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
								className: _dsh_css_64557083eb0f58b9_default.routeBadge,
								children: session.integration_pattern
							}) : null,
							session.allow_workflow_authoring === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_64557083eb0f58b9_default.authoringBadge,
								children: t("session.authoring", { budget: session.workflow_authoring_budget ?? "—" })
							}) : null,
							session.fresh_session != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_64557083eb0f58b9_default.gateBadge,
								"data-gate": session.fresh_session,
								children: t("session.freshGate", { status: t(GATE_KEYS[session.fresh_session]) })
							}) : null,
							session.allow_workflow_authoring === true && session.baseline_witness != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_64557083eb0f58b9_default.gateBadge,
								"data-gate": session.baseline_witness,
								children: t("session.baselineGate", { status: t(GATE_KEYS[session.baseline_witness]) })
							}) : null,
							session.allow_workflow_authoring === true && session.profile_evidence != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_64557083eb0f58b9_default.gateBadge,
								"data-gate": session.profile_evidence,
								children: t("session.profileGate", { status: t(GATE_KEYS[session.profile_evidence]) })
							}) : null,
							session.allow_workflow_authoring === true && session.profile_owner != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_64557083eb0f58b9_default.routeBadge,
								"data-profile-owner": session.profile_owner,
								children: t("session.profileOwner", { owner: session.profile_owner })
							}) : null,
							session.allow_workflow_authoring === true && session.dsh_compatibility != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_64557083eb0f58b9_default.gateBadge,
								"data-gate": session.dsh_compatibility,
								children: t("session.dshGate", { status: t(GATE_KEYS[session.dsh_compatibility]) })
							}) : null,
							session.allow_workflow_authoring === true && session.candidate_ownership != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_64557083eb0f58b9_default.gateBadge,
								"data-gate": session.candidate_ownership,
								children: t("session.ownershipGate", { status: t(GATE_KEYS[session.candidate_ownership]) })
							}) : null,
							activity !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("session.lastActivity", { time: activity }) }) : null
						]
					}),
					session.allow_workflow_authoring === true && session.baseline_next_action != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_64557083eb0f58b9_default.baselineAction,
						"data-baseline-action": session.baseline_next_action,
						title: session.baseline_reason ?? void 0,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_64557083eb0f58b9_default.baselineActionLabel,
							children: t(BASELINE_ACTION_KEYS[session.baseline_next_action])
						}), session.baseline_reason != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_64557083eb0f58b9_default.baselineActionReason,
							children: session.baseline_reason
						}) : null]
					}) : null,
					session.allow_workflow_authoring === true && session.profile_evidence === "fail" && session.profile_reason != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_64557083eb0f58b9_default.profileBlock,
						"data-profile-gate": "fail",
						title: session.profile_reason,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_64557083eb0f58b9_default.profileBlockLabel,
							children: t("session.profileBlocked")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_64557083eb0f58b9_default.profileBlockReason,
							children: session.profile_reason
						})]
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_64557083eb0f58b9_default.classicFoot,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_64557083eb0f58b9_default.workflowName,
								children: session.selection_status === "stalled" ? t("session.selectorStalled") : session.workflow !== null && session.workflow !== void 0 ? t("session.workflow", { workflow: session.workflow }) : t("session.noWorkflow")
							}),
							fitConfidence !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_64557083eb0f58b9_default.fitBadge,
								"data-fit-confidence": fitConfidence,
								children: t("session.fit", { confidence: fitConfidence })
							}) : null,
							session.warningCount > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_64557083eb0f58b9_default.warningCount,
								children: t("session.warnings", { count: session.warningCount })
							}) : null
						]
					}),
					session.decision !== null && session.decision !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_64557083eb0f58b9_default.decisionReason,
						title: session.decision,
						children: session.decision
					}) : null,
					selected && loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_64557083eb0f58b9_default.detailNote,
						children: t("detail.loading")
					}) : null,
					selected && error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_64557083eb0f58b9_default.detailError,
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
				className: _dsh_css_64557083eb0f58b9_default.callRow,
				"data-call-status": call.status,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: _dsh_css_64557083eb0f58b9_default.dotSlot,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: callDotState(call.status) })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: _dsh_css_64557083eb0f58b9_default.callLabel,
						title: call.callId,
						children: call.label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: _dsh_css_64557083eb0f58b9_default.callMeta,
						children: [
							call.kind === "evaluation" ? t("call.evaluation") : null,
							call.rolledBack ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_64557083eb0f58b9_default.badge,
								children: t("call.rolledBack")
							}) : null,
							duration !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: duration }) : null,
							call.tokens !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [call.tokens.toLocaleString(), " tk"] }) : null
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: _dsh_css_64557083eb0f58b9_default.callStatus,
						children: t(CALL_STATUS_KEYS[call.status])
					})
				]
			});
		}
		function PhaseSection({ phase, t }) {
			const title = phase.title.length > 0 ? phase.title : t("phase.empty");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_css_64557083eb0f58b9_default.phaseSection,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: _dsh_css_64557083eb0f58b9_default.phaseHeader,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_64557083eb0f58b9_default.dotSlot,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: phaseDotState(phase.status) })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_64557083eb0f58b9_default.phaseTitle,
							children: title
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_64557083eb0f58b9_default.phaseSummary,
							children: phase.calls.length
						})
					]
				}), phase.calls.map((call) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CallRow, {
					call,
					t
				}, call.callId))]
			});
		}
		function WorkflowPipeline({ view, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
				className: _dsh_css_64557083eb0f58b9_default.pipeline,
				"aria-label": t("run.pipeline"),
				children: view.phases.map((phase) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
					className: _dsh_css_64557083eb0f58b9_default.pipelineNode,
					"data-phase-status": phase.status,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: _dsh_css_64557083eb0f58b9_default.pipelineNodeHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: phaseDotState(phase.status) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: phase.title.length > 0 ? phase.title : t("phase.empty") })]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_64557083eb0f58b9_default.pipelineCount,
							children: t("run.calls", { calls: phase.calls.length })
						}),
						phase.calls.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: _dsh_css_64557083eb0f58b9_default.pipelineCalls,
							children: phase.calls.map((call) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: _dsh_css_64557083eb0f58b9_default.pipelineCall,
								"data-call-status": call.status,
								title: call.callId,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: callDotState(call.status) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: call.label })]
							}, call.callId))
						}) : null
					]
				}, `${phase.index}-${phase.title}`))
			});
		}
		function WorkflowResult({ result, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: _dsh_css_64557083eb0f58b9_default.workflowResult,
				"aria-label": t("run.result.title"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_64557083eb0f58b9_default.resultHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_64557083eb0f58b9_default.detailTitle,
							children: t("run.result.title")
						}), result.stage !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_64557083eb0f58b9_default.resultStage,
							children: t("run.result.stage", { stage: result.stage })
						}) : null]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_64557083eb0f58b9_default.resultMetrics,
						children: [
							result.selectedCandidateId !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("run.result.selected", { candidate: result.selectedCandidateId }) }) : null,
							result.expectedCycles !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("run.result.cycles", { cycles: result.expectedCycles.toLocaleString() }) }) : null,
							result.measuredSpeedup !== void 0 && result.measuredSpeedup !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"data-measurement": "measured",
								children: t("run.result.measured", { speedup: speedup(result.measuredSpeedup) })
							}) : result.estimatedSpeedup !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"data-measurement": "estimated",
								children: t("run.result.estimated", { speedup: speedup(result.estimatedSpeedup) })
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"data-measurement": "pending",
								children: t("run.result.unmeasured")
							})
						]
					}),
					result.candidates.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: _dsh_css_64557083eb0f58b9_default.candidates,
						children: result.candidates.map((candidate) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: _dsh_css_64557083eb0f58b9_default.candidate,
							"data-selected": candidate.id === result.selectedCandidateId,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: _dsh_css_64557083eb0f58b9_default.mono,
									children: candidate.id
								}),
								candidate.expectedCycles !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("run.result.cycles", { cycles: candidate.expectedCycles.toLocaleString() }) }) : null,
								candidate.id === result.selectedCandidateId ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("run.result.chosen") }) : null
							]
						}, candidate.id))
					}) : null
				]
			});
		}
		function workflowResultOf(view) {
			const nested = view.result;
			const candidates = view.candidates ?? nested?.candidates ?? [];
			const stage = view.candidateStage ?? nested?.stage;
			const selectedCandidateId = view.selectedCandidateId ?? nested?.selectedCandidateId;
			const expectedCycles = view.expectedCycles ?? nested?.expectedCycles;
			const estimatedSpeedup = view.estimatedSpeedup ?? nested?.estimatedSpeedup;
			const measuredSpeedup = view.measuredSpeedup ?? nested?.measuredSpeedup;
			if (stage === void 0 && selectedCandidateId === void 0 && expectedCycles === void 0 && estimatedSpeedup === void 0 && measuredSpeedup === void 0 && candidates.length === 0) return void 0;
			return {
				...stage === void 0 ? {} : { stage },
				...selectedCandidateId === void 0 ? {} : { selectedCandidateId },
				...expectedCycles === void 0 ? {} : { expectedCycles },
				...estimatedSpeedup === void 0 ? {} : { estimatedSpeedup },
				...measuredSpeedup === void 0 ? {} : { measuredSpeedup },
				candidates
			};
		}
		function RunDetail({ view, t }) {
			const result = workflowResultOf(view);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_css_64557083eb0f58b9_default.runDetail,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_64557083eb0f58b9_default.runHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_64557083eb0f58b9_default.workflowIdentity,
								title: view.scriptHash,
								children: view.workflow ?? view.runId
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _dsh_css_64557083eb0f58b9_default.runId,
								title: view.runDir,
								children: view.runId
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: _dsh_css_64557083eb0f58b9_default.statusTail,
								"data-status": view.status,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: runDotState(view.status) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(RUN_STATUS_KEYS[view.status]) })]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_64557083eb0f58b9_default.runMeta,
						children: [
							view.currentPhase.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("run.currentPhase", { phase: view.currentPhase }) }) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("run.calls", { calls: view.totals.calls }) }),
							view.totals.tokens > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("run.tokens", { tokens: view.totals.tokens.toLocaleString() }) }) : null
						]
					}),
					view.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_64557083eb0f58b9_default.runError,
						children: t("run.error", { message: view.error })
					}) : null,
					view.phases.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkflowPipeline, {
						view,
						t
					}) : null,
					result !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkflowResult, {
						result,
						t
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
				className: _dsh_css_64557083eb0f58b9_default.launcher,
				"aria-label": t("launcher.title"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_css_64557083eb0f58b9_default.launcherHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_64557083eb0f58b9_default.launcherTitle,
							children: t("launcher.title")
						}), launcher.active.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _dsh_css_64557083eb0f58b9_default.launcherSummary,
							children: t("launcher.running", { count: launcher.active.length })
						}) : null]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_css_64557083eb0f58b9_default.taskList,
						children: launcher.tasks.map((task) => {
							const key = `start:${task.id}`;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_css_64557083eb0f58b9_default.taskRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: _dsh_css_64557083eb0f58b9_default.taskLabel,
									children: task.label
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: _dsh_css_64557083eb0f58b9_default.controlButton,
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
						className: _dsh_css_64557083eb0f58b9_default.activeList,
						children: launcher.active.map((launch) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: _dsh_css_64557083eb0f58b9_default.activeRow,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "ongoing" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: _dsh_css_64557083eb0f58b9_default.activeLabel,
									title: launch.runDir,
									children: [labels.get(launch.taskId) ?? launch.taskId, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _dsh_css_64557083eb0f58b9_default.activeRunId,
										children: launch.runId
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: _dsh_css_64557083eb0f58b9_default.controlButton,
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
						className: _dsh_css_64557083eb0f58b9_default.readError,
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
		/** First-class KerSor view rendered beside Chat and Trajectory. */
		function KersorView({ t, store, refresh, loadRun, loadClassic, start, stop }) {
			const [busy, setBusy] = (0, react.useState)();
			const state = (0, react.useSyncExternalStore)(store.subscribe, store.getSnapshot);
			const rows = store.rows;
			const classicSessions = state.snapshot?.classic.sessions ?? [];
			const health = state.snapshot === void 0 ? void 0 : viewerHealth(state.snapshot);
			const view = store.activeView;
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			(0, react.useEffect)(() => {
				if (store.selectedRunDir !== void 0 || rows.length === 0) return;
				const preferredSession = classicSessions.find((session) => session.health === "active") ?? classicSessions[0];
				const target = (preferredSession === void 0 ? [] : rows.filter((row) => row.sessionDir === preferredSession.session_dir)).sort((left, right) => (right.round ?? 0) - (left.round ?? 0))[0] ?? rows.find((row) => row.discovery === "active") ?? rows[0];
				if (target === void 0) return;
				store.select(target.runDir);
				loadRun(target.runDir);
			}, [
				classicSessions,
				loadRun,
				rows,
				store
			]);
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: _dsh_css_64557083eb0f58b9_default.view,
				"data-conversation-composer-overlay": "",
				"aria-label": t("panel.title"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: _dsh_css_64557083eb0f58b9_default.header,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: _dsh_css_64557083eb0f58b9_default.title,
						children: t("panel.title")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: _dsh_css_64557083eb0f58b9_default.note,
						children: t("panel.hint")
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: _dsh_css_64557083eb0f58b9_default.body,
					children: [
						state.launcher !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LauncherControls, {
							launcher: state.launcher,
							busy,
							start: runStart,
							stop: runStop,
							t
						}) : null,
						state.transportError !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: _dsh_css_64557083eb0f58b9_default.readError,
							children: t("panel.readFailed", { message: state.transportError })
						}) : null,
						health !== void 0 && health.state !== "healthy" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: _dsh_css_64557083eb0f58b9_default.readError,
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
							className: _dsh_css_64557083eb0f58b9_default.note,
							children: t("panel.loading")
						}) : null,
						!state.loading && state.transportError === void 0 && health?.state === "healthy" && rows.length === 0 && classicSessions.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: _dsh_css_64557083eb0f58b9_default.note,
							children: t("panel.empty", { roots: health.roots })
						}) : null,
						classicSessions.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: _dsh_css_64557083eb0f58b9_default.activitySection,
							"aria-label": t("session.title"),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_css_64557083eb0f58b9_default.sectionHead,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: _dsh_css_64557083eb0f58b9_default.sectionTitle,
									children: t("session.title")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: _dsh_css_64557083eb0f58b9_default.sectionSummary,
									children: t("session.summary", {
										count: classicSessions.length,
										active: classicSessions.filter((session) => session.health === "active").length
									})
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: _dsh_css_64557083eb0f58b9_default.classicRows,
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
							className: _dsh_css_64557083eb0f58b9_default.activitySection,
							"aria-label": t("run.sectionTitle"),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_css_64557083eb0f58b9_default.sectionHead,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: _dsh_css_64557083eb0f58b9_default.sectionTitle,
									children: t("run.sectionTitle")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: _dsh_css_64557083eb0f58b9_default.sectionSummary,
									children: rows.length
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: _dsh_css_64557083eb0f58b9_default.rows,
								children: rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
									className: _dsh_css_64557083eb0f58b9_default.row,
									"data-run-status": row.discovery,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: _dsh_css_64557083eb0f58b9_default.rowHead,
										"aria-pressed": store.selectedRunDir === row.runDir,
										onClick: () => {
											const next = store.selectedRunDir === row.runDir ? void 0 : row.runDir;
											store.select(next);
											if (next !== void 0) loadRun(next);
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: row.discovery === "active" ? "ongoing" : row.discovery === "failed" ? "error" : "done" }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: _dsh_css_64557083eb0f58b9_default.runId,
												children: row.runId
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: _dsh_css_64557083eb0f58b9_default.rowPath,
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
					view: this.withInventoryResult(ref.runDir, this.state.views.get(ref.runDir))
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
				const loading = this.state.snapshot === void 0 && (snapshot.diagnostics.scan.state === "never" || snapshot.diagnostics.scan.state === "running");
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
				views.set(frame.run.runDir, this.withInventoryResult(frame.run.runDir, frame.run) ?? frame.run);
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
				views.set(runDir, this.withInventoryResult(runDir, view) ?? view);
				this.state = {
					...this.state,
					views,
					loading: false
				};
				this.emit();
			}
			/** Attach one separately loaded bounded Workflow result to its folded run view. */
			setRunResult(runDir, result) {
				if (result === void 0) return;
				const existing = this.state.views.get(runDir);
				if (existing === void 0) return;
				const views = new Map(this.state.views);
				views.set(runDir, {
					...existing,
					result,
					candidateStage: result.stage,
					selectedCandidateId: result.selectedCandidateId,
					expectedCycles: result.expectedCycles,
					estimatedSpeedup: result.estimatedSpeedup,
					measuredSpeedup: result.measuredSpeedup,
					candidates: result.candidates
				});
				this.state = {
					...this.state,
					views
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
			withInventoryResult(runDir, view) {
				if (view === void 0 || view.result !== void 0) return view;
				const result = this.state.snapshot?.runs.find((ref) => ref.runDir === runDir)?.result;
				return result === void 0 ? view : {
					...view,
					result,
					candidateStage: result.stage,
					selectedCandidateId: result.selectedCandidateId,
					expectedCycles: result.expectedCycles,
					estimatedSpeedup: result.estimatedSpeedup,
					measuredSpeedup: result.measuredSpeedup,
					candidates: result.candidates
				};
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
			"view.kersor": "KerSor",
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
			"session.profileGate": "Profile 证据：{status}",
			"session.profileOwner": "Profile 来源：{owner}",
			"session.profileBlocked": "Profile 阻塞",
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
			"run.sectionTitle": "Workflow 执行",
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
			"run.pipeline": "Workflow 执行图",
			"run.result.title": "候选选择",
			"run.result.stage": "阶段：{stage}",
			"run.result.selected": "已选择 {candidate}",
			"run.result.cycles": "{cycles} cycles",
			"run.result.measured": "{speedup}x 实测",
			"run.result.estimated": "{speedup}x 预估",
			"run.result.unmeasured": "尚未实测",
			"run.result.chosen": "已选择",
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
			"view.kersor": "KerSor",
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
			"session.profileGate": "Profile evidence: {status}",
			"session.profileOwner": "Profile owner: {owner}",
			"session.profileBlocked": "Profile blocked",
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
			"run.sectionTitle": "Workflow execution",
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
			"run.pipeline": "Workflow execution graph",
			"run.result.title": "Candidate selection",
			"run.result.stage": "Stage: {stage}",
			"run.result.selected": "Selected {candidate}",
			"run.result.cycles": "{cycles} cycles",
			"run.result.measured": "{speedup}x measured",
			"run.result.estimated": "{speedup}x estimated",
			"run.result.unmeasured": "Not measured yet",
			"run.result.chosen": "Selected",
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
			const loadRun = async (runDir) => {
				try {
					const remote = viewerRemote();
					const [backlog, result] = await Promise.all([remote.runBacklog(runDir), remote.runResult(runDir)]);
					if (!backlog.ok) {
						store.setTransportError(`${backlog.error.code}: ${backlog.error.message}`);
						return;
					}
					if (!result.ok) {
						store.setTransportError(`${result.error.code}: ${result.error.message}`);
						return;
					}
					store.setBacklog(runDir, backlog.value);
					store.setRunResult(runDir, result.value);
				} catch (error) {
					store.setTransportError(error instanceof Error ? error.message : String(error));
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
				loadRun,
				loadClassic,
				start,
				stop
			};
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "kersor",
				order: 20,
				locale: NS,
				label: () => t("view.kersor"),
				inject: () => face
			}, KersorView));
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