# Iteration 04 — 活动面板必须看到当前 DSH 工作区

## 假设

KerSor preset 在 DSH 工作区建立 Session v2 后，“KerSor 活动”面板应自动显示该 Session，不要求用户再把同一个项目路径手工写进 viewer 配置。DSH 已登记工作区应是项目清单的唯一来源，KerSor store 仍是 Session 状态的唯一来源。

## 固定边界

- DSH：`47f9438`
- KerSor：`f059447`
- 插件起点：`a360e24`
- VLIW eval HEAD：`868d29a`
- 官方 starter：147734 cycles
- 当前已验证算法检查点：51478 cycles
- 禁止读取其他 refs／既有高分解；禁止修改 `tests/`、`problem.py`、机器常量与多核配置。

## 正式 Session 证据

修复后的 KerSor preset 成功完成 skill、composer、status 与 protocol 前置门，并在 VLIW eval 工作区建立 `.kersor/20260817-093744`。Session 轨迹暴露的是工作流路由缺陷，不是新的算法结果：

1. setup 把纯 Python VLIW 模拟器误分为 `backend=triton`、`kernel_language=triton`。
2. 唯一目录候选 `ksearch-kernel-optimization` 被错误评为 `fit_confidence=high`。
3. KSearch 因缺少 GPU `benchmark_command_or_harness` 产生规范 `infra / harness_integration` Attempt Result。
4. `allow_workflow_authoring=false` 与 `allow_workflow_evolution=false` 已冻结，Session 没有 task-native 逃生路径。
5. agent 准备绕过 KerSor Workflow 直接编辑 `perf_takehome.py` 时被停止；随后按协议把 round 1 收敛为 `STALLED`，生成 postmortem 与 issue draft。

终态验证：`perf_takehome.py` 与 `868d29a` 完全一致，`git diff origin/main -- tests/ problem.py` 为空。VLIW 记录明确标为 workflow routing KILL，而非算法候选 KILL。

## 可视化缺陷

同一时间，已安装 bridge 的 `status --path <workspace>` 能读取新 Session，但 `sessions --limit 20` 只扫描 KerSor checkout 自己的 `.kersor/`。因此 3193 的活动面板只能看到旧 checkout Session，看不到正在测试的 VLIW Session。viewer 配置虽然声明 `roots`，host service 也没有接入 DSH 已登记工作区。

## 实现

- viewer 强制注入 `workspaceRegistry`，每次重扫读取最新的规范工作区路径。
- classic adapter 把手工 `sessionRoots` 与自动 `workspaceRoots` 分开传给 bridge；CLI 分别使用可重复的 `--root` 与 `--workspace`，避免猜测路径语义。
- bridge 合并 checkout、配置根与各工作区 `.kersor/`，按 Session ID 全局排序、按规范路径去重，再调用 KerSor `SessionStore`／`AttemptResultStore` 生成有上限的投影。
- autonomous-run scanner 同样扫描工作区 `.kersor/`，使 Session 摘要与 Workflow run 使用同一项目边界。
- `noDefaultRoots` 只关闭回退默认根，不会隐藏已登记 DSH 工作区。

## 验证

- DSH 原生 TypeScript project build 与 host bundle 成功。
- viewer 原生 Vitest：4 files、22 tests 全部通过。
- `python3 scripts/check.py`：20 项通过，覆盖 workspace 参数转发、重复工作区去重、built host 注入与 portable bridge。
- source bridge 对真实 eval 工作区返回 `20260817-093744` 为第一项：`terminal-stalled`、round `1/3`、target `8.0x`、KSearch、无警告。
- preset 最终重装后 bridge 与 skill 逐字节匹配仓库；旧 preset 保存为 `kersor.backup-20260817-095900`。
- 在全新 3195 Host 打开最终构建的真实页面：面板显示“最近 20 个 · 0 个活跃”，VLIW Session 位于第一张卡片，展示“已结束 / 第 1/3 轮 / 目标 8.0x / stalled / triton / auto / v2 / KSearch”；旧 checkout Session 仍为“已陈旧”。Host 无错误日志。
- 页面验收后内核与受保护文件仍无差异。

## 结论与下一轮

本轮 LAND。可视化现在覆盖用户实际在 DSH 中管理的项目，而不是仅覆盖 KerSor 源码 checkout。

下一轮修工作流入口：让 compose/setup 显式携带 workflow authoring/evolution 能力，并在 Python VLIW 合同上拒绝 GPU-only KSearch 的伪高 fit；随后从 51478-cycle 检查点建立新的 task-native Session 继续冲击 `<18532`。
