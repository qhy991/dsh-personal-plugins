# kersor — 已登记 KerSor Mission 启动器

[English](README.md) | 中文

让 [KerSor](https://github.com/qhy991/KerSor) autonomous Mission 可从 dsh 启动的 Host 插件，同时不把浏览器变成 shell。部署配置登记一份有限任务清单；remote 可以列出任务、通过 KerSor 的 Session-binding runner 启动其中一项、列出仍由 dsh 托管的进程树，并停止一棵受管进程树。

KerSor 继续作为 Mission 校验、workflow 状态、事件历史、摘要、artifact 与 resume 行为的事实源。本包只负责启动授权、显式凭据转发和进程树生命周期。与 [`@deepseek-ai/dsh-kersor-viewer`](../kersor-viewer/README.md) 及 [`@deepseek-ai/dsh-client-ui-kersor-viewer`](../ui-kersor-viewer/README.md) 组合后，可观察 workflow 状态，并在 Web UI 中显示可选控制区。

## 配置

通过 `~/.dsh/cordis.patch.yml` 等 overlay 加入 Host 插件：

```yaml
- id: kersor
  name: '@deepseek-ai/dsh-kersor'
  config:
    root: /absolute/path/to/KerSor
    python: /absolute/path/to/python3
    tasks:
      - id: memo
        label: Build repository memo
        mission: /absolute/path/to/memo.mission.json
        runtimeConfig: /absolute/path/to/codex-runtime.json
    credentialRefs:
      - INFINI_API_KEY
    env:
      NO_PROXY: 127.0.0.1,localhost
    maxOutputBytes: 65536
    stopGraceMs: 3000
```

- `root` 是包含 `scripts/run-autonomous-workflow.py` 的 KerSor checkout 绝对路径。
- `python` 是 subprocess provider 执行环境中的绝对可执行路径或 `PATH` 裸名称。
- `tasks` 是完整的浏览器可启动登记表。`mission` 与可选 `runtimeConfig` 必须是绝对路径；remote 调用方只能提交任务 `id`。
- `credentialRefs` 在每次启动时从 dsh credential provider 解析，并以同名环境变量转发。secret 值不会进入任务清单或启动回执。
- `env` 是显式的非 secret 子进程环境；它不会继承 subprocess 边界清除的 credential 形环境变量。
- `maxOutputBytes` 限制每条 launcher 输出流的捕获量；`stopGraceMs` 控制 TERM 到 KILL 的升级等待。

Mission 必须是 JSON `kersor-mission-v1` 文档。其 `workspace`、`session` 与 `runtime` 为标准 KerSor runner 提供路由。Mission 中的相对路径按 Mission 文件位置解析；插件 config 不复制这些路由字段。

## 运行语义

`start(taskId)` 在 dsh 已持有进程树后返回，并包含生成的 `runId` 与预期 `runDir`。它不表示 workflow 已成功启动或完成。`listActive()` 只列出当前 dsh 进程仍持有的 launcher 进程。Workflow 状态来自 viewer 读取的 KerSor run 文件。

插件卸载会终止并等待所有受管进程树退出。dsh 重启不会重新取得一个已脱离 KerSor 进程的所有权；其 run 文件仍可由 viewer 发现。

## 模型体验

间接且在进程外。本插件不会向 dsh Session 添加文本，也不会改写 KerSor prompt。它启动配置好的 KerSor runtime；planner/worker prompt、模型选择与 artifact 仍属于 KerSor。

#### KV Cache 影响

dsh 内无影响。启动后的 KerSor runtime 自行负责模型侧 cache 行为。

## 已知限制与顺延工作

- 任务是静态部署配置。刻意不支持从浏览器编辑 Mission、runtime config 或任意命令参数。
- remote 不暴露 resume。Resume 校验与策略仍由 KerSor 标准 runner 持有。
- launcher stdout/stderr 为诊断而有界捕获，但不暴露给浏览器；workflow 诊断应读取 KerSor `.runtime` 文件。
- launcher 不从进程退出推断 workflow 成功；viewer 折叠出的 KerSor 状态才是权威状态。
