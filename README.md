# dsh-personal-plugins

统一管理个人 DSH 扩展。当前 KerSor 套件包含 agent preset、可加载 skill、工作区状态卡、只读 run viewer、Web 侧栏以及可选的有限 Mission 启动器；不复制 DSH 上游源码，也不收集 `~/.dsh/settings.yaml`、sessions、storages 或任何凭据。

## 五分钟上手

1. 安装或更新 preset：

   ```bash
   "${KERSOR_PYTHON:-python3}" scripts/install.py --kersor-root /absolute/path/to/KerSor --force
   ```

2. 首次安装 Web bundle；若已经安装过，使用下文的“移除再重装”更新流程：

   ```bash
   dsh plugin --profile web add "file:$PWD/bundles/kersor-web"
   ```

3. **重启 DSH Web 进程**。已经运行的 Host 不会自动采用新 preset composition 或新的浏览器 bundle。
4. 在 DSH 中添加目标工作区，新建会话，把 agent preset 从“标准模式”切换为 **KerSor**。
5. 用任务合同描述目标、基线、权威验证命令、禁止修改的文件和停止条件。Agent 应先加载 `kersor` skill，再由 skill 路由到当前 KerSor checkout 的协议。
6. 用 `kersor_status` 查看当前 Session；用侧栏底部的“KerSor 活动”查看优化会话与 autonomous Workflow。

## 为什么安装时生成 composition

`standard` preset 由 DSH 上游维护。仓库只拥有 KerSor 增量；`scripts/install.py` 每次从当前安装的 `standard/agent.cordis.yml` 生成用户侧 `kersor/agent.cordis.yml`。升级 DSH 后重新执行安装命令即可继承新版 standard，避免维护一份会漂移的副本。

## 插件源码与分发快照的权威边界

DeepSeek Harness 的 `packages/extensions/{kersor,kersor-viewer,ui-kersor-viewer}` 是三个 DSH 插件的源码权威；本仓库中的对应 `src/`、`tests/`、包 README、TypeScript 构建配置和 `lib/` 只是可离线安装的分发快照。preset、安装器、Web bundle composition，以及三个 `package.json` 的外部分发版本／peer range 仍由本仓库拥有。不要在两边分别实现同一插件改动：先在 Harness 完成源码、测试与构建，再单向刷新这里的快照。

[`plugins/dsh-mirror.json`](plugins/dsh-mirror.json) 记录权威仓库、精确提交以及每个镜像文件的 SHA-256。`scripts/check.py` 会拒绝任何未登记、缺失或 hash 漂移的 `src/tests/README/tsconfig/lib` 文件，因此只改 `src` 或只改已提交 `lib` 都不会静默通过；source map 与 `tsbuildinfo` 属于本地构建缓存，不进入分发快照。清单中的 `reconciled: false` 表示当前字节来自尚未形成权威提交的 Harness 开发工作树，因此不能伪称与所记录提交完全一致；待这些改动进入 Harness 提交后，从干净 checkout 正式同步会把它改为 `true`。

同步默认只做计划并在存在差异时返回非零，不会覆盖文件：

```bash
python3 scripts/sync_plugins.py check
python3 scripts/sync_plugins.py sync --harness /absolute/path/to/deepseek-harness
```

审阅计划后，确保 Harness 的三个插件已构建出完整 `lib/`、两个仓库的镜像路径都没有未提交改动，再显式写入：

```bash
python3 scripts/sync_plugins.py sync \
  --harness /absolute/path/to/deepseek-harness \
  --write
```

同步器在写入前一次性读取完整来源清单，拒绝 dirty source／destination，只会增删上述三个包的镜像面，并在成功后重写来源提交和全部 hash。它不安装依赖、不构建 Harness，也不修改本仓库拥有的 `package.json`。

## 安装或更新

需要 Python 3.10+、已安装的 DSH，以及一个 KerSor checkout。生成 KerSor
Workflow catalog 的解释器还需要能导入 PyYAML。先固定解释器并验证：

```bash
export KERSOR_PYTHON=/absolute/path/to/python3
"$KERSOR_PYTHON" -c 'import sys, yaml; assert sys.version_info >= (3, 10); print(sys.executable, yaml.__version__)'
```

`KERSOR_PYTHON` 是 preset skill、`kersor_status` 和 Web viewer 调用 bridge
时共同使用的唯一显式覆盖；未设置时才使用 DSH Host `PATH` 中的 `python3`。
应让启动 DSH Web 的进程继承该变量，而不是只在另一个终端中设置。bridge
会拒绝 Python 3.10 以下的实际解释器，并提示重新设置变量和重启 Host。

然后安装：

```bash
"${KERSOR_PYTHON:-python3}" scripts/install.py --kersor-root /absolute/path/to/KerSor
```

如果 `${DSH_HOME:-$HOME/.dsh}/.agent-presets/kersor` 已存在，先预览，再显式覆盖：

```bash
"${KERSOR_PYTHON:-python3}" scripts/install.py --kersor-root /absolute/path/to/KerSor --dry-run
"${KERSOR_PYTHON:-python3}" scripts/install.py --kersor-root /absolute/path/to/KerSor --force
```

覆盖前，安装器会把旧目录移动到同级时间戳备份。KerSor 的机器路径只写入已安装 preset 的 `.local/kersor-root`，不会进入 Git。

为 Web profile 安装 run viewer 与侧栏（建议先安装上面的 preset，让两者共享同一份 checkout 指针）：

```bash
dsh plugin --profile web add "file:$PWD/bundles/kersor-web"
```

若 `dsh` 未加入 `PATH`，可在 DSH checkout 中用 `pnpm dsh plugin --profile web add ...` 执行同一操作，并把 `file:` 后的路径写成此仓库 bundle 的绝对路径。

该 bundle 会安装三个插件，但默认只挂载只读 viewer 与 UI。`@deepseek-ai/dsh-kersor` 启动器只有在 profile patch 中显式登记至少一个 `kersor-mission-v1` Mission 后才应挂载；配置合同见 [`plugins/kersor/README.zh.md`](plugins/kersor/README.zh.md)。

更新仓库后，先移除再重装这一精确 bundle，确保 pnpm 不复用旧的本地目录快照：

```bash
dsh plugin --profile web remove @qhy991/dsh-kersor-web
dsh plugin --profile web add "file:$PWD/bundles/kersor-web"
```

若 DSH 使用非默认位置：

```bash
"${KERSOR_PYTHON:-python3}" scripts/install.py \
  --dsh-home /path/to/.dsh \
  --standard-preset /path/to/standard/agent.cordis.yml \
  --kersor-root /path/to/KerSor
```

## 持久化 Infini Codex bridge

`tools/codex-infini-bridge/server.mjs` 是本地 Responses API → Chat
Completions bridge 的源码权威。不要再从 `/tmp` 启动临时副本。安装器只使用
Python 标准库，把源码派生到
`~/.local/share/codex-infini-bridge/server.mjs`，并生成无 token、无 API key
的 `~/Library/LaunchAgents/ai.infini.codex-responses-bridge.plist`。

先停止并确认任何旧的 `127.0.0.1:8143` listener；安装器不会替换或杀死
占用端口的进程，而会在写文件或调用 `launchctl` 前 fail closed。然后固定
明确的 Node 与 HTTPS upstream，先预览再安装：

```bash
NODE_PATH="$(command -v node)"
python3 scripts/install_bridge.py dry-run \
  --node "$NODE_PATH" \
  --upstream-base https://cloud.infini-ai.com/maas/v1
python3 scripts/install_bridge.py install \
  --node "$NODE_PATH" \
  --upstream-base https://cloud.infini-ai.com/maas/v1
```

LaunchAgent 固定监听 `127.0.0.1:8143`，使用 `RunAtLoad`、`KeepAlive` 和
10 秒节流；stdout/stderr 写入
`~/Library/Logs/codex-infini-bridge/`。安装完成后会依次执行
`launchctl bootstrap`、`kickstart`，再验证 `/health` 的服务身份。默认
通过 Node 的 `--use-system-ca` 读取 macOS 系统信任库，不再依赖易失的
`system-roots.pem`。只有额外的组织 CA 才显式提供：

```bash
python3 scripts/install_bridge.py install \
  --node "$NODE_PATH" \
  --upstream-base https://cloud.infini-ai.com/maas/v1 \
  --extra-ca /absolute/path/to/company-ca.pem
```

此时 CA bundle 才会复制到持久目录并通过 `NODE_EXTRA_CA_CERTS` 引用。
不要仅凭 Node 接受 `--use-system-ca` 参数就推断 TLS 已可用；若无认证的
上游探针在系统 `curl` 中返回 `401`、但 bridge 返回 `502`，应先用 Node
确认是否为 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`，再通过 `--extra-ca`
安装经过验证的公有 CA bundle。安装后必须同时看到本地 `/health` 成功与
同一无认证探针返回上游 `401`，才算完成网络信任链验收。
生产服务不支持 `BRIDGE_DEBUG`，也不会把原始请求或认证头写盘。随时检查
源码 hash、plist 合同、文件权限与运行中 health：

```bash
python3 scripts/install_bridge.py check
```

## 如何选择运行方式

| 任务 | 建议入口 | 权威状态／证据 |
|---|---|---|
| GPU kernel 或带 benchmark 的本地优化 | `kersor` skill → `compose optimize` → 当前 `commands/optimize.md` | Session v2、Attempt Result、实测 benchmark |
| 通用本地任务的固定验证循环 | `kersor-task-v1` → `commands/evolve.md` | `output.json` 与 verifier evidence |
| 自主 Workflow / Mission | `kersor-mission-v1` → `commands/evolve.md` | `result.json`、artifact receipts、独立 verifier |
| 状态、恢复、诊断 | 先调用 `kersor_status`，再读取相应 command protocol | 当前磁盘 Session，不依赖聊天记忆 |

不要把 CUDA Workflow 硬套到 Python、VLIW、Verilog 或普通工程任务。任务类型不匹配时，稳定 `optimize` 路径应先确定性拒绝不兼容的已发布 Workflow，再通过有界 workflow authoring 创作 task-native Proposal；workflow evolution 只属于显式 research runner。任务自己的测试命令始终是唯一验收门。

自定义模拟器任务的推荐入口：

```text
compose optimize --path <task-dir> \
  --integration-pattern custom_simulator \
  --allow-workflow-authoring --workflow-authoring-budget 1
```

`custom_simulator` 必须来自任务事实或用户明确合同，不能按 `.py` 后缀猜测。进入文件修改前，Session 应显示真实的 `language/backend/integration pattern`；无兼容 Workflow 时先显示 `STALLED`，直到 Phase 3.6 验证并重新 catalog 一个 Proposal。

在 DSH Workspace Write 中，Phase 3.6 的 Proposal 必须保存在 Session 内的 `workflow-authoring/proposals/`，Catalog 也从同一 store 生成；不要要求写 KerSor checkout。`author-context.json.dispatch` 是唯一 subagent envelope，必须原样传入而不是由 parent 重写 metadata 模板；其中 `run_in_background:false` 会让工具阻塞到作者完成。不要用 `list_agents` 轮询，也不要检查或写 staging 进度。author 返回后的第一步是把三个文件封存在 `author-handoff.json`；save 必须携带该 seal，任何 parent 修补都会因 hash 不匹配而被拒绝。结构校验通过后仍要做语义安全审查：Workflow 只能返回候选或评测 Session-local 副本，不能在证明正确且更快之前覆盖规范 checkpoint。KILL／needs-revision 时还必须用 KerSor state 工具转成 `stalled`，否则 UI 会继续显示“活跃”。

## 在 DSH 中使用

在 DSH 中新建 task 并选择 `KerSor` preset。遇到 kernel 优化、通用本地任务演化、KerSor 状态或恢复请求时，加载 `kersor` skill。skill 会读取 KerSor checkout 中当前的 `AGENTS.md` 与 command protocol；KerSor 仓库仍是行为和参数的唯一权威来源。

推荐提示词至少包含：

```text
目标：<可测量结果>
基线：<命令与数值>
权威验证：<确定性命令>
不可变约束：<禁止修改的文件/接口/数据>
组织要求：<主 agent、只读顾问、唯一集成者、并行边界>
停止条件：<成功门槛、预算、可复现 NO-GO>
```

`kersor_status` 工具只读取当前 DSH task 的工作区，调用时使用空参数 `{}`，不要传 KerSor checkout 或其他路径。它展示阶段、当前轮次、workflow、最佳实测 speedup、目标、fit confidence、`language/backend`、integration pattern、authoring gate／预算和最近决策，并使用 DSH 原生可回放卡片呈现。单一工作区入口同时消除了路径猜测和 host-side bridge 越界面。

Web 侧栏同时显示最近 20 个经典／Session-v2 优化会话摘要，以及 autonomous run 的实时进度。它自动读取 DSH 已登记工作区，并扫描各工作区的 `.kersor/`，无需为当前项目重复配置路径；额外的集中式 Session 根仍可通过 viewer `roots` 配置。Session 卡会直接显示 `language/backend`、integration pattern、selector 结果与 workflow authoring 预算，让 Python/VLIW 被误路由成 Triton、或缺少 task-native 逃生路径的问题无需打开状态文件即可发现；展开卡片可查看 artifact 派生的阶段时间线、authoring／seal／save、Proposal validation、dispatch／measurement，以及密封后的 metadata、文件 hash、rationale 和 `workflow.js`。seal 前或 hash 不匹配时不暴露 staging 内容。经典状态由 KerSor 自己的 `SessionStore`／`AttemptResultStore` 解析；侧栏不复制 legacy frontmatter 规则，并把规范 phase 与建议性 health 分开：只有阈值内有稳定 artifact 活动的 Session 才算 active，旧的 `optimizing` 会显示为“已陈旧”而不再点亮全局蓝点。Host 用一个原子 `snapshot` 同时发布 Session、run 清单和结构化来源健康，后续只在状态变化时推送替换事件；选中 run 才读取 `runBacklog`，展开经典 Session 才读取 `classicSessionDetail`，不再每两秒轮询整份快照。缺失、健康空、部分降级和完全失败具有不同 UI，诊断只携带 stage/code/count/time，不泄漏异常原文或事件内容。`waiting` 按本次 invocation 的终态处理；断连后重读同一 snapshot 路径恢复。viewer 优先使用 `KERSOR_ROOT`，否则复用 preset 的 `.local/kersor-root`，路径只有一个机器侧权威来源。

环境变量 `KERSOR_ROOT` 可以临时覆盖安装时记录的 checkout：

```bash
KERSOR_ROOT=/another/KerSor dsh
```

## 真实案例：VLIW Take-Home 从零优化

[`docs/vliw-takehome-from-scratch.md`](docs/vliw-takehome-from-scratch.md) 给出完整案例：从 Anthropic 官方 `origin/main` 的 147734-cycle starter 创建隔离 worktree，在 DSH 中选择 KerSor preset，禁止读取任何既有优化解，组织架构分析、hazard 审计、向量化／调度和独立验证角色，依次冲击 `<18532` 与 `<2164`。

这个案例同时验证五条链路：skill 发现、goal 持久化、subagent/Workflow 组织、权威 benchmark 守门、KerSor 状态与可视化。每轮实验总结收录在 [`docs/experiments/`](docs/experiments/README.md)。

## 故障排查

### `skill "kersor" is unknown or no longer available`

先确认新会话顶部显示的是 **KerSor**，而不是“标准模式”：preset-local skill 只注入选择了 KerSor preset 的新会话；在标准模式中直接要求加载 `kersor` 会得到该错误。若已经选对模式，旧安装可能把 skill 复制到 preset 内却没有把 preset-local `skills/` 加入 `skill-filesystem.customSkillDirs`。更新仓库后重新运行安装器并重启 DSH Web：

```bash
"${KERSOR_PYTHON:-python3}" scripts/install.py --kersor-root /absolute/path/to/KerSor --force
```

重新新建会话并先切到 KerSor preset；初始 skill catalog 应包含 `kersor`。若仍失败，检查生成的 `${DSH_HOME:-$HOME/.dsh}/.agent-presets/kersor/agent.cordis.yml` 是否把同目录下的 `skills` 写入 `customSkillDirs`。

### Web 侧栏仍是旧版本

本地 `file:` 依赖可能被 pnpm 作为旧目录快照复用。执行精确移除／重装流程，然后重启 Web Host；只执行 `add --force` 不足以证明文件已刷新。

### `kersor_status` 返回 `additionalProperties: false`

这表示 bridge 的结构化输出与 preset 中工具 schema 版本不一致。更新本仓库，重新安装 preset 并重启 DSH Web；不要让 agent 绕过状态门继续修改：

```bash
"${KERSOR_PYTHON:-python3}" scripts/install.py --kersor-root /absolute/path/to/KerSor --force
```

仓库回归测试会精确比较 status 输出、schema properties 和 required keys，避免新增字段再次只在直接渲染测试中通过、却被 DSH 工具边界拒绝。

## 验证

```bash
python3 scripts/check.py
```

检查覆盖 metadata、preset-local skill 发现配置、安装器渲染与幂等性、强制更新备份、built plugin 合同，以及仓库中意外出现的机器绝对路径。

## 目录

```text
bundles/kersor-web/         # Web profile 的只读 viewer + UI 组合层
plugins/kersor/             # 可选有限 Mission 启动器（Host）
plugins/kersor-viewer/      # Session 摘要、run 发现、tail、fold 与 snapshot remotes
plugins/ui-kersor-viewer/   # 优化会话与 run 的 Web 侧栏（Client）
presets/kersor/
  preset.yml                 # DSH picker metadata
  skills/kersor/SKILL.md     # 只负责路由到 KerSor 的轻量适配层
  bin/kersor_bridge.py       # checkout 定位、doctor、compose 入口
  plugins/kersor-status.mjs  # 工作区受限的结构化状态工具与原生卡片
scripts/install.py           # 从当前 standard preset 生成并安装
scripts/install_bridge.py    # 持久化 bridge、LaunchAgent 与 health 验收
scripts/check.py             # 零依赖本地/CI 验证
tests/                       # 安装合同回归测试
tools/codex-infini-bridge/   # Responses → Chat Completions bridge 源码权威
docs/experiments/            # 每轮真实任务实验的假设、证据、结论与下一步
docs/vliw-takehome-from-scratch.md
                             # VLIW 比赛从零评测教程与反作弊边界
```
