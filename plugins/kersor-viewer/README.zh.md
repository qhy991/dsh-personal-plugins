# kersor-viewer — KerSor autonomous-workflow 查看器

[English](README.md) | 中文

在 dsh Web UI 中实时查看 [KerSor](https://github.com/qhy991/KerSor) autonomous-workflow 运行。本 host 包在 KerSor session 根目录下发现 run 目录，tail 每个活跃 run 的 `.runtime/events.jsonl`，把事件流折叠成阶段/调用视图模型，并通过生成的 remote 暴露清单／backlog 快照。browser 半在独立的桥包 [`@deepseek-ai/dsh-client-ui-kersor-viewer`](../ui-kersor-viewer/README.md) 中，轮询这些快照，在侧栏面板渲染 run 清单与实时进度，视觉沿用 workflow-run 进度卡。

本包只观察、不启动。如需从同一面板启动部署配置中有限的一组 Mission，可组合兄弟启动器 [`@deepseek-ai/dsh-kersor`](../kersor/README.zh.md)。无论是否加载启动器，KerSor run 文件始终是权威状态。

## 配置

插件行在 `cordis.patch.yml` 中接受 config：

```yaml
- id: kersor-viewer
  name: '@deepseek-ai/dsh-kersor-viewer'
  config:
    roots:
      - /absolute/path/to/kersor/.kersor
    noDefaultRoots: false
    scanIntervalMs: 5000
```

- `roots` — 在默认根之外额外扫描的 KerSor session 根。
- `noDefaultRoots` — 关闭全部自动根：`~/.local/share/kersor`、`~/Agent4Kernel/KerSor/.kersor`，以及已安装 `kersor` preset 记录的 checkout（或 `KERSOR_ROOT`）追加 `/.kersor` 后的路径。
- `scanIntervalMs` — run 发现重扫间隔（最小 500 ms）。

带 `workflow_status: "waiting"` 的 summary 在发现层属于终态：KerSor controller 已停止并写入 summary，只是 workflow 正在等待外部输入，而非语义完成。

## 结构

| 文件 | 职责 |
|---|---|
| `src/service.ts` | host 半：发现、tail、折叠、`kersor/event` 发射、`listRuns`/`runBacklog` remote |
| `src/scanner.ts` | 根扫描：session-v2 目录及其 `autonomous-runs/` 子目录 |
| `src/tailer.ts` | 带截断检测的 `events.jsonl` 位置追踪 tail |
| `src/fold.ts` | KerSor 事件流到视图模型的纯函数折叠 |
