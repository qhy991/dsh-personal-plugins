# KerSor in DSH 实验索引

每次迭代使用一个真实任务，遵循同一份记录合同：

1. 写清假设与本轮唯一主问题。
2. 固定版本、工作区、基线、验证命令和不可变边界。
3. 记录 agent / Workflow 组织与可视化证据。
4. 区分产品缺陷、任务算法结果和测试基础设施问题。
5. 修复后运行原生测试与真实 DSH 验收。
6. 一轮对应一个 Git commit、一次 GitHub push 和一次 CI 结果。

| 迭代 | 案例 | 主问题 | 结果 |
|---|---|---|---|
| [01](2026-08-17-vliw-from-scratch-01.md) | VLIW Take-Home 官方 starter | KerSor preset skill 是否真实可发现 | 缺陷复现并修复；live probe 通过 |
| [02](2026-08-17-vliw-from-scratch-02.md) | VLIW Take-Home 持续运行 | `optimizing` phase 是否等于真正 active | 接入 advisory health；真实页面 20 recent / 0 active |
| [03](2026-08-17-vliw-from-scratch-03.md) | VLIW Take-Home 修复后新会话 | status bridge 与 DSH tool schema 是否仍是同一合同 | schema drift 复现；严格边界测试与 fail-closed 路由 |
| [04](2026-08-17-vliw-from-scratch-04.md) | VLIW Take-Home 正式 KerSor Session | DSH 工作区中的 Session 是否能被活动面板自动发现 | workspace registry 接入；真实 stalled Session 首卡呈现 |
| [05](2026-08-17-vliw-from-scratch-05.md) | VLIW Take-Home task-native authoring | Python/VLIW 能否从 STALLED 创作安全的 Session-local Workflow | 路由与可视化 LAND；不安全 Proposal KILL，checkpoint 保持 51478 |
| [06](2026-08-17-vliw-from-scratch-06.md) | VLIW Take-Home session-safe Proposal | 首次生成能否通过 output ownership，并消除 status 路径歧义 | ownership PASS；事后发现 false candidate binding；decision 理由可视化 |
| [07](2026-08-17-vliw-from-scratch-07.md) | VLIW Take-Home candidate-bound Proposal | 证据是否真实执行候选，staging 是否保持单写入者 | candidate binding 修复；orchestrator 代修违规，Proposal KILL；fit 徽标上线 |
