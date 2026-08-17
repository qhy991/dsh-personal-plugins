# Iteration 01 — VLIW from scratch：preset-local skill 发现

## 假设

用户在 DSH 选择 KerSor preset 后，agent 应能从初始 catalog 加载 `kersor` skill，并以当前 KerSor checkout 的协议组织任务。复制到 preset 目录的 `SKILL.md` 必须真实可发现，不能只存在于磁盘。

## 固定环境

- Personal plugins：`218693b`
- KerSor：`f059447`
- DSH：`47f9438`
- 任务：Anthropic Original Performance Take-Home，隔离 worktree 从官方 `origin/main` 创建
- 基线：`python tests/submission_tests.py` → `147734 cycles`
- 保护边界：不修改 `tests/`、`problem.py`；不读取现有 1085/1249 解、其他 refs、兄弟 worktree或网络现成解

## 复现

1. 在 DSH Web 添加 starter worktree。
2. 新建会话并选择 KerSor preset。
3. 要求 agent 首先调用 `skill("kersor")`。

实际结果：

```text
Skill Error: skill "kersor" is unknown or no longer available
```

同一 preset 中 `kersor_status` 可以调用，证明失败位于 skill provider 发现链，而不是整个 preset 未挂载。

## 根因

安装器把 skill 复制到：

```text
${DSH_HOME}/.agent-presets/kersor/skills/kersor/SKILL.md
```

但 DSH `skill-filesystem` 的默认根只有项目 `.dsh/skills`、项目 `.agents/skills`、`${DSH_HOME}/skills` 和 `${DSH_AGENTS_HOME}/skills`。Preset-local `skills/` 不属于任何默认根，原 composition 又没有配置 `customSkillDirs`，所以文件存在但 catalog 永远看不到它。

## 修复

`scripts/install.py` 现在基于最终安装目录生成：

```yaml
- id: skill-filesystem
  name: '@deepseek-ai/dsh-skill-filesystem'
  config:
    customSkillDirs:
      - <installed-preset>/skills
```

它复用 standard preset 已有的 provider，保留默认项目／用户 roots，只增加 KerSor preset 自己拥有的一个根。安装路径只进入生成后的用户 composition，不进入 Git 中的可移植资产。

## 真实任务旁证

首次运行因 skill 缺失退化为普通 coding agent：它创建了 goal 和 `VLIW_EVAL_LOG.md`，但最初没有按提示组织角色；单 agent 多次调试 RAW / 同周期读写 / iteration reorder 后得到一个正确的 `98582-cycle` scalar VLIW packing checkpoint，随后才启动 vectorization 子 agent。这个现象说明“preset 被选择”不等于“KerSor 协议正在工作”，skill 发现必须成为安装验收项。

## 验证

- `python3 scripts/check.py`：17 项通过。
- 用更新后的 preset 启动全新 DSH Web Host 和全新 KerSor 会话。
- 能力探针只要求加载 skill；6 秒内成功返回：
  - 标题：`KerSor DSH bridge`
  - 来源：installed preset 的 `skills/kersor`
  - 第一段：通过 `kersor_bridge.py` 解析 checkout，失败时停止而不猜路径。
- 探针未修改工作区文件。

## 下一轮

继续同一 VLIW-from-scratch 任务，验证 skill 真正参与后的 command routing、task-native Workflow、subagent 组织和状态可视化；同时把 KerSor TUI 已有的 `active / stale / needs_resume / terminal` 健康语义接入 Web 侧栏，避免旧测试 Session 被误画成活跃态。
