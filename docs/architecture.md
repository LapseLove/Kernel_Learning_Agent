# 仓库架构

## 如何组合

[AGENTS.md](../AGENTS.md) 是简短入口。[技术学习工作流](../workflows/technical-learning.md) 按阶段加载共用 skill，并按问题选领域模块。领域模块产出可核查的主张、路径和边界，由共用讲解与复核消费。格式层消费讲解提纲与 Case，负责实现和检查表达。共用 skill 无需读取具体领域，研究或讲义也无需进入 HTML 层。

这些 Markdown 文件由 Agent 按需读取。Python CLI 和脚本运行构建、导入与验证，浏览器负责展示与交互。新增 skill 通过工作流路由接入，新增页面通过该 Case 的构建入口接入。

## 资料归属

| 位置 | 职责 |
| --- | --- |
| `cases/<case>/case.json` 和来源映射 | 可核查的事实、边界、公式或场景数据 |
| Case 的 `evidence/`、`experiments/` | 支撑教学结论的研究证据与可复现的实验资料 |
| 本地 `cases/<case>/reviews/` | 版本化审查记录与截图素材，随各自工作副本保存 |
| `web/` | HTML、JS、CSS 和共享阅读组件 |
| `kernel_learning/` | sparse decode、mHC 的验证器与构建器，以及本地服务 |
| `scripts/`、`tests/` | 独立案例构建、来源导入、场景检查、截图和回归 |
| `docs/archive/` | 仍供案例参考的历史设计 |
| 本地 `references/` | 用户原始 Canvas |
| 根目录离线 HTML、`dist/` | 构建产物和本地审查素材 |

首例的 `web/pinned-sources.json` 和 mHC 的 `cases/mhc-mega/pinned-sources.json` 各由对应构建器读取。首例的 `cases/schema.json` 描述自身字段。mHC 使用 `mhc.py` 中的验证器，目录名 `mhc-mega` 对应 `case_id=mhc-mega-sm100`。kern 和 Model PR history 的构建脚本各自校验 Case 与 source map。KernelWiki 使用独立模板与内嵌查询快照。新场景沿用工作流交接，Case 数据按自身需要建模。

## 构建与复查

- 首例用 `python -m kernel_learning validate`。mHC 用 `python -m kernel_learning validate-mhc`。各案例的离线构建及 `--check` 入口见 [README](../README.md#本地运行)。
- `python -m kernel_learning import-mhc-source --root <checkout>` 从固定 DeepGEMM SHA 导入，检查提交匹配并记录 blob SHA 与行号。
- 首例可用 `python -m kernel_learning export-html --output <path>` 导出。显式 `--include-local-sources` 才嵌入 `web/local-sources.json`，分享前审阅本地源码。
- mHC 的 `lesson_plan` 控制章节，`reading_scenes` 保存图形、步骤与来源。`web/reader.js` 和 `reader.css` 提供局部图形步骤，mHC 与 Model PR history 按各自的案例语义复用。场景包和截图工具见 [visual-tooling.md](visual-tooling.md)。
- 安装 `requirements-dev.txt` 与 Playwright Chromium 后运行 `python -m unittest discover -s tests -v`。可设置 `KLA_BROWSER_CHANNEL=msedge` 选用已安装的 Edge。测试与领域实验的分层见 [case-testing.md](case-testing.md)。
