# mHC 页面实现参考

仅在 UI Construction 阶段加载，先明确主线与删减清单。组件服务心智模型；旧页面的 DOM 和内容量不是必须保留的资产。

## 当前 mHC 实现

页面是连续的三章：算子 → 框架 dispatch → 小 T。`case.json` 的 `lesson_plan` 控制主线，`reading_scenes` 保存图的事实/步骤/来源。没有第二套旧讲义或独立时间线。

| 目的 | 定位 | 使用原则 |
| --- | --- | --- |
| 章节、屏幕、叙事 | `web/mhc.js` 的 operator / dispatch / smallT / screen | 每个机制一个主要位置，代码入口贴着机制 |
| 主图 | `web/mhc-scenes.js`；Mega 专属 `web/mhc-mega-scenes.js` | 张量路径、矩阵、FMA 读写、fusion 外框采用不同组合；Mega 分任务/角色、元素路径、槽位状态和消费者拓扑四层，不再叠加旧流水图 |
| 局部步骤 | `web/reader.js` mountFigure | 只有沿图追踪有帮助时才开启；interactive=false 静态呈现 |
| 视觉主题 | `web/mhc.css` 的 CSS tokens | 暖白背景、淡桃与棕色强调、深色文字、留白；不通过越缩越小的字塞入内容 |
| 公式与属性比较 | equation-strip / property-row / compare-table | 正文保留必需公式；有物理含义的数量比较用表或条形图 |
| 源码映射 | openSource / sourceRail / source-dialog | 统一抽屉展示 pinned 行号和已导入真实代码，不重复展开全部源码 |

`build-mhc` 内联上述代码与样式为离线 HTML，勿手改生成物。窄屏图形允许明确提示的局部横向滚动，公式与源码各有自己的滚动区；正文不可横向溢出。

可步进场景的共用方法见 [scene-author](../../../../formats/html/scene-author/SKILL.md)。截图工具兼容连续页面的 data-figure：逐状态捕获，静态图只捕获一次。每个受影响主图必须实际打开目检，并分别完成技术和视觉审查。
