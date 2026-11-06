# 多案例路线图

## 已实现与未实现

现有案例包括 sparse decode、mHC、kern × vLLM、Model PR history 和 KernelWiki。教学工作流按需加载共用、领域和 HTML skill；各案例使用自己的构建入口。Case/source map 是事实源，根目录 HTML 是生成物。按需 skill 和独立技术/视觉审查已定义；自动调度 Agent、通用案例注册表、统一 schema、任意 JSON 自动生图及 GPU profiler adapter 尚未实现。当前执行逻辑见 [architecture.md](architecture.md)。

## 下一步按实际需求抽取

1. 对照现有各类案例，抽取真正共用的导航、来源链接和证据标签；算子的 tile/dispatch/数值边界留在 Case。
2. 建立案例注册表，使 CLI 明确选择 case、验证器和渲染器；保留现有入口和回归测试。
3. 有稳定接口后再统一离线构建和目录索引。`dist/cases/<case_id>/index.html` 是候选目标，不是现有约定；不创建空目录占位。
4. 浏览器检查保留逐 Case 的语义路径；共享组件变更复查受影响的案例。截图和自动测试通过仍需分别做技术/视觉验收。
5. GPU 实验独立记录环境、原始数据与 baseline；不阻塞无 GPU 的源码研究，也不把概念图升级为实测。

## 协作与发布

页面请求 → 确定读者问题与版本 → 核查证据 → 讲解与视觉规划 → 页面和测试 → 技术与视觉双审 → 审核后发布。贡献者通过 Issue 或 Draft PR 写出需要评审的具体问题；投稿不要求先有 GPU。流程细节以 [CONTRIBUTING.md](../CONTRIBUTING.md) 为准。

CI 构建产物用于审阅，不等于已部署站点。发布目录、GitHub 设置及分支规则需另行配置，不由本地文件自动开启。PR 工作流保持只读权限，不给未审代码发布凭据。后续再按实际维护人数引入 CODEOWNERS 和案例负责者。

## 维护原则

- 每个 PR 保持可审查范围；先证据再性能结论。
- 新版本保持 pinned SHA 与可追溯历史，不静默将旧结论迁到 main。
- 教学所需的可核查证据放 `cases/<case>/evidence/`，实验方法按需放 `experiments/`。逐版本审查和截图保存在本地 `reviews/`。
- 历史设计在 `docs/archive/`；不进入默认 Agent 上下文。
