# dsh-personal-plugins

统一管理个人 DSH 扩展。当前收录 `kersor` agent preset：它在用户已安装的 DSH `standard` preset 上增加 KerSor 的入口和 skill，不复制 DSH 上游源码，也不收集 `~/.dsh/settings.yaml`、sessions、storages 或任何凭据。

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

若 DSH 使用非默认位置：

```bash
python3 scripts/install.py \
  --dsh-home /path/to/.dsh \
  --standard-preset /path/to/standard/agent.cordis.yml \
  --kersor-root /path/to/KerSor
```

## 使用

在 DSH 中新建 task 并选择 `KerSor` preset。遇到 GPU kernel 优化、通用本地任务演化、KerSor 状态或恢复请求时，加载 `kersor` skill。skill 会读取 KerSor checkout 中当前的 `AGENTS.md` 与 command protocol；KerSor 仓库仍是行为和参数的唯一权威来源。

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
presets/kersor/
  preset.yml                 # DSH picker metadata
  skills/kersor/SKILL.md     # 只负责路由到 KerSor 的轻量适配层
  bin/kersor_bridge.py       # checkout 定位、doctor、compose 入口
scripts/install.py           # 从当前 standard preset 生成并安装
scripts/check.py             # 零依赖本地/CI 验证
tests/                       # 安装合同回归测试
```
