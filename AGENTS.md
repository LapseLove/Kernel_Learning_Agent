# Kernel Learning Harness · Agent contract

## Goal
Build an engineer's understanding of **why this kernel exists, how it maps the workload onto hardware, where it wins/loses, and how to verify it**. Do not substitute generic CUDA tutorials for concrete code and workload evidence.

## Order of operation
1. Intake. Fix a `case_id` and inspect model version, phase (prefill/decode/verify), architecture/SM, TP/EP, token count, KV format, head count, shape, and source SHA. Resolve framework Dispatch before reading the isolated kernel.
2. Workload. Define math, tensor shapes/strides, memory/state lifetime, estimated FLOPs/bytes, occupancy/granularity, and specific bottleneck *hypotheses*.
3. Lineage. Separate **model algorithm lineage**, **implementation/PR lineage**, and **framework integration lineage**. Cite the exact PR, file at SHA, paper or official blog for each fact. Show what is not comparable.
4. Execution. Decompose in phase nodes, with exact pinned file path/line ranges and source-to-node mapping. Mark diagram type: `conceptual`, `interpreter`, or `hardware-measured`.
5. Evidence. Collect correctness, latency, throughput, CUDA Graph, JIT, warmup and profiler data. Always record hardware, input distribution, baseline, count of trials, version and measurement method.
6. Experiments. Present 2-3 falsifiable hypotheses; let the user predict before running. Archive counterexamples and failed variants.

## Non-negotiable trust constraints
- Do not fabricate code snippets, PTX/SASS, measured timings, PR discussions, benchmark numbers, commits or line numbers.
- Source deep links **always include pinned SHA**. A moved file on `main` is a separate implementation.
- A result reported by a PR author is `reported`, never `reproduced`. Preserve confidence/boundaries.
- Algorithm animation ≠ Triton interpreter execution ≠ GPU hardware trace. Label each clearly.
- Do not claim that padding 8/64 means 87.5% end-to-end runtime is wasted.
- Do not compare absolute tokens/s between a TP8/H20/DSpark-K2 run and TP4/GB300/DSpark-K5 run as a fair benchmark.
- SGLang's `dsv4/` source path is **not** proof that the code is for DeepSeek V4 instead of V4.1. Read the caller, shape and cache layout.
- Backtest dispatch boundaries and preserve mature fallback.
- Never overwrite user notes silently. New research goes to structured case with provenance; source Obsidian canvas remains untouched.

## Skills and exports
Run `kernel-intake` before `kernel-history`; run `kernel-model` before `kernel-explain`; `kernel-investigate` runs with a proven baseline. Case JSON and source map are canonical. Narrative Markdown/HTML are derived artifacts. The model must separate storage size, source unique-address lower bound, logical loads/stores, and measured physical traffic; identify source-proven Program/CTA/Warp/Thread roles and unknown compiler mappings.

## Definition of done per case
User can: identify the bottleneck hypothesis; explain the choice of compute tiling; navigate each crucial stage to pinned source; predict dispatch/fallback conditions; distinguish real test evidence from illustrative graphics; propose an experiment and confirm/refute it.

## Teaching quality gate — before Kernel Anatomy (v0.2)
The pre-anatomy section is **a guided explanation, not a dashboard**. For each new case:
1. Build a single causal argument: **operator data flow → precisely defined performance hole → one normal CTA from split assignment through Merge → exceptional paths → quantified trade-off → eligibility/dispatch → cross-implementation comparison**. The v0.5 worked example in Case JSON controls the guided Anatomy order.
2. Each illustration must carry `question`, `data_basis`, `what_to_read`, and `conclusion`. Do not draw generic GPU grids, decorative arrows, or repetitive tensor icons.
3. Use a physically meaningful denominator and an explicit unit. Example: `8/64 effective head slots` describes padded MMA's head dimension, **not** 12.5% GPU utilization or an 87.5% runtime loss.
4. Distinguish parallel input branches: the Query and selected sparse KV indices are separate inputs to attention; don't accidentally depict q→indices as a kernel-internal dependency unless showing the actual indexer.
5. Treat diagrams as *conceptual* unless an interpreter or profiler produced the geometry/timing. Never encode fake percentages or pseudo latency spans into visuals.
6. The lesson has at most four principal questions before Anatomy. Every question starts with a one-sentence claim, one readable main diagram, and one explicit answer. Attach a PR/commit link and an unresolved hypothesis where applicable.
7. Evolution must show **decisions and constraints** (why this option, why not the alternative) rather than independent chronological lists. A model version's name or a repository directory is not proof of interchangeability.
8. Keep a story-level check: after the pre-anatomy section, an engineer should identify the inputs and performance hole. After the guided Anatomy, they should derive the block/split/CTA mapping, explain one normal CTA and Merge, then assess cost and applicability without reading isolated code snippets.

See `docs/lesson-design.md`. When adapting to another operator, regenerate this narrative from audited Case evidence rather than changing labels on an inherited diagram.
