---
name: kernel-intake
description: 固定模型、Workload、硬件、框架与 Commit；从入口追踪实际 Dispatch。
---
# Kernel intake
固定 case_id、仓库/源码 SHA、模型版本、阶段、设备、并行策略、dtype/layout、输入规模与框架入口。只收集算子相关维度：attention 才要求 heads/KV/cache；mHC 关注 routes、hidden、token 和系数跨边界生命周期。未知标 unknown，不适用标 N/A，不能填入另一案例的默认值。

先追 wrapper → model caller → backend/capability → shape/phase/parallel gate → fallback；记录每一判断的固定源码和分支优先级。注明 CUDA Graph/JIT 对资格与测量的影响。模型名、目录名和函数名均不能替代 caller 证据。

输出进入该 Case 实际使用的 JSON/schema 与 source map。当前 sparse-decode 使用 `python -m kernel_learning validate`；mHC 使用 `python -m kernel_learning validate-mhc`。新算子先确认 schema 是否支持，不可借填 heads/KV 让校验通过。

Dispatch 教学策略仅包含已核验的判断；为每种实现记录候选、边界与回退例子。阶段标签与实际 token 数分开；TP/EP/CP/SP 如何改变每 rank shape、collective 或可融合接缝要显式记录。源码分支推导不等于运行 trace。
