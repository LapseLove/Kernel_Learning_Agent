---
name: kernel-investigate
description: 生成可复现的 Benchmark/Profiler/Correctness 测试计划，区分实测与报告。
---
# Investigate & experiment
先固定模型 revision、GPU、driver、compiler、FP8/FP4 semantics、TP/EP、数据分布、token lengths、CUDA Graph 和 warmup。分别测 operator、graph replay、server E2E、precision。保存每次原始 trace、指标、median/variance、完整命令与环境。任何 PR 数字一律 `reported_not_reproduced`，除非本机重跑获得独立数据。
设计一个可证伪的 bottleneck hypothesis，最小化变量数量；监控 negative speedups/accuracy flips，不隐去反例。

## 测试分层
新增 Case 复用 `docs/case-testing.md` 的结构、出处、推导一致性和浏览器动作门槛；为该 Case 追加正常输入、dispatch 两侧、空 split/尾块及 fallback 的具体样例。不要把“一个 Kernel 一个测试函数”当作覆盖目标，也不要复制整套 UI 测试。若有真实可运行实现，再添加 reference correctness、mask/page stride、dtype 边界和 GPU 性能测试；无 GPU 的概念图检查不得标作数值正确性或性能复测。
