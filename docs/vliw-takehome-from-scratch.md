# VLIW Take-Home：用 KerSor in DSH 从官方 starter 开始

这个案例用于评估 agent 是否会建立合同、组织角色、选择 task-native Workflow、用权威 benchmark 守门并沉淀失败证据。目标不是复制仓库中已有的高分解，而是从 Anthropic 官方 starter 独立得到改进。

## 1. 建立隔离 worktree

在 take-home 仓库中执行：

```bash
git fetch origin
git worktree add -b eval/dsh-kersor-vliw-takehome \
  ../vliw-dsh-takehome-eval origin/main
cd ../vliw-dsh-takehome-eval
python tests/submission_tests.py
```

官方 starter 的预期基线是 `147734 cycles`。性能测试失败是起点，不是基础设施故障。

## 2. 固定反作弊边界

- 不修改 `tests/`、`problem.py` 或机器常量。
- 不启用多核。
- 不读取其他 git refs、git 历史中的优化解、兄弟 worktree 或已有 1085/1249 产物。
- 不用网页搜索寻找现成解。
- 每个候选都由 `tests/submission_tests.py` 决定是否保留。

任何阶段都可以运行：

```bash
git diff origin/main -- tests/ problem.py
python tests/submission_tests.py
```

第一条必须为空；第二条打印的 `CYCLES` 是唯一 headline 指标。

## 3. 在 DSH 创建 KerSor 会话

1. 启动更新后的 DSH Web。
2. 添加 `vliw-dsh-takehome-eval` 工作区。
3. 新建会话，先把顶部的“标准模式”切换成 **KerSor** preset，再发送任务。
   标准模式不会注入 preset-local `kersor` skill；模式选择是实验合同的一部分。
4. 保持 Workspace Write；选择当前部署可用的模型。
5. 发送下面的任务合同。

```text
从官方 origin/main starter 独立优化 VLIW take-home。

目标：147734 → 首先 <18532，随后 <2164，并继续降低。
权威验证：python tests/submission_tests.py
禁止修改：tests/、problem.py、机器常量、多核设置。
完整性：禁止读取其他 refs、历史优化解、兄弟 worktree、网络现成解。

首先加载 kersor skill，按 task directory 运行 compose optimize，并显式传入
--integration-pattern custom_simulator --allow-workflow-authoring
--workflow-authoring-budget 1；用空参数 `{}` 调用 kersor_status，确认成功返回后才允许修改文件。
这是 Python VLIW 模拟器，不是 CUDA；Session 必须冻结为
python_reference/python/custom_simulator。已发布 Workflow 均不适配时应先
STALLED，再由 Phase 3.6 创作并验证 VLIW-native Proposal，不得硬套 CUDA，
也不得在 workflow 路由建立前直接修改候选。DSH Workspace Write 下的 Proposal
必须保存到 Session 的 workflow-authoring/proposals/，Catalog 使用同一 store；
不得要求写 KerSor checkout。结构验证后还要审查 output ownership：Workflow 只
返回候选或评测 Session-local 副本，不能先覆盖 perf_takehome.py 再验证。KILL 时用
KerSor state 工具转成 stalled，并由 kersor_status 与侧栏共同确认 0 个活跃 Session。

创建持久 goal 和 VLIW_EVAL_LOG.md。主 agent 是唯一集成者；只读角色至少
覆盖 ISA/瓶颈、RAW/WAR/WAW 与同周期 commit、向量化/软件流水、独立验证。
每轮记录假设、命令、cycles、正确性、land/kill。不要把完成计划当作完成任务。
```

## 4. 观察组织能力

合格运行应能回答以下问题：

- 初始 catalog 是否包含并成功加载 `kersor`？
- `compose optimize` 与 `kersor_status` 是否在任何文件修改前成功？
- Session 是否显示 `python_reference/python/custom_simulator` 与 authoring 预算 1？
- KSearch 是否因 integration mismatch 被拒绝，而不是得到伪高 fit？
- Agent 是否先确认基线、保护文件和 ISA 语义？
- 是否只有主 agent 写 `perf_takehome.py`，只读顾问没有写冲突？
- Workflow 是否匹配 Python/VLIW，而不是 CUDA？
- Proposal 是否保持 session-scoped，而不是要求 DSH 写 KerSor checkout？
- 结构校验后是否仍拒绝“先覆盖 checkpoint、再测试”的不安全 Workflow？
- 是否用 cheap probe 证伪，再做大改？
- 每个 cycles 改进是否同时通过正确性和保护文件 gate？
- 失败方向是否写入实验日志，防止下一角色重复？
- 终止时规范 phase 是否真的转成 `stalled`，侧栏活跃数是否归零？

DSH 顶部的 subagent 指示器用于观察 agent 组织；“KerSor 活动”侧栏用于观察 KerSor Session、round、Workflow、speedup 与 autonomous run。两者是互补证据，不应相互冒充。

## 5. 分阶段验收

| 阶段 | 门槛 | 说明 |
|---|---:|---|
| Baseline | 147734 | 官方 scalar starter |
| Milestone 1 | <18532 | 至少完成有效向量化／VLIW 重构 |
| Milestone 2 | <2164 | 进入强调度与结构优化区间 |
| Stretch | <1487 | 超过 README 中发布时的 Opus 4.5 最佳线 |

达到门槛后不要只在聊天中报告；先把命令、输出摘要、代码 diff 范围和角色决策写入 `VLIW_EVAL_LOG.md`，再进入下一阶段。

## 6. 每轮沉淀

插件自身的产品实验记录写入本仓库 `docs/experiments/`；比赛 worktree 的算法实验写入 `VLIW_EVAL_LOG.md`。前者回答“KerSor in DSH 哪条能力需要改”，后者回答“本次 VLIW 假设是否成立”。
