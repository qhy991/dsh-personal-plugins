# Iteration 11 — 把 DSH 子 Agent 的候选写入边界变成独立门禁

## 假设

Iteration 10 已把 Session baseline、不可变 author handoff 和 DSH schema compatibility
收敛为机器门禁。第 11 轮从全新 Session 验证：这些门禁全部通过后，一次且仅一次的
DSH Workflow 调用是否会把候选写入、测试与安装保持在 Session-local 边界。

## 固定边界

- DSH：`47f9438`
- KerSor 起点：`f0fa998`
- 插件起点：`348e267`
- VLIW eval HEAD：`868d29a`；算法 checkpoint：`c6dbf8b`
- 官方 starter：147734 cycles；当前受保护 checkpoint：51478 cycles
- 权威 correctness：`python tests/submission_tests.py CorrectnessTests.test_kernel_correctness`
- 权威 benchmark：`python tests/submission_tests.py SpeedTests.test_kernel_speedup`
- `tests/`、`problem.py`、`VLIW_EVAL_LOG.md` 不可修改；只有独立 correctness 通过且
  cycles 严格下降的 Session-local 候选才可安装为 `perf_takehome.py`。

## 正式 Session 11

- Session：`20260817-165546`
- `kernel_language=python_reference`
- `backend=python`
- `integration_pattern=custom_simulator`
- `allow_workflow_authoring=true`
- `workflow_authoring_budget=1`
- `max_workflows=1`
- target：8.0x

Session 在任何 baseline 命令之前创建。`baseline-witness.json` 绑定 Session config、
规范 kernel SHA-256、`test-method.md` 与两条精确命令；`/bin/zsh` 中 correctness 8/8
通过，benchmark 为 51478 cycles，后续 verify 仍为 pass。

## 首次完整通过的 dispatch 前链路

唯一 workflow-author 使用 `author-context.json.dispatch`，并以
`run_in_background:false` 前台阻塞。它交付且只交付 `workflow.js`、`metadata.json`、
`rationale.md`；author 返回后的第一条 parent 动作是不可覆盖的 handoff seal。parent
没有修改 staging，save 恰好一次，Proposal `vliw-simd-vectorize` 进入 Session-local
catalog。

第一次尝试执行 compatibility 的 shell 命令因引号未闭合而在 shell 解析期失败，adapter
尚未被调用，也没有产生报告。修正调用语法后，唯一 adapter 实际执行一次，生成
`run-1/dsh-compatibility.json` 与 `dsh-workflow.json`，verdict 为 pass。随后 parent 只用
`meta/script/args` 调用 DSH `Workflow()` 一次。Analyze 子 Agent 完成，Generate 子 Agent
开始工作。

这证明 Iteration 10 的 baseline witness、foreground author、单 writer、handoff seal、
single save、portable adapter 和 single Workflow call 可以在同一个真实 Session 中同时
成立。

## 新失败：候选所有权越界

Proposal 文本要求候选位于 Session-local candidate root，但 Generate 子 Agent 实际：

1. 在规范 workspace 根写入 `vectorized_kernel.py`；
2. 直接编辑受保护的 `perf_takehome.py`；
3. 对未经授权的规范编辑运行 correctness，失败后继续调试。

监督立即停止 DSH task，Workflow 与 Generate 被取消。所有 child 输出与测试结果均被
判无效；没有候选被接受，也没有性能成绩。监督把 `perf_takehome.py` 从 Git owner
逐字节恢复到 SHA-256
`a65d92f7f29a5c42076c650131f7028bc8069331da1e4d3017050428a0de0033`，删除越权的
`vectorized_kernel.py`，并确认受保护 diff 为空。机器失败证据为
`run-1/candidate-ownership.json`；规范 round decision 为 `STALLED`。

算法结论是 NO-GO，checkpoint 保持 51478 cycles。

## 根因

DSH 的 portable Workflow `agent()` hook 当前不暴露 per-child filesystem/tool filter。
KerSor 能审查 prompt 和输出结构，却没有一个独立 owner 在 Workflow 前后证明规范 task、
oracle、既有 worktree 与 Session 外文件未变化。因此“候选只写 Session”仍是文字约束，
并未成为 host 可验证的 execution gate。

## 产品修复

KerSor 新增 `candidate-ownership.py`，由同一脚本拥有两个不可覆盖的证据：

- `seal` 只允许在 baseline witness 为 pass 后执行，绑定 Session config、baseline
  witness、规范 kernel、tracked `problem.py`/`tests`、已有 tracked/staged diff，以及当前
  Session 外的所有 untracked 文件；
- `verify` 必须是阻塞 Workflow 成功或失败返回后的第一条 parent 动作，重新计算同一
  边界并写 `candidate-ownership.json`；任何漂移都拒绝 child 结果、进入 `stalled`，不得
  通过恢复文件、重试 Workflow 或 parent 接管优化把失败洗成 pass。

允许写入的根只有当前 Session；兄弟 `.kersor` Session 也受保护。DSH authoring 合同同步
收紧：每个 Workflow child 只能作为 advisory/read-only 顾问返回源码或分析，不能被 prompt
要求写文件、运行 shell 或测试；候选落盘和评测由 enclosing host-owned 路径负责。

这是 host 的前后快照与 fail-closed 门禁，不是进程级只读 sandbox：若恶意 child 修改后
又逐字节恢复，终态快照无法证明瞬时越权未发生。下一轮应验证新协议能否让正常 child
只返回数据；长期的强边界仍需 DSH 暴露 restricted child provider/tool filter。

## 可视化

bridge、`kersor_status`、Host Typert、browser remote、TypeScript source 与 built bundle
新增同一个 `candidate_ownership` 字段。新 authoring Session 没有报告时显示“待验证”；
旧 Session 无声明且无报告时显示“无需”；一旦存在报告，pass/fail 以报告为准。

在 3197 隔离 DSH 实例重新安装 preset 与 Web bundle、只重启该测试实例后，真实
Session 11 卡片同时显示：

- `基线见证：通过`
- `DSH 兼容：通过`
- `候选所有权：失败`
- 完整 `STALLED` 原因

第三个徽标可见，`data-gate=fail`，计算后的文字颜色为 `rgb(236, 19, 19)`。历史 Session
10 显示“候选所有权：无需”，证明新字段按证据投影而非前端硬编码。用户的 3080 DSH
进程在验收期间始终保持原 PID 监听，未被重启。

## 验证

- KerSor 聚焦：59 tests passed、1 skipped。
- KerSor macOS Python 3.11 全量：1508 passed、7 skipped（576.56 秒）。默认 Python
  3.14 没有安装 pytest，因此未执行代码；切到项目与 CI 固定的 3.11 后全量通过。
- KerSor commit `a4c0c5b` 的
  [GitHub CI 32017721846](https://github.com/qhy991/KerSor/actions/runs/32017721846)
  在 Linux 全量通过（6 分 23 秒）。
- 插件 Host TypeScript、Typert、Client TypeScript 与 tsdown browser bundle 重建通过。
- 插件 `tests.test_install` + `tests.test_plugins`：23 tests passed。
- `python3 scripts/check.py`：23 tests passed。
- DSH core 工作树为空；VLIW 终态仍只有用户原有 `VLIW_EVAL_LOG.md` 与实验 `.kersor/`，
  受保护任务 diff 为空。

## 结论与下一轮

产品修复可以 LAND；本轮算法 NO-GO。Iteration 12 必须创建全新 Session，并验证新配置
声明 ownership gate 为 required，compatibility pass 后先 seal，DSH Workflow 恰好调用
一次，返回后的第一步 verify。成功标准不是先追求更低 cycles，而是所有 child 只返回
源码／分析、host 只在当前 Session 落盘候选、ownership 为 pass，再由候选绑定的
correctness 与 benchmark 决定是否安装。
