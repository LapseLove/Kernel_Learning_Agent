/* Source-linked, conceptual Kernel Anatomy. No geometry or timing here is a GPU trace. */
'use strict';

function anatomySource(st) {
  const base = S.pinned?.variants?.[S.variant]?.stages?.[st.id];
  const p = st.id === 'tiling' && S.mmaView === 'pv' ? base?.views?.pv || base : base;
  const start = p?.start ?? st.source.start;
  const end = p?.end ?? st.source.end;
  return { start, end, url: `${v().repo}/blob/${v().commit}/${st.source.file}#L${start}-L${end}` };
}
function anatomyFigure(st, question, basis, body, conclusion) {
  const src = anatomySource(st);
  return `<div class="anatomy-figure" role="group" aria-label="${esc(question)}">
    <div class="anatomy-figure-top"><span>CONCEPTUAL · SOURCE-LINKED</span><a href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">阅读 L${src.start}–L${src.end} ↗</a></div>
    <h3>${esc(question)}</h3><p class="anatomy-basis"><b>依据</b> ${esc(basis)}</p>
    ${body}
    <p class="anatomy-conclusion"><b>结论</b> ${esc(conclusion)}</p>
  </div>`;
}
function anatomyCells(items) {
  return `<div class="anatomy-cells">${items.map(([label, value, sub, tone]) =>
    `<div class="anatomy-cell ${tone || ''}"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(sub)}</span></div>`).join('')}</div>`;
}
function anatomyGate(st) {
  const d = calc(), w = deriveWorkload(S), k = S.swa + S.extra, vl = S.variant === 'vllm';
  const checks = vl
    ? [['Phase', S.phase, S.phase === 'decode'], ['Local heads', S.heads, [8, 16].includes(S.heads)],
       ['Max keys capacity', k, true], ['Token gate', `T=${S.token} ≤ ${w.gateTokens}`, S.token <= w.gateTokens]]
    : [['Phase', S.phase, ['decode', 'verify', 'draft-extend-v2'].includes(S.phase)],
       ['Local heads', S.heads, S.heads === 16], ['Query tokens', `T=${S.token} ≤ ${w.gateTokens}`, S.token <= w.gateTokens],
       ['Packed KV', '584 B/token', true]];
  const body = `<div class="anatomy-gate">${checks.map(([name, value, ok]) =>
    `<div class="${ok ? 'pass' : 'fail'}"><span>${esc(name)}</span><b>${esc(value)}</b><em>${ok ? '✓' : '×'}</em></div>`).join('')}</div>
    <div class="anatomy-outcome ${d.ok ? 'pass' : 'fail'}"><b>${d.ok ? 'Fast path' : 'Fallback'}</b><span>${esc(d.name)}</span></div>
    <p class="anatomy-caveat">此演示固定 ${vl ? 'SM90' : 'SM100/103'}、BF16 Query、D=512 与 V4 packed layout；真实 wrapper 还检查运行时条件与输入布局。</p>`;
  return anatomyFigure(st, '当前输入会进入哪个实现？', '固定 SHA 的框架入口与候选 Kernel 条件；本面板仅模拟可见的主要 gate。', body,
    d.ok ? '当前参数满足教学模型的 fast path，继续检查所选 CTA 如何处理 KV。' : '当前参数触发 fallback，后续候选 Kernel 的图只用于理解实现，不代表这次请求会执行。');
}
function anatomyKV(st) {
  const n = deriveWorkload(S).block;
  const body = `<div class="anatomy-path">
      <div><small>输入 ①</small><b>Sparse index</b><span>无效 ID / 越界必须 mask</span></div><i>→</i>
      <div><small>寻址</small><b>page = id ÷ P<br>row = id mod P</b><span>P 是实际 page size</span></div><i>→</i>
      <div><small>输入 ②</small><b>Packed cache</b><span>page stride 由 caller 给出</span></div>
    </div>
    <div class="anatomy-page">
      <div class="anatomy-page-label">同一 Page 内，数据区和 scale 区分开放置</div>
      <div class="anatomy-page-row"><span>row r · data_base = page_base + r × 576</span>
        <div class="anatomy-byte-bar"><b style="flex:448">448 B FP8 noPE</b><b style="flex:128">128 B BF16 RoPE</b></div></div>
      <div class="anatomy-page-row scale"><span>scale_base = page_base + P × 576 + r × 8</span>
        <div class="anatomy-byte-bar"><b>8 B scale slot · 7 个 64-d group 使用</b></div></div>
    </div>
    <div class="anatomy-path compact"><div><small>一次循环的 load + dequant</small><b>${n} 个 key 位置 × 512 通道</b><span>形成 ${n}×512 BF16 Tile；一个 CTA 可循环处理多个这样的 Tile，边界位置会被 mask</span></div></div>
    <p class="anatomy-caveat">584 B/token 是总存储量；图中两条地址公式来自源码。不要把它误读成一个物理连续的 584B row。</p>`;
  return anatomyFigure(st, '一个 selected KV token 如何变成计算 Tile？',
    '两个固定实现均使用 576B 数据行与独立的 8B scale 行；页大小和 page stride 保持符号化。',
    body, 'Gather 和 dequant 发生在 MMA 之前；索引有效性、page stride 与 scale 位置直接影响正确性。');
}
function anatomySplit(st) {
  const d = calc();
  if (!d.ok) return anatomyFigure(st, 'Fast path 的 CTA 怎样分工？', '候选实现的 launch 形状。',
    '<p class="anatomy-caveat">当前 workload 触发 fallback。调整上方参数后可以检查候选 Kernel 的 CTA 网格。</p>',
    '不要把 fallback 请求画成候选 Kernel 的执行。');
  const vl = S.variant === 'vllm', splitCount = d.splits;
  S.inspectToken = Math.min(Math.max(0, S.inspectToken || 0), S.token - 1);
  S.inspectSplit = Math.min(Math.max(0, S.inspectSplit || 0), splitCount - 1);
  const tok = S.inspectToken, split = S.inspectSplit;
  const w = deriveWorkload(S), swaBlocks = w.swaBlocks, extraBlocks = w.extraBlocks;
  const allBlocks = w.blocks;
  let detail;
  if (vl) {
    const per = w.blocksPerSplit, first = split * per, last = Math.min(first + per, allBlocks);
    const branches = Array.from({length:Math.max(0,last-first)},(_,i)=>first+i < swaBlocks ? 'SWA' : 'Extra');
    const assignment = first >= allBlocks
      ? `起点 ${split} × ${per} = ${first}，已超出 ${allBlocks} 个 block；这是边界情况，没有 KV 计算。−∞ LSE 让 Merge 忽略它。`
      : `block ${first} 到 ${last-1}（${branches.join(' → ')}）；这个 CTA 按顺序循环 ${last-first} 轮，每轮加载最多 32 个 key × 512 个通道。`;
    detail = `<b>CTA = (query token ${tok}, split ${split})</b><span>总数：SWA ${swaBlocks} + Extra ${extraBlocks} = ${allBlocks} blocks；${splitCount} 个 split，因此每 split 最多 ceil(${allBlocks}/${splitCount}) = ${per} blocks。</span><span>这个 CTA：${assignment}</span>`;
  } else {
    const branch = split < swaBlocks ? 'SWA' : 'Extra';
    const tile = split < swaBlocks ? split : split - swaBlocks;
    detail = `<b>program_id = (${tok}, ${split})</b><span>${branch} 分支第 ${tile} 个 64-token tile；容量决定 launch 数，有效 lengths 和 ID mask 决定实际读入的 key。</span>`;
  }
  const body = `<div class="anatomy-inspector"><label>选择 Query token
    <select id="inspect-token">${Array.from({length:S.token},(_,i)=>`<option value="${i}" ${i===tok?'selected':''}>token ${i}</option>`).join('')}</select></label>
    <span>${S.token} token × ${splitCount} split = ${d.programs} partial CTA</span></div>
    <div class="anatomy-split-grid" aria-label="选择一个 key split">${Array.from({length:splitCount},(_,i)=>
      `<button data-inspect-split="${i}" class="${i===split?'active':''}" aria-pressed="${i===split}" title="token ${tok}, split ${i}">${i}</button>`).join('')}</div>
    <div class="anatomy-selected">${detail}</div>
    <p class="anatomy-caveat">网格表示 launch 的 program，不表示 SM 驻留或运行时间。${vl?'源码按每个 token 的有效 lengths 计算 block；这里用控件容量作可检查的示例。':'SGLang wrapper 按 index tensor 容量分配 tile；边界 tile 可以只有部分有效 key。'}</p>`;
  return anatomyFigure(st, '选中的一个 CTA 到底处理哪些 key？',
    vl ? '源码以 (token, split) 为 program_id，按 BLOCK_N=32 的 block 数分配区间。' : 'wrapper 使用 (batch, tile) 网格，SWA/Extra 各按容量 ceil(keys/64) 分配。',
    body, '增加 split 能增加少 token 时的并行任务，也可能产生空任务和更多 partial/merge 成本。');
}
function anatomyMapping(st) {
  const vl=S.variant==='vllm', w=deriveWorkload(S), K=S.swa+S.extra;
  const splits=w.splitsCandidate;
  const policy=v().dispatch;
  const warp=vl?(K>policy.threshold_keys&&S.token<=policy.split_policy.long_tiers[0].max_tokens?4:8):4;
  const per=w.blocksPerSplit;
  const active=w.activeSplitsMax;
  const range=vl?`每 CTA 至多 ${per} 个 32-key block；每 block 16×32 scores、16×512 partial O`:'每 CTA 一个 64-key Tile；64×16 scores、512×16 partial O';
  const cards=[
    ['Grid / program',`${S.token} × ${splits} = ${S.token*splits}`,vl?`program_id=(token,split)；本例每 token 至多 ${active} 个非空、${splits-active} 个空 split`:'program_id(0)=batch/token，program_id(1)=tile'],
    ['单个 CTA',vl?'16 heads × 32 keys/loop':'16 heads × 64 keys',range],
    ['Warp',`${warp} warps / CTA`,`${warp*32} threads；这是 launch 配置，不是驻留数`],
    ['Thread / lane',vl?'源码未指定':'KV base: 1 key × 8 channels',vl?'tl.dot 的元素归属要查编译 IR/PTX；不能平均分摊矩阵 FLOP':'BlockedLayout: 每 warp 4 key × 64 channels；4 warps 16 key × 64 channels；完整 64×512 Tile 重复覆盖'],
    ['MMA 引擎',vl?'SM90 · tl.dot':'SM100 · tcgen05_mma',vl?'Q[16,512] × Kᵀ[512,32]；P[16,32] × K[32,512]':'KV[64,512] × Qᵀ[512,16]；PV 两次（high/residual）']
  ];
  const base=v().repo+'/blob/'+v().commit+'/';
  const extra=vl?[[`vllm/models/deepseek_v41/nvidia/ops/small_head_sparse_decode.py#L112-L159`,'program_id / block 范围'],[`vllm/models/deepseek_v41/nvidia/ops/small_head_sparse_decode.py#L233-L239`,'warp / split 配置']]:[[`python/sglang/kernels/ops/attention/dsv4/swapab_attention.py#L63-L119`,'BT / grid / num_warps'],[`https://triton-lang.org/main/getting-started/tutorials/gluon/layouts.html`,'BlockedLayout 语义']];
  const body=`<div class="mapping-stack">${cards.map((r,i)=>`<div class="mapping-card"><em>${i+1}</em><small>${esc(r[0])}</small><b>${esc(r[1])}</b><span>${esc(r[2])}</span></div>`).join('')}</div><div class="cost-sources">${extra.map(([path,label])=>`<a href="${esc(path.startsWith('https:')?path:base+path)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`).join('')}</div><p class="anatomy-caveat">${vl?'vLLM 源码只给出 grid、BLOCK_H/BLOCK_N 和 num_warps。Lane 映射、寄存器分配、真实指令数与物理内存事务必须看编译产物和 Profile。':'BlockedLayout 描述 Gather 张量的逻辑寄存器分布；它不证明内存事务，也不等于 tcgen05_mma 的硬件 lane ownership。wrapper 在固定 SHA 使用 BT=64、num_warps=4。'}</p>`;
  return anatomyFigure(st,'一个 program、CTA、warp、thread 分别做什么？',
    vl?'固定源码的 launch grid、_pick_config、program_id 与 BLOCK_H/BLOCK_N；未知 lane 分配明确留空。':'固定源码的 Gluon BlockedLayout 与 wrapper 的 BT=64 / num_warps=4；按 Triton layout 语义拆解逻辑分布。',body,
    vl?'优化把 64-head 形状缩为 16-head，并沿 Key 扩展 CTA；不能从 num_warps 反推每线程精确工作。':'优化把 16 head 放 MMA N 轴，KV Tile 沿 CTA 并行；显式 layout 只说明逻辑 Thread 数据分工。');
}
function anatomyMMA(st) {
  const vl = S.variant === 'vllm', pv = S.mmaView === 'pv';
  const shapes = vl
    ? (pv ? [['P · BF16','16 × 32','真实 head × key'],['KV','32 × 512','key × channel'],['partial O','16 × 512','head × channel']]
          : [['Q','16 × 512','head × channel'],['Kᵀ','512 × 32','channel × key'],['Scores','16 × 32','head × key']])
    : (pv ? [['KVᵀ','512 × 64','channel × key'],['P · BF16','64 × 16','key × 真实 head'],['partial O','512 × 16','channel × head']]
          : [['KV','64 × 512','key × channel'],['Qᵀ','512 × 16','channel × 真实 head'],['Scores','64 × 16','key × head']]);
  const body = `<div class="anatomy-toggle"><button data-mma="qk" class="${pv?'':'active'}" aria-pressed="${!pv}">QK / Scores</button><button data-mma="pv" class="${pv?'active':''}" aria-pressed="${pv}">PV / Output</button></div>
    <div class="anatomy-matrix">${shapes.map(([name,dim,axis],i)=>`${i?'<span class="anatomy-op">'+(i===2?'=':'×')+'</span>':''}<div class="anatomy-mat mat-${i}"><small>${esc(name)}</small><strong>${dim}</strong><span>${esc(axis)}</span></div>`).join('')}</div>
    <div class="anatomy-matrix-note">${vl
      ? 'SM90：Triton tl.dot 使用 16-head block 与 32-key block；实际 head=8 时，block 内仍有 masked head，区别于旧路径的 64-head tile。'
      : 'SM100：tcgen05_mma 把 16 个真实 head 放 N 轴。QK 的 score 在 Tensor Memory；PV 覆盖 512 个输出通道，源码以 128 通道为一个 Tensor Memory block。'}</div>`;
  return anatomyFigure(st, 'Head 和 Key 被放到 MMA 的哪条轴？',
    vl ? '固定代码的 BLOCK_H=16、BLOCK_N=32 与两次 tl.dot。' : '固定代码的 BT=64、H=16、tcgen05_mma 操作数布局。',
    body, vl ? '更窄的 Head tile 减少无效 head 计算；32-key block 是单次循环的工作单元。' : 'Head-N 映射使 MMA 的 N 轴直接容纳 16 个真实 head；它依赖 SM100 的指令和布局。');
}
function anatomyPartial(st) {
  const vl = S.variant === 'vllm';
  const body = vl
    ? `<div class="anatomy-state"><div><small>每个 32-key block</small><b>score → mask invalid</b></div><span>→</span><div><small>在线更新</small><b>m = max · l = Σexp · acc = ΣpV</b></div><span>→</span><div><small>每个 split 写入</small><b>归一化 partial O + log₂ LSE</b></div></div>
       <div class="anatomy-formula">m′ = max(m, max(score))<br>l′ = l · 2<sup>m−m′</sup> + Σ 2<sup>score−m′</sup><br>acc′ = acc · 2<sup>m−m′</sup> + P · KV</div>
       <p class="anatomy-caveat">空 split 的 LSE 写为 −∞。此处是源码中的状态关系示意，未展示寄存器分配或周期。</p>`
    : `<div class="anatomy-state"><div><small>Scores[64,16]</small><b>每 head 计算 max / sum</b></div><span>→</span><div><small>概率分解</small><b>P<sub>hi</sub> + P<sub>lo</sub></b></div><span>→</span><div><small>两次 PV</small><b>一次覆盖 + 一次累加</b></div></div>
       <div class="anatomy-formula">P<sub>hi</sub> = BF16(P)<br>P<sub>lo</sub> = BF16(P − FP32(P<sub>hi</sub>))<br>partial = KVᵀP<sub>hi</sub> + KVᵀP<sub>lo</sub></div>
       <p class="anatomy-caveat">源码把 partial O、tile max、tile sum 分别写入 FP32 scratch；此图不声称数值误差或性能收益的大小。</p>`;
  return anatomyFigure(st, vl ? '跨 key block 如何保持 Softmax 稳定？' : '为什么 PV 要用 BF16 high + residual 两次计算？',
    vl ? '固定源码的 m_i、l_i、acc 在线更新及 split 尾部存储。' : '固定源码的 score Tensor Memory、prob、COMPENSATE=True 与两次 tcgen05_mma。',
    body, vl ? 'partial O 和 log₂ LSE 是跨 split 归并的充分状态，单个 split 的 O 不能直接相加。' : '第二次 PV 处理 BF16 舍入残差；它改变数值路径，也增加计算与同步。');
}
function anatomyMerge(st) {
  const vl = S.variant === 'vllm';
  const body = `<div class="anatomy-state">
    <div><small>每个 split / head</small><b>${vl?'Oᵢ + log₂ LSEᵢ':'Oᵢ + maxᵢ + sumᵢ'}</b></div><span>→</span>
    <div><small>稳定重标定</small><b>${vl?'wᵢ = 2^(LSEᵢ−m)':'wᵢ = exp(maxᵢ−m)'}</b></div><span>→</span>
    <div><small>仅在 Merge</small><b>加入 sink 一次 → BF16 output</b></div>
  </div><div class="anatomy-formula">${vl
    ? 'm = maxᵢ LSEᵢ；wᵢ = 2<sup>LSEᵢ−m</sup><br>O = (Σ wᵢ Oᵢ / Σ wᵢ) × attention-sink factor'
    : 'm = max(maxᵢ, sink)；wᵢ = exp(maxᵢ−m)<br>O = Σ(wᵢ Oᵢ) / [Σ(wᵢ sumᵢ) + exp(sink−m)]'}</div>
    <p class="anatomy-caveat">这是归并依赖图，不是时序 Trace。vLLM partial 已按 split 内 sum 归一；SGLang partial 保留未归一的 numerator。</p>`;
  return anatomyFigure(st, '为什么不能直接把各 CTA 的输出相加？',
    '两个固定实现的 scratch 格式和 Merge Kernel；sink 只在合并时加入一次。',
    body, '每个 split 的 Softmax 基准不同，Merge 必须重标定后求和；额外 scratch 与第二次 launch 是收益边界的一部分。');
}
function anatomyConfig(st) {
  const k = S.swa + S.extra, t = S.token, policy=v().dispatch, rule=policy.split_policy;
  const threshold=policy.threshold_keys, short=k<=threshold;
  const rows = [[`≤${threshold} keys`,'任意支持的 T',String(rule.short_splits)]];
  let lower=1;
  for(const tier of rule.long_tiers){
    const upper=tier.max_tokens??policy.max_tokens_long;
    rows.push([`>${threshold} keys`,lower===1?`T≤${upper}`:`${lower}≤T≤${upper}`,String(tier.splits)]);
    lower=upper+1;
  }
  const active = short?0:1+rule.long_tiers.findIndex(tier=>tier.max_tokens===undefined||t<=tier.max_tokens);
  const body = `<div class="anatomy-table"><div class="anatomy-table-head"><span>容量条件</span><span>Token 条件</span><span>Split</span></div>${rows.map((r,i)=>
    `<div class="${active===i?'active':''}"><span>${r[0]}</span><span>${r[1]}</span><b>${r[2]}</b></div>`).join('')}</div>
    <p class="anatomy-caveat">当前输入：T=${t}，max_keys=${k}，因此候选配置选 S=${rows[active][2]}。${calc().ok?'':'当前触发 fallback，不会运行此候选 Kernel。'}先定 S，再算 block 怎样分给每个 CTA。表格对应固定 PR 的 _pick_config；它不是通用 GPU 常数。</p>`;
  return anatomyFigure(st, '何时选 8、16、32 个 key split？', '固定源码 _pick_config 与 token gate，按 index 容量判断。',
    body, 'Token 增多时自身并行度增加，配置降低 split 数；具体收益仍需要同条件实验验证。');
}
function anatomyWarmup(st) {
  const body = `<div class="anatomy-state"><div><small>启动期</small><b>枚举 SWA / Top-k / Page 配置</b></div><span>→</span><div><small>编译</small><b>Partial 变体</b></div><span>→</span><div><small>编译</small><b>Merge S=8/16/32</b></div></div>
    <p class="anatomy-caveat">源码提供 register_warmup 路径；真正的首次请求 JIT 与 CUDA Graph replay 仍需运行时测试。这里没有展示实测启动耗时。</p>`;
  return anatomyFigure(st, '为什么需要把所有可分流变体预热？', '固定源码的 register_small_head_decode_warmup 与 _SPLIT_CHOICES。',
    body, '支持区域不只取决于 Kernel 本身，还取决于启动期是否覆盖线上会选到的编译组合。');
}
function anatomyVisual(st) {
  const id = st.id, vl = S.variant === 'vllm';
  if (id === 'gate') return anatomyGate(st);
  if (id === 'kv' || id === 'gather') return anatomyKV(st);
  if (id === 'split' || id === 'splits') return anatomySplit(st);
  if (id === 'mapping') return anatomyMapping(st);
  if (id === 'tiling') return anatomyMMA(st);
  if (id === 'qk') return anatomyMMA(st) + anatomyPartial(st);
  if (id === 'softmax') return anatomyPartial(st);
  if (id === 'merge') return anatomyMerge(st);
  if (id === 'config' && vl) return anatomyConfig(st);
  if (id === 'warmup' && vl) return anatomyWarmup(st);
  return anatomyFigure(st, st.title, '固定源码和 Case 说明。', '', st.why);
}
