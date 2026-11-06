# GPU 执行账本与冷读问题

按需记录与本案例优化有关的字段。证据口径使用共用 [source-evidence](../../../../core/source-evidence/SKILL.md)。

## 优化决策

| 决策记录字段 | 含义 |
| --- | --- |
| `problem`, `options` | 精确的 workload 缺口及当时可行的实现选项。 |
| `choice`, `reason` | 选择的 tiling、fusion、layout 或 dispatch；关联证据 `claim_id`，并说明未选方案的约束。 |
| `cost`, `eligibility` | 新增 scratch、同步、launch、数值边界、编译/Graph 负担及实际 gate/fallback。 |
| `prediction`, `test`, `outcome` | 2–3 个可证伪假设，运行前让读者预测；保存反例、失败变体与尚未验证的结果。 |

## 共享结构：依赖、launch、内存

- **算子 DAG：** 每个节点记录公式/归约轴、输入输出的 shape/stride/dtype、值名、时间或层索引及状态寿命。边仅在真实生产者值被消费者读取时存在；独立输入保持独立。注明物化、collective、舍入和跨调用状态转移。
- **实现覆盖：** 把旧/新实现的每个 launch 作为覆盖框映射到相同 DAG 节点；单列外部节点、跨 launch 中间量、CTA 间协调与 fallback。框表示覆盖，不表示时间；实际并发或耗时需 profiler 证据。源码映射包括固定 SHA 文件/行与框架调用点。
- **执行映射：** 从 split/block 分配追一个正常 CTA 到 partial 和归并，再解释空任务、尾块等异常路径。记录 grid、每 CTA 工作、warp 数、源码明确的线程布局与矩阵操作轴；编译器实际 lane 映射、occupancy 和物理事务若未测则记未知。
- **内存/成本：** 分开记录存储大小、源码唯一地址下界、逻辑 load/store 和实测物理流量；有效 FLOP 与 padded tile 计算也分开。每项有 workload、公式、单位、分母、数据来源及敏感参数。不得把不同核算层相加为 HBM 字节。

## 逐阶段成本与同步账本

对影响优化决策的阶段，以 Case/source map 中的结构化记录为准，页面表格和示例由同一记录推导。字段是逻辑契约，不要求现有 Case 采用固定 JSON 键名。

| 字段 | 核对要求 |
| --- | --- |
| `stage`, `scope`, `source` | 算子阶段、固定 workload 与模式、固定 SHA 路径和行范围；说明统计单位是每线程、每 CTA、每 token 或整次调用。 |
| `inputs`, `outputs`, `lifetime` | shape/stride/dtype、值名、生产和消费时间；明确哪些输出落地，哪些只在寄存器/shared/TMEM 中暂存。 |
| `mapping`, `loops` | grid、tile/split、循环范围、mask 与尾块；能从一个正常 CTA 推到整个 launch。 |
| `accesses` | 每条重要边的读者、写者、内存位置、访问范围、次数表达式和复用范围；容量、唯一地址下界、逻辑访问量、实测物理流量分列。 |
| `arithmetic` | 有效数学工作、源码重复工作、tile/填充工作、归约和特殊函数分列；说明 FLOP 约定，不能把表达式数当成编译指令或时间。 |
| `sync` | 生产者、消费者、ready、wait、release、join、buffer slot/phase；分清数据依赖、CUDA stream 并行与 CTA 内流水。 |
| `evidence` | 每项是源码推导、作者报告、复现实测、推断还是未知；未知项写明可推翻或测量的方法。 |

一个比较必须对齐语义和包含的阶段，例如可选 Norm、舍入位置、跨 CTA 归并和调用前后的数据状态。注明哪个实现因列 tile 或 split 重算，哪个中间量因 fusion 不再落地，以及新增的 scratch 与同步。归一化类算子应写实际迭代顺序、次数、epsilon 和归约轴；不能以算法名称代替读写与计算说明。

流水图选至少两个连续工作单元，显示第一块的生产、消费和释放如何允许第二块进入，并标明启动和排空。仅有一个工作单元的示例不足以证明跨工作单元的稳态流水。源码可证明允许的并发与等待关系；实际隐藏的延迟、带宽争用和瓶颈排序须用 profiler/benchmark 另证。

## GPU 冷读问题

按本案例的学习目标选择题目。用实际页面回答，并记录所见版本、卡住的位置和复查结果。

1. 从图复述输入、输出、状态与真实性能缺口，指出并列分支和依赖边。
2. 由给定 workload 推导 tile/split/grid，跟踪一个正常任务到归并，区分异常路径。
3. 从固定 SHA 到达关键源码，预测 dispatch/fallback，并区分 source-derived、reported、reproduced 与概念图。
4. 说明优化收益的代价和适用范围，提出一个可推翻的实验及预期观察。
5. 由一个固定 workload 的循环与 tile 范围推导有效计算和至少一种重复/填充计算，指出式子的统计单位与证据边界。
6. 追踪一条输入到输出的读写链，区分中间存储容量、逻辑访问和未知的物理流量；说出 fusion 消除的读写和仍保留的中间量。
7. 解释一个 buffer 的生产、ready、等待、消费、释放及下一块复用，指出必需的 join 和一个可能使 overlap 失效的条件。
