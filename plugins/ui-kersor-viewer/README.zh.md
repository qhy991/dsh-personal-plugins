# @deepseek-ai/dsh-client-ui-kersor-viewer

[English](README.md) | 中文

KerSor 活动界面的 browser 半：同一个侧栏面板先展示 host 包 [`@deepseek-ai/dsh-kersor-viewer`](../kersor-viewer/README.md) 提供的最近经典／Session-v2 优化摘要，再列出 autonomous-workflow run，并渲染选中 run 的实时阶段／调用进度。紧凑的双列 Session 卡片展示建议性 health、规范 phase、最后活动时间、轮次预算、最佳／目标加速比、language/backend、integration pattern、workflow authoring 预算、从零隔离、Session 自有的基线见证、profile evidence 与已密封的 profile owner、DSH 兼容与候选所有权门禁、mode、selector 结果、选中 Workflow、fit confidence、存储格式、状态提醒数，以及最新规范 `COMPLETE`／`CONTINUE`／`STALLED` 原因的两行预览。展开卡片会按需加载 artifact 派生的阶段时间线，以及 authoring／seal／save、Proposal validation、dispatch 与 measurement 状态；通过验证的 author handoff 才会解锁只读 metadata、文件 hash、rationale 与 Workflow source，仍在写入或 hash 不一致的 handoff 不会暴露 staging 内容。内联 baseline 与 profile blocker 保留有界规范原因。门禁通过为绿色、待定为琥珀色、失败为红色；stalled／cancelled Session 会隐藏建议性 fit 徽标，因为历史 fit 不能覆盖终态 decision。

可选 Host 启动器 [`@deepseek-ai/dsh-kersor`](../kersor/README.md) 处于 active 后，同一面板还会列出部署配置中的任务和 dsh 当前持有的 launcher 进程，并提供启动／停止操作。该 capability 由规范的 Host 插件清单判定；UI 不会仅因 Client namespace 存在就探测 launcher endpoint。Host 条目缺失或未 active 时，面板仍会挂载，只是不显示控制区。

**一个 store，一个 Host 快照。** 面板数据存在一个 `useSyncExternalStore` observable 里。首次加载、打开面板和重连会读取 `kersorViewer/snapshot`；之后替换式 `kersor/event` 帧更新同一份原子 projection。选择 run 时读取 `runBacklog` 获取折叠详情；展开经典 Session 时读取 `classicSessionDetail`，并在保持选中期间随替换快照刷新。API Remotes assembly 是生成 contribution 生命周期的唯一 owner；本 UI 只消费已组装的 namespace，不会再次挂载。launcher 发现会先检查 `pluginInventory/list`，再决定是否调用 `kersor/listTasks` 或 `listActive`，因此只读 profile 不会探测缺失的 launcher route。阶段渲染为带共享状态点（running 蓝、completed 绿、failed 红）的折叠行，其下的 agent/evaluation 调用行带状态、耗时、tokens 与回滚标记；循环重访的 phase 按执行顺序各占一个桶，KSearch 循环读起来就是独立的多轮。

**node 半为空。** 所有运行时行为在 `src/client/` 中，经 `./client` 导出为浏览器 bundle；包的 node 侧 `apply` 只为让同名包进入浏览器 roster。发现、tail 与折叠属于 host 包；本包渲染它们的结果。

**状态记账保持分离。** 经典 Session 与 autonomous 清单原子到达，形成一致的活动视图；折叠 run 详情与 launcher 持有的进程树仍是独立记账。进程从清单消失不会把 workflow 标成完成；状态由 KerSor Session store、summary 与事件决定。

## Model Experience

间接：本包不产生任何 prompt 输入，面板只调用已登记任务 remote、读取 snapshot/backlog remote 与转发的替换事件，不写 dsh session 事件。运行中的 KerSor workflow 自身的 model-visible 效果属于 KerSor 进程，不属于 dsh。

#### KV Cache effect

无：本包不产生任何 prompt 输入。

## Known Limitations and Deferred Work

- **一个标签页选中的 run 不会同步到另一个** —— 选择是页面内组件状态，刻意如此：浏览行为不改写任何 host 状态。
- **详情跟随选择** —— 清单与来源健康实时更新；选中 run 的 backlog 或经典 Session inspector 在选择时读取，并在重连或替换快照后刷新。
- **控制区不编辑启动配置** —— 任务路径、runtime config、凭据与环境仍是 Host 部署配置；浏览器只发送已登记 task id 或一条受管 run 的精确目录。
