# Iteration 02 — Phase 不等于 Health

## 假设

Web 侧栏不能把所有 `phase=optimizing` 的历史 Session 都画成正在运行。KerSor 的规范 phase 是控制状态；TUI/doctor 的 `active / stale / needs_resume / terminal / unknown` 是基于稳定 artifact 活动和干净 round 边界的只读健康投影。二者必须分开显示。

## 真实数据审计

KerSor checkout 的 `.kersor/` 中：

- 1056 个可读 Session，全部为 legacy。
- 1056 个都写着 `phase=optimizing`。
- 1056 个的绝对 kernel path 都已不存在。
- 没有一个包含完成的 round summary。
- 最近 Session 的最后 artifact 活动时间是 2026-07-10，而验收日是 2026-08-17。

旧 UI 只看 phase，因此最近 20 张卡全部是蓝色、侧栏触发器也持续显示 active。这与真实可操作状态矛盾。

## VLIW agent 组织旁证

同一 from-scratch 任务继续运行：

1. 主 agent 先得到正确的 `98582-cycle` scalar VLIW packing。
2. 经用户 steering 后，建立 hazard auditor 与 vectorization architect 两个只读角色，并把 id、职责和结论写入 `VLIW_EVAL_LOG.md`。
3. Architect 预测 2-item multi-issue 可到约 12600 cycles；权威测试实测只有 `51478 cycles`。主 agent 保留 benchmark 结果并转向真正的 VLEN=8 vectorization。
4. 后续又启动 register-plan 顾问；DSH 顶部能显示 subagent 数量，但 KerSor 侧栏没有对应 Session，因为本次旧会话在 Iteration 01 修复前未能加载 skill。

这证明两个产品要求：subagent 建议必须经过确定性 gate；可视化必须区分“agent 正在活动”“KerSor Session 健康”和“规范 phase”，不能用一个蓝点代替三者。

## 实现

Preset bridge 的 bounded Session projection 新增：

- `status`：`pre-round-1 / in-progress / resumable / terminal-*`
- `health`：`active / stale / needs_resume / terminal / unknown`
- `started_at`
- `last_activity_at`

Health 使用 KerSor TUI/doctor 的建议性规则：

- terminal phase → `terminal`
- 最近稳定 artifact 在阈值内 → `active`
- 陈旧且最后干净决策为 `CONTINUE`、current round 已推进 → `needs_resume`
- 其他陈旧未结束状态 → `stale`
- 没有可靠活动时间 → `unknown`

默认阈值是 1800 秒，可用 `classicStaleAfterSeconds` 配置；经过时间绝不改写 canonical phase。

UI 改为：

- health 决定状态点与卡片边框；phase 仍独立显示。
- 标题显示“最近 N 个 · M 个活跃”。
- 卡片显示本地化的最后活动时间。
- 只有 autonomous active run 或 `health=active` 的 Session 才点亮全局蓝点。

## 验证

- `python3 scripts/check.py`：18 项通过。
- DSH 原生 Viewer/UI Vitest：34 项通过。
- Host/Client TypeScript 构建、Typert Remote 生成和 built JS 语法通过。
- 本地安装包与仓库 built artifact 哈希一致。
- 新 DSH Web Host 的真实页面显示：
  - `最近 20 个 · 0 个活跃`
  - 每张旧卡为橙色“已陈旧”
  - 同时保留 `optimizing`、round、backend/mode、last activity 和 kernel warning
  - Host 无运行错误

## 下一轮

在 VLIW worktree 中启动一个使用修复后 skill catalog 的新 KerSor 会话，验证 task-directory compose、非 CUDA Workflow routing、Session v2 建立、round/Attempt Result 写入和侧栏实时展示。继续以权威 benchmark 而不是 agent 估算决定 land/kill。
