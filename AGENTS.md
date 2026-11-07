# Technical Learning Studio

把代码、系统和工程方法做成可核查的学习材料。读者应能解释设计取舍，沿一个具体例子追到实现，并知道下一步怎样验证。

- 跨阶段任务先读 [技术学习工作流](workflows/technical-learning.md)，按阶段和问题选 skill。局部修改直接加载受影响的 skill。
- `skills/core/` 管证据、讲解与技术复核。需要解释某类机制时按需读 `skills/domains/`。交付 HTML 时再读 `skills/formats/html/`。
- 先校准读者的学习重点，再按“是什么、为什么 → 一条完整路径 → 判断与分支 → 实现与验证”安排主线。用同一个例子贯穿。每节解决一个问题，把源码和精确条件放在对应机制旁。
- 案例事实归入 `cases/`，源码引用固定版本和位置，区分推导、作者报告与复现。提交源码、构建所需的 Case、测试和文档；截图、审查过程、用户笔记与原始 Obsidian Canvas 留在本地。
- 页面图形先确定要表达的关系，再选视觉形式。概念图标明语义与边界；耗时需要测量支持。HTML 交付分别核对技术含义和阅读体验，按 [HTML 阅读环境](skills/formats/html/visual-design/references/design.md#阅读环境)实际查看最终版本的截图。
