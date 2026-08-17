# Iteration 10 — 把 baseline 因果链与 DSH dispatch 变成机器门禁

## 假设

Iteration 09 已封住 author handoff。第 10 轮从新会话验证：首次 handoff 若完全合法，
是否能安全进入 DSH Workflow；基线、AKW Proposal 与 DSH host 三者是否共享一条可执行
合同，而不是各自只在 Markdown 中“看起来正确”。

## 固定边界

- DSH：`47f9438`
- KerSor 起点：`123157b`
- 插件起点：`1fc07b5`
- VLIW eval HEAD：`868d29a`；算法 checkpoint：`c6dbf8b`
- 官方 starter：147734 cycles
- 历史 checkpoint：51478 cycles；只有当前 Session 创建后的重测才能成为本轮 baseline
- `tests/`、`problem.py`、`VLIW_EVAL_LOG.md` 只读；`perf_takehome.py` 只有在独立
  correctness 通过且 cycles 严格下降后才允许安装。
- Iteration 09 KerSor CI：<https://github.com/qhy991/KerSor/actions/runs/32001182332>
- Iteration 09 插件 CI：<https://github.com/qhy991/dsh-personal-plugins/actions/runs/32001178764>

## 正式 Session 10

- Session：`20260817-142748`
- `kernel_language=python_reference`
- `backend=python`
- `integration_pattern=custom_simulator`
- `allow_workflow_authoring=true`
- `workflow_authoring_budget=1`
- `max_workflows=1`
- target：8.0x

Agent 在创建 Session 前执行了 checkpoint 测试，得到 51478 cycles 与 8/8 correctness，
随后把结果复制进新 Session 的 `test-method.md`。数值本身真实，但执行时间不属于当前
Session，因此不能证明当前 config、命令和 kernel 身份对应同一次 baseline。旧协议只有
prose 要求，没有机器 owner，未能阻止 selection/authoring 继续。

## Author handoff 结果

Iteration 09 的修复完整成立：唯一 workflow-author 使用机器生成的
`author-context.json.dispatch`，真实携带 `run_in_background:false`，parent 阻塞等待；
author 返回后的第一条 parent 动作是 `seal-author-handoff.py`。author 只交付
`workflow.js`、`metadata.json`、`rationale.md`，parent 未修改 staging；save 恰好一次，
Proposal `vliw-bundle-compression` 结构校验通过并进入 Session-local catalog，fit 为 high。

这是首次在 VLIW 案例中让 foreground、单 writer、hash seal、single save 和 re-catalog
同时通过。

## 新失败链

Proposal 的 AKW 结构有效，但它使用 `type: ["number", "null"]` 等 nullable JSON
Schema。DSH Workflow 只接受单字符串 `type`。当时没有 AKW→DSH 兼容门：

1. parent 第一次用错误的 module/path 形式调用 DSH Workflow，得到
   `ReferenceError: workflow is not defined`；
2. parent 自行写 `run-1/dispatch-workflow.js` 再调用，DSH 才在 tool boundary 拒绝
   nullable type arrays；
3. parent 没有终止，而是决定绕过 Workflow，开始在 `/tmp/optimized_kernel.py` 直接承担
   优化工作，并在临时副本上报告 47180 cycles 与 correctness pass；监督随后停止生成。
   这个结果来自被协议禁止的 parent-side 路径，不是 Session candidate、没有通过 KerSor
   dispatch/validation，也没有安装到受保护任务，因此不能作为本轮算法结果或新 checkpoint。

KerSor 自身的 run preflight 还记录了另一个基础设施错误：Codex broker 无法在只读的
`~/.codex/state_5.sqlite` 初始化 app-server。它没有产生候选或测量，且不能把上述 DSH
合同错误转化为可接受结果。

Session 已规范转成 `stalled`。事后使用本轮新增 adapter 对 sealed Proposal 做一次只读
复现，`run-1/dsh-compatibility.json` 确定性列出 8 个 nullable-type 错误并写
`verdict: fail`；没有生成 `dsh-workflow.json`。完整 canonical decision 位于
`round-1-summary.md`。没有候选、安装或算法提交，受保护文件 diff 为空。

## 产品修复

KerSor 新增两个确定性 owner：

- `baseline-witness.py` 在 Session 创建后执行 `test-method.md` 拥有的 correctness 与
  benchmark 命令，把 Session config、命令字段、kernel hash、时间、退出码和有界输出
  写入不可覆盖的 `baseline-witness.json`。correctness 失败时不再运行 benchmark；
  selection、author context 和 dispatch 都会重新 verify。
- `prepare-dsh-workflow.mjs` 是唯一 AKW→DSH adapter。它提取 `export const meta`，把
  body 编译为 DSH portable subset，递归检查 inline schema、hook 与 agent option，输出
  唯一的 `{meta, script, args}` envelope。报告和 envelope 使用 exclusive create；失败
  或成功后都不能在同一 round 重写或重试。

协议把 DSH 调用收敛为恰好一次
`Workflow({meta: envelope.meta, script: envelope.script, args: envelope.args})`。compatibility
或 host call 失败后，parent 不能修脚本、另造 adapter、重试或亲自优化，只能写失败证据
并把 Session 转成 `stalled`。workflow-author 同时收到 portable subset 与 oracle 只读
合同：tests、reference、problem、benchmark harness 都不能被 child 复制修改来伪造
candidate seam。

## DSH 使用体验与可视化

`kersor_status` 与 Web viewer 现在投影两个独立门禁：`baseline_witness` 和
`dsh_compatibility`。侧栏只在 authoring Session 显示它们，并用绿色／琥珀色／红色区分
pass、pending、fail；终态 decision 仍优先于历史 fit。Host Typert schema、browser
remote、TypeScript source 与 built bundle 都包含相同字段。

插件仓库还新增 `scripts/build.py`：它在临时目录重建 DSH monorepo 布局，借用指定 DSH
checkout 的固定 TypeScript runtime 生成 Host reflection 与 browser bundle，但不修改
DSH 工作树。随机临时路径、CSS module hash 与 source-region 路径会被规范化，产物可重复
生成且不泄漏机器路径。

## 验证

- KerSor 定向：51 passed、1 skipped。
- KerSor macOS 本地全量：1501 passed、7 skipped（588.46 秒）。首次 GitHub CI
  在 Linux 暴露 `/bin/zsh` 硬编码，5 个 baseline witness 测试失败；失败运行：
  [KerSor CI 32010834640](https://github.com/qhy991/KerSor/actions/runs/32010834640)。
  witness 随后改为从 `SHELL` 解析可执行 shell，并以 `bash`/`sh` 回退，同时把实际 shell
  写入每条执行证据。Python 3.11 回归 7/7 通过，相关定向测试 51 passed、1 skipped；
  修复后的 [KerSor CI 32011523115](https://github.com/qhy991/KerSor/actions/runs/32011523115)
  全量通过。
- 插件 build：Host TypeScript、Typert、Client TypeScript、tsdown browser bundle 全部通过。
- `python3 scripts/check.py`：23 tests passed。
- Iteration 10 sealed Proposal 的新 compatibility gate：确定性 fail；报告不可覆盖；无
  dispatch envelope。
- live DSH UI：Session `20260817-142748` 显示 `基线见证：无需`、红色
  `DSH 兼容：失败` 与完整 `STALLED` decision；历史 Session 仍保持各自的 pending/fail
  投影，证明状态不是前端硬编码。
- DSH core 工作树为空；VLIW 受保护文件 diff 为空，仍只有用户原有
  `VLIW_EVAL_LOG.md` 与实验 `.kersor/`。

## 结论与下一轮

产品修复通过全量与 live UI 验收，可以 LAND；本轮算法 NO-GO，checkpoint 保持 51478
cycles。越权 parent-side 临时结果 47180 cycles 明确排除在成绩与 checkpoint 之外。
Iteration 11 必须从新 Session 验证完整因果链：Session 后 baseline witness 为 pass；
author 首次交付即满足 portable subset；compatibility 为 pass 后 DSH Workflow 恰好调用
一次。任何门禁失败都应直接显示红色并在 `stalled` 边界停止。
