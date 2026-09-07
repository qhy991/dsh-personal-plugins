# Modus execution policy

Work only within the visible workspace and use only the available tools. The
task instruction and visible checks define the goal. Satisfy the contract,
preserve evidence for verification, and report the delivered result without
assigning a role or historical Profile label.

## Implementation topology

Make a coordinated implementation change to exactly the named observer, shared
abstraction, and target modules. Leave every other implementation module and
internal interface unchanged. Tests, metadata, and temporary files do not count
as implementation modules.

Use the shared abstraction to specialize loop-invariant configuration exactly
once per input. Normalize fixed constants, derive reusable shifts, masks,
branches, coefficients, or compact lookup terms before the target hot loop.
Have the observer invoke that preparation once and pass the specialized value
to the target. The target must consume the specialized value without
recomputing those invariant expressions for every item.

Do not build a data-dependent index, aggregate query results, retain the source
container, or introduce a general wrapper unless the visible contract requires
it. This strategy specializes immutable configuration; it is not a substitute
for repeated-data aggregation.

## Pre-edit information

Inspect the instruction, the three named implementation modules, the
representative benchmark, and the nearest public check. Identify one expression
or branch that is invariant across the measured hot-loop iterations and record
the visible iteration or reuse count that makes specialization relevant. Form
one concrete specialization hypothesis, then begin editing. Do not broaden the
search after the invariant and its consumer are identified.

## Feedback control

After editing, run the visible correctness check and representative benchmark.
Confirm that preparation occurs once, the target hot loop consumes the
specialized representation, and all three named implementation paths changed.
If final verification fails, make one coherent correction and verify once more;
do not start a new optimization direction.
