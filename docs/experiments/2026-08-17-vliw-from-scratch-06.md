# Iteration 06 — 首次生成安全 Proposal，并把状态入口收敛为当前工作区

## 假设

修复 Session-local Proposal store 后，新的 KerSor preset 会话应能在第一次创作时
生成不覆盖 `perf_takehome.py` 的 VLIW-native Workflow，并在同一 round 完成 Catalog
重建、selection 与 fit check。DSH 卡片还应直接呈现 canonical round decision 的完整
理由，而不是只显示 `stalled`；`kersor_status` 则不应再给 Agent 一个猜测 checkout
路径的机会。

## 固定边界

- DSH：`47f9438`
- KerSor 起点：`0d657f9`
- 插件起点：`95d10f4`
- VLIW eval HEAD：`868d29a`；算法 checkpoint：`c6dbf8b`
- 官方 starter：147734 cycles
- 本轮 checkpoint：51478 cycles，starter speedup 2.869847×
- `perf_takehome.py`、`tests/` 与 `problem.py` 全程只读；本轮只验证到安全
  Proposal、同轮选择和 fit，不 dispatch、不安装 candidate。

两处 GitHub `main` 在修改前均已 fetch；KerSor 与插件仓库的 ahead/behind 都是
`0/0`。

## 产品修复

DSH classic Session summary 现在从 canonical round summary 投影最新完整 decision，
Host/remote 类型与 Client 卡片保持同一字段合同。卡片在 workflow footer 下显示两行
理由，悬停可查看全文。真实页面验证了 Iteration 05 的终止理由：

> STALLED: Proposal KILL/needs_revision — workflow.js Evaluate phase writes
> candidate directly to KERNEL_PATH ...

状态入口进一步做了减法：`kersor_status` 不再接受 `path`，只读取当前 DSH session
workspace；skill 与 tool description 都要求用空对象 `{}` 调用，避免把 KerSor checkout
误当任务路径。KerSor optimize/workflow 协议中的 `workload-census.py`、
`author-workflow-context.py` 和 scaffold 示例统一使用显式 `python3`，不再让 Agent
猜解释器入口。

## 正式 Session 06

- Session：`20260817-115244`
- `kernel_language=python_reference`
- `backend=python`
- `integration_pattern=custom_simulator`
- `allow_workflow_authoring=true`
- `workflow_authoring_budget=1`
- target：8.0×

Agent 最初仍把 KerSor checkout 传给旧版 `kersor_status`，被 workspace boundary 正确
拒绝；它也一度尝试复用 Iteration 05 的 profile/roofline/proposal。插话后，Agent 停止
旧 author 子代理，重新读取当前 `perf_takehome.py`、`tests/submission_tests.py` 与
`problem.py`，重写本 Session 的 test method、profile 与 task spec，再从当前 Session
创作 Proposal。

新 Proposal 保存到：

```text
.kersor/20260817-115244/workflow-authoring/proposals/vliw-packing-optimizer/
```

结构验证 7/7 通过，Catalog 使用同一个 `KERSOR_PROPOSALS_DIR` 重建。同轮 selection
只留下 `vliw-packing-optimizer`；它以 authored/probation 身份被 fallback 选中，原有
KSearch 因 `custom_simulator` mismatch 被拒绝。确定性 fit 与合并后的 judge 均为
`fit_confidence=high`、`needs_adaptation=false`。

## Output ownership 语义审查

> **Iteration 07 事后更正：** 本节只证明了输出路径所有权，不能证明 dispatch
> evidence safety。Proposal 的 evaluator 虽然导入了 Session-local candidate，随后调用的
> harness 仍从 `tests.submission_tests.KernelBuilder` 解析 canonical 实现，因此并未实际
> 执行被声明的 candidate。下述“通过”仅保留为当时的 ownership 结论；本 Proposal
> 现在追溯标记为 false candidate binding，不可 dispatch。

本轮 Proposal 首次生成即通过语义边界：

- `KERNEL_PATH` 只出现在读取和“不得修改”的提示中；
- `exp_dir` 由 KerSor 固定为 `$SESSION_DIR/run-1`，Proposal 从其父目录得到当前
  Session；
- session copy、候选和 evaluator 都写入
  `$SESSION_DIR/workflow-authoring/candidates/`；
- Workflow 通过 `best_kernel_code` 返回候选，外层 optimize 保留唯一 winner install
  权限。

`git diff HEAD -- perf_takehome.py tests problem.py` 为空。因为本轮合同要求只到 fit，
在 Agent 开始追加非必要 fit-judge 修复后手动停止，没有 dispatch。

## Agent 组织与效率

主测试最终为 1 个前台 round、105 步、3 个子代理，LLM 用时 7 分 19 秒，输入约
8.9M tokens、输出 36.2K tokens。比 Iteration 05 的 108 步只减少 3 步，仍明显过重。
主要浪费来自：错误 status 路径、对旧 Session artifact 的复用、主 Agent 与
workflow-author 的重复 staging、已完成子代理先报 `unknown job` 后又迟到 settled，
以及 fit-judge JSON 形状试错。

安装新 preset 后另起最小真实 DSH 冒烟任务：Agent 加载 KerSor skill，准确调用
`kersor_status · {}`，3 步、7 秒返回 `20260817-115244`，没有路径错误，也没有文件
修改。

## 验证

- VLIW 官方 `python tests/submission_tests.py`：8 次 correctness 全部正确；51478
  cycles；通过 correctness 与 starter speedup 两项，7 个更高性能阈值按预期未过。
- KerSor 定向：21 passed、1 skipped。
- KerSor 全量：1479 passed、7 skipped（584.61 秒）。
- DSH 原生 Host/Client build 与 viewer Vitest 在本轮 UI 修改后通过：5 files、35
  tests。
- `python3 scripts/check.py`：22 tests 全部通过，覆盖 decision projection、built UI、
  空参数 status tool 与 skill 合同。
- DSH 主仓库构建后保持 clean；构建产物保存在
  `/private/tmp/dsh-kersor-iter6-build-20260817-1145`。
- preset 旧版保存在
  `~/.dsh/.agent-presets/kersor.backup-20260817-120411`。
- VLIW 工作树仍只有用户原有 `VLIW_EVAL_LOG.md` 与 `.kersor/`。

## 结论与下一轮

产品修复 LAND；output ownership PASS，但事后 candidate-binding 审查 FAIL；算法
checkpoint 未变。本轮证明 task-native authoring 已能生成不越界写入、可选且 fit high
的 Proposal，同时 DSH 能解释旧 Session 为什么终止，状态工具也收敛成无路径歧义的
单一入口；它没有证明该 Proposal 的测试证据真实绑定了候选实现。

下一轮不得 dispatch 这份 Proposal。应从新 Session 重新创作，要求候选只落在
Session-local 目录，correctness 与 benchmark 显式注入同一个 candidate，并以独立的
correctness 与 cycles `< 51478` 作为唯一安装门。同时继续压缩 staging owner、
fit-judge schema 与子代理结果回收，目标把 pre-dispatch 控制在 40 步以内。
