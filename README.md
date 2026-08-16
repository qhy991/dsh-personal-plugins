# dsh-personal-plugins

统一管理个人 DSH 扩展。当前 KerSor 套件包含 agent preset、工作区状态卡、只读 run viewer、Web 侧栏以及可选的有限 Mission 启动器；不复制 DSH 上游源码，也不收集 `~/.dsh/settings.yaml`、sessions、storages 或任何凭据。

## 为什么安装时生成 composition

`standard` preset 由 DSH 上游维护。仓库只拥有 KerSor 增量；`scripts/install.py` 每次从当前安装的 `standard/agent.cordis.yml` 生成用户侧 `kersor/agent.cordis.yml`。升级 DSH 后重新执行安装命令即可继承新版 standard，避免维护一份会漂移的副本。

## 安装或更新

需要 Python 3.10+、已安装的 DSH，以及一个 KerSor checkout：

```bash
python3 scripts/install.py --kersor-root /absolute/path/to/KerSor
```

如果 `${DSH_HOME:-$HOME/.dsh}/.agent-presets/kersor` 已存在，先预览，再显式覆盖：

```bash
python3 scripts/install.py --kersor-root /absolute/path/to/KerSor --dry-run
python3 scripts/install.py --kersor-root /absolute/path/to/KerSor --force
```

覆盖前，安装器会把旧目录移动到同级时间戳备份。KerSor 的机器路径只写入已安装 preset 的 `.local/kersor-root`，不会进入 Git。

为 Web profile 安装 run viewer 与侧栏（建议先安装上面的 preset，让两者共享同一份 checkout 指针）：

```bash
dsh plugin --profile web add --force "file:$PWD/bundles/kersor-web"
```

若 `dsh` 未加入 `PATH`，可在 DSH checkout 中用 `pnpm dsh plugin --profile web add ...` 执行同一操作，并把 `file:` 后的路径写成此仓库 bundle 的绝对路径。

该 bundle 会安装三个插件，但默认只挂载只读 viewer 与 UI。`@deepseek-ai/dsh-kersor` 启动器只有在 profile patch 中显式登记至少一个 `kersor-mission-v1` Mission 后才应挂载；配置合同见 [`plugins/kersor/README.zh.md`](plugins/kersor/README.zh.md)。更新仓库后重跑同一条 `add --force` 命令即可刷新 profile 内的打包副本。

若 DSH 使用非默认位置：

```bash
python3 scripts/install.py \
  --dsh-home /path/to/.dsh \
  --standard-preset /path/to/standard/agent.cordis.yml \
  --kersor-root /path/to/KerSor
```

## 使用

在 DSH 中新建 task 并选择 `KerSor` preset。遇到 GPU kernel 优化、通用本地任务演化、KerSor 状态或恢复请求时，加载 `kersor` skill。skill 会读取 KerSor checkout 中当前的 `AGENTS.md` 与 command protocol；KerSor 仓库仍是行为和参数的唯一权威来源。

`kersor_status` 工具默认读取当前 DSH task 的工作区，展示阶段、当前轮次、workflow、最佳实测 speedup、目标、fit confidence 和最近决策。结果使用 DSH 原生可回放卡片；传入子路径时只允许当前工作区内部，避免 host-side bridge 越过 DSH 会话边界。

Web 侧栏每两秒读取 KerSor 的 `summary.json`／`events.jsonl` 折叠快照，显示 run、phase、agent/evaluation call、耗时、token、回滚和终态。`waiting` 按本次 invocation 的终态处理；短暂断连或漏帧会由下一次快照自动恢复。viewer 优先使用 `KERSOR_ROOT`，否则复用 preset 的 `.local/kersor-root`，路径只有一个机器侧权威来源。

环境变量 `KERSOR_ROOT` 可以临时覆盖安装时记录的 checkout：

```bash
KERSOR_ROOT=/another/KerSor dsh
```

## 验证

```bash
python3 scripts/check.py
```

检查覆盖 metadata、安装器渲染与幂等性、强制更新备份、未解析占位符，以及仓库中意外出现的机器绝对路径。

## 目录

```text
bundles/kersor-web/         # Web profile 的只读 viewer + UI 组合层
plugins/kersor/             # 可选有限 Mission 启动器（Host）
plugins/kersor-viewer/      # run 发现、tail、fold 与 snapshot remotes
plugins/ui-kersor-viewer/   # Web 侧栏（Client）
presets/kersor/
  preset.yml                 # DSH picker metadata
  skills/kersor/SKILL.md     # 只负责路由到 KerSor 的轻量适配层
  bin/kersor_bridge.py       # checkout 定位、doctor、compose 入口
  plugins/kersor-status.mjs  # 工作区受限的结构化状态工具与原生卡片
scripts/install.py           # 从当前 standard preset 生成并安装
scripts/check.py             # 零依赖本地/CI 验证
tests/                       # 安装合同回归测试
```
