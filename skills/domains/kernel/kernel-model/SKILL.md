---
name: kernel-model
description: 从固定 workload 和源码建立算子依赖、FLOP/byte、并行粒度及硬件映射模型，并把性能瓶颈写成可证伪的假设。
---
# Kernel model

在 `kernel-intake` 固定模型、phase、框架 dispatch、形状、dtype、硬件和源码 SHA 后执行。`kernel-explain` 使用此模型解释实现选择。

## 建模顺序

1. 从模型 caller 和参考数学定义算子契约：输入、输出、跨调用状态、shape/stride/dtype。选择一个明确的时间接缝，用带值名和时间索引的边画 DAG；并列分支、join、舍入、物化和同步边界分别标注。不要把 residual routes、CUDA streams 和 kernel 内流水混为一谈。
2. 按算子给出读取地址、计算、写回、状态寿命、归约维度和一个能手算的例子。为关键阶段记录 elementwise/broadcast、reduce（明确轴）、matmul、搬运/转换/同步等类型及输入输出 shape；数学矩阵乘与实际硬件实现分别记录。核心公式定义每个符号、epsilon、数值舍入位置；区分算法参考与具体实现差异。
3. 在同一固定 workload 上逐阶段核算有效工作、源码实际执行的重复工作、tile/填充工作、launch grid、每 CTA 工作和 scratch。对每条重要数据边记录读者/写者、访问范围、次数表达式、mask、复用范围、内存位置与下一消费者；对数值计算单列特殊函数和归约。每个数字写单位、统计范围（线程/CTA/token/调用）和分母。区分**存储大小**、**源码唯一地址下界**、**逻辑 load/store**和**实测物理流量**；没有 profile 时最后一项保持未知。使用 [逐阶段账本字段](references/execution-ledger.md#逐阶段成本与同步账本) 保存可复算依据。
4. 从源码追踪 Program/CTA、warp、thread 与矩阵引擎角色。`num_warps` 不能证明元素到 lane 的实际映射；不从源码猜测 occupancy、缓存命中或 HBM 事务。
5. 从源码的生产、等待、消费、释放关系建立 overlap 模型；分别说明算子 DAG 的独立分支、CUDA stream 并发和 CTA 内流水，记录 join、buffer 周转及可能的资源竞争。源码中的并发机会不等于实测时间隐藏。每个候选瓶颈写成 `源码事实 → 条件假设 → 可推翻它的观测`。至少区分 launch、并行任务数、计算、数据移动、同步/归约；标明 T/phase/硬件/Graph 变化可能改变主导项。报告 source-derived 模型和 measured 结果各自的证据边界。

输出 Case 中可复算的公式、代入值、source map 和 2–3 个可证伪实验。逐阶段成本与 dispatch/fallback 要能用同一 workload 核对。图含 `question`、`data_basis`、`what_to_read`、`conclusion`，标记 `conceptual`、`interpreter` 或 `hardware-measured`。

若研究首个 sparse-decode 案例，另读 [专属成本与布局参考](references/sparse-decode.md)；其中 H/head/key 常数不可移植到其他算子。
