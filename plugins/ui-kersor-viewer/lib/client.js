window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-kersor-viewer",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region \0dsh-css:/Users/haiyan-infiniai/tools/deepseek-harness/packages/extensions/ui-kersor-viewer/src/client/KersorPanel.module.css.mjs
		const css = ".FSQJCq_layer{flex:none;align-items:center;width:100%;height:49px;margin:8px 0 0;display:flex;position:relative}.FSQJCq_trigger{width:100%;height:49px;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border:none;border-radius:12px;align-items:center;gap:8px;padding:0 8px 0 6px;font-family:inherit;font-size:13px;display:flex}.FSQJCq_trigger:hover{background:var(--dsw-alias-bg-hover-secondary)}.FSQJCq_trigger[aria-expanded=true]{background:var(--dsw-alias-bg-active-secondary)}.FSQJCq_triggerIcon{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);flex:none;justify-content:center;align-items:center;display:inline-flex}.FSQJCq_triggerLabel{text-align:left;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.FSQJCq_triggerBadge{flex:none;align-items:center;display:inline-flex}.FSQJCq_panel{z-index:30;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);width:460px;max-width:calc(100vw - 24px);max-height:60vh;box-shadow:var(--dsw-shadow-lv2);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:12px;flex-direction:column;display:flex;position:fixed;bottom:128px;left:12px;overflow:hidden}.FSQJCq_header{box-sizing:border-box;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);flex:none;justify-content:space-between;align-items:center;gap:8px;min-height:44px;padding:10px 12px;display:flex}.FSQJCq_title{color:var(--dsw-alias-label-primary);flex:none;font-size:13px;font-weight:500;line-height:20px}.FSQJCq_note,.FSQJCq_readError{color:var(--dsw-alias-label-tertiary);margin:4px 0;font-size:12px;line-height:18px}.FSQJCq_note{text-align:right;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.FSQJCq_readError{color:var(--dsw-alias-state-error-primary)}.FSQJCq_body{flex:1;min-height:0;padding:4px 12px 12px;overflow-y:auto}.FSQJCq_launcher{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);border-radius:12px;flex-direction:column;gap:8px;margin:4px 0 10px;padding:10px 12px;display:flex}.FSQJCq_launcherHead,.FSQJCq_taskRow,.FSQJCq_activeRow{align-items:center;gap:8px;display:flex}.FSQJCq_launcherHead{justify-content:space-between}.FSQJCq_launcherTitle,.FSQJCq_taskLabel{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:510;line-height:18px}.FSQJCq_launcherSummary,.FSQJCq_activeRunId{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.FSQJCq_taskList,.FSQJCq_activeList{flex-direction:column;gap:4px;display:flex}.FSQJCq_taskRow,.FSQJCq_activeRow{min-height:28px}.FSQJCq_taskLabel,.FSQJCq_activeLabel{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.FSQJCq_activeLabel{color:var(--dsw-alias-label-secondary);flex-direction:column;font-size:12px;line-height:16px;display:flex}.FSQJCq_activeRunId{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.FSQJCq_controlButton{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);min-width:52px;height:26px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:7px;flex:none;padding:0 10px;font-family:inherit;font-size:11px}.FSQJCq_controlButton:hover:not(:disabled){background:var(--dsw-alias-bg-hover-secondary)}.FSQJCq_controlButton:disabled{cursor:default;opacity:.55}.FSQJCq_controlButton[data-busy=true]{color:var(--dsw-alias-state-business-primary)}.FSQJCq_rows{flex-direction:column;gap:8px;margin:0;padding:0;list-style:none;display:flex}.FSQJCq_row{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:12px;flex-direction:column;gap:6px;padding:10px 12px;display:flex}.FSQJCq_row[data-run-status=active]{border-color:var(--dsw-alias-state-business-primary)}.FSQJCq_rowHead{width:100%;color:inherit;text-align:left;cursor:pointer;background:0 0;border:none;border-radius:8px;align-items:center;gap:8px;padding:2px;font-family:inherit;display:flex}.FSQJCq_rowHead:hover{background:var(--dsw-alias-bg-hover-secondary)}.FSQJCq_rowHead[aria-pressed=true]{background:var(--dsw-alias-bg-active-secondary)}.FSQJCq_runId{max-width:45%;color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;flex:none;font-size:13px;font-weight:510;line-height:20px;overflow:hidden}.FSQJCq_rowPath{min-width:0;color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;direction:rtl;flex:1;font-size:11px;line-height:16px;overflow:hidden}.FSQJCq_runDetail{border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:4px;padding:4px 2px 2px;display:flex}.FSQJCq_runHead{justify-content:space-between;align-items:center;gap:8px;display:flex}.FSQJCq_statusTail{height:20px;color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none;align-items:center;gap:4px;font-size:11px;font-weight:510;line-height:16px;display:inline-flex;overflow:hidden}.FSQJCq_runMeta{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;gap:4px 12px;font-size:11px;line-height:16px;display:flex}.FSQJCq_runError{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}.FSQJCq_phaseSection{flex-direction:column;margin-top:4px;display:flex}.FSQJCq_phaseHeader{box-sizing:border-box;background:var(--dsw-alias-bg-module-platform);border-radius:8px;align-items:center;gap:6px;width:100%;min-width:0;height:28px;padding:0 8px;display:flex}.FSQJCq_dotSlot{flex:none;justify-content:center;align-items:center;width:16px;display:inline-flex}.FSQJCq_phaseTitle{max-width:55%;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:none;font-size:13px;font-weight:510;line-height:22px;overflow:hidden}.FSQJCq_phaseSummary{min-width:0;color:var(--dsw-alias-label-tertiary);text-align:right;text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:11px;line-height:16px;overflow:hidden}.FSQJCq_callRow{align-items:center;gap:6px;min-height:24px;padding:0 0 0 8px;display:flex}.FSQJCq_callLabel{min-width:0;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:12px;line-height:18px;overflow:hidden}.FSQJCq_callMeta{color:var(--dsw-alias-label-tertiary);flex:none;align-items:center;gap:6px;font-size:11px;line-height:16px;display:inline-flex}.FSQJCq_badge{border:1px solid var(--dsw-alias-border-l2);border-radius:4px;padding:0 4px}.FSQJCq_callStatus{color:var(--dsw-alias-label-tertiary);flex:none;font-size:11px;font-weight:510;line-height:16px}.FSQJCq_callRow[data-call-status=failed] .FSQJCq_callStatus{color:var(--dsw-alias-state-error-primary)}";
		const tagId = "@deepseek-ai/dsh-client-ui-kersor-viewer/KersorPanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-kersor-viewer";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var KersorPanel_module_css_default = {
			"title": "FSQJCq_title",
			"phaseTitle": "FSQJCq_phaseTitle",
			"controlButton": "FSQJCq_controlButton",
			"callLabel": "FSQJCq_callLabel",
			"launcherHead": "FSQJCq_launcherHead",
			"activeRow": "FSQJCq_activeRow",
			"activeList": "FSQJCq_activeList",
			"taskLabel": "FSQJCq_taskLabel",
			"row": "FSQJCq_row",
			"statusTail": "FSQJCq_statusTail",
			"phaseSection": "FSQJCq_phaseSection",
			"launcherTitle": "FSQJCq_launcherTitle",
			"readError": "FSQJCq_readError",
			"runMeta": "FSQJCq_runMeta",
			"triggerIcon": "FSQJCq_triggerIcon",
			"phaseHeader": "FSQJCq_phaseHeader",
			"phaseSummary": "FSQJCq_phaseSummary",
			"runError": "FSQJCq_runError",
			"rows": "FSQJCq_rows",
			"layer": "FSQJCq_layer",
			"header": "FSQJCq_header",
			"launcher": "FSQJCq_launcher",
			"taskRow": "FSQJCq_taskRow",
			"rowPath": "FSQJCq_rowPath",
			"panel": "FSQJCq_panel",
			"badge": "FSQJCq_badge",
			"triggerBadge": "FSQJCq_triggerBadge",
			"callMeta": "FSQJCq_callMeta",
			"callStatus": "FSQJCq_callStatus",
			"triggerLabel": "FSQJCq_triggerLabel",
			"rowHead": "FSQJCq_rowHead",
			"callRow": "FSQJCq_callRow",
			"dotSlot": "FSQJCq_dotSlot",
			"activeLabel": "FSQJCq_activeLabel",
			"trigger": "FSQJCq_trigger",
			"taskList": "FSQJCq_taskList",
			"launcherSummary": "FSQJCq_launcherSummary",
			"runHead": "FSQJCq_runHead",
			"runDetail": "FSQJCq_runDetail",
			"body": "FSQJCq_body",
			"activeRunId": "FSQJCq_activeRunId",
			"note": "FSQJCq_note",
			"runId": "FSQJCq_runId"
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
				className: KersorPanel_module_css_default.callRow,
				"data-call-status": call.status,
				children: [
					(0, react_jsx_runtime.jsx)("span", {
						className: KersorPanel_module_css_default.dotSlot,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: callDotState(call.status) })
					}),
					(0, react_jsx_runtime.jsx)("span", {
						className: KersorPanel_module_css_default.callLabel,
						title: call.callId,
						children: call.label
					}),
					(0, react_jsx_runtime.jsxs)("span", {
						className: KersorPanel_module_css_default.callMeta,
						children: [
							call.kind === "evaluation" ? t("call.evaluation") : null,
							call.rolledBack ? (0, react_jsx_runtime.jsx)("span", {
								className: KersorPanel_module_css_default.badge,
								children: t("call.rolledBack")
							}) : null,
							duration !== void 0 ? (0, react_jsx_runtime.jsx)("span", { children: duration }) : null,
							call.tokens !== void 0 ? (0, react_jsx_runtime.jsxs)("span", { children: [call.tokens.toLocaleString(), " tk"] }) : null
						]
					}),
					(0, react_jsx_runtime.jsx)("span", {
						className: KersorPanel_module_css_default.callStatus,
						children: t(CALL_STATUS_KEYS[call.status])
					})
				]
			});
		}
		function PhaseSection({ phase, t }) {
			const title = phase.title.length > 0 ? phase.title : t("phase.empty");
			return (0, react_jsx_runtime.jsxs)("div", {
				className: KersorPanel_module_css_default.phaseSection,
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: KersorPanel_module_css_default.phaseHeader,
					children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: KersorPanel_module_css_default.dotSlot,
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: phaseDotState(phase.status) })
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: KersorPanel_module_css_default.phaseTitle,
							children: title
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: KersorPanel_module_css_default.phaseSummary,
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
				className: KersorPanel_module_css_default.runDetail,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: KersorPanel_module_css_default.runHead,
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: KersorPanel_module_css_default.runId,
							title: view.runDir,
							children: view.runId
						}), (0, react_jsx_runtime.jsxs)("span", {
							className: KersorPanel_module_css_default.statusTail,
							"data-status": view.status,
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: runDotState(view.status) }), (0, react_jsx_runtime.jsx)("span", { children: t(RUN_STATUS_KEYS[view.status]) })]
						})]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: KersorPanel_module_css_default.runMeta,
						children: [
							view.currentPhase.length > 0 ? (0, react_jsx_runtime.jsx)("span", { children: t("run.currentPhase", { phase: view.currentPhase }) }) : null,
							(0, react_jsx_runtime.jsx)("span", { children: t("run.calls", { calls: view.totals.calls }) }),
							view.totals.tokens > 0 ? (0, react_jsx_runtime.jsx)("span", { children: t("run.tokens", { tokens: view.totals.tokens.toLocaleString() }) }) : null
						]
					}),
					view.error !== void 0 ? (0, react_jsx_runtime.jsx)("div", {
						className: KersorPanel_module_css_default.runError,
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
				className: KersorPanel_module_css_default.launcher,
				"aria-label": t("launcher.title"),
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: KersorPanel_module_css_default.launcherHead,
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: KersorPanel_module_css_default.launcherTitle,
							children: t("launcher.title")
						}), launcher.active.length > 0 ? (0, react_jsx_runtime.jsx)("span", {
							className: KersorPanel_module_css_default.launcherSummary,
							children: t("launcher.running", { count: launcher.active.length })
						}) : null]
					}),
					(0, react_jsx_runtime.jsx)("div", {
						className: KersorPanel_module_css_default.taskList,
						children: launcher.tasks.map((task) => {
							const key = `start:${task.id}`;
							return (0, react_jsx_runtime.jsxs)("div", {
								className: KersorPanel_module_css_default.taskRow,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: KersorPanel_module_css_default.taskLabel,
									children: task.label
								}), (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: KersorPanel_module_css_default.controlButton,
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
						className: KersorPanel_module_css_default.activeList,
						children: launcher.active.map((launch) => (0, react_jsx_runtime.jsxs)("div", {
							className: KersorPanel_module_css_default.activeRow,
							children: [
								(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "ongoing" }),
								(0, react_jsx_runtime.jsxs)("span", {
									className: KersorPanel_module_css_default.activeLabel,
									title: launch.runDir,
									children: [labels.get(launch.taskId) ?? launch.taskId, (0, react_jsx_runtime.jsx)("span", {
										className: KersorPanel_module_css_default.activeRunId,
										children: launch.runId
									})]
								}),
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: KersorPanel_module_css_default.controlButton,
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
						className: KersorPanel_module_css_default.readError,
						children: t("launcher.error", { message: launcher.error })
					}) : null
				]
			});
		}
		/** Sidebar footer panel: trigger row plus the fixed inventory popup. */
		function KersorPanel({ t, store, refresh, start, stop }) {
			const [open, setOpen] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)();
			const state = (0, react.useSyncExternalStore)(store.subscribe, store.getSnapshot);
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
				className: KersorPanel_module_css_default.layer,
				children: [(0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: KersorPanel_module_css_default.trigger,
					"aria-expanded": open,
					"aria-label": t("panel.trigger"),
					onClick: () => {
						setOpen(!open);
						if (!open) refresh();
					},
					children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: KersorPanel_module_css_default.triggerIcon,
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: KersorPanel_module_css_default.triggerLabel,
							children: t("panel.trigger")
						}),
						state.rows.some((row) => row.discovery === "active") ? (0, react_jsx_runtime.jsx)("span", {
							className: KersorPanel_module_css_default.triggerBadge,
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "ongoing" })
						}) : null
					]
				}), open ? (0, react_jsx_runtime.jsxs)("div", {
					className: KersorPanel_module_css_default.panel,
					role: "dialog",
					"aria-label": t("panel.title"),
					children: [(0, react_jsx_runtime.jsxs)("div", {
						className: KersorPanel_module_css_default.header,
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: KersorPanel_module_css_default.title,
							children: t("panel.title")
						}), (0, react_jsx_runtime.jsx)("span", {
							className: KersorPanel_module_css_default.note,
							children: t("panel.hint")
						})]
					}), (0, react_jsx_runtime.jsxs)("div", {
						className: KersorPanel_module_css_default.body,
						children: [
							state.launcher !== void 0 ? (0, react_jsx_runtime.jsx)(LauncherControls, {
								launcher: state.launcher,
								busy,
								start: runStart,
								stop: runStop,
								t
							}) : null,
							state.error !== void 0 ? (0, react_jsx_runtime.jsx)("div", {
								className: KersorPanel_module_css_default.readError,
								children: t("panel.readFailed", { message: state.error })
							}) : null,
							state.loading ? (0, react_jsx_runtime.jsx)("div", {
								className: KersorPanel_module_css_default.note,
								children: t("panel.loading")
							}) : null,
							!state.loading && state.rows.length === 0 ? (0, react_jsx_runtime.jsx)("div", {
								className: KersorPanel_module_css_default.note,
								children: t("panel.empty")
							}) : null,
							state.rows.length > 0 ? (0, react_jsx_runtime.jsx)("ul", {
								className: KersorPanel_module_css_default.rows,
								children: state.rows.map((row) => (0, react_jsx_runtime.jsxs)("li", {
									className: KersorPanel_module_css_default.row,
									"data-run-status": row.discovery,
									children: [(0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: KersorPanel_module_css_default.rowHead,
										"aria-pressed": store.selectedRunDir === row.runDir,
										onClick: () => {
											store.select(store.selectedRunDir === row.runDir ? void 0 : row.runDir);
										},
										children: [
											(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: row.discovery === "active" ? "ongoing" : row.discovery === "failed" ? "error" : "done" }),
											(0, react_jsx_runtime.jsx)("span", {
												className: KersorPanel_module_css_default.runId,
												children: row.runId
											}),
											(0, react_jsx_runtime.jsx)("span", {
												className: KersorPanel_module_css_default.rowPath,
												title: row.runDir,
												children: row.sessionDir
											})
										]
									}), store.selectedRunDir === row.runDir && row.view !== void 0 ? (0, react_jsx_runtime.jsx)(RunDetail, {
										view: row.view,
										t
									}) : null]
								}, row.runDir))
							}) : null,
							state.rows.length > 0 && view !== void 0 && !state.rows.some((row) => row.runDir === store.selectedRunDir) ? (0, react_jsx_runtime.jsx)(RunDetail, {
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
		* Browser-side viewer store: run inventory plus folded run views, fed by the
		* forwarded `kersor/event` Host frames and the `listRuns`/`runBacklog`
		* remotes. A useSyncExternalStore-compatible snapshot observable.
		* @module @deepseek-ai/dsh-client-ui-kersor-viewer/client
		*/
		/** Snapshot store over the run inventory and per-run folded views. */
		var KersorViewerStore = class {
			state = {
				rows: [],
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
			/** Currently selected run directory (panel-local choice). */
			get selectedRunDir() {
				return this.selected;
			}
			/** Select a run for the detail view; persists across inventory frames. */
			select(runDir) {
				this.selected = runDir;
				this.emit();
			}
			/** The selected run's folded view, falling back to the best active run. */
			get activeView() {
				const row = (this.selected !== void 0 ? this.state.rows.find((row) => row.runDir === this.selected) : void 0) ?? this.state.rows.find((candidate) => candidate.discovery === "active") ?? this.state.rows[0];
				return row?.view ?? (row !== void 0 ? emptyViewOf(row) : void 0);
			}
			/** Replace the inventory half from a `listRuns` remote answer. */
			setInventory(refs) {
				const byDir = new Map(this.state.rows.map((row) => [row.runDir, row]));
				const rows = refs.map((ref) => ({
					...ref,
					view: byDir.get(ref.runDir)?.view
				}));
				this.state = {
					...this.state,
					rows,
					loading: false
				};
				this.emit();
			}
			/** Mark a failed inventory read. */
			setError(message) {
				this.state = {
					...this.state,
					loading: false,
					error: message
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
				if (frame.kind === "runs") {
					this.setInventory(frame.runs);
					return;
				}
				const rows = this.state.rows.some((row) => row.runDir === frame.run.runDir) ? this.state.rows.map((row) => row.runDir === frame.run.runDir ? {
					...row,
					view: frame.run
				} : row) : [...this.state.rows, {
					...refOf(frame.run),
					view: frame.run
				}];
				this.state = {
					...this.state,
					rows,
					loading: false
				};
				this.emit();
			}
			/** Store the backlog answer of `runBacklog` (panel open / reconnect). */
			setBacklog(runDir, view) {
				if (view === void 0) return;
				const rows = this.state.rows.some((row) => row.runDir === runDir) ? this.state.rows.map((row) => row.runDir === runDir ? {
					...row,
					view
				} : row) : [...this.state.rows, {
					...refOf(view),
					view
				}];
				this.state = {
					...this.state,
					rows,
					loading: false
				};
				this.emit();
			}
			/** Drop everything (connection reset). */
			reset() {
				this.state = {
					rows: [],
					loading: true
				};
				this.selected = void 0;
				this.emit();
			}
			emit() {
				for (const listener of this.listeners) listener();
			}
		};
		function refOf(view) {
			return {
				runId: view.runId,
				runDir: view.runDir,
				sessionDir: view.sessionDir,
				root: "",
				discovery: view.status === "running" ? "active" : view.status === "failed" ? "failed" : "completed",
				view
			};
		}
		function emptyViewOf(row) {
			return {
				runId: row.runId,
				runDir: row.runDir,
				sessionDir: row.sessionDir,
				status: row.discovery === "active" ? "running" : row.discovery,
				currentPhase: "",
				phases: [],
				totals: {
					calls: 0,
					completed: 0,
					failed: 0,
					tokens: 0
				}
			};
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** KerSor viewer UI dictionaries. */
		const NS = "kersorViewer";
		/** Simplified Chinese KerSor viewer messages. */
		const zh = {
			"panel.trigger": "KerSor 运行",
			"panel.title": "KerSor Workflow 运行",
			"panel.empty": "没有发现任何 KerSor 运行",
			"panel.loading": "读取中…",
			"panel.readFailed": "读取运行清单失败：{message}",
			"panel.hint": "在左侧栏底部查看 KerSor workflow 的实时进度",
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
			"panel.trigger": "KerSor runs",
			"panel.title": "KerSor Workflow runs",
			"panel.empty": "No KerSor runs discovered",
			"panel.loading": "Loading…",
			"panel.readFailed": "Reading the run inventory failed: {message}",
			"panel.hint": "Live KerSor workflow progress in the left sidebar footer",
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
		* KerSor viewer browser half: sidebar run-inventory panel fed by the forwarded
		* `kersor/event` Host frames and the `kersorViewer` remote namespace.
		* @module @deepseek-ai/dsh-client-ui-kersor-viewer/client
		*/
		/** Required services: slot registry, locale, and the assembled KerSor remotes. */
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.kersor",
			"remote.kersorViewer"
		];
		/** Mount the KerSor viewer surfaces over the Host inventory and event stream. */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "kersor-viewer: dictionaries");
			const store = new KersorViewerStore();
			const refreshViewer = async () => {
				try {
					const answered = await ctx.remote.kersorViewer.listRuns();
					if (!answered.ok) {
						store.setError(`${answered.error.code}: ${answered.error.message}`);
						return;
					}
					store.setInventory(answered.value);
					const selected = store.selectedRunDir;
					if (selected !== void 0) {
						const backlog = await ctx.remote.kersorViewer.runBacklog(selected);
						if (backlog.ok) store.setBacklog(selected, backlog.value);
					}
				} catch (error) {
					store.setError(error instanceof Error ? error.message : String(error));
				}
			};
			const refreshLauncher = async () => {
				try {
					const [tasks, active] = await Promise.all([ctx.remote.kersor.listTasks(), ctx.remote.kersor.listActive()]);
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
					const answered = await ctx.remote.kersor.start(taskId);
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
					const answered = await ctx.remote.kersor.stop(runDir);
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
			ctx.remote.$on("kersor/event", (frame) => {
				store.applyFrame(frame);
			});
			ctx.remote.$on("kersor/active", (frame) => {
				store.applyActiveFrame(frame);
			});
			ctx.on("connection/reset", () => {
				store.reset();
				refresh();
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