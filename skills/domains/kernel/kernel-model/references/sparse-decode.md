# 首个 sparse-decode Case 专属模型

只在该 Case 的固定源码与 H/head/key 布局下使用。先选能显示正常和空 split 的一组输入，例如 H=16、K=640、T=4；随后计算 block/tile 数、split 分配和每个 CTA 的循环次数。不要把这里的常数迁移到 mHC。

- vLLM：`B=ceil(SWA/32)+ceil(Extra/32)`，`slots=32B`，`S` 来自 `_pick_config`。每有效 key 的 QK+PV FLOP 代理为 `4×H_real×512`；16-head tile 为 `4×16×512`；旧 64-head 形状代理为 `4×64×512`。乘 slots 得含 key block padding 的形状代理；空 split 不做 MMA。`H_real/H_tile` 是槽位比例，不是耗时比例。
- V4 cache：每 key 存储 `448+128+8=584 B`。vLLM 源码唯一有效 cache 地址为 `448+128+7=583 B`，另有 4B index。Q 有效 load 每 CTA 为 `H_real×512×2 B`；scratch 的 `part_o+part_lse` 每 CTA 为 `16×(512×4+4) B`。这些均非实测 HBM 流量。
- SGLang：`NT=ceil(SWA_capacity/64)+ceil(Extra_capacity/64)`；每 CTA 64-key tile、16 heads、4 warps。`BlockedLayout([1,8],[4,8],[4,1],[1,0])` 的基础逻辑分布为每 lane 1 key×8 channel、每 warp 4×64、每 CTA 16×64，再覆盖 64×512 tile。`_load_v4` 的 scale `d//64` 在 448 个 FP8 channel 上出现 448 个逻辑 load 位置，但只指向 7 个唯一 scale 字节；物理读取需 IR/profile。`tcgen05_mma` QK+两次 PV 代理为 `6×16×512×64 FLOP/CTA`；scratch 每 CTA 为 `16×(512×4+4+4) B`。

对比旧方案时，同一 workload 列出 Gather/Dequant、QK/PV、Q 重读、partial 写、Merge 读和 launch；若旧实现只有 PR 描述，则只能称为**形状代理**。说明 SM90 `tl.dot` 与 SM100 `tcgen05_mma` 不同的 ISA 路径。所有数字附固定 SHA 的行号、单位、分母和未测项。
