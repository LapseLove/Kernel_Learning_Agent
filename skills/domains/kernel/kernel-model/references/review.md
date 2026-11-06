# GPU 技术核对项

先完成共用技术审查中的正常路径、分支与证据检查，再按改动范围核对 GPU 语义。

1. 从 caller 核验模型/phase、shape/stride/dtype、TP/EP 等适用条件、dispatch 优先级与 fallback；目录名不能证明模型版本。对变更的 gate 检查边界和回退例子。
2. 沿一条正常输入到输出链复述：每条箭头的生产值/消费者、并列分支、时间索引、归约、舍入、状态寿命。launch 覆盖、数学依赖和硬件并发分别核验。
3. 查读写位置、有效元素、源码执行范围、mask 和复用；检查重复/填充工作。容量、唯一地址下界、逻辑访问、物理流量不可混算；表达式或 lane 调用数不等于机器指令。
4. 核验 CTA/warp/thread 角色和 buffer 的 ready/wait/release/join；只承认源码可证的映射。对可选 tile/thread 的图，实际手算非零坐标和边界；区分 local 数组下标与全局输出坐标、local/shared 复用和跨 CTA 重算。未测 occupancy、缓存、实际 overlap 仍是未知。
5. 核对关键公式、单位、固定 SHA 行锚和模式分支。reported 不写成 reproduced；不同模型/硬件/并行的绝对吞吐不作公平比较，tile 槽位比例不推导耗时损失。实测需硬件、输入、baseline、版本、warmup/Graph/JIT、trial 数和方法。

涉及成本时实算一条成本链；涉及同步时实追一个交接。逐阶段字段和 kernel 冷读问题见 [GPU 执行账本](execution-ledger.md)。
