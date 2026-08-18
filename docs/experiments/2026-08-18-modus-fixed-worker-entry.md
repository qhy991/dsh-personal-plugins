# Modus matched fixed Worker entry

Date: 2026-08-18

## Question

Can DSH execute `neutral`, `p000`, and `p100` as matched root Workers without a Router model call, while retaining the same Worker tool restriction, token gate, Profile injection, and durable behavior policy used by routed Workers?

This is development mechanism evidence. The scripted smoke does not compare coding quality or token efficiency across Profiles.

## Design

`scripts/install_modus_fixed.py` derives three presets from one current DSH standard composition:

- `modus-fixed-neutral`: unchanged standard persona;
- `modus-fixed-p000`: standard persona plus the pinned p000 text;
- `modus-fixed-p100`: standard persona plus the pinned p100 text.

All three add the same `modus-fixed-worker` runtime, hide the routed Worker delegation tools, and may use the same paired new/cache-read token thresholds. Qualified Profiles use the same three-attempt pre-edit information gate as Router-created children; neutral remains untreated by that gate. Each cell is one root Worker session with zero Router sessions and zero descendants, so fixed-arm cost is the root session's complete durable usage.

The installer verifies the profile manifest and file digests before rendering, embeds the selected digest in the composition, stages a self-contained preset tree, preserves a differing prior install on forced replacement, and makes an identical reinstall a no-op.

## Runtime verification

Implementation commit: `51a6a2a03df4bbbc03c2d2f008a745c2d26f7661`.

Checks passed:

- 34 Node/plugin tests;
- 32 Python repository tests;
- 17 real DSH Loader/ToolRuntime/AgentRegistry/AgentLoop/fork compatibility tests;
- metadata, portability, syntax, JSON, and diff checks.

The real DSH fixed-p000 test confirms that the preset-visible tool catalog excludes `subagent_fork`, the fourth pre-edit read does not enter its tool body, and a following typed edit does enter its tool body.

## Installed Web/API smoke

A clean-plugin, clean-DSH, isolated-home smoke installed all three presets with identical `200000` new-token and `2000000` cache-read thresholds. It used a provider-free loopback mock and did not read ambient credentials. DSH `agentPreset.list` returned all three user presets. Each root session received the same user prompt, made exactly one model request, returned `FIXED_OK`, persisted one completed turn, reported 3 input + 8 output tokens, exported exactly one `session.jsonl`, and had no descendants.

Treatment injection was checked from the actual `request/header.system` strings:

| Preset | p000 occurrence | p100 occurrence | System SHA-256 | Export SHA-256 |
|---|---:|---:|---|---|
| neutral | 0 | 0 | `c31d926279bafae9a10ed5661222ea363f5cc9726bac5cc11370433b88b06da5` | `6223b2d65771c64af761be3f758effd9447faa852bba2df982f9f4e52d69e416` |
| p000 | 1 | 0 | `d8ea2a250595d0b1b3b84789f63ab71138b9838ce50df694d5a7d62650a05743` | `df52da8c6075c978f254302798575550ecfcaa74f8e9b5127253e0fcbb40386c` |
| p100 | 0 | 1 | `02c24042c8af427757db5d7f746be2fb8d32b8d19ec7739b360046283ca978df` | `90628851ed9c465b00d94362182b36d463ff536bfe504ad5b3491ed7fde4334a` |

Raw smoke summary SHA-256: `79e74f917413a81371a549947d1d947d55ba9942e519155c67d92a46f38cc9d1`.

The committed, redacted record is [`evidence/2026-08-18-modus-fixed-worker-entry.json`](evidence/2026-08-18-modus-fixed-worker-entry.json).

## Conclusion and boundary

The fixed-action execution and treatment-injection gap is closed: all three actions can now be created through the same DSH Web/API path without Router cost, and their actual model system prompts carry the intended zero/exact-one Profile occurrences. The runtime tests also prove the common behavior gate and tool restriction.

The smoke output is scripted, so it cannot support a Profile preference, quality, performance, or token-efficiency conclusion. The next admissible experiment is a frozen 3 action × 3 repeat development matrix using a real model, one task, identical prompt/workspace/verifier/budget, failure retention, no selective retry, and independent correctness/performance verification.
