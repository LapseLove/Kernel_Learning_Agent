# 证据与推导索引

本 Case 的可审查材料：

- [研究备忘](research-notes.md)：两个固定实现的来源、作者报告及不可比较的条件。
- [成本与映射](cost-and-mapping.md)：读取、FLOP、Tile、Program/CTA/Warp/Thread 的源码派生模型；不是 GPU 测量。
- [`../case.json`](../case.json)：workload、dispatch、阶段与固定源码映射的主记录。

目前无本机实测 NCU/Nsight 数据。`case.json` 中的 `reported` 是 PR 作者报告，不可当成这里复测。实验计划见[experiments](../experiments/README.md)；后续每次实验建立独立目录：`YYYY-MM-DD-<commit>-<hardware>-<shape>/`，记录 `run.yaml`、raw trace、benchmark.csv、correctness.json、notes.md。
