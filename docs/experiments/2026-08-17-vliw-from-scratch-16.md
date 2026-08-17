# Iteration 16 — 不让 Workflow authoring 越过 Phase 2 profile

## 本轮问题

Iteration 15 固定了 Session 的唯一可执行入口。本轮从另一份官方 worktree 开始，先
验证 `setup → stable projections → baseline init → record → verify`，再继续验证真正的
Agent 组织边界：released-workflow selection、唯一前台 workflow-author、不可变
handoff、一次 save 与重选。

本轮唯一新增审计问题是：即使这些组织边界都通过，optimizer Proposal 是否仍绑定
`commands/optimize.md` 要求的 Phase 2 Session profile，而不是依靠 prompt 常量猜测
瓶颈。

## 从零边界

- 官方基线：`origin/main@5452f74`
- worktree：`vliw-dsh-takehome-eval-16`
- branch：`eval/dsh-kersor-vliw-takehome-16`
- DSH workspace：`56f79d0e-d7b4-4de7-838f-fe99fa674d84`
- DSH session：`session-ddd1105c-8cd1-4617-b77e-bf049a3cab56`
- KerSor Session：`20260817-202423`
- model：`infini-ai/deepseek-v4-pro`
- `perf_takehome.py` SHA-256：
  `af14cbb2e8666aaba375aa6875e731b176875cb89b6f870473ae05cda979c15d`
- `problem.py` SHA-256：
  `fadb0f0858e2259f5759077a5544b9906dad3ceee80d37b4f0aa77da730c93c9`

第一次只读模型请求在工具调用前被 provider 以 `Service quota exceeded` 拒绝，token
和 tool 均为 0；限额窗口后重发同一探针成功。它不构成 KerSor 行为结果。

## Session bootstrap 与 baseline 首次闭环

Agent 从更新后的 skill 中读取到唯一
`scripts/setup-session.sh "$TASK_DIR"` 入口，自行把当前工作区作为第一个位置参数。
setup 成功后，它没有解析 raw JSON，而是通过 `kersor-state.sh get` 验证：

- fresh、baseline witness、candidate ownership requirement 均为 `true`；
- integration pattern 为 `custom_simulator`；
- retrieval、experience、transfer、KernelWiki experience export 均为 `off`。

随后 `baseline-witness.py init → record → verify` 全部成功。correctness exit 0；官方
baseline 为 `147734 cycles`。速度阈值测试在 baseline 上 exit 1 是预期事实，witness
policy 明确允许“有效测量但未超过 baseline 阈值”，最终 `verdict=pass`。witness 绑定
当前 Session config、test method 与官方 kernel hash。

真实 3197 侧栏首卡显示 `从零隔离：通过`、`基线见证：通过`，DSH compatibility 和
candidate ownership 保持待验证。

## Multi-Agent authoring 组织证据

released catalog 的 Workflow 全部因 `custom_simulator` integration mismatch 被确定性
拒绝，round 1 为 `STALLED`。owner 生成 `author-context.json`，其中 dispatch 固定：

- description：`Author one KerSor workflow proposal`；
- `run_in_background=false`；
- prompt 只绑定当前 Session staging、author context 与完整 workflow-author role。

parent 原样调用唯一前台 subagent。等待期间没有轮询 agent、检查 staging 或启动第二个
作者。blocking result 返回后，parent 的第一条工具动作是
`seal-author-handoff.py`；三个文件的 SHA-256 被不可变 seal 绑定。seal 后 parent 才
读取文件，未做任何修补；`save-authored-workflow.sh` 只调用一次并成功。Proposal 只
进入当前 Session store，重新 catalog 后以 probation/demoted 状态成为唯一候选，没有
被全局 promote。

## 新失败：author context 接受空 profile

在 finalize-selection 前审计发现：

- `$SESSION_DIR/kernel-profile.md` 不存在；
- `author-context.json.task.kernel_profile` 是空字符串；
- workflow-author 的 slot utilization、SIMD ceiling 与 bottleneck 结论来自 prompt 中的
  architecture facts，不是 Phase 2 Session evidence。

`commands/optimize.md` 明确要求 kernel-profiler 写出并确认 `kernel-profile.md`。但
`author-workflow-context.py` 过去只是 `_read()` 并把缺失文件投影为空字符串，仍返回 0，
导致 selection、authoring、handoff 和 save 都能越过 Phase 2。

DSH parent 写入 `run-1/profile-gate.json`（`missing_kernel_profile`）和以 `STALLED:`
开头的 round summary，然后通过 `kersor-state.sh` 把 Session 转成 canonical
`stalled`。Workflow 从未 dispatch，官方题目文件 hash 保持不变。本轮不是算法 NO-GO。

## 产品修复

KerSor 的唯一 author-context builder 现在在 baseline gate 之后要求非空
`kernel-profile.md`；缺失或空白时非零退出，并且不创建 partial context。协议、双语
README 和 changelog 同步说明该确定性 Phase 2 gate。

DSH 插件增加同源只读投影：

- `run-N/profile-gate.json` fail 优先显示失败与 bounded reason；
- 非空 `kernel-profile.md` 显示通过；
- 两者都没有则显示待验证；
- UI 新增“Profile 证据”徽标，失败时显示红色 `Profile 阻塞` callout。

bundle 版本提升到 `0.1.14`，viewer 为 `rc.15`，UI 为 `rc.16`。CSS bundle
normalizer 同时从固定 6 位 hash 改为 bounded 6–16 位字母数字 hash，以接受 bundler
合法输出，仍锚定唯一 `_layer` class。

## 验证与版本

- KerSor 红相：缺 profile 的 context builder 旧实现错误返回 0。
- KerSor 定向：`3 passed`。
- KerSor 全量：`1517 passed, 7 skipped`（603.17 秒）。
- DSH bridge 红相：两个新字段均缺失，`2 failed`。
- DSH bridge / UI 定向：`4 passed`（bridge 2、built UI/viewer 2）。
- 插件完整检查：`27 passed`；`scripts/build.py` 构建成功。
- preset：以 `--force` 重新安装到 `~/.dsh/.agent-presets/kersor`。
- live 3197 UI：首卡为 Session `20260817-202423`，显示 fresh / baseline 通过、
  Profile 失败、DSH / ownership 待验证，并展示 `missing_kernel_profile` 的 bounded
  红色阻塞原因；用户的 3080 服务保持 PID `91238`，未重启。
- KerSor commit：`6b31f71 fix: require profile evidence before authoring`，已推送；
  [CI 32032132260](https://github.com/qhy991/KerSor/actions/runs/32032132260) success。
- DSH 插件 commit：`651fe31 feat: surface KerSor profile evidence`，已推送；
  [Validate 32032337047](https://github.com/qhy991/dsh-personal-plugins/actions/runs/32032337047)
  success。

## 决策与下一轮

Session 16 证明 foreground author、immutable handoff 与 one-save 边界能在真实 DSH 中
成立，但也证明好的 Agent topology 不能替代缺失的测量证据。修复可以 LAND。

Iteration 17 必须从新的官方 worktree 开始：baseline 通过后先运行 kernel-profiler 并
得到非空 Session profile，再允许 selection 和 Phase 3.6 authoring。只有 profile、
handoff、DSH compatibility 与 candidate ownership 全部通过，才调用一次 Workflow。
