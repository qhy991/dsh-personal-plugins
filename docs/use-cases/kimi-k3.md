# Kimi K3 through Infini-AI

Native `kersor-task-v1` and `kersor-mission-v1` can select K3 without changing
DSH's global default or the existing KerSor K2.7 preset.

1. Register `kimi-k3` on DSH's `infini-ai` provider. Reuse its configured
   credential reference; do not copy secret values into a task, Mission, or
   preset.
2. Install a KerSor Core checkout containing
   `config/runtime-dsh-infini-k3.json`.
3. Set `runtime` to `dsh` and `runtime_config` to that file's absolute path, or
   to a byte-identical independent copy.
4. Launch through the KerSor DSH profile and verify that the Host receipt names
   `infini-ai/kimi-k3`. The task's own verifier remains the acceptance authority.

The Host freezes the selected runtime-config digest and model route before it
launches Core. Role aliases, child model calls, durable usage, and terminal
receipts must agree with that route. An unregistered model, another route, or a
runtime-config change during launch is rejected.

DSH activations may run for up to four hours. A Mission may set shorter planner
or node limits. Historical runtime configs and receipts remain immutable; start
a successor run when the trusted preset changes.
