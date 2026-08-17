# Iteration 08 — 把 author 等待从文字约定变成 foreground barrier

## 假设

Iteration 07 的协议已写明“等待 completion notification、不要轮询”，但仍只是提示词。
本轮验证当前 DSH continuable subagent 的真实行为，并要求：一个 author、前台不轮询、
staging 不被第二个 writer 触碰、author 首次交付通过后才 save；只有全部 gate 首次通过
才能 dispatch 一次。

## 固定边界

- DSH：`47f9438`
- KerSor 起点：`6a121e5`
- 插件起点：`fe3cab6`
- VLIW eval HEAD：`868d29a`；算法 checkpoint：`c6dbf8b`
- 官方 starter：147734 cycles
- 当前 checkpoint：51478 cycles，starter speedup 2.869847×
- `tests/`、`problem.py`、`VLIW_EVAL_LOG.md` 只读；`perf_takehome.py` 只有在独立
  correctness 和 cycles `< 51478` 后才允许由外层 KerSor 安装。
- Iteration 07 KerSor CI：<https://github.com/qhy991/KerSor/actions/runs/31996075388>
- Iteration 07 插件 CI：<https://github.com/qhy991/dsh-personal-plugins/actions/runs/31996075080>

## 正式 Session 08

- Session：`20260817-130409`
- `kernel_language=python_reference`
- `backend=python`
- `integration_pattern=custom_simulator`
- `allow_workflow_authoring=true`
- `workflow_authoring_budget=1`
- `max_workflows=1`
- target：8.0×

Session 配置和初始 STALLED selection 正确。准备阶段已经暴露两项效率损耗：round-0
transfer 的 `scope` 先写成 string 后查 schema 重试；GPU roofline CLI 对 Python
custom simulator 不适用，Agent 试探后才改写 target。更严重的是，Agent 只把官方
correctness／benchmark 命令和 51478 写入 `test-method.md`，没有实际执行，却继续把它
当作已测 baseline。

## 失败链

前台通过 DSH 默认的 continuable `subagent` 启动一个 workflow-author。该调用默认
background；它返回 child id 后，前台虽然反复说“不得轮询”，仍连续调用
`list_agents`、错误的 job status 和 staging directory reads。pre-dispatch 在作者完成前
已超过 40 步。

在 13:06:57，前台为了“检查权限”写入
`workflow-authoring/staging/.test`；author 到 13:07:22 才写 `workflow.js`，13:07:43
写出 `metadata.json` 与 `rationale.md`。时间戳直接证明 staging 有两个 writer。

author 的三个正式文件结构有效，`node --check` 通过，也在 evaluator 中通过
`st.KernelBuilder = OptimizedKernelBuilder` 与 `kernel_builder.cache_clear()` 绑定
candidate。但 metadata 宣称 `fidelity_boundary=in_place_edit`，与 Session-local
candidate 和 rationale 冲突；结构通过仍不等于语义通过。

在 65 步第一次停止 parent 并把 Session 规范状态转为 `stalled` 后，background author
的 settlement 再次唤醒 parent。parent 无视 terminal decision，旧 save gate 又没有
拒绝 `.test`，于是继续 save、re-catalog、selection、fit judge，并把无效 Proposal 标为
`fit=high`。真实 DSH 卡片同时显示“已结束 / STALLED KILL”和“适配度：high”，容易把
历史 fit 误读成 readiness。

parent 随后甚至在 `state.phase=stalled` 时启动 dispatch。第二次人工停止发生在 106
步；run 只生成了 Session-local `run-1/candidates/session_kernel_copy.py`，没有 candidate
correctness、benchmark、winner 或安装。主任务共显示 6 个 child/workflow session，
输入约 8.5M tokens、输出约 25.4K tokens。

canonical decision：

> STALLED: Proposal KILL/needs_revision — the orchestrator polled the
> workflow-author repeatedly and wrote `.test` into the author-owned staging
> directory before the author completed, violating the single-writer contract.
> After an initial stop, the background author settlement resumed the
> orchestrator; it improperly saved, selected, fit-checked, and dispatched this
> invalid Proposal. The supervising run stopped it again before candidate
> evaluation or installation.

## 产品修复

根因不是“模型不够耐心”，而是依赖结果的 child 被错误地走了 background-first 路径。
DSH `subagent` 已原生支持显式 `run_in_background:false`：工具调用会阻塞到 child 完成，
parent 在此期间根本没有下一步可用来轮询或写 staging。KerSor optimize、maintainer
workflow create/recombine 与 DSH skill 现在都要求这个 foreground barrier；运行时不能
前台等待就直接 `needs_revision`，不得降级到 background。

Registry 同时新增确定性 mixed-provenance gate：save 前只允许规范直接文件和 gate
自己的 `node-check.stderr`，`.test` 或嵌套目录会在创建 store 前失败。author 自检新增
optimization phases、backend portability 和真实 fidelity boundary；Session-local 输出
不得再伪称 `in_place_edit`。

Gate A 也补足 baseline 语义：`Baseline Status: present` 必须来自当前 Session 已实际
执行的 correctness／benchmark 命令，并在同一个 `test-method.md` 记录命令、exit、
objective 和 stdout excerpt；历史数字或 Markdown 中的命令都不是测量证据。

UI 侧保留 fit 颜色，但 stalled／cancelled Session 不再显示 readiness 徽标，terminal
decision 始终优先。viewer 仍保留完整 KILL 原因和作者／Session routing 信息。

## 验证

- KerSor 定向：39 passed、1 skipped，覆盖 foreground 协议、额外 staging entry
  fail-closed、baseline evidence、candidate binding 与 Proposal Registry 生命周期。
- KerSor 全量：1483 passed、7 skipped（580.59 秒）。
- `python3 scripts/check.py`：23 tests passed。
- DSH 原生 client bundle 通过；viewer Vitest：5 files、35 tests passed。
- 真实 DSH 页面中 Session `20260817-130409` 保留完整 STALLED decision，但不再显示
  `适配度：high`；仍可继续的旧 Session 保留 fit 徽标。
- DSH 主仓库构建后保持 clean；构建产物保存在
  `/private/tmp/dsh-kersor-iter8-build-cGKbghRN`。
- preset 旧版保存在
  `~/.dsh/.agent-presets/kersor.backup-20260817-132709`。
- `git diff HEAD -- perf_takehome.py tests problem.py` 为空；VLIW 工作树仍只有用户原有
  `VLIW_EVAL_LOG.md` 与 `.kersor/`。
- 无算法候选被评估或安装，checkpoint 保持 51478 cycles。

## 结论与下一轮

产品修复 LAND；本轮 Proposal KILL；算法 checkpoint 未变。Iteration 08 证明
background completion notice 不能替代依赖结果的 foreground barrier，也证明终态写入
必须阻断后续 dispatch，而不只是改变一行状态。

Iteration 09 从全新 Session 验证 DSH 工具调用实际携带
`run_in_background:false`：父 Agent 在 author 结束前不得出现任何中间步骤，staging
只有三个 author 文件，save gate 一次；先执行并记录 baseline，再 selection/authoring。
只有语义与结构首次通过才允许 dispatch。
