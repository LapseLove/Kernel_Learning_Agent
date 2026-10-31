# 系统设计（MVP → 可扩展 Harness）

## 三种边界
- **Operator**：运算语义、输入输出、缓存/状态和模型架构版本。
- **Implementation**：框架、具体 Kernel 的 Git SHA、语言/IR、显卡架构、输入布局、参数。
- **Execution**：一次 dispatch + 输入、环境、运行时配置、Profile/Benchmark 结果。

Case 通过 JSON 记录研究事实。Web Studio 负责交互，不做决定性的测量判断。Python CLI 负责验证、导入源码和运行本地静态站点，后续可加 GPU 的 profiler adapter。

## 精确性
Source Node 和源码 `repo + commit + path + start/end line` 关联；显示的真实 snippet 由 `import-source` 从 SHA 一致的 checkout 抽取。未导入则只显示标记为「教学解释，非真实源码」的 pseudo。

## Agent 工程扩展点
- `source-indexer`: git blame / PR / symbols / AST → source map，先抓 Dispatch → implementation → tests。
- `workload-model`: shape, bytes, FLOPs, layout, occupancy hypothesis; aware of packed/unpacked sizes。
- `trace-adapter`: TileLens/TritonParse 对应解释器/编译器层；NCU/Nsight 对应硬件测量层，不能互换。
- `evidence-registry`: PR-reported → locally-reproduced → independently-validated 的实验等级；Pin GPU/driver/compiler/model/data。
- `studio`: Algorithm DAG → Block/Tile → IR/ISA → Benchmark 的三级下钻。

## 安全边界
普通 `serve` 只提供静态文件，默认绑定 127.0.0.1。`import-source` 无源代码执行、无联网；仅读取文件并输出指定行号。不要将内含本地私有源码的 `web/local-sources.json` 提交到公开仓库。
