# @deepseek-ai/dsh-client-ui-kersor-viewer

[English](README.md) | 中文

KerSor autonomous-workflow 界面，browser 半：一个侧栏面板，列出 host 包 [`@deepseek-ai/dsh-kersor-viewer`](../kersor-viewer/README.md) 发现的 run，并渲染选中 run 的实时阶段/调用进度，视觉沿用 workflow-run 进度卡。

加载可选 Host 启动器 [`@deepseek-ai/dsh-kersor`](../kersor/README.zh.md) 后，同一面板还会列出部署配置中的任务和 dsh 当前持有的 launcher 进程，并提供启动／停止操作。launcher namespace 不可用时，控制区不出现，只读 viewer 的行为与此前完全一致。

**一个 store，两条来源。** 面板数据存在一个 `useSyncExternalStore` observable 里，双向供给：面板打开或重连时通过 `kersorViewer/listRuns` remote 拉取 run 清单；页面打开期间由转发的 `kersor/event` Host 事件推送清单变化与折叠后的 run 视图更新。阶段渲染为带共享状态点（running 蓝、completed 绿、failed 红）的折叠行，其下的 agent/evaluation 调用行带状态、耗时、tokens 与回滚标记；循环重访的 phase 按执行顺序各占一个桶，KSearch 循环读起来就是独立的多轮。

**node 半为空。** 所有运行时行为在 `src/client/` 中，经 `./client` 导出为浏览器 bundle；包的 node 侧 `apply` 只为让同名包进入浏览器 roster。发现、tail 与折叠属于 host 包；本包渲染它们的结果。

**两套状态记账保持分离。** Launcher 帧只替换 dsh 持有的进程树清单；viewer 帧替换或折叠 KerSor run 状态。进程从清单消失不会把 workflow 标成完成；该状态由 KerSor summary 与事件决定。

## Model Experience

间接：本包不产生任何 prompt 输入，面板只调用已登记任务 remote 并读取 remote 与转发事件，不写 dsh session 事件。运行中的 KerSor workflow 自身的 model-visible 效果属于 KerSor 进程，不属于 dsh。

#### KV Cache effect

无：本包不产生任何 prompt 输入。

## Known Limitations and Deferred Work

- **一个标签页选中的 run 不会同步到另一个** —— 选择是页面内组件状态，刻意如此：浏览行为不改写任何 host 状态。
- **backlog 只在选择时拉取，之后只靠事件更新** —— 运行中途打开的页面收到一次 host 折叠的 backlog，之后是实时帧；漏帧（短暂断连）通过重新选择该 run 拉取 backlog 恢复。断连自动重拉顺延。
- **控制区不编辑启动配置** —— 任务路径、runtime config、凭据与环境仍是 Host 部署配置；浏览器只发送已登记 task id 或一条受管 run 的精确目录。
