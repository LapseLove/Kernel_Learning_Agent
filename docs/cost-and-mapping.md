# Small-head Sparse Decode：读取、计算与 Tile 分工（固定源码模型）

本页按 vLLM `74c0f0e10ac647ee22cf9e2bcd0ee20e40aee343`、SGLang `b98a4ead5bd337418e8eb5a18e9f5f5a402baac0` 核算。它是源码派生的形状/地址模型，不是 GPU 测量。统一采用每个 query token、H=16、D=512、SWA=128、Extra=512、容量等于有效长度、所有 ID 有效且不重复、FMA=2 FLOP。两条实现运行在不同硬件上，不能用这些 FLOP 直接比较延迟。

## 1. Head=16：padding 64 与 Tile 16 的分层对照

vLLM 的旧 64-head 说法来自 [固定源码的设计说明](https://github.com/vllm-project/vllm/blob/74c0f0e10ac647ee22cf9e2bcd0ee20e40aee343/vllm/models/deepseek_v41/nvidia/ops/small_head_sparse_decode.py#L1-L15)。以下旧值是**相同 key slots 下的矩阵形状代理**，不是旧 FlashMLA 的实际指令数或读取量。

| 层面，每 query token | 64-head 形状对照 | vLLM 16-head Tile | 解释 |
| --- | ---: | ---: | --- |
| 有效 QK + 单次 PV | 20,971,520 FLOP | 20,971,520 FLOP | `4×16×512×640`，语义工作不变 |
| Tile QK + PV 形状代理 | 83,886,080 FLOP | 20,971,520 FLOP | `4×H_tile×512×640`；Head 槽位减少 4 倍 |
| 单个 BF16 Q 操作数形状 | 65,536 B | 16,384 B | `H_tile×512×2`；不代表旧路径物理 Q 读取 |
| KV 唯一有效 cache 地址 | 373,120 B | 373,120 B | `640×(448+128+7)`；Head padding 不改变所选 KV 记录 |
| KV 布局占用 | 373,760 B | 373,760 B | `640×584`，其中每 key 第 8 个 scale 字节未被此 load 使用 |
| Index 唯一有效地址 | 2,560 B | 2,560 B | `640×4`，按无重复 ID |
| Q 源码级有效 load | 旧路径未知 | 524,288 B | `32 CTA×16×512×2`；跨 CTA 缓存复用未知 |
| Partial scratch 容量 | 旧路径未知 | 1,050,624 B | `32×16×(512×4+4)`，写入后 Merge；不是 DRAM 实测字节 |

vLLM 将 `ceil(128/32)+ceil(512/32)=20` 个 Key block 分给 `S=32` 个 split。当前分配规则 `ceil(20/32)=1` block/split，因此每 query token 20 个非空 CTA、12 个空 CTA；两者仍要经过 Q/partial 相关路径。Key block padding 在本例为零；其他容量需先分别向上取整。QK/PV 的矩阵形状代理忽略 Softmax、dequant、地址计算、指令粒度与缓存。H=8 时有效计算为 10,485,760 FLOP，但新 Tile 仍是 20,971,520 FLOP 代理，说明 H8 仍有一半 Head 槽位无效。来源：[Key 分配、Q 加载、MMA](https://github.com/vllm-project/vllm/blob/74c0f0e10ac647ee22cf9e2bcd0ee20e40aee343/vllm/models/deepseek_v41/nvidia/ops/small_head_sparse_decode.py#L111-L181)、[split/warp 选择](https://github.com/vllm-project/vllm/blob/74c0f0e10ac647ee22cf9e2bcd0ee20e40aee343/vllm/models/deepseek_v41/nvidia/ops/small_head_sparse_decode.py#L233-L239)、[scratch 形状](https://github.com/vllm-project/vllm/blob/74c0f0e10ac647ee22cf9e2bcd0ee20e40aee343/vllm/models/deepseek_v41/nvidia/ops/small_head_sparse_decode.py#L438-L445)。

因此本次优化主要缩小 **Head 方向的 MMA 形状**，并沿 Key 方向增加 CTA；它并没有消除 selected KV Gather。新方案还付出重复 Q load、FP32 partial scratch、Merge 与额外 launch。哪项主导延迟需要真实 GPU profile。

## 2. Program、CTA、Warp、Thread 分工

| 实现 | Grid / program | 单个 CTA | Warp | Thread/lane | MMA |
| --- | --- | --- | --- | --- | --- |
| vLLM SM90 | `(T,S)`；一个 program 对应 `(token,split)` | 对该 split 的 32-key block 逐个做 QK、在线 Softmax、PV；16-head Tile | 长 Key 且 T≤3 为 4 warps，否则该策略为 8 warps；128/256 threads | 固定源码没有显式 lane 到矩阵元素映射；需编译 IR/PTX | `tl.dot`，QK `[16,512]×[512,32]`，PV `[16,32]×[32,512]` |
| SGLang SM100 | `(B,NT)`；一个 program 对应一个 64-key Tile | 64 key ×16 head；按 SWA/Extra 分支 Gather，masked 边界 | 4 warps，即 128 threads | KV `BlockedLayout([1,8],[4,8],[4,1],[1,0])`：基础每 lane `1 key×8 channel`，每 warp `4×64`，每 CTA `16×64`，再重复覆盖 `64×512` | `tcgen05_mma`：QK `64×512` 与 `512×16`，PV high/residual 两次 |

vLLM 来源：[program_id 与 Key 区间](https://github.com/vllm-project/vllm/blob/74c0f0e10ac647ee22cf9e2bcd0ee20e40aee343/vllm/models/deepseek_v41/nvidia/ops/small_head_sparse_decode.py#L112-L159)、[launch grid 与参数](https://github.com/vllm-project/vllm/blob/74c0f0e10ac647ee22cf9e2bcd0ee20e40aee343/vllm/models/deepseek_v41/nvidia/ops/small_head_sparse_decode.py#L320-L336)。SGLang 来源：[Gluon layout、program_id、mask](https://github.com/sgl-project/sglang/blob/b98a4ead5bd337418e8eb5a18e9f5f5a402baac0/python/sglang/kernels/ops/attention/dsv4/swapab_gluon.py#L71-L89)、[wrapper 的 BT/grid/warps](https://github.com/sgl-project/sglang/blob/b98a4ead5bd337418e8eb5a18e9f5f5a402baac0/python/sglang/kernels/ops/attention/dsv4/swapab_attention.py#L63-L119)、[Triton 官方 BlockedLayout 语义](https://triton-lang.org/main/getting-started/tutorials/gluon/layouts.html)。Gluon layout 是 **KV Gather 的逻辑数据分布**，不能当作 Tensor Core 的真实 lane ownership、内存事务或 SM 驻留。

## 3. SGLang 的附加代价与读取歧义

固定 wrapper 对同一容量得到 `NT=ceil(128/64)+ceil(512/64)=10` 个 CTA/query token。QK+单次 PV 代理为 20,971,520 FLOP；源码默认 `COMPENSATE=True`，第二次 PV 处理 BF16 residual，因此 QK+两次 PV 的 Tile 代理为 31,457,280 FLOP。每 query token Q 逻辑 load 为 `10×16×512×2=163,840 B`，scratch 容量为 `10×16×(512×4+4+4)=328,960 B`。这些数与 vLLM 不能作为硬件速度对照。

SGLang 的 `_load_v4` 中 scale 指针含 `d//64`，对 448 个 FP8 channel 形成 448 个逻辑 load 位置，却只指向 7 个唯一 scale 字节。编译器可能消除/合并重复，物理 DRAM/L2 事务必须测量。来源：[KV Load](https://github.com/sgl-project/sglang/blob/b98a4ead5bd337418e8eb5a18e9f5f5a402baac0/python/sglang/kernels/ops/attention/dsv4/swapab_gluon.py#L16-L36)、[两次 PV](https://github.com/sgl-project/sglang/blob/b98a4ead5bd337418e8eb5a18e9f5f5a402baac0/python/sglang/kernels/ops/attention/dsv4/swapab_gluon.py#L128-L143)。

## 4. 无 GPU 时可核对的结论

运行 `python -m kernel_learning cost --repo vllm --tokens 2 --swa 128 --extra 512 --heads 16`，再改变 Heads/Keys/Tokens，核对 `key_slots`、空 split、FLOP 与 scratch。真实 GPU 阶段再验证物理流量、编译布局、MMA 指令、CTA occupancy、Merge 开销和延迟转折点。
