# Case 与交互测试约定

不采用“一个 Kernel 只有一个 test”，也不为每个 Kernel 复制整套测试文件。每个新 Case 进入同一套门槛：

| 层 | 每个新 Case 要提供什么 | 谁执行 |
| --- | --- | --- |
| 结构与出处 | `schema_version`、variants、固定 SHA、source map、evidence 等级 | 通用 schema/validator |
| 数学与边界 | 该 Case 的正常输入、dispatch 两侧、尾块/空 split、fallback 反例 | Case 专属参数样例；复用模型断言 |
| 页面交互 | 切换方案、调参后统一重算、选 CTA、源码随阶段定位、错误状态 | 通用浏览器动作，按 Case 提供选择器和预期 |
| Kernel 数值 | 若有可运行实现，reference 对比、dtype 边界、mask/page stride、随机输入 | 该实现专属；GPU 可用时运行 |
| 性能实验 | 环境、基线、输入分布、轮数、warmup/Graph/Profiler、置信边界 | 实验记录，不作为无 GPU 的 CI 门槛 |

目前 Case JSON 的 `variants.<id>.dispatch` 是教学 Gate 与 split 策略的参数源；Python `workload()` 和浏览器 `deriveWorkload()` 分别实现公式，使用变更策略的样例做跨语言一致性检查。`tests/test_contract.py` 负责 schema、推导一致性及导出边界；`tests/test_browser.py` 用 Chromium/Edge 实测离线与服务页面；`tests/test_dsv41.py` 保存首个 Case 的语义和数值边界。新增 Kernel 时至少加入它自己的正常、边界和 fallback 样例；若执行图或控件行为不同，补一条浏览器路径。只有真实 Kernel 可运行时才加入数值与 GPU 测试，不用概念图的自我断言冒充正确性测试。

离线 HTML 是从 `web/` 和 Case 构建的派生文件，Git 忽略；本机用 `python -m kernel_learning build` 更新根目录的 Obsidian 入口。`python -m kernel_learning export-html --include-local-sources` 会嵌入本地导入源码，分享前应明确审阅；默认导出不嵌入。
