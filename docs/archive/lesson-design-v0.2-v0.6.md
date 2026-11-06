# Lesson Design Contract · v0.2

> 历史参考，按需加载：本文保留旧案例的设计演进，不是新任务的启动必读。
> 当前选图与构建入口为 [visual-design](../../skills/formats/html/visual-design/SKILL.md)，页面交付分别由 [Technical Reviewer](../../skills/core/technical-review/SKILL.md) 与 [Visual Reviewer](../../skills/formats/html/visual-review/SKILL.md) 验收。旧案例细则不得替代双重审查。

## Cross-operator contract · v0.6 (2026-11-01)

The historical v0.2–v0.5 sections below describe the sparse-decode worked example. They are not a requirement to reuse its head counts, CTA geometry, or separate Merge launch for another operator. See the [technical learning workflow](../../workflows/technical-learning.md) for the current routing, including kernel-specific modeling and shared HTML design.

For a reader new to an operator, the main path must establish model placement, tensor/state contract and equations, then framework routing and workload hypotheses before the selected optimization scenario. Compare earlier implementations before explaining the larger fused kernel. Each section owns one teaching purpose; detailed source evidence and alternative configurations may be progressively disclosed.

A data-dependency edge needs an actual producer value and consumer. Distinguish time/layer indices; two consumers of separate output slices are siblings unless one reads the other's result. Draw the operator DAG separately from launch coverage: a fused launch may contain independent branches, internal global scratch and inter-CTA synchronization. Equal-width stage columns do not imply ordering or duration.

Every bound label includes its workload, accounting layer, source-based reason, and an observation that would refute it. Shape alone cannot establish measured compute-, bandwidth-, launch- or synchronization-bound behavior. Use one hand-verifiable scenario to connect grid/splits/threads, numerical rounding and intermediate storage to the optimization decision.

Acceptance is a cold-reader reconstruction of the computation and the optimization trade-off, plus source, arithmetic and browser checks. Test counts and screenshot presence alone do not establish teaching quality. Record each review failure and the reusable skill correction in a case research log.

## Diagnosis of the v0.1 UI
The old Workload page mixed four disconnected tensor cards, free-standing hypotheses, and a dispatch slider. The Evolution page put three lists side by side, despite the different causal role of (i) model design, (ii) hardware/ISA, and (iii) runtime integration. Neither view answered a question step-by-step; the repeated 64 tiny squares and anonymous CTA grids provided no clear interpretation. The homepage opened in Anatomy and skipped the prerequisite problem model entirely.

## Historical pre-Anatomy learning path · v0.2

The v0.5 teaching sequence at the end of this document supersedes this earlier four-question order. The current Workload page introduces only inputs and the performance hole; the chosen implementation's normal CTA path comes next.

**Chapter A / Workload:**
1. **What does sparse decode actually read and calculate?** Two independent inputs: query and selected sparse indices → page gather/unpack → QK + softmax + PV. On the pinned V4 packed layout, one KV token record is 584 B (448 FP8 noPE, 128 BF16 RoPE, 8 scale). Treat physical page strides and lengths as additional constraints.
2. **Why is small-head a performance hole?** A TP8 rank has 8 real heads while SM90 FlashMLA's WGMMA head-M computation tiles 64. Visualize the 8/64 *useful head slots* as a large, readable area ratio. Do not infer whole-kernel time wasted.
3. **What changed?** Old FlashMLA has little parallelism for a handful of queries (the PR describes approximately one CTA/query in that region). New vLLM decoder has `T × S` CTAs with `S=8/16/32` depending on workload. SGLang SM100 instead splits into 64-token KV tiles and maps 16 real heads to MMA N. Both pay for partial scratch and Merge.
4. **When does it win?** Explain competing costs (Gather/Dequant, QK/PV, intermediate stores, Merge/Launch), then expose a live dispatch simulator under fixed preconditions. Explain fallbacks. Profiles are required to claim a bottleneck ranking.

**Chapter B / Design Evolution:**
1. Model lineage **is not** implementation lineage. Treat notes about V3.2/V4/V4.1 as source notes requiring source verification when changed.
2. The hardware fork (SM90 head-M vs SM100 head-N) motivates different mappings. Present alternatives next to the *constraints that caused them*.
3. Integrating the fast path adds eligibility, numerical correctness, CUDA Graph/JIT warmup obligations.
4. Contrast implementation decisions, but explicitly block H20/TP8 and GB300/TP4 cross-system absolute speed comparisons.

**Then → Kernel Anatomy:** actual source-linked stages for the chosen variant.

## Readability acceptance test
- A figure has a unique question above it, a short conceptual-vs-measured label, readable quantities, a one-sentence inference underneath, and a citation to primary evidence.
- A diagram explains actual relationships. E.g. query and index are separate graph inputs, not a falsely sequential chain.
- Any counts in a CTA grid must depend on user-selected workload parameters or be marked as a frozen example. Counts are CTA launches, **not SM occupancy**.
- A visualization may omit information to stay legible but must never invent execution ordering or present estimates as measured fact.
- The page supports a short uninterrupted reading path; optional evidence links lead to pinned sources.
- Desktop and narrow-width mobile should not have horizontal overflow.

## MVP limits
This is a **case-specific authored teaching renderer**; it does not yet generate lesson diagrams automatically for arbitrary kernels. The Skills above specify the research/output contract for future generation. Real hardware-timed execution graphics and automatic layout extraction remain future work.

## Anatomy contract · v0.3
- Every stage has one engineering question, a source-backed explanation, a concrete visual, and one conclusion. Repeating the same generic CTA/head grid on every stage is a failure.
- The visual must expose the specific source variables that determine its shape: index capacity versus effective length, page size/stride, BLOCK_N or BT, head axis, split count, scratch format, and merge formula.
- A user must be able to select a token/split and explain which SWA or Extra key region that CTA owns. Empty splits and masked tiles must stay visible as possibilities.
- The code panel contains verbatim excerpts from the Case's pinned SHA, with line numbers and Git blob SHA. A mismatched local checkout is not presented as the pinned source.
- When a control changes a diagram (for example QK to PV), the code excerpt and source link must move to the matching lines.
- Conceptual geometry is not interpreter output or hardware trace. A diagram of program count must not imply SM occupancy or duration. No measured percentages or fake timeline spans.

## Cost and mapping contract · v0.4

- Before stage browsing, show a source-derived cost ledger with H=16 old 64-head shape versus new 16-head shape. Keep useful FLOPs, padded Tile FLOP proxy, KV unique addresses, Q logical loads, and scratch bytes in separate rows; never sum different accounting layers as physical bandwidth.
- For a changed input, recompute key-slot padding and split count. Distinguish capacity from per-token effective length and mark the all-valid assumption.
- The mapping view must show grid, selected CTA, its Key tile/block, warp count, source-defined lane layout if any, and MMA operand axes. A vLLM Triton `tl.dot` has no source-defined lane assignment; a Gluon `BlockedLayout` describes logical data distribution, not measured transactions.
- Cite the exact fixed-SHA line range for each amount and division. Label old 64-head FLOPs as a shape proxy unless old compiled/kernel evidence is available. No claim of end-to-end speedup follows from FLOP ratio alone.

## Teaching sequence contract · v0.5

- Anchor one workload in Case JSON. For vLLM use T=4, H=16, SWA=128, Extra=512: 4+16=20 key blocks, S=16, at most 2 blocks per split. All visible diagrams and formulas must recompute from the same controls.
- Show the unit ladder before any cost table: selected key position → 32-key block → one split/CTA → one query token → whole launch. A `32×512` KV Tile is one loop iteration within a CTA; it is not a split or the entire launch.
- Trace split 0 through index load, Gather/Dequant, QK/Softmax/PV, partial scratch, then a separate Merge Kernel. Only after this path is clear should a collapsible aside explain split 10's empty range and `−∞` LSE.
- Order source stages by explanatory dependency: configuration → split assignment → program/warp hierarchy → KV load → compute/partial → merge → gate/warmup. Do not place split policy after the CTA distribution it determines.
- Put FLOP/byte accounting after the execution trace. Put cross-framework comparison in its own optional chapter; the guided route should advance from workload directly to the chosen implementation's Anatomy.
- Acceptance test: a reader should derive `ceil(20/16)=2`, identify which CTA handles block 0 and 1, explain why `32×512` is per loop, and recognize Merge as a separate kernel without reading source code or a tooltip.
