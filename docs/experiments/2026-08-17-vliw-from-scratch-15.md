# Iteration 15 — 固定 KerSor Session 的唯一启动入口

## 本轮问题

Iteration 14 已禁止 DSH agent 直接解析 `session-config.json`，并要求通过
`kersor-state.sh get` 验证稳定投影。本轮只验证再往前的一步：agent 能否从插件合同
可靠定位 Session setup 的真实可执行入口，然后完成
`setup → state projection → baseline init → record → verify`。

成功标准是：不读取旧 Session，不猜 raw JSON，不修改官方题目 oracle；只有 setup 和
八项投影全部通过后才允许执行 baseline，baseline 通过前不进入 workflow selection 或
authoring。

## 从零边界

- 官方基线：`origin/main@5452f74`
- worktree：`vliw-dsh-takehome-eval-15`
- branch：`eval/dsh-kersor-vliw-takehome-15`
- DSH workspace：`4bfd087e-412e-49e3-a547-c95d5e314737`
- DSH session：`session-dc4edbf7-eaca-43f0-8255-38f4aee030ec`
- model：`infini-ai/deepseek-v4-pro`
- `perf_takehome.py` SHA-256：
  `af14cbb2e8666aaba375aa6875e731b176875cb89b6f870473ae05cda979c15d`
- `problem.py` SHA-256：
  `fadb0f0858e2259f5759077a5544b9906dad3ceee80d37b4f0aa77da730c93c9`

第一个 DSH turn 只加载 KerSor skill 并调用 `kersor_status {}`；当前 worktree 没有
Session。第二个 turn 被要求在一个 Bash 调用内完成 setup、稳定投影验证和 baseline
witness 三步，任何命令失败都必须立即停止。

## 真实失败

Agent 正确解析了 bridge 所返回的 checkout root，但把 setup 入口拼成：

```text
$kersor_root/commands/setup-session.sh
```

实际唯一 owner 是 `scripts/setup-session.sh`。DSH tool result 为：

```text
bash: .../KerSor/commands/setup-session.sh: No such file or directory
[exit code: 127]
```

因为 Bash 使用 `set -euo pipefail`，执行在第一条 KerSor 命令处停止：没有创建
`.kersor` Session、没有 `test-method.md`、没有 baseline witness、没有运行题目测试，
也没有进入 selection、authoring 或 candidate mutation。随后 provider 返回租户 TPM
429，但它发生在工具失败之后，不改变根因分类。

官方 `perf_takehome.py` 与 `problem.py` hash 保持不变。本轮因此是 session bootstrap
合同失败，不是 VLIW 算法 NO-GO，也不是 baseline 结果。

## 根因

插件告诉 agent “读取 `$kersor_root/commands/<name>.md` 协议”，也分别示范了
`kersor-state.sh` 和 `baseline-witness.py` 的 `scripts/` 路径，却没有明确写出 Session
启动的可执行路径。模型把协议目录和脚本目录合并成了一个不存在的路径；同时它也没有
从当前 owner 的 usage 中继承必需的第一个任务路径参数。

这不是需要兼容 alias 的理由。最小修复是让适配器固定唯一 owner，而不是在
`commands/` 再复制一个 wrapper。

## 产品修复

KerSor DSH skill 现在明确规定：

1. 唯一入口是 `bash "$kersor_root/scripts/setup-session.sh" "$TASK_DIR" ...`；
2. `$TASK_DIR` 是不可省略、不可重排的第一个位置参数；
3. `commands/` 只拥有 Markdown protocol，不拥有 setup executable；
4. 只有 setup 零退出后才能消费 `SESSION_DIR`；缺失入口或非零退出必须硬停止。

README 与 VLIW 教程同步给出同一条命令，bundle 版本提升到 `0.1.13`。安装测试新增
字面合同，防止未来再次把入口漂移回 `commands/`。

## 验证与版本

- 红相：入口合同断言失败，证明旧 skill 没有唯一 setup 路径。
- 修复后定向测试：`1 passed`。
- 插件完整检查：`python3.11 scripts/check.py`，`26 tests passed`，metadata、
  portability 与 installer contracts 全部通过。
- 构建：`python3.11 scripts/build.py --dsh-root <checkout>` 通过，viewer host 与
  browser bundle 均生成成功。
- 安装 smoke：安装后的 skill 同时包含唯一 `scripts/setup-session.sh` 命令和
  `Never call it from commands/` 约束。
- commit / push：待填写。
- GitHub Actions：待填写。

## 决策与下一轮

缺陷可复现、修复边界小，而且没有制造第二个 setup owner，因此可以 LAND。
Iteration 16 必须使用另一个全新的官方 worktree 和 DSH Session，从 skill 自己读取
`scripts/setup-session.sh <task>`，再验证八项稳定投影和
`baseline-witness.py init → record → verify`；如果这三段全部通过，才继续进入 proposal
authoring 与一次 DSH Workflow ownership 闭环。
