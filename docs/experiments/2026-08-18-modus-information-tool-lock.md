# Modus information-tool lock after the pre-edit limit

Date: 2026-08-18

## Triggering evidence

The matched fixed-action DSH pilot in `qhy991/Modus` commit `75c7b96` completed nine Infini-AI `deepseek-v4-flash` cells on one old development task. All nine passed hidden correctness and benchmark verification. The three qualified cells per action all executed no more than three pre-edit information tools, but denied attempts remained model-visible:

- p000: six total gate denials across three cells;
- p100: nineteen total gate denials;
- one p100 cell repeated sixteen denied information calls, reached 198,211 total tokens, and edited only at step 9.

The result demonstrates that pre-execute denial controls tool-body execution but does not reliably control the next model decision. Repeating the same denied schemas can convert the behavior gate into token-expensive churn.

## Minimal mechanism change

The limit remains three executed pre-edit information calls and still uses the durable trajectory projector as SSOT. On the first over-limit call:

1. the current call receives `MODUS_PRE_EDIT_INFORMATION_LIMIT` and does not enter its body;
2. the Worker receives a scoped temporary deny-list for `read`, `read_image`, `glob`, `grep`, and `bash`;
3. `edit` and `write` remain visible;
4. a typed workspace edit immediately releases the temporary restriction, restoring information and verification tools;
5. plugin unload, agent disposal, and rebind release owned restrictions;
6. HMR with an over-limit durable prefix reconstructs the temporary restriction; a durable typed edit reconstructs the released state.

Neutral remains untreated. The fixed and Router-created Worker paths share the same information-tool name SSOT in `lib/worker-policy.mjs`.

## Verification

- 35 Node/plugin tests passed;
- 32 Python repository tests passed;
- 17 real DSH compatibility tests passed on clean DSH `71705c7`;
- the real ToolRuntime test observes only `edit` after the fourth read denial and observes both `edit` and `read` after typed edit;
- the fixed Worker HMR test reconstructs the lock from four durable pre-edit attempts and reconstructs the released state after durable edit.

## Real-model sentinel

A new development-only p100 cell used plugin commit `3ac091d`, a new session/workspace/run id, the same old task and prompt, and was excluded from the completed nine-cell analysis. Its actual request schemas were:

1. step 1: full fixed Worker tools;
2. step 2: full fixed Worker tools; the parallel batch proposed six information calls and three were denied;
3. step 3: `read/read_image/glob/grep/bash` absent, while `edit/write` remained visible;
4. step 4: full tools restored after typed edit.

The Worker edited at step 3, completed with hidden correctness, and reported three gate denials rather than the previous p100 outlier's sixteen. It used 16,650 uncached input, 55,808 cache-read, and 3,175 output tokens (75,633 total), with steady time 0.010545 seconds. This proves the schema transition and removal of sequential deny churn. It does not prove lower typical cost: one sentinel total remains above the prior p100 median of 50,966 tokens.

Sentinel manifest SHA-256: `2e4bc63e2d5d05fe58c5d2a56bc342c3bf2e8515451e019c8b4b6503c029aa7a`. Record SHA-256: `ea30c4c38f2d8cbbf1761f76643bca32f900d26ecbf65847fa67cd9c74a0eb45`. Session export SHA-256: `21f868aa7bb194781f43006865e8bef92bd4bf6affb1fda1c6f376d0f2e8cf2b`.

This remains mechanism evidence, not an outcome improvement, and cannot overwrite or reinterpret the completed nine-cell pilot.
