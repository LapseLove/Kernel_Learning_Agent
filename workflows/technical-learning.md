# 技术学习工作流

先确认交付物和读者要学会的判断。下面是完整案例的路径；局部任务从受影响的阶段开始，复用仍有效的证据和设计。

| 阶段 | 何时加载 | 交接给下一步 |
| --- | --- | --- |
| 建立证据 | 新案例、研究或事实变更读 [source-evidence](../skills/core/source-evidence/SKILL.md)，按下表补领域分析 | 范围、版本、关键主张、可追踪的输入到输出、来源与未知项 |
| 规划讲解 | 新讲解、主线重构或关键机制下钻读 [lesson-plan](../skills/core/lesson-plan/SKILL.md) | 读者目标、知识深度、贯穿全篇的例子与检查问题 |
| 选择表达 | HTML 读 [visual-design](../skills/formats/html/visual-design/SKILL.md)，有多状态机制才读 [scene-author](../skills/formats/html/scene-author/SKILL.md)。讲义或问答直接用讲解提纲 | 章节或页面源码、产物和阅读路径 |
| 核对并迭代 | [technical-review](../skills/core/technical-review/SKILL.md) 核对成品中的实质结论。HTML 另用 [visual-review](../skills/formats/html/visual-review/SKILL.md) 在浏览器检查 | 审查范围、同一交付版本、问题、修复与复查结果 |

## 按问题接入领域 skill

| 要回答的问题 | 读取模块 | 补充到共用交接 |
| --- | --- | --- |
| 框架怎样选择 kernel，输入和执行有什么约束？ | [kernel-intake](../skills/domains/kernel/kernel-intake/SKILL.md) | caller、workload、派发与回退 |
| 一个 kernel 如何把工作映射到硬件，为什么这样优化？ | 在 intake 的证据上用 [kernel-model](../skills/domains/kernel/kernel-model/SKILL.md)，讲执行路径时读 [kernel-explain](../skills/domains/kernel/kernel-explain/SKILL.md)，技术审查按需读 [GPU 核对项](../skills/domains/kernel/kernel-model/references/review.md) | 可复算的分工、成本、状态、同步与对照 |
| kernel 如何演进，或者怎样验证性能假设？ | 按需读 [kernel-history](../skills/domains/kernel/kernel-history/SKILL.md) 或 [kernel-investigate](../skills/domains/kernel/kernel-investigate/SKILL.md) | 带版本的优化谱系，或同口径、可复现的实验 |
| 一个项目、工具或 skill 如何组织和运作？ | [project-breakdown](../skills/domains/project/project-breakdown/SKILL.md) | 职责图、真实入口、一次代表性运行与边界；有维护者与使用者时分开追 |
| 两个推理组件为什么集成，谁负责哪一段？ | [runtime-integration](../skills/domains/runtime/runtime-integration/SKILL.md) | 接入动机与代价、注册与绑定、每轮交接及状态归属 |

混合案例根据问题组合模块。例如 kern × vLLM 讲服务与插件的协作时用 runtime 模块；只有下钻到具体算子的硬件映射时才加入 kernel 模块。领域模块补充事实和复核项，输出沿用当前 Case 的记录形式。只核对 GPU 派发时也可按需使用 GPU 核对项，范围由所改结论决定。

## 审查和返工

技术审查核对源码、实际路径和边界。HTML 的视觉审查先走读实际页面，再查看截图和交互状态。HTML 交付以同一产物版本的 Technical 和 Visual 均通过为准。分别执行的自审按自审记录。某一项有问题时，先定位读者首次卡住的位置和原因，再修相应层并复查原问题及相邻过渡。改变结论、数据或箭头语义时重新技术核对；改变页面表现时重新截图目检。

## 接入新场景

先用现有工作流走通一个真实案例。发现可以复用的领域判断后，在 `skills/domains/<domain>/<skill>/SKILL.md` 记录适用问题、必要输入、核对步骤和领域交付，再给上面的路由表补一行。共用阶段继续接收同一类证据和提纲。若仅增加同领域的案例，直接补 Case 和产物入口。
