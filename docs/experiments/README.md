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
