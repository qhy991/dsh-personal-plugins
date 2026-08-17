# Iteration 12 — 把“从头开始”从提示词升级为 Session 历史隔离

## 假设

Iteration 11 已把 DSH child 的候选写入边界变成 Workflow 前后独立门禁。第 12 轮原计划
验证正常 child 是否只返回数据并让 ownership pass；但更早的执行暴露了优先级更高的
问题：当用户明确要求从头开始时，parent 是否真的不会读取旧 Session。

## 固定边界

- DSH：`47f9438`
- KerSor 起点：`a4c0c5b`
- 插件起点：`5b12092`
- VLIW eval HEAD：`868d29a`；受保护算法 checkpoint：51478 cycles
- 权威 correctness：`python tests/submission_tests.py CorrectnessTests.test_kernel_correctness`
- 权威 benchmark：`python tests/submission_tests.py SpeedTests.test_kernel_speedup`
- `perf_takehome.py`、`tests/`、`problem.py` 均为只读 owner；本轮不得读取任何旧
  `.kersor` Session 的 test method、baseline、Proposal、candidate 或 round 结论。

## 正式 Session 12

- Session：`20260817-181348`
- `kernel_language=python_reference`
- `backend=python`
- `integration_pattern=custom_simulator`
- `allow_workflow_authoring=true`
- `workflow_authoring_budget=1`
- `max_workflows=1`
- target：8.0x

模型服务在 setup 前多次耗尽 2/2 retry；这些 transport failure 没有执行 KerSor 操作，也
没有改变任务文件。服务恢复后，parent 正确拒绝继续 Session 11 并创建 Session 12。

## 新失败：baseline 前读取旧 Session

在当前 Session 尚无 `test-method.md`、尚未执行 baseline witness 时，parent 运行：

```bash
cat "$TASK_DIR/.kersor/20260817-165546/test-method.md" 2>/dev/null || echo "NO_FILE"
```

它由此导入旧 Session 的 51478 cycles、8/8 correctness、witness、环境和 target。该 shell
卡片在真实 DSH 页面展开后确认，不是根据聊天措辞推断。监督在 baseline 创建前停止本轮，
没有 selection、workflow authoring、DSH compatibility、Workflow call、candidate 或算法
成绩。规范 Session phase 被写为 `stalled`，机器失败证据为
`run-1/fresh-session-boundary.json`，完整理由写入 `round-1-summary.md`。

本轮算法结论是未开始，不是 NO-GO；受保护 checkpoint 保持 51478 cycles。

## 根因

“禁止读取旧 Session”只有 prompt，没有 setup 不变量。只要旧 `.kersor/<timestamp>` 与新
Session 共存于工作区，parent 就可以在任何 deterministic baseline gate 之前读取它；
baseline witness 能证明一次命令在 Session 后执行，却不能证明测试方法与初始数值没有
来自历史 Session。

仅设置一个新的外置 `KERSOR_SESSION_ROOT` 也不充分：若任务目录自己的 `.kersor` 仍在，
历史文件照样可见。因此边界必须同时检查选定 Session 根和任务工作区。

## 产品修复

KerSor 新增 `--fresh-session` 作为 setup 合同：

- 在分配新 Session 前，检查选定 Session 根与任务工作区 `.kersor`；任何有效或 partial
  时间戳 Session 都 fail closed；
- 禁止 `--resume` 与 `--seed-analysis`；
- 强制关闭 retrieval、experience、transfer 与 KernelWiki experience export；
- 在 Session config 写 `extensions.fresh_session_required=true`；
- compose、`/kersor:optimize`、README、changelog 与 workflow-author dispatch 继续传递
  同一边界。

推荐路径是 fresh worktree。外置空 `KERSOR_SESSION_ROOT` 只有在任务工作区自身没有
`.kersor` 历史时才有效。该检查隔离测试工作区内的 Session 历史；它不是操作系统级
filesystem sandbox，因此 DSH skill 仍明确禁止主动搜索其他 worktree 或绝对路径历史。

DSH preset skill 同步规定：用户说 “from scratch”“fresh”或“从头开始”时必须传
`--fresh-session`，不得检查旧 Session 来找 baseline、策略或候选。prompt 现在是对物理
preflight 的说明，而不再独自承担边界。

## 可视化

bridge、`kersor_status`、Host Typert、browser remote、TypeScript source 与 built bundle
新增同一个 `fresh_session` gate：

- future `fresh_session_required=true` 且无失败报告：pass；
- 当前 round 有 `fresh-session-boundary.json`：以报告 pass/fail 为准；
- 历史 Session 没有声明且没有报告：不显示该徽标。

重新安装 preset 与 Web bundle、只重启 3197 测试实例后，真实 Session 12 首卡显示：

- `从零隔离：失败`
- `基线见证：待验证`
- `DSH 兼容：待验证`
- `候选所有权：待验证`
- 完整 `STALLED` 原因

红色 fresh 徽标与另外三个独立 gate 并存，准确表达“执行在 baseline 前因历史污染停止”，
而不是错误宣称 baseline 或 Workflow 已失败。用户的 3080 DSH 进程没有被重启。
真实 DOM 中该徽标为 `data-gate=fail`，计算后的文字颜色是 `rgb(236, 19, 19)`。

## 验证

- KerSor 聚焦：38 tests passed、1 skipped；覆盖 storage root、task workspace、seed、compose
  与 author dispatch 边界。
- KerSor macOS Python 3.11 全量：1513 passed、7 skipped（589.41 秒）。系统 Python 3.14
  的 `unittest discover` 不是项目全量入口；无范围的 pytest 还会递归收集两个 attempts
  镜像并触发同名模块冲突，因此权威命令固定为 `python3.11 -m pytest -q tests`。
- KerSor commit `0281ffb` 的
  [GitHub CI 32022078721](https://github.com/qhy991/KerSor/actions/runs/32022078721)
  在 Linux 全量通过（6 分 32 秒）。
- 插件 Host TypeScript、Typert、Client TypeScript 与 browser bundle 重建通过。
- `python3 scripts/check.py`：24 tests passed。
- 插件 commit `baeea11` 的
  [GitHub Validate 32022082372](https://github.com/qhy991/dsh-personal-plugins/actions/runs/32022082372)
  通过。
- 真实 3197 页面包含 `从零隔离：失败`，Session 12 为首卡且 phase 为 `stalled`。
- DSH core 工作树保持干净；VLIW 受保护任务 diff 保持为空。

## 结论与下一轮

产品修复可以 LAND；Session 12 在 baseline 前按证据终止，没有算法结果。Iteration 13
必须从 fresh worktree 启动并显式传 `--fresh-session`。首先验证 setup 产生
`fresh_session_required=true`、四个历史 transfer source 全部关闭、fresh 徽标为 pass；
之后才允许创建当前 Session 自有 test method 与 baseline witness，再继续 selection、
authoring 和恰好一次的 DSH Workflow。
