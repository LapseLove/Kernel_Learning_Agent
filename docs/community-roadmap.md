# 多案例社区路线图

## 当前事实与目标

仓库目前只有 `dsv41-small-head-decode` 一个 Case。`kernel_learning/core.py` 的默认 Case 路径、CLI 的 `--repo vllm|sglang`、`web/` 的方案按钮和浏览器测试都专门服务这个 Case。Case JSON 与 source map 是研究事实的主记录；根目录 HTML 是派生物。当前 CI 能检查此页面，**不能**仅凭新增一个 JSON 自动产出任意 Kernel 页面。

目标是让贡献者选择自己感兴趣的 Kernel，先提交可复核的证据，再制作有明确问题和交互的页面；读者能从页面回到固定源码、分辨模型推导与实测，并知道何时 fallback。

## 从请求到页面

```text
页面请求 Issue（问题、版本、workload、需要帮忙处）
  → 固定 case_id、框架入口与源码 SHA
  → Draft PR：Case / source map / 计算与瓶颈假设
  → 页面草图与交互、正常及边界样例
  → CI 构建预览 + 来源/技术审核 + 教学/交互审核
  → 合并后进入案例目录
```

Issue 可以只提出问题，不强迫请求者先拿到 GPU、写出完整源码图或保证有人认领。维护者在 Issue 中将工作拆成可独立认领的来源核查、建模、可视化、测试与评审任务。已有半成品用 Draft PR；PR 描述中请写出具体待答问题，例如“固定 SHA 下 T=8、K=640 时 wrapper 是否还会选此 fast path？”并链接对应行号与反例输入。技术尚未确定时保持 Draft 状态。

## 目录演进

保留现有 Case 路径；在**第二个真实案例**中验证通用接口，再迁移首个页面。建议的目标形态：

```text
cases/<case_id>/
  case.json                  # 事实、workload、实现变体、source map、证据等级
  lesson/                    # 作者维护的讲述与页面源文件，按需拆 JS/CSS
  evidence/                  # 引用索引与核查笔记；原始大文件外链或归档
  experiments/               # 每次复测独立目录，含环境和原始结果
web/shared/                  # 共用壳、图表组件、无 Case 特例的交互
tests/contract/              # 所有 Case 共用的结构与来源检查
tests/cases/<case_id>/       # 正常、边界、fallback 与页面交互样例
dist/cases/<case_id>/index.html  # 构建产物，不手工维护、不提交 Git
```

这只是**迁移目标**。当前 `web/`、`tests/`、`kernel_learning/` 的真实文件结构以 README 为准；不要为了占位一次性创建空目录。一个 Case 可研究同一问题下的多个实现，不能把“一个 Kernel”“一个 PR”“一个页面”强行等同。跨版本/架构若不可公平比较，分别建 Case 或在同一 Case 中清楚标出边界。

共享代码只容纳跨 Case 一致的行为。特定算子的 tile 规则、图说和适用条件留在 Case；`lesson/` 可以有人工编排的视图，但数字和关键断言应读取或回溯到 Case，不能把 HTML 变成第二份事实表。第二个案例出现之前不抽象一个没有实际使用者的图生成 DSL。若共用组件改变，CI 应重跑所有页面；Case 局部改动可只构建变化的 Case，发布前仍做全量目录检查。

## CI 分层

| 层 | 现在 | 多案例阶段 |
| --- | --- | --- |
| 结构 | Case Schema、固定 SHA、source map 检查 | 遍历 `cases/*/case.json`；校验唯一 `case_id`、文件归属和 schema 版本 |
| 推导 | Python/JS 的分流与几何样例一致性 | 共用合同测试 + 每 Case 的关键边界样例；新增策略必须有反例 |
| 页面 | 离线/服务模式真实浏览器测试 | 生成每 Case 的离线页面、目录索引和截图；变更 Case 先跑对应路径 |
| 产物 | 单个离线 HTML 与 Workload 截图供 PR 下载审阅 | 每 Case 独立 HTML/截图 Artifact；合并后才发布统一目录 |
| GPU | 无，不能声称测量 | 独立、可选的机器和实验记录；不阻塞没有 GPU 的内容贡献 |

PR CI 使用 `pull_request`、只读 `contents` 权限，不给待审代码发布凭据或私有测量数据。不要让 `pull_request_target` 以高权限运行贡献者代码。审核大规模页面时，下载 CI Artifact 或查看 PR 截图并结合源码差异；**截图不能替代核查 Case 与固定来源**。[GitHub 的不可信 PR 工作流说明](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)。

首次推送后，可在 GitHub 分支规则里将 `test` 作必需检查，并要求人工评审。初期由维护者按页面范围邀请领域评审；稳定贡献者增多后再引入 CODEOWNERS，区分 `web/shared/`、Schema/构建器和各案例的负责者。标签可从 `page-request`、`needs-source-audit`、`help-wanted`、`draft-lesson`、`needs-gpu-evidence` 开始；标签是工作状态，不是证据真值。

首次发布时还需在仓库设置中确认 **Issues 与 Actions 已启用**，页面请求表单和 PR 模板能显示，Apache-2.0 被识别，`test` 检查运行成功，`studio-offline` Artifact 可下载。这些 GitHub 设置不由当前本地文件自动开启。

## 大量页面如何审核与维护

1. **一 PR 一条可审查主线。** Case 来源审查、页面讲述、通用组件重构尽量分开；涉及多个 Case 的批量重排要解释迁移方式。
2. **两类人工检查。** 来源/技术审查看 dispatch、形状、字节/FLOP 账本、CTA/warp 角色和不能比较的条件；教学/交互审查看问题顺序、图的单位、默认例子、输入变化和错误状态。
3. **证据等级不随页面数量稀释。** `conceptual`、`interpreter`、`hardware-measured` 分开；PR 作者报告永远标为 `reported`，本机复测附环境与原始数据。
4. **生成目录，不手工复制导航。** 后续从 Case 元数据生成案例索引，可按算子、模型、框架、硬件、阶段和证据状态筛选；稳定链接使用 `case_id`，标题可改。
5. **版本与旧页面保留。** 上游 `main` 改动时新建或更新固定版本 Case，不静默移动旧链接。被替代的页面保留可访问的快照与迁移说明。
6. **审查容量不够时减速合并。** 保持 Issue 讨论和 Draft PR 开放，优先修正已发布页面的事实错误；不让自动化测试替代领域审稿。

下一步最有价值的验证是选一个**形状与 dispatch 规则显著不同**的第二 Case，看看哪些共用合同真的成立，再实现通用构建和案例目录。GPU Profile 导入属于另一条工作线，不能作为开放页面贡献的前提。
