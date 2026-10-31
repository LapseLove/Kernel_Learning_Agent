# Experiment proposals

1. SM90: `T ∈ {1,2,4,8,12,16}`, `max_keys ∈ {128,640}`, local heads 8/16, split 8/16/32，比较各项子 Kernel 时长及端到端 decode。
2. SM100: 64-token split，收集 MMA N-dim、L2/DRAM、KV gather 与 two-PV compensation 的影响。
3. 分别验证 FP64 reference、BF16 output boundary、sink、mask、page strides、graph replay、warmup，不跨硬件直接横比 latency。

以上均为**计划，未执行**。需要真实的 H20/GB300 GPU 与 pinned dependencies。
