# 首个 sparse-decode Case 专属 Anatomy

遵循 `docs/archive/lesson-design-v0.2-v0.6.md` 中首例的 v0.5 worked example；不要复用到其他算子。

讲解顺序：固定一组输入并定义 key position、block、split、CTA、tile 的包含关系 → 算 block/tile 和 split/CTA 分配 → 跟踪一个非空 CTA 的 Gather、QK/PV、online Softmax、partial → 第二个 kernel Merge → 折叠展示空 split/尾部 mask → 成本 → 回看 dispatch/fallback。运行时 gate 实际早于 kernel；这里把详细 gate 放后只是教学顺序。

- 图展示 H=16 对 64-head 的 FLOP 形状代理、KV 唯一地址、Q 重读、scratch/merge；物理流量未知。
- 区分 `BLOCK_N×D` 单轮加载 tile 与 `ceil(B/S)` 每 CTA 最多处理的 block 数。默认例子能走通一个正常 CTA 及一个空 split；交互控件重算同一条链。
- 每阶段绑定 Case 中的 `id/title/description/flow/source.file/start/end/pseudo/why/check/visual`。pseudo 标为伪代码；动态数字图写当前 T/H/SWA/Extra、公式、代入值与单位。
- 逐层追踪 layout、page stride、mask、precision、launch grid、同步和 scratch。SM90 与 SM100 的矩阵指令分别说明。源码无法证明的 lane 映射或物理事务直接标未知。
