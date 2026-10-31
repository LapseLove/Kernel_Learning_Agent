# 单案例原型演进

项目最早的 README 详细记录了 v0.2–v0.5 的教学修改；[固定在首次 Git 快照的原文](https://github.com/ZhouMaomaoZhou/Kernel_Learning_Agent/blob/5213f785804056d52a78718357c9c4129f57bf11/README.md)可供追溯。当前使用方法与贡献流程以根目录 README 和 CONTRIBUTING 为准。

| 阶段 | 主要变化 | 仍需核查的边界 |
| --- | --- | --- |
| v0.2 | 在 Anatomy 前先解释算子输入、small-head 性能空洞和设计分岔 | 概念图不代表硬件执行；模型版本与实现版本分开 |
| v0.3 | Anatomy 阶段绑定固定 SHA 的真实源码摘录，加入 CTA、KV 页布局和 QK/PV 轴映射 | 行号随版本固定；本地不匹配的源码不得冒充 pinned 版本 |
| v0.4 | 加入读取量、FLOP 形状代理、scratch 和 Program→CTA→Warp→Thread 分工 | 唯一地址、逻辑 load 与物理流量分开；未知 lane 映射留空 |
| v0.5 | 固定 T=4、H=16、SWA=128、Extra=512，先走一个非空 CTA，再解释空 split、成本和 dispatch | 每个交互图使用同一组输入；第二个 Merge Kernel 单独画出 |

之后的工程化工作加入 Case Schema、Python/浏览器公式一致性、真实浏览器测试、URL 学习位置恢复和安全离线导出。当前 CI 仍只验证首个 Case；多页面路线见[community-roadmap.md](community-roadmap.md)。
