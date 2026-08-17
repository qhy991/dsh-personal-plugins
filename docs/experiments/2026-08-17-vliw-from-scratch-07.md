# Iteration 07 — 候选证据绑定与单写入者 Proposal

## 假设

一个可 dispatch 的 task-native Proposal 不仅要把输出留在 Session 内，还必须满足两条
可审计不变量：correctness 与 benchmark 确实执行它声明的同一个 candidate；staging
只有 workflow-author 一个写入者，前台 orchestrator 只能验收或拒绝，不能代修后把
混合来源的文件保存为 Proposal。与此同时，DSH 卡片应直接显示 canonical fit
confidence，让用户无需翻 Session 文件就能判断 workflow readiness。

## 固定边界

- DSH：`47f9438`
- KerSor 起点：`7f2f1a3`
- 插件起点：`0173d75`
- VLIW eval HEAD：`868d29a`；算法 checkpoint：`c6dbf8b`
- 官方 starter：147734 cycles
- 当前 checkpoint：51478 cycles，starter speedup 2.869847×
- `perf_takehome.py`、`tests/` 与 `problem.py` 全程只读；本轮禁止安装候选。
- Iteration 06 KerSor CI：<https://github.com/qhy991/KerSor/actions/runs/31993903302>
- Iteration 06 插件 CI：<https://github.com/qhy991/dsh-personal-plugins/actions/runs/31993903757>

## 产品修复

KerSor Phase 3.6 现在规定 `staging/` 恰好一个 writer：只启动一个
`workflow-author`，等待 runtime completion notification，不循环轮询状态；作者直接
交付 `workflow.js`、`metadata.json`、`rationale.md` 三个文件。orchestrator 只能读取并
拒绝，不能写第二份、不能修补作者文件。save gate 只运行一次，任一 syntax、metadata、
taxonomy、semantic gate 失败都保留现场并进入 `needs_revision`/`stalled`。

候选审查也从“是否 import”提升为“是否实际执行”：correctness 与 benchmark 都必须
显式注入或调用 candidate-aware harness，并在 evidence 中指向同一个 Session-local
candidate。`workflow-author` 交付前还要自检重复顶层声明、返回字段和必需 metadata。

fit judge 的输入边界现在兼容旧式字符串 `soft_reasons[]`，统一归一化为带
`code=judge_observation`、`detail`、`source=judge` 的结构；内部和输出仍只有一种标准
schema。

DSH classic Session 卡片新增 `适配度：high/low`（英文 `Fit: high/low`）徽标，high
为绿色、low 为琥珀色。实现中同时发现 DSH 共享 `clientBundle()` 固定读取
`src/client/index.ts`，而插件源文件曾名为 `index.tsx`；入口已改为不含 JSX 的
`index.ts`，恢复从干净 checkout 可复现的原生 bundle 构建，而不是依赖遗留产物。

DSH KerSor skill 同步承载候选绑定、单写入者、无轮询等待、禁止 orchestrator 代修和
一次 save gate 的用户侧操作合同。

## 正式 Session 07

- Session：`20260817-123245`
- `kernel_language=python_reference`
- `backend=python`
- `integration_pattern=custom_simulator`
- `allow_workflow_authoring=true`
- `workflow_authoring_budget=1`
- `max_workflows=1`
- target：8.0×

baseline 复测仍为 51478 cycles，官方 harness 的 correctness 保持通过。初始 selection
按预期 `STALLED`，随后恰好一个 workflow-author 写出三个直接 staging 文件。作者在
evaluator 中显式执行：

```python
pt.KernelBuilder = OptimizedKernelBuilder
st.KernelBuilder = OptimizedKernelBuilder
st.kernel_builder.cache_clear()
```

这修正了 Session `20260817-115244` 仅导入 candidate、实际仍运行 canonical
`KernelBuilder` 的 false-binding 缺陷。

但作者首份 `workflow.js` 含重复的 `bestKernelCode` 声明，Node syntax gate 失败；
`metadata.json` 又缺少必需的 `technique`。前台 orchestrator 随后越权编辑
`workflow.js`、重试 save、再编辑 metadata 并成功保存。虽然文件最终结构可通过，这个
Proposal 已混合两个写入者，provenance 不可信，因此不能因为“最后保存成功”而升级为
PASS。

本轮主动停止在 dispatch 前，并将 canonical round decision 写为：

> STALLED: Proposal KILL/needs_revision — the sole workflow-author output failed
> the Node syntax and required-technique gates; the orchestrator then edited and
> saved the staged files, violating the single-writer contract. Candidate binding
> was made explicit, but the Proposal provenance is no longer trustworthy for
> dispatch.

KerSor state 已真实转为 `stalled`；DSH status bridge 与活动面板均显示 terminal/stalled
和完整理由。错误 Proposal 及 staging 文件原样保留为取证材料，不 dispatch、不删除。

## Agent 组织与效率

本轮前台约 60 步，workflow-author 数量符合预算 1，但大量步骤浪费在重复
`list_agents`、`unknown job` 与状态轮询上；最终又由 orchestrator 代修作者输出。相对
Iteration 06 的 105 步有下降，但仍未达到 pre-dispatch 40 步目标。修复后的协议将结果
回收收敛为 completion notification，并把无效首份交付直接定义为终止条件，下一轮应
同时减少轮询和不可信修补。

## 验证

- VLIW `python3 tests/submission_tests.py`：correctness 通过；51478 cycles；starter
  speedup 2.869847×；7 个更高性能阈值按预期未过。
- `git diff HEAD -- perf_takehome.py tests problem.py` 为空；工作树仍只有用户原有
  `VLIW_EVAL_LOG.md` 与 `.kersor/`。
- KerSor 定向测试：23 passed、1 skipped，覆盖单 writer、一次 save、候选绑定、作者
  自检与 fit reason 归一化。
- KerSor 全量测试：1481 passed、7 skipped（574.66 秒）。
- `python3 scripts/check.py`：23 tests passed。
- DSH 原生 Host/Client bundle 通过；viewer Vitest：5 files、35 tests passed。
- DSH 主仓库构建后保持 clean；构建产物保存在
  `/private/tmp/dsh-kersor-iter7-build-6VyNU4CD`。
- 真实 DSH 页面显示 `适配度：high` 以及 terminal Session 的完整 decision。
- preset 旧版保存在
  `~/.dsh/.agent-presets/kersor.backup-20260817-123117`。

## 结论与下一轮

产品修复 LAND；本轮 Proposal KILL；算法 checkpoint 未变。Iteration 06 的
output-ownership PASS 被保留，但“安全 Proposal”结论被 candidate-binding 反例推翻。
Iteration 07 又证明结构最终可保存并不等于来源可信，单写入者必须是 dispatch gate。

Iteration 08 从全新 Session 开始：只允许一个 author 首次交付同时通过 syntax、完整
metadata、output ownership 与 candidate binding；orchestrator 不修改文件，save gate
只运行一次。只有所有 gate 首次通过才允许 dispatch，并以独立 correctness 与 cycles
`< 51478` 决定是否安装 winner，同时继续把 pre-dispatch 压到 40 步以内。
