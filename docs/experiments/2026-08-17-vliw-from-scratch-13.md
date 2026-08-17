# Iteration 13 — 把 baseline 手写 Markdown 变成确定性入口

## 假设

Iteration 12 已把“从头开始”升级为 `--fresh-session` 物理 preflight。本轮从 Anthropic
官方 starter 的新 worktree 验证该边界能否通过，并继续建立 Session 自有 baseline
witness。唯一主问题是：在不读取任何旧 Session 的前提下，DSH agent 能否可靠完成
baseline gate。

## 固定边界

- KerSor 起点：`0281ffb`
- 插件起点：`cf1d72a`
- 官方 VLIW base：`origin/main@5452f74`
- fresh worktree：`vliw-dsh-takehome-eval-13`
- branch：`eval/dsh-kersor-vliw-takehome-13`
- `perf_takehome.py` SHA-256：
  `af14cbb2e8666aaba375aa6875e731b176875cb89b6f870473ae05cda979c15d`
- `problem.py` SHA-256：
  `fadb0f0858e2259f5759077a5544b9906dad3ceee80d37b4f0aa77da730c93c9`
- correctness：`python tests/submission_tests.py CorrectnessTests.test_kernel_correctness`
- benchmark：`python tests/submission_tests.py SpeedTests.test_kernel_speedup`
- `tests/`、`problem.py`、`perf_takehome.py` 在 baseline gate 内只读。

## 正式 Session 13

DSH workspace ID 为 `b85569ee-5981-4717-a19a-fc7645d095f3`。首个 DSH 对话
`session-b08e6284-cd54-4b68-9bcd-6815203b4ff8` 只读取当前 checkout protocol、当前
task oracle 和当前 workspace status，没有读取旧 `.kersor` Session；随后按合同执行：

```bash
bash "$kersor_root/scripts/setup-session.sh" "$task_dir" \
  --fresh-session \
  --integration-pattern custom_simulator \
  --allow-workflow-authoring \
  --workflow-authoring-budget 1 \
  --max-workflows 1 \
  --mode explore \
  --target-speedup 8.0
```

创建的唯一 KerSor Session 是 `20260817-190809`。配置证据：

- `fresh_session_required=true`
- `baseline_witness_required=true`
- `candidate_ownership_required=true`
- `integration_pattern_contract=custom_simulator`
- retrieval、experience、transfer、KernelWiki experience export 全部 `off`
- `python_reference/python · custom_simulator · explore`

真实 3197 UI 先显示绿色 `从零隔离：通过`，baseline、DSH compatibility 与 ownership
均为 pending，证明 Iteration 12 的修复在全新官方 worktree 上成立。

## 基础设施观察：租户 TPM 与无效 compaction 路径

Infini-AI 的 `deepseek-v4-flash` 与 `deepseek-v4-pro` 都在连续模型步之间触发租户级
TPM 429；官方 provider catalog 可见，但本机没有其凭据，因此 DSH 正确 fail closed，
本轮没有请求或存储新凭据。

首个对话读取完整 protocol 后达到 63,632 pressure tokens。向临时 DSH 发送合法
`/compact` 输入只返回普通 `accepted:true`，没有 `command` 字段、`command/*` 或
`compaction/*` 事件，pressure 也没有下降；该 3197 组合未提供可验证的手动压缩路径。
因此使用同一 workspace、同一 KerSor Session 新建短上下文 DSH 对话
`session-4a28ce25-bfe0-4e86-ab3d-19de9eff989c`。它把首次输入降到 3.8K tokens，加载
同一个 KerSor skill，并通过 `kersor_status {}` 确认唯一 Session；没有创建第二个
KerSor Session。

## 新失败：`Baseline Status` 手写字段遗漏

为适应 provider 每分钟只能完成约一个模型步的约束，第二个对话被要求把 test method、
record 与 verify 放在一次 Bash 工具调用中。它创建了两条命令，但把命令包在 Markdown
code span 中，并漏掉第三个机器必需字段：

```markdown
- Baseline Status: present
```

`baseline-witness.py record` 在执行 correctness 或 benchmark 前 fail closed：

```text
BASELINE WITNESS BLOCK: Baseline Status must be present before recording, found unknown
```

按本轮合同，这个 gate 一旦失败就不能原地修补。Session phase 置为 `stalled`，规范
失败证据写入 `run-1/baseline-gate.json`，完整终态写入 `round-1-summary.md`。没有
`baseline-witness.json`，两条测试均未执行，selection、authoring、Workflow、candidate
与 winner 都未开始。两份受保护 starter hash 与创建前一致。

## 根因

KerSor 的 canonical optimize protocol 知道 `test-method.md` 必须含三类字段，但 DSH
adapter 的最短路径只展示后续 `record`/`verify`。当 exact task-native 命令已知时，
agent 仍需手写 Markdown；字段名、status 与 code-span 语义成为无价值的格式风险。
这是产品可消除的输入错误，不是 VLIW 算法失败。

## 产品修复

KerSor 新增唯一 task-native 初始化入口：

```bash
python3 "$kersor_root/scripts/baseline-witness.py" init \
  --session "$SESSION_DIR" \
  --correctness-command "$CORRECTNESS_COMMAND" \
  --benchmark-command "$BENCHMARK_COMMAND"
```

`init` 原子创建 `test-method.md`，写入两条单行命令与
`Baseline Status: present`；空命令、多行输入与覆盖既有 owner 都 fail closed。它不会
替代需要 tolerance、environment 与用户确认的完整 `test-harness-synthesizer` 路径，
只收敛本轮已出现的 host-owned task-native 第二用例。

DSH skill 改为 `init → record → verify`，禁止手写最小 Markdown 或用 code span 包命令。
bridge 不复制 witness parser，而只根据规范 artifact 投影三个下一步：

- 无 `test-method.md`：`init`
- 有 method、无 witness：`record_verify`
- 规范失败报告或 verify fail：`new_session`

失败理由来自当前 round 的 `baseline-gate.json` 或 canonical verifier stderr，并压成有界
单行字符串。更早的 fresh isolation 为 fail 时不显示 baseline action，防止 UI 建议越过
上游 gate。`kersor_status`、presentation meta、Host TypeScript、Typert、browser 类型和
built bundle 使用同一字段。

## 可视化

Session 卡在 gate 徽标下面新增 baseline action callout。只重启 3197 临时实例后，
Session 13 成为首卡并显示：

- `从零隔离：通过`
- `基线见证：失败`
- `下一步：新建 Session 后重试`
- `Baseline Status must be present before recording, found unknown`
- 完整 `STALLED` decision

真实 DOM 的 `data-baseline-action=new_session`，左边框与 label 计算色均为
`rgb(236, 19, 19)`；title 也是完整 blocker。Session 12 因 method 不存在显示
pending baseline，但其 fresh isolation 已 fail，因此 action 被正确抑制；bridge fixture
另行覆盖 fresh pass + 无 method 的 `init` 状态。用户的 3080 listener 仍是 PID 91238，
未重启。

## 当前验证

- 新 CLI 的 red phase：3 个 `init` 测试按预期失败（尚无子命令）。
- KerSor 聚焦：`tests/test_baseline_witness.py` 10 passed。
- KerSor macOS Python 3.11 全量：1516 passed、7 skipped（596.15 秒）。
- DSH bridge 聚焦：4 个 status/session/tool 端到端安装测试通过。
- Host TypeScript、Typert、Client TypeScript 与 browser bundle 重建通过。
- 插件完整：25 tests passed。
- live 3197 UI 与 DOM style 验收通过。
- DSH core 工作树保持干净；VLIW worktree 除当前 `.kersor/` 外无 diff。

## 结论与下一轮

Session 13 是有效的基础设施／合同失败，不是算法结果；修复可以 LAND。Iteration 14
必须从另一个官方 fresh worktree 与新的 KerSor Session 开始，使用 `init` 原子创建
test method，首先要求 baseline witness pass，再进入唯一 Proposal author 与一次 DSH
Workflow。provider TPM 仍按独立基础设施事实记录，不能成为绕过 agent workflow 的理由。
