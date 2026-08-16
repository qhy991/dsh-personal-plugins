/** KerSor viewer UI dictionaries. */
export declare const NS = "kersorViewer";
/** Simplified Chinese KerSor viewer messages. */
export declare const zh: {
    readonly 'panel.trigger': "KerSor 运行";
    readonly 'panel.title': "KerSor Workflow 运行";
    readonly 'panel.empty': "没有发现任何 KerSor 运行";
    readonly 'panel.loading': "读取中…";
    readonly 'panel.readFailed': "读取运行清单失败：{message}";
    readonly 'panel.hint': "在左侧栏底部查看 KerSor workflow 的实时进度";
    readonly 'launcher.title': "任务控制";
    readonly 'launcher.start': "启动";
    readonly 'launcher.stop': "停止";
    readonly 'launcher.running': "dsh 正在托管 {count} 个启动进程";
    readonly 'launcher.error': "任务控制失败：{message}";
    readonly 'run.active': "运行中";
    readonly 'run.completed': "已完成";
    readonly 'run.failed': "已失败";
    readonly 'run.unknown': "未知";
    readonly 'run.currentPhase': "当前阶段：{phase}";
    readonly 'run.calls': "{calls} 个调用";
    readonly 'run.tokens': "{tokens} tokens";
    readonly 'run.startedAt': "开始于 {time}";
    readonly 'run.error': "错误：{message}";
    readonly 'phase.empty': "（无事件）";
    readonly 'call.queued': "排队中";
    readonly 'call.running': "运行中";
    readonly 'call.completed': "已完成";
    readonly 'call.failed': "已失败";
    readonly 'call.rolledBack': "已回滚";
    readonly 'call.evaluation': "评测";
    readonly 'call.agent': "代理";
    readonly 'call.duration': "{seconds}";
};
/** English KerSor viewer messages. */
export declare const en: {
    readonly 'panel.trigger': "KerSor runs";
    readonly 'panel.title': "KerSor Workflow runs";
    readonly 'panel.empty': "No KerSor runs discovered";
    readonly 'panel.loading': "Loading…";
    readonly 'panel.readFailed': "Reading the run inventory failed: {message}";
    readonly 'panel.hint': "Live KerSor workflow progress in the left sidebar footer";
    readonly 'launcher.title': "Task controls";
    readonly 'launcher.start': "Start";
    readonly 'launcher.stop': "Stop";
    readonly 'launcher.running': "dsh owns {count} launcher process(es)";
    readonly 'launcher.error': "Task control failed: {message}";
    readonly 'run.active': "Running";
    readonly 'run.completed': "Completed";
    readonly 'run.failed': "Failed";
    readonly 'run.unknown': "Unknown";
    readonly 'run.currentPhase': "Current phase: {phase}";
    readonly 'run.calls': "{calls} calls";
    readonly 'run.tokens': "{tokens} tokens";
    readonly 'run.startedAt': "Started {time}";
    readonly 'run.error': "Error: {message}";
    readonly 'phase.empty': "(no events)";
    readonly 'call.queued': "Queued";
    readonly 'call.running': "Running";
    readonly 'call.completed': "Completed";
    readonly 'call.failed': "Failed";
    readonly 'call.rolledBack': "rolled back";
    readonly 'call.evaluation': "evaluation";
    readonly 'call.agent': "agent";
    readonly 'call.duration': "{seconds}";
};
export type KersorViewerKey = keyof typeof zh;
//# sourceMappingURL=locales.d.ts.map