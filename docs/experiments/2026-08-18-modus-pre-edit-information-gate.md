# Modus pre-edit information gate

Date: 2026-08-18

## Question

Can a profile instruction reliably move an Agent from inspection into a bounded edit, or does that transition require a runtime invariant?

This is a development mechanism study. It does not estimate held-out profile quality or Router net benefit.

## Apparatus check

The KernelOwl carrier branch `codex/evidence-bound-promotion` was fetched and was already current at `ddd79548176b62aa7bac55b8a6d4b3e0525a9483`. Thirty-five targeted provider, retry, verification, staleness, and best-metric tests passed. A representative Infini-AI `deepseek-v4-flash` Agent smoke also completed before the two treatments below.

Both treatments started from the same independently verified kernel:

- kernel SHA-256: `03c8b9196fcf4cb8557f72f3df9bc0cf71b29825eab17bdb566fcf0bb5c9ed01`
- 8/8 seed correctness;
- deterministic 16,978 cycles;
- target for the incremental experiment: strictly below 16,978 cycles.

The verification command was promoted into KernelOwl's structured `declared_verification_command`, rather than appearing only in free-form prose.

## Development treatments

| Treatment | Model calls | Agent steps | Uncached input | Cache read | Output | Total tokens | Cost (CNY) | Executed edits | Final cycles |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| broad checkpoint continuation | 34 | 34 | 226,725 | 742,656 | 182,693 | 1,152,074 | 0.606964 | 0 | 16,978 |
| prompt-only bounded patcher | 9 | 11 | 31,280 | 54,784 | 7,521 | 93,585 | 0.047418 | 0 | 16,978 |

The bounded treatment reduced total token by 91.88% and recorded cost by 92.19%, but it did not improve quality: both treatments executed zero kernel edits. The broad treatment attempted a whole-method edit whose tool arguments reached the 16,384-token response boundary and never became an executed edit. It also created a backup file and contaminated its original workspace custody. The bounded treatment preserved clean custody, but made ten read/search/inspection attempts despite a prompt instruction allowing at most two before editing.

Raw local artifacts remain outside Git. Their frozen summaries are bound by these hashes:

- broad summary: `d808fd0e691cb7055a180f372cdf46baf2c516704666888be1e479dff543fc7c`;
- broad fresh-projection verifier receipt: `b8f0644442f00da19ef6a6ff4aaa001d038e8a696ef60d348f53187788731959`;
- bounded summary: `071b9b9a81a886d4056145f2d66204fd08110f747bcb1a37f8c55f66770653d5`;
- bounded original-workspace verifier receipt: `b8f0644442f00da19ef6a6ff4aaa001d038e8a696ef60d348f53187788731959`.

The redacted, machine-readable development record is committed at [`evidence/2026-08-18-modus-pre-edit-information-gate.json`](evidence/2026-08-18-modus-pre-edit-information-gate.json).

## Conclusion

The data supports one narrow claim: a smaller hard budget controls cost, while a prompt-only instruction did not control the inspection-to-edit transition in these runs. It does not show that the existing Modus DSH profiles are ineffective, because the carrier was KernelOwl and no DSH Profile Worker was executed.

The next Modus mechanism therefore moves only this transition into the existing durable trajectory primitive:

1. `neutral` remains untreated.
2. Installed `p000/p100` Workers may execute three pre-edit workspace information attempts.
3. The fourth read/search/inspection-shell attempt is denied with `MODUS_PRE_EDIT_INFORMATION_LIMIT`.
4. A typed workspace `edit/write` permanently lifts the gate for that Worker.
5. Native and Code Mode starts are counted once from durable events; fork seed actions are excluded.
6. HMR must reconstruct the selected Profile from the qualified durable subagent descriptor; missing or mismatched identity fails before another model request.

This gate does not claim that the edit is correct or that the file changed. Independent correctness, performance, and custody verification remain mandatory.

## Verification

The implementation passed:

- 31 pure Node/plugin tests;
- 5 Modus installer tests;
- 16 real DSH Loader/ToolRuntime/AgentLoop/fork compatibility tests on clean DSH `71705c7ff0d47cc7823b240e4d3f2be1dd7d52bb`.

The real native pipeline test proves that the first three `read` bodies execute, the fourth body does not execute, a following typed `edit` does execute, and the final parent route result exposes the denied read plus the first edit in its durable trajectory.

An additional installed Web/API smoke used clean DSH `71705c7`, clean plugin commit `9ef8ebe`, an isolated home, and a provider-free mock. It verified that the rendered preset contains the `p000/p100` three-attempt gate, created one p000 fork Worker, preserved parent/child lineage, exported both sessions, and recovered complete mock usage of 5 Router + 12 Worker = 17 total tokens. The smoke summary, export, and effective-config hashes are recorded in the machine-readable evidence. Because the mock route and Worker answer were scripted, this proves installation/composition only and does not exercise or validate profile-task fit.

## Next experiment

Run a new DSH development pilot with the same task, model, prompt, budget, and verifier under three fixed actions: `neutral`, `p000`, and `p100`. The primary mechanism check is whether qualified Profiles now cap pre-edit information attempts while neutral remains unconstrained. Outcome and token comparison is secondary and must not be promoted until each action has replicated, verifier-complete cells.
