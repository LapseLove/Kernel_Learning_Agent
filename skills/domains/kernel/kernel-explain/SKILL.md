---
name: kernel-explain
description: 将已核验的 kernel 数学、dispatch、硬件分工与性能取舍组织为可手算和追踪源码的讲解。
---
# 讲解 Kernel 执行

以 [kernel-model](../kernel-model/SKILL.md) 的事实和共用 [lesson-plan](../../../core/lesson-plan/SKILL.md) 的读者提纲为起点。

1. 先定义算子身份、模型位置、输入输出、核心数学与依赖，再解释框架如何选到实现。用同一条数据流标出 fusion 覆盖、跨 launch 中间值和物化边界。
2. 用可手算 workload 追一个正常任务到归并。先说 grid 为什么这样切、partial 给谁、shape 属于谁，再下钻 CTA/warp/thread。切换参数时同步更新数量、公式、职责和出处；条件跨过 gate 时跟到实际路径。
3. 把算术、访问与等待分开。公式标 shape、归约轴、时间索引和舍入。成本区分有效/重复/填充计算与四种字节口径；流水至少追两个工作单元，明确等待、消费、释放和复用。

切观察层或展开执行层次时读 [阅读连续性与执行映射](references/reader-transitions.md)。遇到 persistent / megakernel，读 [任务、角色与 buffer](references/megakernel.md)。成本与同步字段见 [GPU 执行账本](../kernel-model/references/execution-ledger.md#逐阶段成本与同步账本)。只在对应案例中读 [sparse-decode](references/sparse-decode.md) 或 [mHC 页面实现](references/mhc-components.md)。
