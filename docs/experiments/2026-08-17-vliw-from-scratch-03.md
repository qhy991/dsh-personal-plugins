# Iteration 03 — Status 输出必须通过 DSH 边界

## 假设

修复 skill 发现后，新的 KerSor preset 会话应在任何任务文件修改前依次完成：加载 `kersor` skill、解析 checkout、组合 task-directory `optimize` 路由、调用 `kersor_status`。任一必需入口失败都必须停止，不能退化为普通 coding agent。

## 真实复现

在端口 3191 启动全新 DSH Web Host，选择官方 VLIW eval worktree 与 KerSor preset。新会话的原始轨迹证明：

1. 初始 `skill-catalog` 包含 `kersor`，`Skill kersor` 成功。
2. bridge 成功解析当前 KerSor checkout。
3. `compose optimize --path . --json` 成功。
4. 首次 `kersor_status` 被 DSH 拒绝：`value.started_at is not a declared property (additionalProperties: false)`。
5. 会话被人工停止时，VLIW 工作树没有新增 KerSor Session，也没有任务代码改动；`perf_takehome.py` 仍与 verified `c6dbf8b` 一致，protected diff 为空。

## 根因

Iteration 02 为 bridge 的结构化 `status` 输出增加了 `started_at`，但只同步了 classic viewer 类型，没有同步 preset 内 `kersor_status` 的严格输出 schema。既有测试直接调用 `execute()` 和 `render()`，绕过了 DSH 的 output-schema validator，因此没有覆盖真实失败边界。

另一个行为证据是：状态工具失败后，agent 仍继续读取优化协议。适配 skill 虽要求先调用 status，却没有明确 fail closed。

## 实现

- `kersor_status` schema 增加 nullable `started_at`，并把它列入 required keys 与 presentation metadata。
- 回归测试精确比较实际 status 顶层 keys、schema properties 和 required keys；任何生产者/消费者漂移都会失败。
- KerSor skill 增加 fail-closed 规则：status、composer 或必需 protocol 失败时，在 mutation 前停止，禁止模拟或绕过。
- 原先隐藏在 `whenToUse` 的触发范围并入 catalog 可见的 `description`，frontmatter 收敛为 `name + description`。
- VLIW 教程把 `compose optimize` 与 `kersor_status` 成功列为 mutation 前置门，并补充用户排障路径。

## 验证

- `python3 scripts/check.py`：18 项通过；status 测试同时校验实际 keys、schema properties 与 required keys。
- `skill-creator/scripts/quick_validate.py`：`Skill is valid!`。
- `scripts/install.py --force` 成功，最终旧 preset 保存在 `kersor.backup-20260817-093241`；bridge、status plugin 与 skill 的安装文件逐字节匹配仓库。
- 在端口 3192 的全新 DSH Host 对同一 VLIW 工作区运行只读 live probe：
  - `Skill kersor` 成功；
  - composer 返回 `ready=true`、`/kersor:optimize .`；
  - `kersor_status` 成功，返回 `found=false`、`started_at=null`，不再触发 schema 错误。
- probe 后没有创建 `.kersor/`，`perf_takehome.py` 仍逐字节匹配 `c6dbf8b`，`git diff origin/main -- tests/ problem.py` 为空。

## 下一轮

继续同一官方基线评测，观察 task-directory compose 是否真正建立 Session v2、选择 VLIW-native Workflow、生成 Attempt Result，并在“KerSor 活动”侧栏实时呈现，而不是仅完成 skill/status preflight。
