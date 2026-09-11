# DeepSeek V4 Flash through Infini-AI

Native `kersor-task-v1` and `kersor-mission-v1` can select the DSH model
`deepseek-v4-flash` through an install-recorded runtime preset.

1. Register `deepseek-v4-flash` on DSH's `deepseek-official` provider with the
   existing Infini-AI base URL and credential reference.
2. Install a KerSor Core checkout containing
   `config/runtime-dsh-deepseek-flash.json`.
3. Set the contract's `runtime` to `dsh` and `runtime_config` to that file's
   absolute path, or to a byte-identical independent copy.
4. Require the Host receipt to identify
   `deepseek-official/deepseek-v4-flash`; the task verifier remains the
   acceptance authority.

The Host freezes the runtime-config digest and route before launch. A different
provider, model, alias map, or runtime-config digest is rejected before the
worker can be accepted.
