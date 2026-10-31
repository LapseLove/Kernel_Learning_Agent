/* Kernel Learning Studio · offline static data + optional local source maps.
   The graphics are CONCEPTUAL unless the evidence level says otherwise. */
'use strict';
const S={case:null,variant:'vllm',view:'overview',stage:0,token:4,swa:128,extra:512,heads:16,phase:'decode',local:{},pinned:{},experiment:-1,inspectToken:0,inspectSplit:0,mmaView:'qk'};
const STATE_KEYS=['variant','view','stage','token','swa','extra','heads','phase','inspectToken','inspectSplit','mmaView'];
function restoreState(){
 const p=new URLSearchParams(location.hash.slice(1));
 if(['vllm','sglang'].includes(p.get('variant')))S.variant=p.get('variant');
 if(['overview','evolution','anatomy','evidence','experiments'].includes(p.get('view')))S.view=p.get('view');
 for(const [key,allowed] of Object.entries({token:[1,24],stage:[0,50],inspectToken:[0,23],inspectSplit:[0,64]})){
  const raw=p.get(key),num=Number(raw);if(raw!==null&&Number.isInteger(num)&&num>=allowed[0]&&num<=allowed[1])S[key]=num;
 }
 for(const [key,allowed] of Object.entries({swa:[32,64,128,256],extra:[0,64,512,1024],heads:[8,16,32]})){
  const raw=p.get(key),num=Number(raw);if(raw!==null&&allowed.includes(num))S[key]=num;
 }
 if(['decode','verify','draft-extend-v2','prefill'].includes(p.get('phase')))S.phase=p.get('phase');
 if(['qk','pv'].includes(p.get('mmaView')))S.mmaView=p.get('mmaView');
 S.stage=Math.min(S.stage,S.case.variants[S.variant].stages.length-1);
}
function saveState(push=false){
 const p=new URLSearchParams();for(const key of STATE_KEYS)p.set(key,String(S[key]));
 history[push?'pushState':'replaceState'](null,'','#'+p.toString());
}
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const v=()=>S.case.variants[S.variant];
const repoFile=(st)=>`${v().repo}/blob/${v().commit}/${st.source.file}#L${st.source.start}-L${st.source.end}`;
const section=(title,extra='')=>`<div class="sectionhead"><h2>${title}</h2><span>${extra}</span></div>`;
function calc(){const w=deriveWorkload(S),vl=S.variant==='vllm';
 return {ok:w.supported,splits:w.supported?w.splitsCandidate:null,
  programs:w.supported?w.programsCandidate:null,
  gate:vl?`${S.swa+S.extra<=256?'短 Keys ≤256':'长 Keys >256'} · T ≤ ${w.gateTokens}`:'SM100/103 · H=16 · T ≤ 8 · V4 Packed',
  name:vl?(w.supported?'Small-head Triton':'FlashMLA fallback'):(w.supported?'Gluon tcgen05 fast path':'Existing attention fallback')};
}
function metrics(){const x=v();return `<div class="grid-top">
  <div class="metric"><span class="key">GPU architecture</span><span class="val">${esc(S.variant==='vllm'?'SM90 / Hopper':'SM100+ / Blackwell')}</span><span class="sub">${esc(x.hardware)}</span></div>
  <div class="metric"><span class="key">Native heads</span><span class="val">${esc(x.head_note)}</span><span class="sub">${S.variant==='vllm'?'旧计算 Tile 的 Head-M 为 64':'fast path 的 MMA N 轴恰为 16 heads'}</span></div>
  <div class="metric"><span class="key">Compute engine</span><span class="val">${esc(S.variant==='vllm'?'mma.sync':'tcgen05_mma')}</span><span class="sub">${esc(x.language)}</span></div>
  <div class="metric"><span class="key">Code state</span><span class="val">${S.variant==='vllm'?'Open PR':'Merged PR'}</span><span class="sub">2026-10-27 · ${esc(x.commit.slice(0,12))}</span></div>
  </div>`}
function dispPanel(){const d=calc();return `<div class="dispatch ${d.ok?'':'fallback'}"><div><strong>Dispatch simulator · ${esc(d.name)}</strong><p>${esc(d.gate)} ｜ 当前：T=${S.token}, SWA=${S.swa}, Extra=${S.extra}, H=${S.heads}${d.ok?` ｜ splits=${d.splits}, conceptual programs=${d.programs}`:''}</p></div><span class="pill">${d.ok?'FAST PATH':'FALLBACK'}</span></div><div class="smalldesc">演示固定 PR 支持区域；假定已满足当前实现的架构、BF16 query 和特定 584B packed cache 前提。SGLang 的 Key 参数指 index tensor 的容量；不是所有请求的实时有效长度。</div>`}
function workloadControl(showDispatch=true){return `<div class="pane"><div class="workloadcontrols"><label class="control">Phase <select id="phase">${['decode','verify','draft-extend-v2','prefill'].map(e=>`<option value="${e}" ${e===S.phase?'selected':''}>${e}</option>`).join('')}</select></label><label class="control">Tokens <input type="range" id="tokens" min="1" max="24" value="${S.token}"><b class="value">${S.token}</b></label><label class="control">Heads <select id="heads">${[8,16,32].map(e=>`<option value="${e}" ${e===S.heads?'selected':''}>${e}</option>`).join('')}</select></label><label class="control">SWA keys <select id="swa">${[32,64,128,256].map(e=>`<option value="${e}" ${e===S.swa?'selected':''}>${e}</option>`).join('')}</select></label><label class="control">Extra keys <select id="extra">${[0,64,512,1024].map(e=>`<option value="${e}" ${e===S.extra?'selected':''}>${e}</option>`).join('')}</select></label></div>${showDispatch?dispPanel():''}</div>`}
const costFmt=n=>Number(n).toLocaleString('en-US');
function anatomyCost(){
 const c=S.case.cost_model, vl=S.variant==='vllm', K=S.swa+S.extra, w=deriveWorkload(S), B=w.blocks, slots=w.keySlots;
 const d=calc(), Sx=w.splitsCandidate, H=vl&&[8,16].includes(S.heads)?S.heads:16;
 const useful=4*H*c.dim*K, old=4*64*c.dim*slots, newer=4*16*c.dim*slots;
 const q=Sx*H*c.dim*2, kv=K*(c.fp8_nope_bytes+c.bf16_rope_bytes+c.scale_unique_bytes), idx=K*c.index_bytes;
 const scratch=Sx*16*(c.dim*4+(vl?4:8)), merge=Sx*H*(c.dim*4+(vl?4:8));
 const src=vl?`${v().repo}/blob/${v().commit}/vllm/models/deepseek_v41/nvidia/ops/small_head_sparse_decode.py#L35-L83`:`${v().repo}/blob/${v().commit}/python/sglang/kernels/ops/attention/dsv4/swapab_attention.py#L63-L119`;
 const sample=vl?`<div class="cost-compare"><div><small>旧 64-head · 形状代理</small><strong>${costFmt(old)} FLOP</strong><span>QK + PV，按 ${slots} key slots</span></div><b>÷4</b><div><small>新 16-head Tile · 形状代理</small><strong>${costFmt(newer)} FLOP</strong><span>H=8 时仍按 16-head Tile；真实有效 FLOP 另列</span></div></div>`
 :`<div class="cost-compare"><div><small>16-head · 单次 PV 参照</small><strong>${costFmt(newer)} FLOP</strong><span>QK + PV，按 ${slots} key slots</span></div><b>→</b><div><small>当前源码 · 两次 PV</small><strong>${costFmt(6*16*c.dim*slots)} FLOP</strong><span>QK + PV high + PV residual；非跨硬件速度比较</span></div></div>`;
 const readCompare=vl?`<div class="cost-read-compare"><div><small>KV 唯一地址 / token</small><b>${costFmt(kv)} B → ${costFmt(kv)} B</b><span>Head padding 不改变所选 KV 记录；旧实际 HBM 事务未知</span></div><div><small>Q BF16 操作数形状 / Tile</small><b>65,536 B → 16,384 B</b><span>64×512 → 16×512；形状不是旧路径的物理读取量</span></div></div>`:`<div class="cost-read-compare"><div><small>Scale 的源码级地址位置 / key</small><b>448 个 → 7 个唯一字节</b><span>_load_v4 使用 d//64；重复地址可能被编译器合并</span></div><div><small>物理读取量</small><b>需要 GPU Profile</b><span>不能把 448 个逻辑位置当作 448 次 DRAM load</span></div></div>`;
 const rows=[['有效 QK + 单次 PV',`${costFmt(useful)} FLOP`,`4 × ${H} heads × 512 × ${K} valid keys`],['KV 唯一有效地址',`${costFmt(kv)} B`,`每 key 448 FP8 + 128 BF16 + 7 scale；存储为 ${costFmt(K*584)} B`],['Index 唯一地址',`${costFmt(idx)} B`,`每有效 key 4B；假设 ID 不重复`],...(vl?[['Q 操作数形状','65,536 → 16,384 B','旧 64-head vs 新 16-head，每 CTA 的 BF16 Tile；不是旧路径的 HBM 读量']]:[]),['Q 源码级逻辑 load',`${costFmt(q)} B`,`候选实现每 CTA ${H} × 512 × 2B，重复 ${Sx} 次；cache 命中未知`],['Partial scratch 容量',`${costFmt(scratch)} B`,`候选实现每 CTA 16 × (512 × 4 + ${vl?'4':'4 + 4'}) B；Merge 真实 head 读约 ${costFmt(merge)} B`]];
 const root=vl?'vllm/models/deepseek_v41/nvidia/ops/small_head_sparse_decode.py':'python/sglang/kernels/ops/attention/dsv4/';
 const links=vl?[[root,1,15,'64→16 设计'],[root,111,181,'Grid/QK/PV'],[root,233,239,'Split 配置'],[root,438,445,'Scratch']]:[[root+'swapab_gluon.py',16,36,'KV Load'],[root+'swapab_gluon.py',71,143,'Layout/MMA'],[root+'swapab_attention.py',63,119,'Grid/Scratch']];
 return `<div class="pane cost-panel"><div class="cost-intro"><div><div class="smallcaps">SOURCE-DERIVED MODEL · 每 query token</div><h3>读多少，算多少，优化了哪一层？</h3></div><a href="${esc(src)}" target="_blank" rel="noopener noreferrer">固定源码 ↗</a></div><p class="anatomy-caveat">假设容量=有效长度、所有 ID 有效且不重复；${vl?'SWA/Extra 各自按 32 向上取整':'SWA/Extra 各自按 64 向上取整'}，共 ${B} blocks / ${slots} key slots。当前输入${d.ok?'进入候选 fast path':'触发 fallback；以下是候选实现的反事实模型'}。</p>${sample}${readCompare}<div class="cost-ledger"><div class="cost-ledger-head"><span>层面</span><span>数量</span><span>来源与分母</span></div>${rows.map(r=>`<div><span>${r[0]}</span><b>${r[1]}</b><small>${r[2]}</small></div>`).join('')}</div><div class="cost-conclusion"><b>层次变化</b> ${vl?'Head Tile 的 QK/PV 形状代理缩小 4 倍；selected KV 本身不因 Head padding 缩小。Key split 增加 CTA 并带来 Q 重载、partial 写入和 Merge。':'16 个真实 head 直接进入 MMA N 轴；第二次 PV 为 BF16 残差补偿增加计算。KV tile 并行增加 Q 重载、scratch 和 Merge。'} <b>待实测</b> 物理 HBM/L2 事务、寄存器/共享内存、实际指令数与延迟。</div><div class="cost-sources">${links.map(([file,a,b,label])=>`<a href="${esc(v().repo+'/blob/'+v().commit+'/'+file+'#L'+a+'-L'+b)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`).join('')}</div></div>`;
}
function srcBlock(st){
 const data=S.local?.[S.variant], local=data?.stages?.[st.id];
 const localMatched=!!local&&data.matched&&data.expected_commit===v().commit;
 const localOK=localMatched&&!(st.id==='tiling'&&S.mmaView==='pv');
 const bundle=S.pinned?.variants?.[S.variant];
 const basePinned=bundle?.commit===v().commit?bundle.stages?.[st.id]:null;
 const pinned=st.id==='tiling'&&S.mmaView==='pv'?basePinned?.views?.pv||basePinned:basePinned;
 const item=localOK?local:pinned;
 const focus=item&&item.start&&item.end?{...st,source:{...st.source,start:item.start,end:item.end}}:st;
 const status=localOK?'本地 checkout · SHA 一致':pinned?'固定 SHA 的真实源码摘录':'解释性伪代码 · 非实际源码';
 const body=localOK?`<pre><code>${esc(local.code)}</code></pre>`:pinned
   ?pinned.code.split('\n').map((line,i)=>`<div class="source-line"><span>${pinned.start+i}</span><code>${esc(line)||' '}</code></div>`).join('')
   :`<pre><code>${esc(st.pseudo)}</code></pre>`;
 const warning=local&&!localMatched?'<div class="source-warning-inline">本地源码 SHA 不匹配，已优先显示固定版本的摘录。</div>':'';
 return `<div class="codepane"><div class="codehead"><strong>⌘ SOURCE MAP <span>· ${esc(status)}</span></strong><span>L${focus.source.start}–L${focus.source.end}</span></div><div class="source-body">${body}</div>${warning}<div class="codefoot"><span class="source-link">${esc(st.source.file)}<br><small>${esc(v().commit.slice(0,16))}…${pinned?` · blob ${esc(pinned.blob_sha.slice(0,12))}`:''}</small></span><a href="${esc(repoFile(focus))}" target="_blank" rel="noopener noreferrer">查看固定源码 ↗</a></div></div>`;
}
function stageFlow(st){return anatomyVisual(st)}
function anatomyWalkthrough(){
 const vl=S.variant==='vllm', w=deriveWorkload(S), n=w.block, a=w.swaBlocks, b=w.extraBlocks, total=w.blocks;
 const splits=w.splitsCandidate;
 const per=w.blocksPerSplit, assigned=Math.min(per,total), firstEmpty=w.firstEmptySplit;
 const file=vl?'vllm/models/deepseek_v41/nvidia/ops/small_head_sparse_decode.py':'python/sglang/kernels/ops/attention/dsv4/swapab_attention.py';
 const lines=vl?'#L111-L159':'#L63-L119', source=`${v().repo}/blob/${v().commit}/${file}${lines}`;
 const blockList=Array.from({length:assigned},(_,i)=>`block ${i}（${i<a?'SWA':'Extra'}）`).join(' → ');
 const math=vl?[
  [`① 把 Key 切成 block`,`ceil(${S.swa}/32) + ceil(${S.extra}/32) = ${a} + ${b} = ${total}`,`一个 block 最多 32 个 key 位置`],
  ['② 按 T 选 split',`${S.token} 个 query token → 每 token ${splits} 个 split`,'S 来自固定源码的配置规则，不是 key block 数'],
  ['③ 给每个 split 分 block',`ceil(${total}/${splits}) = ${per} blocks / split`,'一个 split 对应一个 program/CTA，可循环处理多个 block'],
  ['④ 跟踪 split 0',`${blockList||'无有效 block'}`,`这个 CTA 逐轮处理 ${assigned} 个 block；每轮形成一个 32×512 KV Tile`]
 ]:[
  ['① 把 Key 切成 Tile',`ceil(${S.swa}/64) + ceil(${S.extra}/64) = ${a} + ${b} = ${total}`,'一个 Tile 最多 64 个 key 位置'],
  ['② 分配 program',`${S.token} 个 query token × ${total} 个 Tile`,'一个 program/CTA 对应一个 query token 和一个 Tile'],
  ['③ 跟踪 CTA (0,0)','SWA Tile 0 → key 位置 0…63','边界与长度由 mask 决定'],
  ['④ 进入计算','KV[64,512] × Qᵀ[512,16]','先建立一条 CTA 的路径，再比较实现']
 ];
 const foot=vl&&firstEmpty<splits?`<details class="walk-edge"><summary>边界情况：为什么会有空 split？</summary><p>前 ${firstEmpty} 个 split 已覆盖 ${total} 个 block。split ${firstEmpty} 的起点是 ${firstEmpty}×${per}=${firstEmpty*per}，已达到或超过总数 ${total}，所以没有 key 可计算；它写入 −∞ LSE，Merge 时权重为零。先理解上面的正常 CTA，再看这个例外。</p></details>`:
 `<details class="walk-edge"><summary>边界情况：有效长度不足时怎样处理？</summary><p>图中的容量只决定 launch 形状；实际长度、无效 ID 和末尾不足一 Tile 的位置由源码 mask 排除。</p></details>`;
 return `<div class="pane walk"><div class="smallcaps">一组输入 · 一条 CTA · 完整执行</div><h2>先跟着一个正常 CTA 走，再讨论例外与优化</h2><p class="walk-intro">当前示例：T=${S.token} 个 query token，H=${S.heads} 个真实 head，SWA=${S.swa}、Extra=${S.extra} 个 key 位置。为讲清分工，先假定有效长度等于容量、ID 均有效。${calc().ok?'':'当前参数不进入候选 fast path；下方只用于理解其执行机制。'}</p><div class="walk-glossary"><div><b>query token</b><span>本轮要算输出的一个查询</span></div><div><b>key 位置</b><span>一个被选中的 KV 记录</span></div><div><b>${vl?'block':'Tile'}</b><span>最多 ${n} 个 key 位置；加载后形状 ${n}×512</span></div><div><b>${vl?'split / CTA':'CTA'}</b><span>${vl?'分给一个 program 的若干 block':'负责一个 64-key Tile 的 program'}</span></div></div><div class="walk-math">${math.map(([title,value,note])=>`<div><small>${esc(title)}</small><b>${esc(value)}</b><span>${esc(note)}</span></div>`).join('')}</div><div class="walk-flow"><b>从一个 CTA 到最终输出</b><div><span>CTA：读 index</span><i>→</i><span>Gather + Dequant<br>${n}×512</span><i>→</i><span>QK + Softmax + PV</span><i>→</i><span>写 partial</span></div><div class="walk-merge">各 CTA 的 partial → 第二个 Kernel 执行 Merge → 输出</div><p>${vl?'split 0 处理多个 block 时，Gather 和计算按 block 循环；32×512 是每轮的 KV Tile，不是整个 split 的大小。':'每个 CTA 负责一个 64-key Tile；所有 CTA 的 partial 再统一归并。'}</p></div>${foot}<a class="walk-source" href="${esc(source)}" target="_blank" rel="noopener noreferrer">查看这条分配链对应的固定源码 ↗</a></div>`;
}
function anatomy(){const x=v();let st=x.stages[S.stage]||x.stages[0];return `${section('01 / 固定一个例子','先改输入，再沿同一组参数从头推到尾')}${workloadControl(false)}${anatomyWalkthrough()}${section('02 / 跟着源码执行','按配置 → 分工 → 加载 → 计算 → 归并阅读')}<div class="anatomy-layout"><div class="anatomy-left"><div class="smallcaps">EXECUTION STAGES · ${x.stages.length}</div>${x.stages.map((it,i)=>`<button class="stagebtn ${S.stage===i?'active':''}" data-stage="${i}"><span class="num">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(it.title)}</strong><small>${esc(it.focus)}</small></span></button>`).join('')}</div><div class="anatomy-right"><div class="pane"><div class="stage-header"><div><div class="smallcaps">STAGE ${String(S.stage+1).padStart(2,'0')} / ${x.stages.length}</div><h2>${esc(st.title)}</h2><div class="copy">${esc(st.description)}</div></div><span class="chip hi">${esc(st.visual)}</span></div>${stageFlow(st)}${srcBlock(st)}<div class="stage-note"><div class="note"><b>✳ WHY THIS DESIGN?</b>${esc(st.why)}</div><div class="note question"><b>◇ QUESTION TO VERIFY</b>${esc(st.check)}</div></div></div></div></div>${section('03 / 回头核算成本','已有完整执行链，再看读取和计算的变化')}${anatomyCost()}${section('04 / 最后判断是否启用','运行时 Gate 先于 Kernel；这里在理解机制后复查适用性')}${dispPanel()}${bottom()}`}
function bottom(){return `<footer>Kernel Learning Agent · pinned case / ${esc(v().commit)}<br>Evidence-first: conceptual graphics, PR-reported metrics and checked-out source must never be conflated.</footer>`}
// ─── Guided learning chapters (before Kernel Anatomy) ───
function sourceBadge(label,url){return `<a class="source-chip" href="${esc(url)}" target="_blank" rel="noopener noreferrer">依据：${esc(label)} ↗</a>`}
function chapter(num, question, claim, content, source=''){
  return `<section class="lesson-chapter" aria-label="${esc(question)}"><div class="lesson-index">${num} / 核心问题</div><h2>${question}</h2><p class="lesson-claim">${claim}</p>${content}${source?`<div class="chapter-sources">${source}</div>`:''}</section>`;
}
function lessonRoute(){return `<div class="lesson-route"><b>阅读路线 · 3 步</b><div class="route-steps"><span>① 认清输入与问题</span><span>② 跟着一个 CTA</span><span>③ 回头算成本和分流</span></div><p>这一页只建立输入与性能问题；执行细节、例外和数字会在同一组参数下逐步展开。</p></div>`}
function memoryDiagram(){return `<div class="teaching-figure" role="group" aria-label="DSv4.1 Sparse Decode 概念数据流与 Packed KV 字节构成"><div class="figure-head"><b>图 1 · 一个 Decode token 究竟读什么、算什么？</b><span>概念数据流 · 非硬件 Trace</span></div>
  <div class="dual-input-flow"><div class="input-stream"><div class="stream-tag">Query 分支</div><div class="op-node"><span>当前 Token</span><strong>Query q</strong><small>H_local × 512</small></div><div class="stream-to">q ────────────────→</div></div><div class="input-stream"><div class="stream-tag">KV 分支</div><div class="op-node"><span>检索结果</span><strong>Selected indices</strong><small>SWA + compressed top-k</small></div><div class="stream-to">↓</div><div class="op-node op-accent"><span>随机访存与解包</span><strong>Page gather + unpack</strong><small>Packed KV → K/V</small></div><div class="stream-to">K, V ─────────────→</div></div><div class="join-stream"><div class="op-node"><span>两路输入汇合</span><strong>QK → Softmax → PV</strong><small>输出每个真实 head</small></div><p>注意：Query 和 sparse indices 是注意力 Kernel 的两路输入，并非 Query 先变成 indices。本图省略上游 Indexer。</p></div></div>
  <div class="memory-slab"><div class="memory-annotation"><b>一个 KV token 的 Packed 总存储量（页内分区）</b><span>576B 数据行 + 单独 8B scale 行 · 仅针对本 Case</span></div><div class="memory-bar" aria-label="448 字节 FP8 noPE、128 字节 BF16 RoPE、8 字节 scale"><div class="mem-fp8" style="flex:448"><strong>448 B</strong><small>FP8 noPE</small></div><div class="mem-rope" style="flex:128"><strong>128 B</strong><small>BF16 RoPE</small></div></div><div class="memory-scale-row">独立 scale 区：每 token 8 B（7 个 64-d group 使用）</div><div class="memory-legend"><span>深绿：448B FP8</span><span>紫色：128B RoPE</span><span>金色：独立 scale 区 8B</span></div></div>
  <div class="figure-answer"><b>这张图要记住：</b> 计算 QK/PV 之前，必须先根据稀疏索引定位、Gather 并解包 KV。小 Batch 时，算力浪费和访存开销可能同时存在。</div></div>`}
function headBudget(){let h=S.heads, meaningful=Math.min(h,64),pct=Math.round(meaningful/64*1000)/10,vl=S.variant==='vllm';
 return `<div class="teaching-figure" role="group" aria-label="64-head 对照 Tile 与实际 head 数对比"><div class="figure-head"><b>图 2 · Head Padding 浪费在什么地方？</b><span>${vl?'SM90 WGMMA M 维 · PR 描述':'64-head 对照示意 · 不是 SGLang fast path'}</span></div>
 <div class="budget-label"><div><strong>${vl?'原先的 64-head 计算 Tile':'用于对照的 64-head Tile'}</strong><span>${h} 个本地 Head 与 64-head Tile 的形状差异</span></div><strong class="budget-ratio">${Math.min(100,pct)}% <small>head 槽位有效</small></strong></div>
 <div class="head-budget"><div class="head-used" style="width:${Math.min(100,pct)}%" title="${meaningful} real heads"></div><div class="head-pad" style="width:${Math.max(0,100-pct)}%" title="${64-meaningful} padded heads"></div></div>
 <div class="budget-legend"><span><i class="legend-dot used"></i>真实 ${meaningful} heads</span><span><i class="legend-dot padded"></i>补齐 ${64-meaningful} heads</span><span>有效槽位比 ${meaningful}/64</span></div>
 <div class="why-matters"><b>因果关系</b><p>${vl?'TP 切分后本地 Query Head 数减少，但原有 SM90 路径仍以 64-head 为计算粒度。':'这个 64-head 对照只说明 Small-head 的形状问题；SGLang SM100 fast path 将 16 个真实 head 放到 MMA N 轴。'} 这里的槽位比例不是整次 Decode 的耗时浪费率。</p></div>
 <div class="figure-answer"><b>这张图要记住：</b> 优化对象是 Head 方向的计算形状；要确认收益，还必须同时衡量 Gather/Dequant、KV Split、Softmax、Merge 的成本。</div></div>`}
function programGridRow(label,n,small=false){let k=Math.min(n,32);return `<div class="program-row"><span>${esc(label)}</span><div class="program-cells">${Array.from({length:k},(_,i)=>`<i title="Key split ${i+1}" class="${small?'prev-cell':'new-cell'}"></i>`).join('')}${n>32?`<em>+${n-32}</em>`:''}</div><b>${n} CTA</b></div>`}
function parallelDiagram(){let d=calc(),t=S.token,display=Math.min(t,3);return `<div class="teaching-figure"><div class="figure-head"><b>图 3 · 用 KV 方向的并行，换掉无效 Head 计算</b><span>CTA 数只是计算网格示意，不是实际 SM 驻留数</span></div><div class="program-compare"><div class="program-side"><div class="program-title"><b>${S.variant==='vllm'?'原有 FlashMLA 路径':'64-head 路径（参考示意）'}</b><span>${S.variant==='vllm'?'PR 描述：少 token 时约每 token 一个 CTA':'不推断 SGLang baseline 的真实 Grid'}</span></div><div class="program-row"><span>Query tokens</span><div class="program-cells">${S.variant==='vllm'?Array.from({length:Math.min(t,12)},()=>'<i class="prev-cell"></i>').join('')+(t>12?`<em>+${t-12}</em>`:''):''}</div><b>${S.variant==='vllm'?'≈'+t:'未建模'}</b></div><p class="grid-explain">${S.variant==='vllm'?'此处 CTA 数仅反映 vLLM PR 所述小批量情形。':'左侧是 Head Tile 形状对照；SGLang baseline 的真实 CTA 网格不在此模型中。'}</p></div><div class="program-vs">→</div><div class="program-side candidate"><div class="program-title"><b>${S.variant==='vllm'?'vLLM / Key-split':'SGLang / 64-token KV tiles'}</b><span>${d.ok?`T=${t} · 每 token ${d.splits} 个 split · 共 ${d.programs} CTA`:'超出当前快速路径条件'}</span></div>${d.ok?Array.from({length:display},(_,i)=>programGridRow('Token '+(i+1),d.splits)).join('')+(t>display?`<div class="remaining-row">其余 ${t-display} 个 token 同样划分</div>`:''):`<p class="grid-explain">当前参数触发 Fallback；新 Kernel 的网格不适用，请调整下方 Workload。</p>`}<p class="grid-explain">${S.variant==='vllm'?'一个 program 处理 (token, key-split)，以更窄的 head tile 计算，再合并 partial LSE。':'一个 CTA 处理一个 query × 64-token KV tile，MMA 的 N 轴容纳 16 个真实 Head，再合并 partial 结果。'}</p></div></div>
 <div class="merge-lane"><span>新增代价</span><strong>各 Split 写 FP32 partial</strong><span>→</span><strong>第二个 Merge Kernel</strong><span>→</span><strong>Output</strong></div>
 <div class="figure-answer"><b>这张图要记住：</b> 优化不是单纯“减少 padding”，而是把计算网格重新铺到 KV 方向，增加可并行 CTA；额外的 scratch + Merge 也会吞掉一部分收益。</div></div>`}
function costLedger(){return `<div class="teaching-figure"><div class="figure-head"><b>图 4 · 决定收益的不是单个 FLOPs 数字</b><span>仅列组成项，不虚构占比</span></div><div class="cost-track"><div><b>Gather / Dequant</b><small>随机页索引、FP8 scale、RoPE</small></div><span>+</span><div><b>MMA / Softmax</b><small>Head padding、布局与计算效率</small></div><span>+</span><div><b>Split / Scratch</b><small>并行度增加、FP32 partial 写回</small></div><span>+</span><div><b>Merge / Launch</b><small>LSE 归并、额外启动开销</small></div></div><div class="cost-conclusion"><b>待验证的拐点：</b> Token 多时，本来就有更多 CTA，过度 Split 可能使 Gather、Scratch、Merge 成为更大成本。真正的阈值应该来自同一硬件与 workload 下的 Benchmark。</div></div>`}
function lessonActions(next='evolution',label='进入设计演进'){return `<div class="lesson-next"><div><b>到这里，你应该能够解释：</b><p>为什么 Small-head 问题是 <em>特定模型 × TP × GPU × Decode workload</em> 的交叉产物？</p></div><button class="btn next-btn" data-go="${next}">${label} →</button></div>`}
function overview(){const a=S.case;return `<div class="guide-intro"><span>第一章 · 建立性能问题的心智模型</span><h2>从 Sparse Decode 的数据流，推导 Small-head 的性能空洞</h2><p>先建立当前实现的输入与执行主线：<b>${S.variant==='vllm'?`每 rank ${S.heads} 个真实 Head，原有 64-head 计算形状为何出现空槽？`:'16 个真实 Head 怎样映射到 SM100 的 MMA N 轴？'}</b></p></div>${lessonRoute()}
 ${chapter('01','Sparse Decode 究竟做哪些计算？','稀疏注意力并不是“只算少量 QK”——它还需要按索引 Gather、解包和参与 Softmax/PV。',memoryDiagram(),sourceBadge('PR 的 Cache Layout 与 load 函数',a.variants.vllm.pr_url))}
 ${chapter('02','Small-head 为什么会形成性能空洞？',S.variant==='vllm'?'关键不是模型总 Head 数，而是 TP 切分后每张 GPU 的真实 Head 数，与 SM90 计算 Tile 的 Head 粒度不匹配。':'用 64-head Tile 作形状对照；SGLang 的 SM100 路线把 16 个真实 head 放到 MMA N 轴。',headBudget(),sourceBadge('vLLM #59418 · Motivation',a.variants.vllm.pr_url))}
 ${lessonActions('anatomy','跟着一个 CTA 走完整流程')}${bottom()}`}
function modelLineage(){return `<div class="teaching-figure"><div class="figure-head"><b>模型语义是第一道边界：不能把每代 Sparse Attention 视为同一个算子</b><span>来自用户 Obsidian 笔记；细节需逐版本对照模型源码</span></div><div class="model-steps"><div><strong>V3 / MLA</strong><small>潜变量 KV 表示<br>作为后续技术基础</small></div><span>→</span><div><strong>V3.2 / DSA</strong><small>Indexer 选 KV<br>稀疏读写模式</small></div><span>→</span><div><strong>V4</strong><small>SWA + 压缩 / 检索<br>改变选取与缓存组织</small></div><span>→</span><div class="current"><strong>V4.1</strong><small>复用 / 压缩策略变化<br>本 Case 的具体输入契约</small></div></div><div class="figure-answer"><b>我们要沿着每一代检查的不是名字，而是：</b> Heads / Top-k / KV Layout / Position Index / Compression Ratio / Sink / dtype。接口只要变了，就不能随意复用旧 Kernel 的性能结论。</div></div>`}
function decisionFork(){const vllm=S.case.variants.vllm,sg=S.case.variants.sglang;return `<div class="teaching-figure"><div class="figure-head"><b>同一个 Small-head 痛点，为什么分出两条工程路线？</b><span>两个不同硬件平台；不是同机 A/B</span></div><div class="fork-origin"><strong>共同输入条件</strong><span>少量 Decode / Verify token + 每 rank 仅 8/16 heads + V4 packed KV + 64-head padding 的潜在浪费</span></div><div class="fork-stem"></div><div class="fork-columns"><div class="fork-arm"><div class="fork-title"><b>vLLM · SM90 / H20</b><span>PR #${vllm.pr} · ${esc(vllm.pr_state)}</span></div><div class="fork-step"><small>硬件约束</small><strong>WGMMA 的 Head-M 粒度 64</strong></div><div class="fork-step"><small>算法重构</small><strong>16-head Tile + Key Split</strong></div><div class="fork-step"><small>核心算子</small><strong>Triton tl.dot / mma.sync</strong></div><div class="fork-result">降低 Head padding，更多 CTA，partial LSE 归并</div></div><div class="fork-arm"><div class="fork-title"><b>SGLang · SM100/103 / GB300</b><span>PR #${sg.pr} · ${esc(sg.pr_state)}</span></div><div class="fork-step"><small>硬件机会</small><strong>MMA N 轴容纳真实 16-head</strong></div><div class="fork-step"><small>算法重构</small><strong>64-token KV Tile + Merge</strong></div><div class="fork-step"><small>核心算子</small><strong>Gluon tcgen05_mma</strong></div><div class="fork-result">Head-N 映射，BF16 high+residual PV，FP32 Merge</div></div></div><div class="figure-answer"><b>关键差异：</b> SM90 通过窄 Head Tile + Split 实现；SM100 利用新的 MMA 轴布局。两条路线可以相互借鉴性能假设，但不能直接移植指令或交叉比较延迟数字。</div></div>`}
function integrationFlow(){return `<div class="teaching-figure"><div class="figure-head"><b>从 Kernel 算法到 Serving，必须跨过三道门</b><span>实现契约而非额外的“功能列表”</span></div><div class="integration-flow"><div><strong>① Eligibility / Dispatch</strong><p>SM、H_local、dtype、T、page/cache layout，决定是否走 Fast Path；Prefill / 不支持配置走 fallback。</p></div><span>↓</span><div><strong>② Numerical Contract</strong><p>Sink、BF16 输出边界、Softmax/LSE 归并、stride、空行；浮点运算顺序可能改变。</p></div><span>↓</span><div><strong>③ Serving Lifecycle</strong><p>JIT 预热、CUDA Graph replay、Speculative Verification、动态 Metadata，决定线上是否可靠。</p></div></div><div class="figure-answer"><b>工程结论：</b> 一个更快的 Kernel 只是中间产物；能够稳定选中它并且不破坏数值契约，才算完成框架优化。</div></div>`}
function evolution(){const a=S.case;return `<div class="guide-intro"><span>第二章 · 追溯设计决策</span><h2>为什么会有两种 Small-head Decode 实现？</h2><p>不要把“模型更新”“硬件差异”“调优 PR”混成一条时间线。先确定算子契约，再看硬件如何约束策略，最后看框架如何把方案变成可上线的路径。</p></div>
 ${chapter('01','模型变化是否改变了 Kernel 的输入契约？','对比不同版本，应先确定 KV representation 和选取规则是否一致，而不是直接比较 Kernel 名称。',modelLineage(),sourceBadge('SGLang V4.1 Day-0 官方说明','https://lmsys.org/blog/2026-09-10-deepseek-v41/'))}
 ${chapter('02','为什么同一问题产生两条不同路线？','硬件指令能映射的矩阵轴与 Tile 形状不同，决定我们该如何在“Head”和“KV”两个方向组织并行。',decisionFork(),sourceBadge('vLLM PR',a.variants.vllm.pr_url)+sourceBadge('SGLang PR',a.variants.sglang.pr_url))}
 ${chapter('03','为什么不能只比较两个 Kernel 的核心循环？','真正进入推理框架还要满足分流、数值正确性、CUDA Graph 与编译预热约束。',integrationFlow(),sourceBadge('两个 PR 的 Test Plan 与 Dispatch 描述',v().pr_url))}
 ${chapter('04','两条路线的决策边界是什么？','比较相同问题的工程策略，而不是比较来自不同 GPU 的绝对吞吐率。',`<div class="compare-table"><table class="data-table"><thead><tr><th>决策点</th><th>vLLM / SM90</th><th>SGLang / SM100/103</th></tr></thead><tbody>${a.comparison.map(it=>`<tr><td>${esc(it.k)}</td><td>${esc(it.v)}</td><td>${esc(it.s)}</td></tr>`).join('')}</tbody></table></div><div class="source-warning"><b>版本校正</b><p>原 Canvas 中的「T≥8 就 Fallback」是早期摘要，不是 vLLM #59418 固定代码的条件。该 PR 的 Gate 是：max_keys≤256 时 T≤16；否则 T≤12。SGLang 的 <code>dsv4/</code> 路径名也不代表只用于旧 V4 模型。</p></div>`,sourceBadge('源码固定 SHA 的 Eligibility / Dispatch',v().pr_url))}
 <div class="lesson-next"><div><b>进入 Anatomy 前的检查点</b><p>你现在应该知道：为什么要换 MMA 的 Head 轴、为何需要 Key Split、什么时候 Merge 的成本可能更高，以及如何避免模型版本与缓存布局混淆。</p></div><button class="btn next-btn" data-go="anatomy">进入逐段源码讲解 →</button></div>${bottom()}`}

function evidence(){const x=v(),r=x.reported;return `${metrics()}${section('Reported performance','数据来自 PR 作者；本地未复测')}<div class="alert">${esc(r.environment)}<br>不同硬件/TP/框架、输入长度、DSpark 设置不同。这里只做「同 PR 下 baseline vs candidate」比较，不进行 vLLM 与 SGLang 的绝对速度横比。</div>${section(r.metric,'only within this experiment')}<div class="pane tablewrap"><table class="data-table"><thead><tr><th>Workload</th><th>Baseline</th><th>Candidate</th><th>Reported result</th></tr></thead><tbody>${r.rows.map(row=>`<tr><td>${esc(row.label)}</td><td>${row.before.toLocaleString()} ${esc(row.unit)}</td><td>${row.after.toLocaleString()} ${esc(row.unit)}</td><td>${esc(row.note)}</td></tr>`).join('')}</tbody></table><div class="smalldesc" style="padding:16px 0 0">Benchmark results quoted from <a href="${esc(x.pr_url)}" target="_blank" rel="noopener noreferrer">PR #${x.pr}</a>; not measured by this studio.</div></div>${section('Validation evidence','真实性、精度边界、Serving 生命周期')}<div class="two-cols"><div class="pane"><div class="smallcaps">NUMERICAL / CORRECTNESS</div><p class="text-body">${esc(r.accuracy)}</p></div><div class="pane"><div class="smallcaps">CUDA GRAPH / WARMUP</div><p class="text-body">${esc(r.warmup)}</p></div></div>${section('Profiling protocol (next phase)','未采样的数据不画成真实 Trace')}<div class="pane"><div class="listline"><b>Profile A: kernel microbenchmark</b><p>固定 SM / dtype / packed cache，按 T × (SWA, extra) × heads 扫描；记录 latency、资源使用、DRAM/L2 bytes、issue/warp active。</p></div><div class="listline"><b>Profile B: graph and startup</b><p>端到端 CUDA Graph replay 与 JIT 首次编译区分，校验动态 page IDs/length 变化是否生效。</p></div><div class="listline"><b>Profile C: matched accuracy</b><p>独立 FP64 reference、FP32 tolerance、BF16 输出边界、sink、空行、非连续 stride、sanitizer。</p></div></div>${bottom()}`}
function experiments(){const qs=S.case.hypotheses;return `${metrics()}${section('Learning lab','先预测，再看验证方法')}<div class="pane"><h2 style="margin-top:0">让 Agent 帮你形成可检验的性能直觉</h2><p class="text-body">每个问题背后都对应一个可以在真实 GPU 上做的消融实验。这里不自动提交 GPU 任务，不臆造测量数值。</p>${qs.map((it,i)=>`<div class="questionbox"><b>${String(i+1).padStart(2,'0')} / ${esc(it.q)}</b><p>先自己回答，再揭示解释。</p><button class="btn" data-reveal="${i}">${S.experiment===i?'收起解释':'Reveal reasoning'}</button>${S.experiment===i?`<p style="padding:10px;border-left:2px solid #5accb9">${esc(it.a)}</p>`:''}</div>`).join('')}</div>${section('Guided experiment plan','真正 GPU 采样属于下一阶段')}<div class="pane"><div class="listline"><b>实验 1：Key-split 参数</b><p>固定 input/TP/hardware，比较 S=8/16/32，记录 CTA occupancy、gather、partial scratch 和 merge 次数，验证不同 token 数下收益转折。</p></div><div class="listline"><b>实验 2：MMA Axis 与架构</b><p>研究 SM90 Head-M tiling 与 SM100 Head-N 的硬件约束，不在不同硬件上直接对比绝对数值。</p></div><div class="listline"><b>实验 3：数值补偿</b><p>SGLang 的 BF16 high + residual PV 与无补偿版本，对比 FP64 reference error、模型评测、latency。</p></div></div>${bottom()}`}
function render(persist=true){const x=v();document.title=`Kernel Studio · ${x.name}`;$('#primaryPr').href=x.pr_url;$('#routeTitle').textContent={overview:'WORKLOAD',evolution:'DESIGN EVOLUTION',anatomy:'KERNEL ANATOMY',evidence:'EVIDENCE',experiments:'LEARNING LAB'}[S.view];
 $$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===S.view));
 $$('#variantTabs button').forEach(b=>b.classList.toggle('chosen',b.dataset.variant===S.variant));
 let html={overview,evolution,anatomy,evidence,experiments}[S.view]();$('#view').innerHTML=html;bind();if(persist)saveState();}
function bind(){
 $$('#phase,#heads,#swa,#extra').forEach(el=>el.addEventListener('change',e=>{S[el.id]=el.id==='phase'?el.value:Number(el.value);S.inspectSplit=0;render()}));
 const tok=$('#tokens');
 if(tok)tok.addEventListener('input',e=>{S.token=Number(e.target.value);const lab=tok.closest('label')?.querySelector('.value');if(lab)lab.textContent=S.token});
 if(tok)tok.addEventListener('change',()=>render());
 $$('[data-stage]').forEach(b=>b.addEventListener('click',()=>{S.stage=Number(b.dataset.stage);render()}));
 const inspect=$('#inspect-token');
 if(inspect)inspect.addEventListener('change',e=>{S.inspectToken=Number(e.target.value);render()});
 $$('[data-inspect-split]').forEach(b=>b.addEventListener('click',()=>{S.inspectSplit=Number(b.dataset.inspectSplit);render()}));
 $$('[data-mma]').forEach(b=>b.addEventListener('click',()=>{S.mmaView=b.dataset.mma;render()}));
 $$('[data-go]').forEach(b=>b.addEventListener('click',()=>{S.view=b.dataset.go;window.scrollTo({top:0,behavior:'auto'});saveState(true);render()}));
 $$('[data-reveal]').forEach(b=>b.addEventListener('click',()=>{let id=Number(b.dataset.reveal);S.experiment=S.experiment===id?-1:id;render()}));
}
$$('#nav button').forEach(b=>b.addEventListener('click',()=>{S.view=b.dataset.view;window.scrollTo({top:0,behavior:'auto'});saveState(true);render()}));
$$('#variantTabs button').forEach(b=>b.addEventListener('click',()=>{S.variant=b.dataset.variant;S.stage=0;S.heads=16;S.inspectToken=0;S.inspectSplit=0;S.mmaView='qk';saveState(true);render()}));
window.addEventListener('popstate',()=>{if(S.case){restoreState();render(false)}});
window.addEventListener('hashchange',()=>{if(S.case){restoreState();render(false)}});
(async()=>{try{
 if(window.__KLA_CASE__){S.case=window.__KLA_CASE__;S.local=window.__KLA_LOCAL__||{};S.pinned=window.__KLA_PINNED__||{}}
 else{
  const r=await fetch('/case.json',{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);S.case=await r.json();
  try{const l=await fetch('/local-sources.json',{cache:'no-store'});if(l.ok)S.local=await l.json()}catch(e){}
  try{const p=await fetch('/pinned-sources.json',{cache:'no-store'});if(p.ok)S.pinned=await p.json()}catch(e){}
 }
 const anchor=S.case.walkthrough?.default_workload;
 if(anchor){S.variant=S.case.walkthrough.anchor_variant||S.variant;S.phase=anchor.phase;S.token=anchor.tokens;S.heads=anchor.heads;S.swa=anchor.swa_capacity;S.extra=anchor.extra_capacity;}
 restoreState();render();
}catch(e){$('#view').innerHTML=`<div class="alert">无法加载案例：${esc(e.message)}。请用 <code>python -m kernel_learning serve</code> 启动，而不是直接双击 index.html。</div>`}})();
