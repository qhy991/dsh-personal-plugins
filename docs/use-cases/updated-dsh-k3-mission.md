# 在更新后的 DSH 中启动 K3 Mission

此入口供 Infini-AI / Kimi K3 的独立 Mission 实验使用。通过标准 `dsh --profile kersor --patch <文件>` 启动，保留已安装 KerSor preset 的 `/kersor-evolve` Host 校验；不依赖已移除的 `headless.runDirectCommand` 导出。

前置条件是所选 DSH 构建支持 `llm.preparedStreamVersion === 1`。该接口保证预算检查绑定实际发送的模型请求；仅更新上游 DSH 而未包含 KerSor 原生接口补丁时，插件会拒绝运行。任务的实际 worker 路由仍由安装记录中的 Core runtime 配置校验。

在启动 patch 中禁用旧 `kersor-app` 行，再插入 [dsh-mission-app.mjs](../../scripts/dsh-mission-app.mjs)。配置包含三个绝对路径：`harnessRoot` 指向构建完成的 DSH 源码目录，`workspace` 指向独立模型工作树，`contract` 指向工作树中的冻结 Mission JSON。恢复同一个等待中的 Mission 时，再提供原 `resumeRun` 绝对路径。

启动器创建加入 KerSor preset 的顶层 Session，通过 `commands.execute` 调用已注册命令，最后 flush Session 并输出 Host 终态。`completed` 退出 0，`waiting` 退出 75，其余失败退出 1。等待是检查点，不是模型部署完成。

新 DSH 的 Session 使用 `snapshotEvents()`。插件优先读取该不可变事件快照，同时兼容旧版本的事件数组；不会为缺失的 command/turn 生命周期伪造事件。

多小时实验应将完整 DSH 宿主放在独立后台进程管理下。不同代码工作区还须有独立的远端源码目录、构建缓存和结果目录；共用同一 GPU 时，设备测试仍由 GPU broker 排队授予使用权。

原生 DSH 的写节点使用一个候选事务文件。若采用异步 SSH 实验桥接，Host 只消费 Core 已提交的候选，将模型生成的内容逐字节应用到独立工作树，并保存绑定候选身份的结果。等待远端结果时退出模型轮次，在收到新的外部结果后恢复原 Mission。只读 Host 验证器保持原有网络与输出限制。
