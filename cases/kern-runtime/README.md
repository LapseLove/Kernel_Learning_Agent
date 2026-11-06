# kern × vLLM

构建后打开 `Kern_Runtime_Studio.html`。从同一轮的五个请求看分工和分组，再追踪 C、D 的七个 token。缓存绑定与两条 GPU 队列的交接在对应位置展开。后两章说明 kern 的设计动机、接入 vLLM 的用途和三组上游性能对照。

按[技术学习工作流](../../workflows/technical-learning.md)选用 [Runtime 集成](../../skills/domains/runtime/runtime-integration/SKILL.md)，沿宿主、插件和执行器的职责追踪接入和每轮交接。

案例固定在 [pegainfer-project/kern @ 83c3f62](https://github.com/pegainfer-project/kern/tree/83c3f62be263da5f1e482fe90872a29bc4800b77)。`kern_vllm` 是同一仓库内的插件，随 `kern-llm` 发布。Qwen3.8-27B 用于推导页布局；分组实验用单独标注的教学容量。性能数据是上游报告，没有在本地 GPU 复测。

- [Case](case.json)：学习问题、断言、教学参数、实验与反证。
- [Source map](source-map.json)：原始摘录、真实行号、固定 SHA、blob 与摘录哈希；[上游许可](UPSTREAM-LICENSE.txt)。
- 本版用固定上游源码和实际页面核对分组、缓存绑定与 stream 交接；桌面和窄屏分别走读。过程截图与审查日志存放于本地 `reviews/`。

在项目根目录运行：

```sh
python scripts/build_kern.py
python scripts/build_kern.py --check
python -m unittest discover -s tests -p test_kern_browser.py -v
```

构建不需要上游 checkout。更新摘录时，在固定 SHA 的 checkout 上运行 `python scripts/import_kern_sources.py --root <checkout>`。浏览器测试使用 Playwright Chromium；使用已安装的 Microsoft Edge 时可设置 `KLA_BROWSER_CHANNEL=msedge`。Windows 上可用 `python scripts/capture_kern_review.py` 重抓浏览器截图，截图之后仍需打开检查。
