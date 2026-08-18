# Modus 作为 DSH Router 插件

## 当前结论

Modus 可以迁移到 DSH，而且不需要包装原来的 Pi、tmux、`bin/lab` 或实验调度脚本。DSH 已经提供 persona、subagent、session persistence 与 token usage；Modus 只需补上 Profile registry、受限路由决策和可复现的父子关联。

当前实现已经完成可执行、可计量、可解释的端到端切片：

```text
用户输入
  → 受限 Router（neutral / p000 / p100）
  → 宿主计算 input digest，并持久化结构化 tool call
  → 新 DSH fork Worker（首次请求前固定 persona + profile digest）
  → Worker 输出回到父 session
  → 从父子 durable events 投影 token、编辑前调查与 edit/evaluate 轨迹
  → 对 p000/p100：首次 typed edit 前执行可恢复的信息尝试门
  → 可选：在下一次模型请求前执行 Router + Worker 共享 token gate
```

它证明“DSH 能按一次可审计决策创建固定 Profile Worker，并在本地 fork 的请求边界治理成本”。它仍不证明某个 Profile 更好，也不证明动态路由能够省 token；这两项必须由新的持出任务实验回答。

## 最小规格

目标：对每个任务阶段选择一个 Profile Worker，在正确性与性能达标的前提下，最小化 Router + Worker 的总 token。

运行不变量：

1. Router 每个 turn 最多产生一次 Worker 创建尝试，不能直接执行任务；零次路由在有限提醒后以 `MODUS_ROUTE_REQUIRED` 明确失败，不能伪装成已完成。
2. `neutral` 不追加任何 Modus profile；`p000`、`p100` 使用固定文本及 SHA-256。
3. Profile 在 Worker 第一次模型请求前注入，不能在同一 Worker 中热切换。
4. Router 只把真实用户消息转给 Worker；DSH 注入的上下文不会被重复转发。
5. `input_digest` 由宿主从实际转交的 content blocks 计算，模型不能自行填写。
6. Worker 创建或运行失败会形成一次终态结果，同一 turn 不自动重发；HMR/replay 看到任意 durable route-start 都保守视为已消费，不能根据最终 `isError` 推断 Worker 从未运行。
7. 父、子 session 是行为与 token 的权威记录；汇总只能从它们确定性派生。
8. 行为 projector 只解析 durable event，不读取或执行 workspace。
9. 配置预算时，只支持兼容性清单固定的 DSH 内置 in-process `fork`；远程 Worker 不能被宣称为已治理。
10. 安装器为 `p000/p100` 启用首次编辑前的信息门：前三次 workspace read/search/inspection shell 可执行，第 4 次被拒绝并要求开始 bounded edit；`neutral` 不受该门影响。计数从 durable event 重折，HMR 无法绑定 Profile 时在请求前 fail-closed。

非目标：

- 不在插件中保存 Modus 任务库、性能阈值或论文统计规则。
- 不执行 workspace Python 来提取 route state。
- 不复刻 DSH 已有的 compaction、subagent 或 session persistence。
- 不把 Pi 实验结果升级为 DSH 实验证据。

## 权威来源

| 事实 | SSOT |
|---|---|
| Router 运行合同 | `presets/modus/plugins/modus-router.mjs` |
| Router 提示 | `presets/modus/router-persona.md` |
| Profile 文本、上游 commit、hash | `presets/modus/profiles/manifest.json` 及同目录快照 |
| DSH 组合 | 安装时从当前 standard preset 生成的 `agent.cordis.yml` |
| 行为与 token | DSH parent/child session events；`lib/trajectory.mjs` 只是纯投影 |
| 任务、gate、统计与正式结论 | Modus owning repository |

Profile snapshot 当前固定到 Modus `7661a5da146d6957de18f14a0e226684486d6bf6` 的 edit-topology M1 action set；该版本的 E0/E1 已通过 24-cell manipulation gate。早期 component-v1 的同名 `p000/p100`（`a170…/b552…`）在 M0 中没有产生 E 差异，不再作为 DSH Router 的动作文本。插件加载时会重新计算当前快照 hash，篡改时直接拒绝加载；Profile 定义、编译和选择证据仍由 Modus owning repository 管理。

## 三个动作的语义

| 动作 | Worker policy | 适用信号 |
|---|---|---|
| `neutral` | standard coding persona，无 Modus profile | 证据不足、任务直接、强行施加策略没有依据 |
| `p000` | 有界局部实现、有限调查、一次最终验证 | 单一目标、小而连贯的修改面、协调收益低 |
| `p100` | 跨表面协调、系统级实现、同样有界的调查与反馈 | 多模块/多消费者、共享预处理、分散热点或系统不变量 |

Router 同时报告 rationale、1–6 条可见 evidence、预期收益类型与是否 abstain。abstain 只能选择 `neutral`。

### 固定 action 对照

Router 净收益不能只与旧 Pi 结果或一个假想的零成本 Worker 比较。`scripts/install_modus_fixed.py` 从同一份当前 standard composition 一次生成 `modus-fixed-neutral`、`modus-fixed-p000` 与 `modus-fixed-p100`：三者拥有相同 provider/model 路由、standard 工具集合、Worker delegation deny-list、token gate 和用户 prompt；neutral 保持原 persona，p000/p100 只分别追加其 hash-bound Profile。三个 preset 都是一个根 Worker session、零 Router session、零 descendant，因此固定臂成本就是该根 session 的完整 durable usage，不需要 fork seed 扣除。

固定 p000/p100 使用与 Router child 相同的三次 pre-edit information gate；neutral 不启用该门，但仍使用相同 delegation deny-list。安装器把 Profile digest、preset id 和可选两轴 token budget 写入生成的 composition。正式分析还必须从 request/header.system 验证 neutral 的 Profile occurrence 为零、p000/p100 的所选文本恰好一次且另一文本为零；preset 名或 installer 输出本身不足以证明 treatment 被模型看到。

## Token 核算

比较动态策略时，成本估计量必须是：

```text
总成本 = Router 自有 usage + Worker 在 seedLength 之后新增的 usage
```

不能直接把父、子 session 的全量 usage 相加：fork Worker 会继承父 session 的已完成 turn，重复计算 seed 会虚增成本。正式 projector 必须按 child header 的 `seedLength` 截断，并分别报告 input、output、cache-read 与 cache-write token。

当前 projector 累计最终 `assistant/message` 以及 DSH `compaction/summary` 中的 usage；流式 chunk 和没有形成最终 assistant record 的普通失败请求没有可恢复的精确计量。任何最终记录缺失 usage、usage 非法、同一步出现重复最终 message、同一 compaction 重复 summary，或 compaction 已开始却没有带 usage 的 summary，都会令 `complete=false`，不能把可能已付费的失败总结当成零成本。model-free 的 surface replacement 不重复计费。因而该口径表示“可从 durable log 恢复的响应与总结 token”，仍不等同于供应商账单。Worker 从 `seedLength` 之后开始折叠，四类 token 分开报告。native route call 会把 input/Profile digest、Worker session id、Router/Worker/总 usage、行为轨迹与预算判断写入父 tool-result metadata；Code Mode 的 nested result 不保证保留 presentation metadata，因此恢复与正式分析始终以 child session 为权威。

预算是显式 opt-in，没有猜测性的默认值：

```bash
python3 scripts/install_modus.py --force \
  --max-new-tokens 600000 \
  --max-cache-read-tokens 9000000
```

其中 `new = uncached input + output`，cache-read 独立设限，cache-write 只报告。达到任一阈值或 usage 不完整时，pre-step gate 会在自动 compaction 之前阻断，不能先偷跑一次总结调用；若在阈值内准入的 compaction 跨线，同一步的普通 Worker 请求会在 `agent/request` 被阻断。它仍是步级 gate：已经准入的一次模型调用可能跨过阈值，不能表述成严格不超额。实验应当“一项任务一个全新 root session”，并把两项 limit 与 preset/config digest 写入外部 run manifest。

## 行为轨迹

projector 将 native `tool/call` 与 Code Mode `tool/code-dispatch-start` 统一成同一种 action，并忽略 Code Mode 外层 `run_code`，避免双计。它测量 Profile 对工具选择行为的影响，而不是从日志猜测 workspace 的最终状态。当前输出覆盖：

- 首个 `edit/write` 工作区编辑尝试及严格更早的 usage、读取/搜索/检查尝试；
- typed read/search/edit 尝试次数、尝试编辑的路径、evaluation command intent；
- 与原 Modus 口径一致、基于尝试序列的 edit→evaluate cycle 和 evaluate→edit switch；
- failed/unsettled tool call、结构缺口、未分类工具、classifier hash 与路径语义。

这里有四个必须保留的科学限定：任意 bash 中隐藏的文件修改不可观测；路径只做相对 `cwd` 的 lexical qualification，不做 realpath/symlink 证明；测试命令只表示验证意图，不表示测试通过；即使 tool result 为 non-error，也不能由 session log 单独证明文件真的发生了预期变化。因此 manipulation check 使用明确标成 attempt/intent 的行为量；实际修改、正确性与性能一律由独立 verifier 判定。

安装器还把同一个 projector 用作 `p000/p100` 的 pre-execute 行为门。它不是新的可变计数器：每次 pending tool call 都从 Worker 的 `seedLength` 后 durable native/Code actions 重折，当前调用无论是否已写入 start event 都只计一次。前三次 workspace information attempt 允许通过；第 4 次调用以 `MODUS_PRE_EDIT_INFORMATION_LIMIT` 拒绝，并为下一次模型请求临时隐藏 `read/read_image/glob/grep/bash`，保留 typed `edit/write`；首次 typed edit 后立即恢复信息与验证工具。HMR/reload 会从 durable trajectory 重建隐藏状态，不能通过重载逃逸。并行同一响应中已经提出的多余调用仍各自形成 denied result，但后续模型请求不再看到这些工具。该机制只强制“停止继续调查并进入编辑或明确报告证据不足”，不证明编辑正确，也不限制编辑后的故障诊断。`neutral` 保持 standard 行为，因而仍可作为未施加 Modus profile 的对照。

## 实验边界

默认 Router 没有 bash、read、grep 等主动工作区能力，但 standard preset 的 `agent-instructions` 仍可能向 Router 提供静态 workspace instructions。一般使用中这是预期行为；确认性实验必须保证这些说明不含 profile、hidden label 或历史 outcome，并在所有 treatment 间完全相同。需要绝对 workspace-blind 的 Router 时，应使用独立、冻结的 route-state provider，而不是让 Router 读取待测工作区。

完整实验按下列依赖顺序执行：

1. **Manipulation check**：同一批任务运行 `neutral/p000/p100`，确认行为轨迹确实随 Profile 改变；不先要求 outcome 有差异。
2. **配对 outcome matrix**：冻结任务、模型、prompt、预算、verifier 与重复次数，比较每个 `(task, profile)` 的正确性、性能和 token；先定义“达到质量/性能 gate 后 token 最小”的事后最优动作。
3. **Router shadow**：Router 只预测、不执行，使用完全持出的任务；比较选择与事后最优动作、abstain、稳定性及 Router 自身成本。
4. **Router arena**：真正执行 Router 所选 Worker；与 `always-neutral`、各固定 Profile、简单规则 Router 比较。主要估计量是质量与性能通过率非劣时的每任务 Router+Worker token，以及相对最佳固定策略的 paired token 差。
5. **长程性能优化**：选少量包含诊断、实现、验证、反馈的系统任务，每阶段新建固定 Profile Worker；只在前四步成立后，检验阶段路由能否保住最终性能并降低端到端 token。

只有第 4、5 步的持出结果才能支持“动态选择提高性价比”。

### DSH 上的首个完整确认实验

实验门槛、任务合同与统计规则的权威来源仍是 Modus owning repository 中固定到
`07017924a08567de8593fc02de249d85475ca8c8` 的
[`PROFILE_NATIVE_ROUTER_P1D_DESIGN_20260813.md`](https://github.com/qhy991/Modus/blob/07017924a08567de8593fc02de249d85475ca8c8/docs/PROFILE_NATIVE_ROUTER_P1D_DESIGN_20260813.md)。
DSH 迁移不能修改该科学问题；它只替换执行与观测层。第一项值得运行的完整实验应为：

| 层次 | 固定设计 | 回答的问题 |
|---|---|---|
| 开发审计 | 旧任务只用于调试 profile-blind state 与 Router；结果不进入确认性统计 | Router 机制是否值得冻结 |
| 持出决策 | 8 个全新任务 × 3 次独立 Router 判断 = 24 次；必须在任何 action outcome 可见前写入并 hash | 仅凭派发前信息能否稳定选择 |
| 完整反事实矩阵 | 8 任务 × 3 action（neutral/p000/p100）× 3 重复 = 72 个 Worker cell | 每个任务上哪些 action 达标、成本多少 |
| 离线策略评估 | 将第 `r` 次 Router 决策与同任务第 `r` 次 Worker outcome 配对；总成本包含 Router | Router 相对固定策略是否有净收益 |
| 端到端复核 | 通过上述门后，才在新任务上让插件真实创建所选 Worker | shadow 结论能否承受真实派发与交接 |

每个任务—action 的 `eligible` 先要求 3/3 隐藏正确性通过且可 benchmark，再要求中位性能
不劣于该任务最快正确 action 的 25%；随后才在 eligible action 中比较 token。首要比较不是
profile 命中率，也不是一个会让低成本抵消错误的综合分数，而是以下两个连续门：

1. **可路由空间存在**：task oracle 至少使用两种 action，并比对 8/8 任务均 eligible 的
   最便宜固定 action 节省至少 15% token；否则 Router 没有经济学问题可解。
2. **Router 捕获该空间**：所选 Worker 保持全部任务正确且性能 eligible；加入 Router token
   后仍比最佳固定 action 节省至少 15%，且相对 task oracle 的 token regret 不超过 10%。

task 是泛化单位，重复只在任务内配对；失败、超时、预算阻断与无效回答的已消耗 token
全部保留。Router 还必须与同一 state 上的冻结零-token 浅规则比较；若扣除 Router 成本后
不能再改善至少 5%，只能说明“状态可用于路由”，不能说明“需要 Agent Router”。8 个任务
只支持 go/no-go，不足以单独形成论文级泛化结论。

第一项 dispatch 前，Modus owning repository 还必须冻结一个 hash-bound run manifest，至少
包含 task/family/split、clean starter hash、模型与服务版本、Profile/Router/state-provider/
projector/verifier/config hash、正确性与性能 gate、token 字段映射、预算、timeout、重复数、
顺序、缺失与整块替换规则。共享代码、算法族或 verifier 的衍生任务必须进入同一 split；
held-out outcome 揭盲后不得再修改 Router、Profile、state、分类器或阈值并沿用原 test 结果。
usage 不完整不能当作零成本或做 complete-case 删除；它会使该 cell 的成本证据无效，并按
预冻结的保守上界/整块基础设施处理规则进入分析。HTTP 402、provider 失联等独立基础设施
故障不是 Profile 失败，但原始记录必须保留，且只有预先规定的整块替换可以重跑。

当前插件已经覆盖 action 固定、父子 session、seed 去重、行为投影、无重发、qualified-profile
首次编辑前信息门和本地 fork 预算 gate；尚缺的是 profile-blind state/shadow runner、冻结 run coordinator、独立 verifier
接入与 96-session 的真实 DeepSeek-V4-Flash 数据。因此当前状态仍是“实验装置通过”，不是
“P1d 已完成”。单个 VLIW 六格矩阵只能作为之后的长程优化案例，不能替代这一步的跨任务
Router 识别。

## 安装与验证

```bash
python3 scripts/install_modus.py --dry-run
python3 scripts/install_modus.py --force
python3 scripts/install_modus_fixed.py --dry-run \
  --max-new-tokens 200000 --max-cache-read-tokens 2000000
python3 scripts/install_modus_fixed.py --force \
  --max-new-tokens 200000 --max-cache-read-tokens 2000000
python3 scripts/check.py
python3 scripts/check_dsh_compat.py --dsh-root /absolute/path/to/deepseek-harness
```

最后一条命令使用真实 DSH 的 Loader、Cordis、ToolRuntime、AgentRegistry、SubagentRuntime、AgentLoop 和内置 fork provider 做兼容性加载；测试包含“首个 Worker 请求受控、跨阈值后下一请求未到 adapter”，“p000 的第 4 次 pre-edit read 未进入 tool body、随后 typed edit 可执行”，以及“固定 p000 preset 隐藏 delegation 工具并复用同一行为门”。它默认同时要求 HEAD 与工作树匹配固定基线；`--allow-dirty` / `--allow-unpinned` 仅用于开发探测，不能作为固定兼容性证据。当前验证基线记录在 `presets/modus/compatibility.json`，升级 DSH 后应更新并重跑。覆盖安装会把不同的旧 preset 移到同级时间戳备份；完全相同的重装是 no-op。安装后需重启 DSH Web，并在新 task 中选择 Router 或对应的固定 Worker preset。

## 下一迭代

按依赖顺序推进：

1. profile-blind state provider 与 shadow runner：由可信宿主生成结构化 state，Router 只提交决策。
2. coordinator：冻结 run plan，支持 timeout、失败保留、配置 digest 与 no-redispatch；进程中断的 one-shot cell 标记无效，不隐式重发。
3. 在 DSH 上先复现 manipulation check 和配对 outcome matrix。
4. 冻结 Router 后做 held-out shadow，再做 live arena。
5. 只有 arena 显示净收益后，才投入长程阶段路由实验。
