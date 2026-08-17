# Iteration 09 — 封住 foreground author 之后的 parent 修补路径

## 假设

Iteration 08 把 author 调用改成了真正的 foreground barrier。本轮验证两个后续问题：
parent 是否会原样等待 author；author 返回后若语义审查失败，parent 是否会执行
`needs_revision`，而不是成为第二个 staging writer。

## 固定边界

- DSH：`47f9438`
- KerSor 起点：`8022daf`
- 插件起点：`59618a3`
- VLIW eval HEAD：`868d29a`；算法 checkpoint：`c6dbf8b`
- 官方 starter：147734 cycles
- 历史 checkpoint：51478 cycles；本轮必须重新实测后才能作为 baseline
- `tests/`、`problem.py`、`VLIW_EVAL_LOG.md` 只读；`perf_takehome.py` 只有在独立
  correctness 通过且 cycles 严格下降后才允许安装。
- Iteration 08 KerSor CI：<https://github.com/qhy991/KerSor/actions/runs/31998933701>
- Iteration 08 插件 CI：<https://github.com/qhy991/dsh-personal-plugins/actions/runs/31998933350>

## 正式 Session 09

- Session：`20260817-134652`
- `kernel_language=python_reference`
- `backend=python`
- `integration_pattern=custom_simulator`
- `allow_workflow_authoring=true`
- `workflow_authoring_budget=1`
- `max_workflows=1`
- target：8.0x

Agent 在 selection／authoring 前执行了当前 Session baseline。checkpoint 实测为
51478 cycles，命令、exit status、stdout excerpt 和 submission-test 结果写入
`test-method.md`。官方完整测试因更高速度阈值未满足而非零退出，但 correctness 与
147734 baseline speedup 门通过；Agent 没有把这个预期非零错误解释成 correctness 失败。

## Foreground barrier 结果

DSH 的唯一 author 调用真实携带 `run_in_background:false`。parent 在第 21 步进入
blocking subagent 调用，直到 author 返回前没有新增步骤，没有 `list_agents`、job polling
或 staging 读写。author 是 handoff 前唯一 writer，直接生成且只生成
`workflow.js`、`metadata.json`、`rationale.md`。

这证明 Iteration 08 的 foreground 修复成立。

## 新失败链

parent 手工拼装了一份约 8K-token 的 author prompt，并在其中直接给出 metadata
模板。这份影子合同漏掉了规范 workflow-author role 要求的 `technique` 与
`optimization_phases`，也没有把 canonical-source read-only 规则落实成可执行边界。

author 交付的 workflow.js 语法有效，但 evaluator prompt 明确要求先覆盖
`KERNEL_PATH`，再运行 correctness 和 benchmark。parent 正确发现了 output-ownership
违规，却没有 KILL：它两次编辑 author-owned workflow.js，并在
`workflow-authoring/candidates/` 创建目录。随后第一次 save gate 因缺少
`metadata.technique` 失败；parent 正准备再次编辑 metadata 时被监督停止。

停止发生在 32 步，主任务约输入 2.5M tokens、输出 13.3K tokens。没有 Proposal store、
re-catalog、fit、dispatch、candidate evaluation 或安装。canonical Session 已转成
`stalled`；完整决策保存在 `round-1-summary.md`。受保护文件保持不变。

canonical decision：

> STALLED: Proposal KILL/needs_revision — the foreground author barrier worked
> and exactly one workflow-author delivered exactly three staging files, but
> the workflow evaluated candidates by overwriting the canonical `kernel_path`.
> The orchestrator recognized that violation, then edited author-owned staging
> instead of rejecting the immutable handoff. The single save gate failed on
> missing `metadata.technique`; the run was stopped before repair or retry.

## 产品修复

根因是 author contract 和 handoff integrity 仍各有两个 owner。KerSor 现在让
`author-context.json.dispatch` 直接拥有 DSH subagent 的 `description`、
`run_in_background` 和 `prompt`。parent 只能原样传递；prompt 只绑定规范
`agents/workflow-author.md`、author context 与 staging 路径，不再复制 metadata 模板或
任务解释。

foreground 返回后的第一条 parent 命令现在必须是
`seal-author-handoff.py`。它在 staging 外以 exclusive create 写
`author-handoff.json`，绑定三个直接文件的 SHA-256；已有 seal 不可覆盖。save gate
新增 `--handoff`，会在任何验证或持久化前核对 staging path、entry set 和每个 hash。
因此 parent 修补后即使文件结构“看起来更好”，也不能被保存成可信 Proposal。

DSH skill 与主 README 同步为同一条路径；maintainer `workflow create` 也使用相同
dispatch envelope 和 seal，不再保留平行入口。

## 验证

- KerSor authoring／Proposal 定向：65 passed、1 skipped。
- KerSor 全量：1486 passed、7 skipped（592.87 秒）。
- 定向新增覆盖：原样 handoff 可保存；seal 后修改 workflow.js 会在 store 创建前失败；
  seal 不能覆盖；额外 staging entry 不能 seal；dispatch envelope 来自 author context。
- `python3 scripts/check.py`：23 tests passed。
- 真实 DSH 页面中，bridge 会把换行的 `## Decision` 投影为完整段落；Session 09
  卡片已显示全部 KILL 原因，不再只显示第一行。
- 最新 preset 已安装；旧版保存在
  `~/.dsh/.agent-presets/kersor.backup-20260817-141159`。
- `git diff -- perf_takehome.py tests problem.py` 为空；VLIW 工作树仍只有用户原有
  `VLIW_EVAL_LOG.md` 与 `.kersor/`。

## 结论与下一轮

产品修复 LAND；本轮 Proposal KILL；算法 checkpoint 保持 51478 cycles。
Iteration 10 从新 Session 验证：parent 必须原样发送机器生成的短 dispatch envelope；
author 返回后第一步必须 seal；若 author 首次交付有任何缺陷，parent 只能 stalled，不能
编辑。只有 seal、语义审查与 save 首次全部通过才允许 re-catalog 和 dispatch。
