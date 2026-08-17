# kersor-viewer — KerSor 活动查看器

[English](README.md) | 中文

在 dsh Web UI 中查看 [KerSor](https://github.com/qhy991/KerSor) 活动。它刻意分开两种投影：最近的优化 Session（包括现有经典 `state.md` 格式），以及实时 autonomous-workflow 运行。本 host 包通过已安装 KerSor preset 的 bridge 获取有上限的 Session 摘要，发现 autonomous run 目录，并 tail 每个活跃 run 的 `.runtime/events.jsonl`。一个生成的 `snapshot` Remote 与一个替换事件原子地携带两份清单及其来源健康状态；`runBacklog` 携带选中 autonomous run 的折叠详情，`classicSessionDetail` 则按需读取一个已经发现的经典 Session。browser 半位于 [`@deepseek-ai/dsh-client-ui-kersor-viewer`](../ui-kersor-viewer/README.md)。

KerSor 始终是唯一状态所有者。bridge 导入 KerSor 规范的 `SessionStore` 与 `AttemptResultStore`；TypeScript 包不重新实现 legacy frontmatter 解析。viewer 以 DSH 的 `workspaceRegistry` 作为受管项目清单的唯一来源，自动扫描每个已登记工作区的 `.kersor/` 子目录。若 preset 未安装，经典 Session 清单会安静地不可用，autonomous run 发现仍继续工作。

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
    classicSessionLimit: 20
    classicStaleAfterSeconds: 1800
```

- `roots` — 其直接子目录为 KerSor Session 的额外根；它们会与已登记 DSH 工作区及默认根一起扫描。
- `noDefaultRoots` — 关闭内置根：`~/.local/share/kersor`、`~/Agent4Kernel/KerSor/.kersor`，以及已安装 `kersor` preset 记录的 checkout（或 `KERSOR_ROOT`）追加 `/.kersor` 后的路径。已登记 DSH 工作区仍保持可见，因为它们是任务状态，不是回退默认值。
- `scanIntervalMs` — run 发现重扫间隔（最小 500 ms）。
- `classicSessionLimit` — 通过已安装 preset bridge 返回的最近优化 Session 数（`0` 关闭，最大 `100`，默认 `20`）。
- `classicStaleAfterSeconds` — 未结束 Session 的建议性无活动阈值（默认 `1800`，最大一天），与 KerSor TUI/doctor 默认值一致。

带 `workflow_status: "waiting"` 的 summary 在发现层属于终态：KerSor controller 已停止并写入 summary，只是 workflow 正在等待外部输入，而非语义完成。

经典 Session 卡片把 KerSor 的规范 phase 与建议性 health 分开：阈值内存在稳定 artifact 活动是 `active`；陈旧的干净 `CONTINUE` 边界是 `needs_resume`；其他未结束的陈旧工作是 `stale`；终态是 `terminal`。经过时间绝不改写 phase。有界投影还携带 language/backend、integration pattern、workflow authoring gate／预算、严格 fresh-Session isolation、Session 自有 baseline witness 状态及其 artifact 驱动的 next action 与有界 canonical blocker、DSH-workflow compatibility、Host 自有 candidate-output ownership、selector 结果与最新规范协议决策。展开卡片会按需读取 artifact 派生的阶段时间线、selector 拒绝数、authoring／seal／save 状态、Proposal validation checks、dispatch lifecycle 与有上限的 Workflow 设计文本。bridge 只有在三文件 author handoff 存在且全部密封 hash 仍匹配时才会提供 staging 内容。投影同时携带最后稳定 artifact 时间；若绝对内核路径已失效，面板只显示不含路径的状态提醒，不把旧本地路径泄漏到浏览器。

## 结构

| 文件 | 职责 |
|---|---|
| `src/service.ts` | host 半：缓存 Session/run 快照、tail、折叠与生成的 remote |
| `src/classic.ts` | 无 shell、有上限地调用已安装 preset bridge，并校验 wire shape |
| `src/scanner.ts` | 根扫描：session-v2 目录及其 `autonomous-runs/` 子目录 |
| `src/tailer.ts` | 带截断检测的 `events.jsonl` 位置追踪 tail |
| `src/fold.ts` | KerSor 事件流到视图模型的纯函数折叠 |
