# Iteration 14 — 不让 DSH agent 猜 Session JSON 形状

## 假设

Iteration 13 已用 `baseline-witness.py init` 消除最小 `test-method.md` 的手写格式风险。
本轮从另一个官方 fresh worktree 验证 `setup → init → record → verify` 能否一次完成。
唯一主问题是 agent 在 baseline 前能否可靠确认 fresh、baseline、ownership、integration
与 transfer-mode 合同。

## 固定边界

- KerSor：`bec7b09`
- 插件：`3a62a23`
- 官方 VLIW base：`origin/main@5452f74`
- fresh worktree：`vliw-dsh-takehome-eval-14`
- branch：`eval/dsh-kersor-vliw-takehome-14`
- `perf_takehome.py` SHA-256：
  `af14cbb2e8666aaba375aa6875e731b176875cb89b6f870473ae05cda979c15d`
- `problem.py` SHA-256：
  `fadb0f0858e2259f5759077a5544b9906dad3ceee80d37b4f0aa77da730c93c9`
- correctness 与 benchmark 沿用官方两个单测；baseline gate 内三个 task owner 只读。

## 正式 Session 14

- DSH workspace：`061b253d-4d5c-4a53-aae4-68c7bffc4799`
- DSH session：`session-9aca93be-da3a-4838-9ba4-479a3276f649`
- KerSor Session：`20260817-195608`

首个 DSH turn 只加载 KerSor skill 并调用 workspace-scoped `kersor_status`，确认没有
Session 或 `.kersor` 历史。第二个 turn 在一次 Bash 调用中执行
`setup-session.sh --fresh-session`，正确创建 `python_reference/python`、
`custom_simulator`、authoring budget 1、target 8x 的 Session；四个 transfer source
均为 off，fresh/baseline/ownership required 均为 true。

## 新失败：raw JSON shape 猜测

同一 Bash 随后用 Python 直接读取：

```python
json.load(open(config))["fresh_session_required"]
```

`session-config.json` 的不可变 owner 把兼容字段放在 `extensions` 下，因此该调用以
`KeyError: 'fresh_session_required'` 结束。`setup-session.sh` 同时输出的 `state.md`
投影把这些字段展示为顶层，进一步说明 storage shape 与兼容读取面不是同一个合同。

本轮明确规定任何失败都不重试，所以 Session 置为 `stalled`；机器证据写入
`run-1/session-contract-gate.json`，完整终态写入 `round-1-summary.md`。没有
`test-method.md` 或 `baseline-witness.json`，没有测试、selection、authoring、Workflow、
candidate 或 winner。受保护 starter hash 未变。

## 根因

DSH skill 说要验证 frozen Session 字段，却没有指定稳定读取面。agent 只能在 raw JSON、
`state.md` 和 `kersor-state.sh` 之间猜测，并把 storage layout 当成公共 API。KerSor 已有
`kersor-state.sh get` 兼容适配器，可读取 extension 与普通 config/state 字段；无需再造
第二个 verifier 或复制 schema。

## 产品修复

KerSor DSH skill 现在明确禁止直接解析 `session-config.json`，并给出唯一读取路径：

```bash
bash "$kersor_root/scripts/kersor-state.sh" "$SESSION_DIR" get <field>
```

fresh task-native baseline 前依次验证：

- `fresh_session_required=true`
- `baseline_witness_required=true`
- `candidate_ownership_required=true`
- `integration_pattern=<grounded pattern>`
- retrieval、experience、transfer、KernelWiki experience export 均为 `off`

任何 mismatch 都 hard stop，但不得编辑 raw Session JSON。主 README 与 VLIW 教程同步
同一合同。

bridge 也修正 action 顺序：terminal Session 若 baseline 仍 pending，不再显示可继续的
`init`/`record_verify` callout；只有 baseline 自己 fail 时才显示 `new_session` 恢复提示。
这避免 Session 14 已 stalled 后 UI 仍建议原地初始化。

## 验证

- skill 安装合同包含稳定 state adapter 与全部必需字段。
- bridge regression 覆盖 terminal + pending baseline → action `null`。
- `python3 scripts/check.py`：26 tests passed。
- 安装 preset 后，真实 3197 UI 的首卡为 Session 14，显示 fresh pass、baseline pending、
  terminal decision，且 `data-baseline-action` 不存在；Session 13 的真实 baseline fail
  仍保留 `new_session`，证明 suppression 只作用于未完成的下游 gate。
- 3080 listener 仍为 PID 91238，未重启；VLIW task owner hashes 未变。

## 结论与下一轮

Session 14 是 setup contract 读取失败，不是算法 NO-GO。修复可 LAND。Iteration 15 必须
从新的官方 fresh worktree 与新的 KerSor Session 开始，在同一 Bash 中只使用
`kersor-state.sh get` 验证 setup，然后执行 `init → record → verify`；baseline pass 前
仍不得进入 Proposal 或 Workflow。
