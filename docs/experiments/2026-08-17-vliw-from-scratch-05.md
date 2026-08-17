# Iteration 05 — Python/VLIW 必须走 task-native authoring，并保护 checkpoint

## 假设

显式携带 `custom_simulator` 与 bounded workflow authoring 后，KerSor 应把
VLIW take-home 冻结为 `python_reference/python`，先拒绝不兼容的 GPU Workflow，
再通过 Phase 3.6 创作 session-scoped Proposal。DSH 应直接显示这条路由和 authoring
预算；任何结构合法但会在证明前覆盖 checkpoint 的 Proposal 都必须 KILL。

## 固定边界

- DSH：`47f9438`
- KerSor 起点：`f059447`；task-native 路由修复：`90d491d`
- 插件起点：`5cd16e6`
- VLIW eval HEAD：`868d29a`；算法 checkpoint：`c6dbf8b`
- 官方 starter：147734 cycles
- 当前已验证 checkpoint：51478 cycles（8/8 correctness）
- 只允许 Session artifact 变化；不得修改 `tests/`、`problem.py` 或未胜出的
  `perf_takehome.py`。

## 产品修复

KerSor 的 direct compose 现在转发 runtime、integration pattern 与 bounded authoring
参数；普通 Python 被识别为 `python_reference/python`，只有有源码证据的 Triton 才
升级为 `triton/triton`。author context 与 scaffold 保留冻结的 integration pattern。

DSH bridge、status card 与 Web viewer 同步增加：

- `integration_pattern`
- `allow_workflow_authoring`
- `workflow_authoring_budget`

Session 卡用独立 badge 显示 route 与 authoring 预算；built schema、Host remote 与
Client bundle 使用同一字段合同。

## 正式 Session 05

第一次从空对话启动时仍处于“标准模式”。Agent 得到
`skill "kersor" is unknown or no longer available`，随后准备自行寻找 checkout；在
任何代码修改前停止。该证据说明安装成功不等于会话已启用 KerSor preset。

重新新建会话并先选择 **KerSor** preset 后，skill 正常加载。Agent 依次完成
`kersor_status`、compose preflight 与新 Session setup：

- Session：`20260817-110122`
- `kernel_language=python_reference`
- `backend=python`
- `integration_pattern=custom_simulator`
- `allow_workflow_authoring=true`
- `workflow_authoring_budget=1`

Round 1 初次 selection 为 `STALLED`；KSearch 等 released Workflow 因
`integration_pattern mismatch` 被确定性拒绝，不再出现 Python→Triton 与 GPU-only
伪高 fit。

## Phase 3.6 发现的两个边界缺陷

Agent 成功生成 VLIW-native `workflow.js`、metadata 与 rationale，但默认
`save-authored-workflow.sh` 试图把 Proposal 写入 KerSor checkout，触发 DSH
Workspace Write 的 `Operation not permitted`。脚本本身已有 `--store`，缺陷在协议：
Phase 3.6 没有显式指定 Session owner。

修正为：

```bash
save-authored-workflow.sh --from "$SESSION_DIR/workflow-authoring/staging" \
  --store "$SESSION_DIR/workflow-authoring/proposals"

KERSOR_PROPOSALS_DIR="$SESSION_DIR/workflow-authoring/proposals" \
  generate-catalog.sh "$WORKFLOW_DIR" "$SESSION_DIR/workflow-catalog.json"
```

Proposal 随后通过 7/7 结构门，Catalog 重建成功，同轮 re-selection 选中
`vliw-packing-optimizer`，KSearch 仍保留明确 rejection。

人工语义审查又发现 `workflow.js` 的 Evaluate prompt 要求先把 candidate 写入
`KERNEL_PATH` 再测试，且没有事务回滚。结构门不能证明 checkpoint ownership。
因此本 Proposal 记录为 `KILL/needs_revision`，未 dispatch：Workflow 只能返回
candidate 或评测 Session-local 副本；winner install 必须由外层 optimize 在
correctness pass 且 cycles 严格小于 51478 后唯一执行。

Agent 首次口头报告“terminated”时 `state.json` 仍为 `optimizing`。用规范
`kersor-state.sh ... phase stalled` 迁移后，bridge 返回 `phase=stalled`，round decision
包含完整 KILL 理由。Markdown 总结不再冒充状态变更。

## 可视化证据

authoring 期间，真实 3197 页面首卡显示：

- `20260817-110122`
- `活跃 · 第 1/20 轮 · optimizing`
- `python_reference/python · explore · v2`
- `custom_simulator`
- `可创作 · 预算 1`
- `Workflow：STALLED`

规范终止后无需刷新配置，面板自动变为“最近 20 个 · 0 个活跃”，首卡显示
“已结束 / stalled”，同时保留 route、authoring 预算与
`Workflow：vliw-packing-optimizer`。这证明 canonical phase 与 advisory health 的
投影一致。

## 验证

- KerSor task-native 修复全量回归：1476 passed、7 skipped；本轮追加协议回归先以
  `15 passed, 1 skipped` 定向验证，再运行最终全量回归：1478 passed、7 skipped
  （571.74 秒）。session-safe 协议修复提交为 `0d657f9`。
- DSH 原生 Host/Client project build 与全 workspace lib build 成功。
- DSH viewer 原生 Vitest：5 files、35 tests 全部通过。
- `python3 scripts/check.py`：22 tests 全部通过；覆盖 bridge/status schema、built
  route badges、Workspace registry 与 preset skill 合同。
- DSH 主仓库构建后恢复为 clean；临时构建保存在
  `/private/tmp/dsh-kersor-iter5-build-20260817-105400`。
- preset 旧版保存在
  `~/.dsh/.agent-presets/kersor.backup-20260817-112152`。
- VLIW `git diff HEAD -- perf_takehome.py` 为空；工作树仍只有用户原有
  `VLIW_EVAL_LOG.md` 与 `.kersor/` 状态。

## 结论与下一轮

产品修复 LAND；本轮 authored Workflow KILL。KerSor 已能从 DSH 中正确完成
Python/VLIW 分类、STALLED、task-native authoring、session-local Catalog 与终态
可视化，但首次生成的 Proposal 仍缺少 checkpoint-safe output ownership。

下一轮从新的 KerSor preset Session 复测 authoring：要求第一次生成就只返回 candidate
或使用 Session-local 副本，并减少本轮 108 步、两次 seed quoting 失败、一次错误的
Catalog 手工重建和补做终态迁移。只有安全 Proposal 才进入 51478-cycle 后续优化。
