---
name: kernel-history
description: Trace a kernel's prior optimization decisions across model algorithm, implementation, and framework dispatch, using pinned primary evidence and comparable workload boundaries.
---
# Kernel history

Run `kernel-intake` first. Fix a case ID, model and phase, framework entry, hardware, parallelism, shapes, dtype/layout, and source revisions. Trace the caller and fallback before interpreting an isolated kernel. Mark missing intake fields as unknown; a directory name is not model-version evidence.

Before drafting a chronology, draw the algorithmic operator DAG from the model caller and reference math. Show model placement, all inputs/outputs and persistent state, tensor shape/dtype, data dependencies, and numerical boundaries. Attach each historical kernel to the exact DAG nodes it covers; identify the nodes and launches it leaves outside. Give unfamiliar operators a brief formula and hand-checkable example before naming an optimization. This graph is the common basis for comparing fusion, side-stream overlap and later all-in-one implementations; regenerate it for each operator instead of reusing another case's visual labels.

Build three linked, separate lines of history:

1. **Algorithm:** the operator's mathematical goal and state lifetime, the prior algorithm it changes, and model-specific ordering or numerical constraints. Use the paper or official model material.
2. **Implementation:** the actual earlier operators, kernel boundaries, fusion, compute tiling, memory/launch costs, rejected alternatives, and introduction/fix PRs. Cite files at full SHAs; label an unmerged proposal as such.
3. **Framework:** wrapper → caller → phase/shape/architecture gate → fallback, dependency pin, warmup, CUDA Graph, and later dispatch changes. Do this independently for each framework and revision.

For each decision, state **problem → candidates → chosen change → constraint/trade-off → evidence → unresolved hypothesis**. A PR title or benchmark alone does not prove its implementation or dispatch. Check code at the PR head or a chosen merge/commit SHA; source links must be `blob/<full SHA>/path#Lx-Ly`. Record whether that SHA is a PR head, merge commit, dependency pin, or later snapshot. Do not silently substitute `main` for the historical revision. Backtest a claimed gate with eligible, boundary, and fallback examples.

Compare variants only after recording model version, phase, hardware/SM, TP/EP, token distribution, hidden size, dtype, baseline, CUDA Graph/JIT/warmup treatment, trial count, and measurement method. Keep author-reported results distinct from local reproduction. When these fields differ, compare architectural decisions, not absolute speed. Do not turn kernel speedup into an end-to-end speedup.

Separate three forms of overlap: operations fused *within one kernel*, concurrent work on distinct CUDA streams, and communication/computation overlap in a distributed training schedule. Show producer/consumer joins and the state whose lifetime crosses the overlap. Do not infer concurrent execution from stream creation alone; that requires profiler evidence.

Produce case `lineage`, `comparison`, and `notes` using the canonical Case/source-map schema when authorized to edit it. A standalone research note is acceptable when case ownership belongs elsewhere; include a compact source manifest with SHAs, PR status, pinned paths/lines, evidence class, and gaps. Preserve user notes. End with 2–3 falsifiable experiments and a short checklist of facts the learner can derive from the history.

Before finishing, audit every claim against its cited primary source, verify pinned line anchors, distinguish reported/reproduced/inferred, and explicitly list unknowns. Revise this skill only for failures observed in actual use, keeping generic operator details out of it.
