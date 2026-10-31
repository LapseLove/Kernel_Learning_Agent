---
name: kernel-intake
description: 固定模型、Workload、硬件、框架与 Commit；从入口追踪实际 Dispatch。
---
# Kernel intake
输入必须包括仓库链接或本地路径、SHA、模型版本、阶段、TP/EP、GPU SM、dtype、KV/cache format、T/heads/keys、框架入口。缺失则标记 TODO，不能编造。
输出规范化 case JSON 的 `variants.<variant_id>.dispatch`、source paths 和 workload，设置 `schema_version` 并通过 `python -m kernel_learning validate`。必须先检查 wrapper、backend、fallback、CUDA Graph 与 JIT。
若页面需要推演 dispatch 和 split，把已核验的阈值、Key block 大小、split tiers 写入 Case 的 `dispatch` 教学策略；Python 与浏览器都从该策略读取。策略只覆盖已明确建模的 Gate，不能把架构、布局等未模拟条件标作运行时已验证。
