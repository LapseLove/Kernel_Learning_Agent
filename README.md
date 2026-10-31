# Kernel Learning Agent

源码、Case、Skill、测试及构建脚本由 Git 管理。离线页面 `Kernel_Learning_Studio.html` 是本机生成的 Obsidian 入口。

面向推理框架优化工程师的 **evidence-first Kernel 学习 Harness**：不是单纯讲 CUDA 语法，而是将 **特定 workload → 设计演进 → 源码执行机制 → 真实 Profile → 优化实验** 组织成可追溯的学习 Case。

首个 Case：**DeepSeek-V4.1 Small-head Sparse Decode**：
- vLLM PR #59418，SM90/H20，Triton `tl.dot`（mma.sync），TP8/TP4：8/16 real heads；提交时处于 **open/unmerged**。
- SGLang PR #39674，SM100/SM103，Gluon `tcgen05_mma`，TP4：16 heads；提交时 **merged**。

二者面对的根本问题相近（64-head padding + 低 batch 并行度不足），但**不能认为是相同 Kernel**：SM90 vs SM100、MMA 轴映射、split 规则、数值路径、缓存布局适用条件、Dispatch 与工程集成不同。

## 1 分钟启动

在 Windows PowerShell 中，将此项目文件夹解压或复制到：

```powershell
D:\Obsidian\Obsidian\开发项目实战\AI infra 学习\Kernel_Learning_Agent
```

```powershell
cd 'D:\Obsidian\Obsidian\开发项目实战\AI infra 学习\Kernel_Learning_Agent'
python -m kernel_learning validate
python -m kernel_learning build
python -m kernel_learning serve
```

浏览器打开：`http://127.0.0.1:8765`。无需 pip/npm、GPU 或互联网，数据可离线浏览；GitHub 源码链接需要联网。

如果只想在 Obsidian/浏览器**双击 HTML 离线浏览**，先运行 `build`，再打开根目录的 `Kernel_Learning_Studio.html`。它与 `web/studio-standalone.html` 内容相同，均从 `web/` 与 Case 生成；这两个生成文件不提交 Git。

```powershell
python -m kernel_learning build --check
```

可运行轻量测试：`python -m unittest discover -s tests -v`。完整测试先 `python -m pip install -r requirements-dev.txt`、`python -m playwright install chromium`，再运行同一命令；本机已装 Edge 时可设置 `KLA_BROWSER_CHANNEL=msedge`，免下载 Chromium。浏览器、Case 合同和新增 Kernel 的测试分工见 `docs/case-testing.md`。如系统仅提供 Python Launcher，可将 `python` 换成 `py`。

`export-html --output <path>` 生成可分享页面，默认不包含 `web/local-sources.json` 中的本地导入源码；只有显式加 `--include-local-sources` 才嵌入，请在分享前审阅。`build` 始终使用不嵌入本地源码的默认行为。

## v0.5：先跟着一个 CTA，之后再看成本

默认案例固定为 vLLM、T=4、H=16、SWA=128、Extra=512：先解释 key 位置、32-key block、split/CTA、每轮 32×512 KV Tile 的包含关系，再连续推导 20 blocks → S=16 → 每 split 最多 2 blocks。主线跟踪非空 split 0 的两轮 Gather/计算、partial 写入和第二个 Merge Kernel；split 10 的空边界放在可展开说明中。Anatomy 阶段按配置、分工、加载、计算、归并排序；成本核算和 Dispatch 放在执行链后。交互控件改变时整条推导链一起重算。

这套顺序已写入 `skills/kernel-explain/SKILL.md`，默认例子与教学契约写入 Case JSON；详细验收要求见 `docs/lesson-design.md`。

## v0.4：读取/计算预算与执行层级

新增 `skills/kernel-model/SKILL.md`，要求先按固定源码核算字节、FLOP、Key padding、scratch 与 Program/CTA/Warp/Thread 分工，再制作 Anatomy。页面的 Cost ledger 随 SWA、Extra、Tokens、Heads 变化，默认展示 H=16 的 64-head 对照和 16-head Tile；新「Program → CTA → Warp → Thread」阶段逐层显示源码能确认的角色，以及需要编译 IR/Profile 才能确认的部分。

无 GPU 也可独立复算固定例子：

```powershell
python -m kernel_learning cost --repo vllm --tokens 2 --swa 128 --extra 512 --heads 16
python -m kernel_learning cost --repo sglang --tokens 2 --swa 128 --extra 512 --heads 16
```

例如 vLLM 每 query token、640 个有效 key：旧 64-head QK+PV 形状代理 83,886,080 FLOP，新 16-head 为 20,971,520 FLOP；唯一 KV cache 地址下界为 373,120B，不随 Head Tile 缩小。候选实现 32 splits 的 Q 源码级有效 load 合计 524,288B，partial scratch 容量 1,050,624B。它们是不同统计层面，不能直接相加为物理 HBM 流量，也不能推出延迟加速比。

## v0.3：Anatomy 源码驱动图示


Anatomy 的 13 个阶段现各自回答一个具体问题，不再重复同一张 Head/CTA 网格：
- Dispatch 显示当前条件怎样进入 fast path 或 fallback。
- Packed KV 显示 page/row 寻址，以及页内 576B 数据行与独立 8B scale 区。
- CTA 检查器可选 token 与 split，解释 vLLM 32-key block 的区间分配、空 split，以及 SGLang 64-token tile 的 SWA/Extra 分支。
- QK/PV 形状切换展示 SM90 的 Head×Key 与 SM100 的 Key×Head 两种 MMA 轴映射。
- Partial、Softmax、数值补偿和 Merge 按两个实现分别解释，区分 vLLM 的 normalized partial + log₂ LSE 与 SGLang 的 numerator + max + sum。

每张图都标为 **conceptual**，并连接固定 SHA 的相关行。页面内置 `web/pinned-sources.json` 的真实源码摘录，可离线阅读；摘录来自 Case 固定 commit，附源文件 Git blob SHA。它不是 GPU trace，也不证明当前线上框架仍选用该路径。若已从匹配 SHA 的本地 checkout 导入源码，页面优先展示本地版本；不匹配时优先保留固定摘录。

若 ChatGPT 内置 HTML 预览打不开，可在本机直接双击 `web/studio-standalone.html`，或运行上述 `serve` 命令并访问本地地址。独立 HTML 的样式、数据、图示脚本和源码摘录均已内嵌。

## v0.2：先讲清楚为什么，才进入源码

默认首先进入 Workload 章节，而不是 Anatomy。前两章按照「算子数据流 → Small-head 性能空洞 → SM90/SM100 两种重构 → 收益与代价 → 模型/硬件/框架的设计决策」连续讲解。

**视觉材料重新设计：**
- 两路输入的 Sparse Decode 数据流（Query 与 Selected indices 不被误画为先后依赖）；完整解释 packed KV 584B 的组成。
- Head Padding 使用大幅面积比例展示“8/64 有效 Head 槽位”，不再是难辨认的 64 个碎格；明确这不是总耗时损失比例。
- CTA 网格根据 Tokens、Keys 和选中的 PR 方案计算；分别解释 vLLM 的 Key Split 与 SGLang 的 64-token Tile，并展示 Merge 的额外代价。
- 将演进改成模型语义边界 → 硬件约束分岔 → Serving 集成合同 → 两路线比较，始终附可追溯的 PR/固定源码依据。
- 加入「下一章」导览；改善字体层级和移动端阅读。

设计规范及可视化验收要求见 `docs/lesson-design.md`。当前页面为 **针对这一特定 Case 人工组织的教学原型**，尚不是任意 Kernel 自动生成器；真实 Profile/编译器 Trace 仍待接入。

## 首版已完成

- [x] 版本化 Case（不同仓库/模型/硬件/张量布局明确分开）
- [x] 算子分析：head padding、数据结构、潜在瓶颈、工作量估算
- [x] 双实现多阶段 Storyboard，逐阶段源码深链接
- [x] Dispatch 交互演示与**同一方案内部**的 split 参数推演
- [x] PR 的性能/正确性/编译记录（注明 **PR 作者报告，不是本项目复测**）
- [x] JSON schema 检查、固定版本的源码片段本地导入
- [x] 原始 Obsidian Canvas 保留（标注已有笔记和当前 PR 的差异）

## 接入真实源码（推荐）

在本地 checkout 到 **指定 Commit**；不要用后续的 `main` 和旧 PR 的实验结果混在一起。以下命令**不会修改源仓库**：

```powershell
# vLLM HEAD 必须与 Case 定义的 SHA 相同
python -m kernel_learning import-source --repo vllm --root 'D:\code\vllm'
# SGLang HEAD 必须与 Case 定义的 SHA 相同
python -m kernel_learning import-source --repo sglang --root 'D:\code\sglang'
```

若本地仓库不是固定 SHA，会拒绝导入，并输出应该 checkout 的 SHA；加 `--allow-mismatch` 只供临时探索，UI 会显示不匹配警示。导入的片段保存到 `web/local-sources.json`，仅显示已存在的**实际源码**；未导入时展示清楚标记的解释性伪代码 + commit/行号链接。

## 交互页面说明

点击左侧 vLLM/SGLang，切换硬件与实现。中间交互步骤对应右侧源码文件与行号。调节 Token 和 Keys 参数，观察仅符合本 PR 条件时的演示 Dispatch。性能表只显示各 PR 自己与其 baseline 的报告结果；**不能跨 PR 直接比较绝对吞吐/延迟**。

## 下一步

1. 在现有固定源码驱动的概念图之上接入 TileLens（Triton）或等价工具，再支持 Gluon；工具生成的 Tile/访存 Trace 与概念图分开标记。
2. 确认线上版本、Attention 选择链、FlashMLA fallback、JIT warmup，形成运行图/源码图双向链接。
3. 引入 Nsight Compute / Systems JSON 或 SQLite 导入，验证 memory-bound、gather/dequant、padding 利用率和 launch/merge 开销。
4. 在准确性测试中增加 BF16 舍入边界、attention sink、page stride、CUDA Graph replay，实验与日志保留运行环境。

详见 `docs/architecture.md`、`docs/research-notes.md`、`AGENTS.md`。

## 可信度

所有具体性能数字都来自对应 PR 描述，并非本机测得；模型演进资料来自你提供的 Canvas 及 SGLang 2026-09-10 官方博文。没有确认的机制不写成确定事实。项目截至 **2026-10-27** 的研究快照，不会自动跟进仓库后续更新。
