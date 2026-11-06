# KernelWiki

项目拆解案例。面向熟悉 GPU kernel 基础、想了解如何把优化知识组织成可检索证据的读者。主线用 FlashAttention-4 展示从查询、判断候选到核查来源，再回看维护流程。

- `case.json` 记录 KernelWiki 的固定版本、逐项来源与 B200/H100 命令实跑样本。页面交互回放该样本。
- `web/kernel-wiki.html` 包含版式、讲解与交互源码。使用 `python scripts/build_kernel_wiki.py --output <文件>` 构建离线 HTML；追加 `--check` 核对产物。
- 页面分析的是 KernelWiki 的检索与证据机制。FA4 的 GPU 正确性、性能与框架 dispatch 属于独立验证范围。

## 角色与脚本补讲复核

修订版 SHA-256 为 `9383c4722d78a8cbfc79ccfaf12c2e3237c1bdf9000a0259889f0689e48852a7`。

- **Technical: pass.** 核对 KernelWiki 和 BBuf 固定源码共 28 处行锚。用 KernelWiki 原评分函数复算 FA4 及 DeepGEMM，实际在隔离目录重建七份索引；运行 BBuf 的 SGLang / qwen3-core 中文查询，核对首条和六行上限。PR 采集与 BBuf 重建根据固定源码分析。
- **Visual: pass.** Edge 离线打开，核对桌面与窄屏的角色、查询展开、维护与对照，实际查看截图。调整来源链接换行后复查。

## 初版交付复核

产物 SHA-256 为 `f7654996bc6f4fce4fdf311be0f89b6dbfd1713a4fe14e37a14dcbbb9677b625`。两项均为自审。

- **Technical: pass.** 在固定 checkout 实跑两个架构查询与 `get_page.py --follow-sources`。逐项比对前四条结果与所引用资料页，核对 20 处来源行范围，并实测 DeepGEMM 对关键词 `4` 的正分。初查发现架构规则的行锚越界，修正并重新构建验证。
- **Visual: pass.** Edge 离线打开单文件，检查 1440×950 与 390×844 下的首屏、职责图、查询、证据与维护布局。实际查看截图，复核 H100 状态、解释展开、键盘切回 B200 和页面横向溢出。
