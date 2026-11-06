# Model PR history · 知识库工作流案例

本页讲解 BBuf `model-pr-optimization-history` 的维护与使用机制。按[技术学习工作流](../../workflows/technical-learning.md)选择[项目拆解](../../skills/domains/project/project-breakdown/SKILL.md)与 HTML 模块，分别追踪维护者如何更新档案、Agent 如何从问题查到可复核证据。

- `case.json`：案例边界、事实声明、维护步骤、每屏问题、验证模板与未知项。
- `source-map.json`：固定 SHA 原文摘录、精确行号与查询样例。
- 页面源码：`web/pr-history.html`、`web/pr-history.css`、`web/pr-history.js`，复用 `web/reader.js` / `reader.css` 的局部步进组件。
- 本地独立入口：在仓库根目录运行 `python scripts/build_pr_history.py`，生成 `Model_PR_History.html`；可直接双击打开，不需要网络、Python 服务或 GPU。
- 校验：`python scripts/build_pr_history.py --check`。
- 预览：从仓库根目录运行 `python -m http.server 8877 --bind 127.0.0.1`，访问 `/Model_PR_History.html`。

查询样例由固定文件按 `query.py` 的任一关键词匹配规则预计算，取前 3 行并按脚本截断至 220 字符。本页没有运行上游查询、重建器或 GPU 实验，也没有逐条审计这些 PR。两个框架和三个预设关键词只是演示范围。PR 状态来自旧档案，不能当作当前 GitHub 状态。

上游来源：[BBuf / AI-Infra-Auto-Driven-SKILLS](https://github.com/BBuf/AI-Infra-Auto-Driven-SKILLS/tree/8309d9f244e11d6a4773fd9a3274bbecb9ce8c01/model-pr-optimization-history)。原文与代码摘录属于原作者；本案例保留作者、仓库、完整 commit、路径与行号，供教学核查。source-map 的事实依据来自直接读取该固定版本源码，而非把本地学习笔记当作原始证据。
