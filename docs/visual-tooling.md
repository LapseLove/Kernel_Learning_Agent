# HTML 场景工具的迁移来源

研究日期：2026-11-01。目标是可自行阅读的 HTML，保留视频工具中有用的场景设计和 QA 方法。以下来源固定版本，不代表当前 main。

## 固定来源与许可

| 项目 | 固定 SHA 与阅读文件 | 本地处理 |
| --- | --- | --- |
| HeyGen HyperFrames | `d0b551d0330d4d2cd932348a911b5457ed1ed3c8`，即 BBuf setup 脚本固定的版本；[visual-design](https://github.com/heygen-com/hyperframes/blob/d0b551d0330d4d2cd932348a911b5457ed1ed3c8/skills/pr-to-video/references/visual-design.md)、[story-design](https://github.com/heygen-com/hyperframes/blob/d0b551d0330d4d2cd932348a911b5457ed1ed3c8/skills/pr-to-video/references/story-design.md)、[frame packet core](https://github.com/heygen-com/hyperframes/blob/d0b551d0330d4d2cd932348a911b5457ed1ed3c8/skills/pr-to-video/scripts/lib/frame-packets-core.mjs) | [Apache-2.0，Copyright 2026 HeyGen, Inc.](https://github.com/heygen-com/hyperframes/blob/d0b551d0330d4d2cd932348a911b5457ed1ed3c8/LICENSE)。本地独立实现有界场景包与阅读状态，不嵌入其视频 runtime。 |
| BBuf AI-Infra-Auto-Driven-SKILLS | `c592955044e896edd20890468c9bdbbe30ab0be6`；[sglang-explainer-video](https://github.com/BBuf/AI-Infra-Auto-Driven-SKILLS/blob/c592955044e896edd20890468c9bdbbe30ab0be6/skills/sglang-explainer-video/SKILL.md)、[worker dispatch](https://github.com/BBuf/AI-Infra-Auto-Driven-SKILLS/blob/c592955044e896edd20890468c9bdbbe30ab0be6/skills/sglang-explainer-video/references/worker-dispatch.md)、[house style](https://github.com/BBuf/AI-Infra-Auto-Driven-SKILLS/blob/c592955044e896edd20890468c9bdbbe30ab0be6/skills/sglang-explainer-video/references/house-style.md)、[check_frames](https://github.com/BBuf/AI-Infra-Auto-Driven-SKILLS/blob/c592955044e896edd20890468c9bdbbe30ab0be6/skills/sglang-explainer-video/scripts/check_frames.mjs) | 该快照根目录未找到明确 LICENSE；不复制其脚本、字体、logo、品牌资产或大段 skill。借鉴方法并独立实现本地工具，保留来源。 |

## 保留什么，怎样适配

| 上游机制 | HTML 阅读版 |
| --- | --- |
| understanding checklist → frame coverage | Case 的 `reading_scenes` 映射问题、结论、固定源码及步骤；若声明 claims/covers，脚本检查无遗漏 |
| 每帧一个焦点、大机制图、稳定标题锚点 | 每屏一个核心问题，主图占主要空间；从节点/张量行为解释机制，详细账本下钻 |
| narrator-cued reveal 与 seek-safe shot | 用户控制前进/后退/重置，任何步骤可直接恢复；切换不改变技术语义，不按秒解释 GPU 时间 |
| bounded frame packet / worker ownership | 按场景生成仅含相关事实与源码的 JSON 包，默认上限 24 KiB，避免给作者预载全部资料 |
| frame contract lint + rendered QA sheet | 场景结构检查 + 浏览器逐场景/逐步截图 + QA 索引；人工/视觉 reviewer 必须实际打开图像 |
| 主题一致性与 CJK 字形检查 | 统一类型角色、颜色语义和标题基线，在桌面浏览器实际检查中文和公式 |

视频专用 TTS、音素、字幕时间戳、ffmpeg、MP4 渲染和发布脚本不进入默认 HTML 依赖。网页保留导航、可访问控件和滚动；没有字幕保留区，也没有自动推进的强制观看节奏。上下游自己的规则（例如隐藏 PR 状态）不覆盖本项目的证据要求。

## 本地可运行工具

- `python scripts/lesson_scene_tools.py --case cases/mhc-mega/case.json --out dist/mhc-packets`：检查 `reading_scenes`，将 source_ids 解析为固定 SHA 链接，按场景输出有界作者包。可用 `--manifest` 指定独立计划；不要求新建第二份事实表。
- `python scripts/capture_lesson_scenes.py --html MHC_Learning_Studio.html --out dist/mhc-qa --reader`：用本机 Edge 和既有 Playwright 依赖截图每个 reader 场景及步骤，生成 `states.json` 和可点击原图的 `index.html`。
- 可用 `--width 1440 --height 950` 指定桌面窗口尺寸。加 `--channel chromium` 使用已安装的 Chromium。任意页面可用 `--selectors`，复杂交互可用 `--plan` 提供点击顺序和截图目标。

工具只产生检查素材。`review: unreviewed` 不会自动改成 pass；Technical Reviewer 和 Visual Reviewer 仍分别核验同一交付版本。

## 当前阅读布局

mHC 已采用连续三章叙事，移除了“场景阅读器 + 完整旧讲义”的并行结构。`reading_scenes` 可标记 `interactive: false`，静态对照不显示步进。截图工具的 `--reader` 同时识别连续页面的 `[data-figure]`，按图枚举局部步骤；不需要视频式播放器。
