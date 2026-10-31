---
name: kernel-explain
description: 源码和执行阶段的双向绑定，产生可视化 Storyboard。
---
# Explain execution
先运行 `kernel-model`，把读取/计算预算和 Program→CTA→Warp→Thread→MMA 的已知边界写入 Case。Anatomy 必须展示 H=16 时 64-head 对照与 16-head Tile 的 FLOP 形状代理、KV 唯一地址、Q 重复 load、scratch/merge，并明确物理访存未知。
讲述按**学习依赖**排序：固定一组输入并定义单位 → 算出 block/tile 数及 split/CTA 分配 → 跟踪一个非空 CTA 的 Gather、Compute、partial → 第二个 Kernel 的 Merge → 空 split/mask 等边界 → 读取/计算成本 → Dispatch/fallback 与跨实现对照。CTA 内部的源码先后顺序必须正确；框架 Gate 可在教学上最后复查适用性，但要注明运行时 Gate 先于 Kernel。前置配置不得放在其结果之后。每阶段需 `id/title/description/flow/source.file/start/end/pseudo/why/check/visual`；pseudo 必须显式标注为伪代码。Graphics 只可标为 conceptual、interpreter 或 hardware-measured（后两者必须真实工具产出）。
重点追踪 layout、page stride、mask、precision、launch grid 与同步。对 SM90、SM100 分别解释 ISA 映射，不能把 `tl.dot` 与 `tcgen05_mma` 当同一种实现。

Anatomy 图示按阶段选择具体表现形式：配置推导、token×split CTA 分工、页内寻址、QK/PV 矩阵轴、在线 Softmax 状态、scratch 与 Merge。用户切换数据或 QK/PV 时，固定 SHA 的源码摘录和行号必须随之定位；不允许用同一张泛化网格填充全部阶段。遵守 `docs/lesson-design.md` 的 v0.5 Teaching sequence contract。

## Worked-example rule

- 在 Case 中保存 `walkthrough.default_workload` 与 `teaching_order`；默认打开的是一组能手算、能走通非空 CTA、并能展示边界的参数。交互控件必须重算同一条推导链，不允许多个图使用隐含的不同例子。
- 首次出现 `key position`、`block`、`split`、`CTA`、`Tile` 时写明包含关系。尤其区分 `BLOCK_N×D`（单轮加载 Tile）和 `ceil(B/S)`（每 CTA 最多循环的 block 数）。
- 先走正常 CTA，再用折叠内容展示空 split、无效 ID、尾部 mask。不能在主线首屏以 `−∞ LSE` 解释分配。
- 显式画出 CTA 写 partial 与**第二个 Kernel** 执行 Merge 的边界；不要把 Merge 画成同一 CTA 的下一步。
- 每张动态数字图都显示当前 T/H/SWA/Extra、单位、公式及代入值。读者不用滚回前一页也能解释这个数字从何而来。
- 比较另一实现或架构之前，先确保读者能口述本实现的一条完整执行链。成本表放在执行链后，用于解释“改了哪一层”，不要在前置概念未定义时堆数值。

## Before source Anatomy: visual teaching narrative (required)
Do **not** start from a bag of tensor cards and historical bullets. The entry page answers only two prerequisite questions: what data enters the operator, and where this specific workload underuses the old compute shape. Lead directly into the anchored CTA walkthrough. Explain tiling/parallelization, added costs and dispatch after the reader can follow that CTA. Each figure needs a clear unit, one conclusion, an evidence link and a falsifiable assumption. Put model/ISA/framework evolution in an optional comparison chapter. Follow `docs/lesson-design.md` as the visual acceptance rubric; omit unsupported quantities and fake timing proportions.
