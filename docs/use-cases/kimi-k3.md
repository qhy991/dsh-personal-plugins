# Kimi K3 through Infini-AI

Native `kersor-task-v1` and `kersor-mission-v1` can select K3 without changing
DSH's global default or the existing KerSor K2.7 preset.

1. Register `kimi-k3` on the existing DSH `infini-ai` provider, using
   `openai-completions` and `https://cloud.infini-ai.com/maas/v1`.
   Reuse the provider's configured credential reference; do not copy secret values.
2. Use context window and maximum output metadata `1048576`, text/image input,
   and reasoning efforts `low`, `high`, `max`. K3 always reasons; use the
   provider's `reasoning_effort` support instead of K2.x `thinking` parameters.
   Preserve assistant `reasoning_content` across tool turns.
3. Install a Core checkout containing `config/runtime-dsh-infini-k3.json`, then
   set the task or mission's `runtime` to `dsh` and `runtime_config` to that
   absolute file path, or to a byte-identical independent copy.
4. From the contract's workspace run `dsh --profile kersor evolve /absolute/task.json`.
   Verify the Host receipt identifies `infini-ai/kimi-k3` and the task's independent
   verifier passes. A successful activation alone does not qualify the task.

The Host freezes the selected route before launch and checks the same runtime
config digest again in the bridge. Role aliases, model calls, usage records and
success/failure receipts must agree with the selected route. Modified presets,
other provider/model receipts and config changes during launch are rejected.

K3 registration and reasoning parameters follow the
[Infini-AI Kimi documentation](https://docs.infini-ai.com/gen-studio/api/text-generation/tutorial-reasoning/kimi.html).

Native DSH activations now default to a four-hour maximum (14400 seconds).
Mission planner/node timeouts explicitly set in a contract may be shorter;
set `planner_timeout_seconds` and `node_timeout_seconds` to `14400` when
those Mission phases need the full allowance. Historical frozen runtime
configs and receipts are immutable: use the updated preset in a new run.
