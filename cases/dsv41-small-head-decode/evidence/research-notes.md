# DSv4.1 small-head sparse decode：研究备忘（2026-10-27）

## 依据与出入
- 用户 Canvas 的中心线索：vLLM #59418（SM90, FP8 packed cache, split-K）与 SGLang #39674（SM100, native16 Gluon）。完整 Canvas 只复制到 `references/`，不做自动覆盖。
- [vLLM #59418](https://github.com/vllm-project/vllm/pull/59418)，SHA `74c0f0e10ac647ee22cf9e2bcd0ee20e40aee343`。状态：**open, unmerged**。PR 作者报告：SM90、小 head、`tl.dot`、prefill 走 FlashMLA；≤256 key 时最多16 decode tokens，否则最多12；`>256` keys 下 tokens≤3 使用32 splits、≤7 使用16 splits、否则8 splits。其他条件交回 FlashMLA。
- Canvas 早期记录 “tokens ≥8 总走 FlashMLA” **不适用于所读 PR SHA**：当前门槛依 max_keys 是 12/16，`tokens >=8` 可用 8-split 新 Kernel。请保留历史笔记作为旧阶段推断，不当成当前 Dispatch 真值。
- [SGLang #39674](https://github.com/sgl-project/sglang/pull/39674)，SHA `b98a4ead5bd337418e8eb5a18e9f5f5a402baac0`。状态：**merged**。SM100/103、TP4 16 actual heads、BF16 Q、512-d、V4-packed 584 bytes/token、1–8 query tokens。MMA N 维放 Head，GLUON tcgen05，按64个KV token split，单独合并 FP32 partial 和 sink。
- `dsv4` 在文件路径中是命名空间；这两条都聚焦 V4.1 的专用条件，不能因此将 SGLang 方案简单标注为“V4 模型的旧实现”。
- SGLang 官方 Day-0（2026-09-10）介绍的是 DeepSeek V4.1 的模型结构/跨层共享与系统栈，不是该 PR 在所有硬件上的性能证据：[原文](https://www.lmsys.org/blog/2026-09-10-deepseek-v41)。

## 性能边界（仅作者报告，不是独立复现）
- vLLM #59418: 8×H20 TP8 DSpark-K2，concurrency1 median ITL 8.99→8.37ms（−6.8%），concurrency2 10.96→9.87ms（−9.9%），concurrency4 13.91→13.11ms（−5.7%）。大并发基本走 fallback。单 H20 的小 head 微基准 inside gate 1.06–2.14×，视 key width 变化。
- SGLang #39674: 4×GB300 TP4、DSpark simulated acceptance mean 5.5，两个独立 start-pair 的单用户速度 1074.79→1153.28 tok/s (+7.30%) 和 1046.21→1166.58 (+11.51%)；C64 无实质回退；其注意力微基准 target-long 19–20µs→9µs，不能替代端到端对比。
- 算术改变可能影响最终 token。vLLM PR 报告 GSM8K 1187→1186（1319），SGLang PR 报告 GSM8K 1280→1281（1314）；不代表严格数值或输出完全一致。

## 优先核验
1. 逐条跟踪小 head 的 backend gate、JIT warmup 与 CUDA Graph capture。
2. vLLM: FP8 dequant、`tl.dot`、online softmax、merge-split、sink 的真实 buffer/stride。
3. SGLang: `tcgen05_mma` 两次 PV（prob BF16 high + residual）为什么要做；精度路径与 SM90 不等价。
4. 画每个 CTA 的分工图，并在 GPU Profile 验证 grid parallelism、gather/dequant、merge overhead、DRAM/L2。
5. 比较 TP4/TP8、tokens、SWA-only vs compressed top-k，但避免将跨硬件的绝对数值做因果推断。

## 需要防止的版本误判
- 截至 2026-10-24，SGLang 官方另有与 DeepInfer 的最新比较，称其已经集成 MegaAttention 等 Mega 系列 Kernel，并表示在 B300/GB300 上 MegaAttention 是默认 Attention 路径。这**不表示**研究中的 `#39674` 实现在当下所有线上条件中仍被选中；必须检查目标 commit 的实际 dispatch，再对比现行 main 的变化：[2026-10-24 官方文](https://www.lmsys.org/blog/2026-10-24-dsv41-deepinfer/)。本 Demo 特意冻结 #39674 的历史快照用于逆向学习。
- Canvas 引用了另一篇本地 Obsidian `.md` 和多幅 `attachments/Pasted image ...`。这些文件并未一起上传，本包保留 Canvas 及引用路径，但**未引入**相关原文/图片。后续如有原始 Vault 文件，可以补上，不应猜测其内容。
