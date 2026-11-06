# 贡献指南

欢迎从一个具体问题、一条固定源码链接、一个反例或一张草图开始。项目收录可核查的技术学习案例，包括 kernel 解读、代码库与工具拆解、runtime 集成。

## 从问题到案例

1. 先查现有 Issue 和 Case。开[页面请求](https://github.com/ZhouMaomaoZhou/Kernel_Learning_Agent/issues/new?template=01-page-request.yml)时，写清读者应能判断什么、已有背景、想深挖的部分、已知来源和不确定条件。
2. 确定 `case_id` 和版本边界。按[工作流](workflows/technical-learning.md)选领域模块。把关键事实、可复查例子和来源写进 `cases/<case_id>/`；研究或实测分别进入 `evidence/`、`experiments/`，保留用户原始笔记。
3. 先提交可走读的提纲。用同一个例子交代动机、正常路径与一个条件变化，写明何处下钻。新增页面时，为该 Case 选择构建和浏览器验证入口。
4. 已有可审阅的变更时开 Draft PR，说明结论、固定版本、测试、未决问题和预览。给评审者一两个可以核对的问题。PR 写入验证结论与构建方式。评审截图和过程记录留在本地，需要分享页面时使用 CI 生成的离线 HTML。

## 审查重点

- **共用。** 固定来源支持关键主张，正常路径和变化后的结果有可核对的例子。源码推导、作者报告和本地复现分开。
- **按领域。** Kernel 核对 caller、派发、执行分工和成本口径。项目或 skill 核对入口、组件职责、实际读写及人工接手点。Runtime 核对生命周期、状态归属和执行交接。
- **HTML。** 分别执行[技术审查](skills/core/technical-review/SKILL.md)和[视觉审查](skills/formats/html/visual-review/SKILL.md)。在实际页面走读主线，打开桌面和窄屏截图检查，记录同一交付版本及复查结果。
- **实验。** 保存环境、命令、输入分布、基线、轮数和原始结果。缺少实际硬件测量时保留未知。

## 本地检查

按 [README](README.md#本地运行) 构建受影响案例并运行相应的 `--check`。下面的命令安装浏览器依赖并运行完整测试。

```powershell
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python -m unittest discover -s tests -v
```

测试分层见[测试约定](docs/case-testing.md)。共享组件改动复查受影响的案例。引入第三方材料时保留原始许可与出处。提交包含构建所需的源码、案例数据、测试和文档；截图、评审日志、个人笔记、原始 Canvas 及本地源码由各自工作副本保管。项目原创贡献按 [Apache-2.0](LICENSE) 发布。
