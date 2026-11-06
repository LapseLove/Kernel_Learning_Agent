# Technical Learning Studio

把复杂的技术机制做成可读、可追踪、可验证的学习材料。选一个真实问题，从设计动机追到一次完整调用，再沿关键分支下钻到源码和证据。

[工作流](workflows/technical-learning.md) · [学习案例](#学习案例) · [本地运行](#本地运行) · [贡献指南](CONTRIBUTING.md)

## 工作流

**核查证据 → 规划讲解 → 选择表达 → 审查与迭代**

1. **核查证据。** 固定版本和边界，从真实入口走完一个例子，再改变一个条件核对分支。领域模块补齐该问题特有的事实。
2. **规划讲解。** 先列知识地图，按读者掌握程度分配简讲、细讲和按需展开。先回答是什么、为什么，再用同一个例子讲完整路径、决策和实现。
3. **选择表达。** 讲义沿提纲交付。HTML 每节围绕一个问题，用主图呈现关系，把源码与证据放在相关机制旁；需要跟踪状态变化时才加步进。
4. **审查与迭代。** 核对结论、真实路径与反例。HTML 另外走读页面，在桌面和窄屏检查布局、交互和阅读顺序。按读者第一次卡住的位置修复并复查。

## Skill 目录

| 层 | 放什么 | 何时加载 |
| --- | --- | --- |
| `skills/core/` | [来源核查](skills/core/source-evidence/SKILL.md) · [讲解规划](skills/core/lesson-plan/SKILL.md) · [技术审查](skills/core/technical-review/SKILL.md) | 按当前阶段加载 |
| `skills/domains/` | [Kernel 分析](workflows/technical-learning.md#按问题接入领域-skill) · [项目拆解](skills/domains/project/project-breakdown/SKILL.md) · [Runtime 集成](skills/domains/runtime/runtime-integration/SKILL.md) | 按学习问题选取；混合案例可以组合 |
| `skills/formats/html/` | [视觉设计](skills/formats/html/visual-design/SKILL.md) · [步进场景](skills/formats/html/scene-author/SKILL.md) · [视觉审查](skills/formats/html/visual-review/SKILL.md) | 交付 HTML 时按需加载 |

例如，“这个工具如何收录和查询 PR？”用项目拆解，分别跟踪维护者和使用者。“输入变长时为什么切换实现？”用 kernel 的 intake、model 和 explain。“kern 为什么接入 vLLM？”用 runtime 集成，从注册与绑定追到结果交回；要看某个算子的线程分工时再加 kernel 模块。

[AGENTS.md](AGENTS.md) 是执行入口，[工作流](workflows/technical-learning.md) 保存完整路由和交接约定。新场景先走通一个真实案例，再把可复用的领域判断放到独立 skill，沿用共用的证据和提纲。

## 学习案例

| 案例 | 一条值得走的路径 | 资料 |
| --- | --- | --- |
| Small-head sparse decode | 从 selected key 到 split、CTA 和 merge，比较两种实现的 dispatch | [Case](cases/dsv41-small-head-decode/case.json) · [证据](cases/dsv41-small-head-decode/evidence/README.md) |
| mHC → Mega mHC | 从残差和系数进入框架 dispatch，再看小 T 的融合取舍 | [Case](cases/mhc-mega/case.json) · [证据索引](cases/mhc-mega/evidence/README.md) |
| kern × vLLM | 用同一轮请求追调度、分组、缓存绑定、stream 交接和回传 | [Case、构建与审查](cases/kern-runtime/README.md) |
| Model PR history | 看人如何维护档案，Agent 如何从模型问题查到可复核证据 | [Case 与构建](cases/model-pr-history/README.md) |
| KernelWiki | 切换 B200/H100，沿 FlashAttention-4 候选追到资料和固定实现 | [Case、构建与审查](cases/kernel-wiki/README.md) |

## 本地运行

在仓库根目录用 Python 3.11+ 构建，然后打开生成的单文件 HTML。阅读离线页面无需 GPU。

| 案例 | 构建命令 | 本地阅读文件 |
| --- | --- | --- |
| Small-head sparse decode | `python -m kernel_learning build` | `Kernel_Learning_Studio.html` |
| mHC | `python -m kernel_learning build-mhc` | `MHC_Learning_Studio.html` |
| kern × vLLM | `python scripts/build_kern.py` | `Kern_Runtime_Studio.html` |
| Model PR history | `python scripts/build_pr_history.py` | `Model_PR_History.html` |
| KernelWiki | `python scripts/build_kernel_wiki.py --output KernelWiki.html` | `KernelWiki.html` |

给对应构建命令加 `--check` 可验证离线文件。用 `python -m kernel_learning serve` 预览网页源码，默认地址为 `http://127.0.0.1:8765`。构建、源码导入与浏览器检查见[仓库架构](docs/architecture.md)和[测试约定](docs/case-testing.md)。

## 仓库结构

```text
workflows/         阶段、路由和交接
skills/
  core/            跨领域的学习方法
  domains/
    kernel/        派发、建模、讲解、演进、实验
    project/       代码库、工具与 skill 拆解
    runtime/       框架接入、生命周期与交接
  formats/html/    网页的视觉表达与验收
cases/             事实、出处和案例审查
web/               页面源码与共享阅读组件
kernel_learning/   Kernel 案例的 Python CLI
scripts/           案例构建、源码导入、场景与截图工具
tests/             结构、推导和浏览器验证
docs/              架构、协作约定与历史
```

Git 版本化页面与工具源码、教学所需的 Case 和固定来源、测试及维护文档。截图、评审过程、个人笔记、原始 Canvas 和本地源码留在工作副本。离线 HTML 可本地构建，CI 只上传可供阅读的 HTML。

从一个具体的技术问题开始，附上你已掌握的背景、希望下钻的机制和已知证据。[请求一个学习页面](https://github.com/ZhouMaomaoZhou/Kernel_Learning_Agent/issues/new?template=01-page-request.yml) · [贡献指南](CONTRIBUTING.md) · [路线图](docs/community-roadmap.md)

项目原创代码与文档采用 [Apache-2.0](LICENSE)。固定源码摘录及工具借鉴的出处见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
