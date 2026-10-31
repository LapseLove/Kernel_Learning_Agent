---
name: kernel-model
description: 在固定源码和明确 workload 下，逐层核算 Kernel 的读取量、计算量、Tile 与 Program/CTA/Warp/Thread 分工，并标出无法由源码确认的硬件事实。
---
# Kernel cost and mapping model

在 `kernel-intake` 固定输入、架构、cache layout 和源码 SHA 后使用。`kernel-explain` 必须消费这里的核算结果，再制作 Anatomy。

## 核算顺序

1. 写清单位与分母：每有效 key、每 key slot、每 CTA、每 query token、每次调用。分别列 `H_real`、计算 Tile 的 `H_tile`、Key block/tile、有效 key 数、容量、split 数。对比旧方案时保持同一 workload；如果旧实现只有 PR 描述，就标为**形状代理模型**，不要冒充旧 Kernel 的真实执行计数。
2. 把字节分为四类：**存储布局大小**、**源码涉及的唯一有效地址下界**、**源码级逻辑 load/store 或 scratch 容量**、**物理 DRAM/L2/共享内存事务**。前三项可以按固定源码计算；最后一项没有 profile 不得填写数字。重复读取、缓存命中、合并访存、无效 mask 都要说明。
3. 计算 QK、PV、额外数值补偿和 Merge 分别的 FLOP 形状代理。FMA=2 FLOP；显式指出是否计算了 padding key slot、masked head、Softmax、dequant、地址运算。`H_real/H_tile` 是计算槽位比例，不是耗时比例。
4. 将总量分解为 Gather/Dequant、QK/PV、Q 读取、partial 写入与 Merge 读取、launch。指出优化改变了哪一项，哪一项保持不变，哪一项增加；不要把字节减少与计算量减少混为一谈。
5. 展示 launch grid → 单个 program/CTA → warp 数 → 显式 Thread/lane layout → MMA 引擎。每一级给出源码行、Tile 形状、循环或分支以及边界 mask。`num_warps` 只证明线程总数；普通 `tl.dot` 的 lane 到元素映射要查编译 IR/PTX，不能从源码臆测。Gluon `BlockedLayout` 可解释其逻辑寄存器分布，但不等于物理内存事务或 Tensor Core lane ownership。
6. 给一个可以手算核对的 H=16、K=640 示例，再给交互参数公式。为教学选能显示完整依赖链的 T，例如本 Case 的 T=4 会选 S=16，20 个 block 导出每 split 最多 2 block；先展示 split 0 的两轮执行，再展示 split 10 的空边界。所有量标 `source-derived model`、`reported` 或 `measured`；无 GPU 时仍能交付可复算的模型。

## 本 Case 的固定公式

- vLLM `B = ceil(SWA/32)+ceil(Extra/32)`，`slots = 32B`，`S` 来自 `_pick_config`。每 key 的 QK+PV 有效计算代理 `4×H_real×512` FLOP；16-head Tile 代理 `4×16×512`；旧 64-head 形状代理 `4×64×512`。前两者乘 `slots` 才是含 key block padding 的每 token 上界形状。空 split 没有 MMA。
- V4 cache 每 key 存储 `448+128+8=584 B`；vLLM 有效 load 的唯一 cache 字节是 `448+128+7=583 B`，再加 4B index。它不是实际 HBM 流量。Q 的源码级有效 load 是每 CTA `H_real×512×2 B`；scratch 的 `part_o + part_lse` 是每 CTA `16×(512×4+4) B`。Merge 只读真实 head 的 partial；各层相加时必须说明是否会重复计数。
- SGLang `NT=ceil(SWA_capacity/64)+ceil(Extra_capacity/64)`，每 CTA 64-key Tile、16 heads，4 warps。`BlockedLayout([1,8],[4,8],[4,1],[1,0])` 的基础逻辑分布是每 lane 1 key×8 channel、每 warp 4×64、每 CTA 16×64，再覆盖完整 64×512 Tile。`_load_v4` 的 scale 表达式 `d//64` 在 448 个 FP8 channel 上出现 448 个逻辑 load 位置，但仅指向 7 个唯一 scale 字节；编译器可能消重，不能声称 448 次物理读取。`tcgen05_mma` 的 QK+两次 PV 形状代理为 `6×16×512×64` FLOP/CTA；实际有效 key 与 mask 需单独列。scratch 是每 CTA `16×(512×4+4+4) B`。

## 输出验收

附公式、代入值、假设、固定 SHA 的行号与每层变化说明。Anatomy 必须有可读的数量对照，以及 Program/CTA/Warp/Thread/引擎分工图；未知项直接写“源码未指定，待编译 IR 或 GPU 测量”。
