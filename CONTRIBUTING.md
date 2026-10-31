# 贡献指南

欢迎从一个问题、一条固定源码链接、一个反例或一个页面草图开始。这个项目要让工程师能复查 Kernel 的工作负载、分工、成本和证据边界；页面是否漂亮不能代替事实核查。

## 先选贡献方式

| 你已有的材料 | 入口 | 期待的产物 |
| --- | --- | --- |
| 想研究一个 Kernel，但还没时间制作 | [页面请求 Issue](https://github.com/ZhouMaomaoZhou/Kernel_Learning_Agent/issues/new?template=01-page-request.yml) | 一个明确的工程问题、候选来源和需要帮忙的部分 |
| 发现来源、公式、图或交互错误 | Issue 或小 PR | 固定 SHA 的反证、复现输入、修正及回归样例 |
| 有源码分析和页面草图 | 先关联 Issue，再开 Draft PR | 可审阅的 Case、来源映射、讲述逻辑与页面源码 |
| 有 GPU 实测 | 关联 Case 的实验 PR | 环境、命令、输入分布、基线、轮数、原始记录和统计方法 |

“请别人帮我做一个页面”适合开 Issue；**PR 用于提交已有变更**。若已有半成品，开 Draft PR，在“需要协助/评审的问题”里分配具体任务。不要把笼统的“谁来看看”当作评审请求。

## 新页面从哪里开始

1. 查找现有 Issue 和 Case，避免同一个算子在不同版本/硬件条件下被误合并。页面请求中至少写：想回答的问题、模型和阶段、候选框架/PR、你已知与未知的输入条件、愿意承担的工作。
2. 与维护者确定 `case_id` 和**版本边界**。先看框架调用/dispatch，再固定实现 SHA。`dsv4/` 这样的目录名不能单独证明模型版本。
3. 将工作负载、各实现、源码映射、估算公式、假设和证据等级记录在 `cases/<case_id>/case.json`。研究笔记进入该 Case 的 `evidence/` 或 `experiments/`；不要改写别人的原始 Obsidian Canvas。
4. 先设计一条能被读者复述的讲述链：数据流 → 明确的性能空洞 → 一个正常 CTA → 例外路径 → 成本与权衡 → eligibility/fallback。每个图写清问题、依据、阅读重点和结论，并标注 `conceptual`、`interpreter` 或 `hardware-measured`。
5. 当前 `web/` 和 CLI 仍固定服务首个 Case。**第二个独立页面需要同时设计入口、构建和测试路径**；在大规模写 HTML 前先用 Draft PR 讨论文件结构。我们计划让每个 Case 有自己的页面源码，再由构建器产出 `dist/cases/<case_id>/index.html`，见[路线图](docs/community-roadmap.md)。这条目录目前是计划，不是现有功能。

## 提交步骤

1. 在 GitHub 上 Fork 仓库，或在已有写权限的仓库内创建 `case/<case_id>` / `fix/<topic>` 分支。关联页面请求或纠错 Issue。
2. 先提交最小可审阅变更：Case 事实与固定来源、计算/边界样例、页面草图或源码。修改共用组件时说明影响哪些现有 Case。
3. 跑下方本地检查；推送分支并向 `main` 开 Draft PR。PR 模板会要求证据、未决问题、测试结果和预览。可以在草稿阶段请别人补某个明确任务。
4. CI 通过后下载 `studio-offline` Artifact 中的现有页面与截图。根据技术与教学评审修改；准备好后把 Draft PR 标为 Ready for review。维护者在确认来源和边界后合并。

目前 Artifact 仅包含首个 Studio，尚不是任意新 Case 的自动预览。若 PR 新增独立页面，请先在 Issue/草稿 PR 中约定构建入口和浏览器检查，不要把缺失预览写成已经通过。

## PR 应能回答什么

一个页面 PR 最好限定一个 Case，说明：

- 页面要教会读者的核心判断，以及一个可反驳的瓶颈假设。
- 每条关键结论的 PR、论文或官方材料；源码链接含完整固定 SHA 和行号。作者报告与本机复测分开。
- 选定输入下的 shape/stride、FLOP、存储字节、唯一地址、源码级读写及未知物理流量；Program/CTA/Warp/Thread 已知与未知分开。
- 正常路径、mask/空 Tile、dispatch/fallback 的可核查样例；页面交互是否随输入统一重算。
- 想请评审者帮忙判定的 **1–3 个具体问题**，最好附“我的推导、证据、尚不确定处”。

无需 GPU 才能提交页面。没有 profiler 时，相关字段写“未测”；不要用构造的延迟、利用率或 GPU trace 填空。可先提交 Case 与页面草图，待来源核查通过再补交互。

## 本地检查

```powershell
python -m kernel_learning validate
python -m kernel_learning build
python -m kernel_learning build --check
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python -m unittest discover -s tests -v
```

测试组织是**通用合同 + Case 专属正常/边界/fallback 样例 + 必要的浏览器路径**，见[测试约定](docs/case-testing.md)。GPU 数值正确性和性能实验单独记录，不能让无 GPU CI 冒充实测。

`Kernel_Learning_Studio.html`、`web/studio-standalone.html` 是派生物，`web/local-sources.json` 可能含本地源码，均不要提交。PR 中若有页面变化，提供截图或 CI 构建产物，并说明截图是概念图、解释器输出还是实测图。引入第三方代码/图片时保留原始许可和出处。提交的原创贡献按仓库 [Apache-2.0](LICENSE) 发布。

修改首个案例的 Workload 首屏后，可在安装 Playwright 并运行 `build` 后执行 `python scripts/capture_studio_preview.py` 更新 README 截图；截图属于文档预览，不代表 GPU 测量。

## 评审如何分工

CI 先拦截结构、语法、公式与交互回归；人类评审分别检查**来源/技术**与**教学/交互**。对不熟悉的指令映射或硬件结论，维护者会请求对应领域的评审，不会将“CI 通过”当作真实性保证。若证据不足，可以合并明确标为概念或待测的内容；不能把待测改写成已验证。新页面的技术审查和教学审查可由不同贡献者完成。
