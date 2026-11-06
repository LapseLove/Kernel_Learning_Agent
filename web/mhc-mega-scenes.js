/* Architecture and buffer snapshots from pinned source; geometry does not encode time. */
window.drawMegaMHCScene=(C,s,k)=>{
 const e=window.KernelReader.esc,m=C.mega_walkthrough,S=s.split,T=m.tokens;
 const shifted=s.megaMode==='shifted',task=s.megaTask,blocks=64/S,block=s.megaBlock;
 const line='#cfbbaa',paper='#fbf7f1',soft='#f5e9dc',peach='#edcab2',sage='#dde2d5';
 let v='',height=610;
 const text=(x,y,z,cls='label',anchor='start')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${e(z)}</text>`;
 const note=(x,y,z)=>text(x,y,z,'muted');
 const rect=(x,y,w,h,fill=soft,stroke=line)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${stroke}"/>`;
 const box=(x,y,w,h,title,lines=[],fill=soft)=>rect(x,y,w,h,fill)+text(x+16,y+28,title)+lines.map((z,i)=>text(x+16,y+54+i*23,z,'tiny')).join('');
 const edge=(d,dashed=false)=>`<path d="${d}" class="edge${dashed?' dashed':''}"/>`;
 if(s.kind==='mega-map'){
  height=615;
  v=box(20,20,240,133,'一个 token block',['T=4：有效行 0…3','tile：64 行 × 每路 H4096','全 H 有 64 个 K block']);
  v+=edge('M262 87 H295')+text(278,71,'划分','tiny','middle')+box(298,20,335,133,`${S} 个 producer task`,[`task = (m-block 0, split 0…${S-1})`,`每 task ${blocks} 个 64-hidden block`,'每个 task 产出一份 [64,24] partial']);
  v+=edge('M635 87 H670')+text(652,71,'领取','tiny','middle')+box(673,20,365,133,'一次 launch：132 CTA × 768 threads',['CTA c 领取 c、c+132、c+264…',`选中 task ${task} → CTA ${task}`,'T4 本例每个 producer CTA 至多一项任务']);
  v+=note(20,190,`下面放大 CTA ${task}：6 WG × 4 warp × 32 thread；WG 是 128 线程工作组`);
  v+=`<rect x="20" y="214" width="1018" height="265" rx="8" fill="none" stroke="#a8552e" stroke-width="1.5"/>`;
  const roles=[
   ['WG0 · 控制 / UMMA',['W0 搬 R/x；W1 搬 Fn','W2 发矩阵乘；W3 系数 / store']],
   ['WG1 · Post worker 0',['8-hidden atom 0/2/4/6',shifted?'结束后 → Shifted Norm 队列':'四路更新 + A + 平方和']],
   ['WG2 · Post worker 1',['8-hidden atom 1/3/5/7',shifted?'结束后 → Shifted Norm 队列':'四路更新 + A + 平方和']],
   ['WG3 · partial 写回',['TMEM accumulator → global','合并 HC stats，发布 Mix arrival']],
   [shifted?'WG4 · Mix':'WG4 · Normal worker',shifted?['4 warp：每 warp 一个 token','等 Mix barrier → 新系数']:['立即进入，可等待 split','一个 WG：Mix → Collapse → Norm']],
   [shifted?'WG5 · Norm':'WG5 · Normal worker',shifted?['立即进入 Norm 队列，可等待','等 X1 / 平方和 → 输出']:['立即进入，可等待 split','一个 WG：Mix → Collapse → Norm']]
  ];
  roles.forEach(([title,lines],i)=>{const x=38+(i%3)*335,y=232+Math.floor(i/3)*123;v+=box(x,y,316,105,title,lines,i<4?soft:sage);});
  v+=edge('M510 480 V512')+box(160,515,720,77,shifted?'Shifted：退休的 WG1/2 加入 Norm；WG4 独立生成系数':'Normal：WG0–3 各自结束后，也加入同一消费池',[shifted?'Norm 不等本次新 Pre；Mix 与 Norm 是两个独立同步域':'WG 内独立同步；不等全部 producer 退休，也不是 WG4 → WG5 串接'],sage);
 }else if(s.kind==='mega-post'){
  height=665;
  const worker=s.megaWG-1,lane=s.megaLane,warp=s.megaWarp,atom=s.megaAtom;
  const r0=warp*16+Math.floor(lane/4),r1=r0+8,hbase=(task*blocks+block)*64,h0=hbase+atom*8+2*(lane%4);
  v=note(20,25,`task ${task} / split ${task} / 本 split 第 ${block} 个 K block：全局 hidden ${hbase}…${hbase+63}`);
  v+=text(20,63,'一个 64 行 × 64 hidden 的块');
  for(let a=0;a<8;a++)v+=text(93+a*49,91,`a${a}`,'tiny','middle');
  for(let w=0;w<4;w++){
   v+=text(20,123+w*31,`W${w}`,'tiny');
   for(let a=0;a<8;a++)v+=rect(70+a*49,103+w*31,45,26,w===warp&&a===atom?peach:a%2?sage:soft,w===warp&&a===atom?'#a8552e':line);
  }
  v+=note(20,254,'列：每路 8-hidden atom；行：warp 的16个行槽位');
  v+=box(525,48,513,195,`WG${s.megaWG} / warp ${warp} / lane ${lane}`,[`全 CTA warp ${s.megaWG*4+warp}；thread ${s.megaWG*128+warp*32+lane}`,`行 = 16×${warp} + floor(${lane}/4)，以及 +8`,`行 ${r0}${r0<T?'（有效）':'（填充）'} / ${r1}${r1<T?'（有效）':'（填充）'}`,`atom ${atom}：全局 h=${h0}/${h0+1}；每坐标更新四路`],paper);
  v+=box(20,302,370,112,'① Post / Comb：EW + REDUCE(route)',['shared R/x + register 中的旧系数','每 h：4 乘法 + 16 FMA = 36 FLOP','R̂j = Postj · x + Σi Combᵢⱼ · Rᵢ']);
  v+=edge('M392 355 H438')+box(441,311,178,94,'② 舍入 BF16',['R′ = BF16(R̂)','共同数值边界'],peach);
  v+=edge('M621 355 H670')+box(673,302,365,112,'③ TMEM A → UMMA：MM',['将 R′ 转回 FP32 表示写入 A','一个 atom：64 行 × 4 路 × 8 hidden','配 shared Fn → 累加全部24列'],sage);
  v+=edge('M530 407 V463 H280 V489')+box(20,492,506,98,'另一路：shared BF16 R′ → global',['WG0 的 warp3 等 store_ready，再 TMA store','仍保留给下一层；Normal consumer 也会重读']);
  v+=edge('M530 407 V463 H796 V489')+box(550,492,488,98,shifted?'统计 + 携入 Pre 的 Collapse':'统计：HC 平方和 REDUCE(4H)',shifted?['同一 BF16 R′ 计算 X1 = BF16(Σ Pre旧 · R′)','X1 写 global；平方和 partial 供独立 Norm']:['由舍入后的 R′ 平方，先留在线程 local','split 结束 → shared → WG3 写 HC partial']);
  v+=note(20,637,`WG${s.megaWG} 是 worker ${worker}：做${worker?'奇':'偶'}数 atom；Fn 的24列共同复用 A，不为12个列 tile 重算 Post。`);
 }else if(s.kind==='pipeline'){
  height=590;const st=Object.fromEntries(Object.entries(m.pipeline_states[k]).map(([key,z])=>[key,typeof z==='string'?z.replaceAll('K0',`K${block}`):z]));
  v=note(20,28,k===4?'省略剩余 atom / K block，跳至整个 task 尾部；状态快照不表示执行时间':`沿用 task ${task} / K${block}，放大 a0…a7；这是合法状态快照，不是执行时间轴`);
  v+=box(20,59,310,105,'shared IO · 4 槽',[st.io,'释放：WG0 / warp3 store worker']);
  v+=box(20,185,310,105,'shared Fn · 2 槽',[st.fn,'每槽覆盖整个 64-hidden block'],sage);
  v+=edge('M332 107 H368')+box(371,59,667,105,'两组 Post → TMEM A · 4 槽',['WG1：a0/a2/a4/a6；WG2：a1/a3/a5/a7','槽 = atom mod 4；每槽是 64行 × 四路 × 8hidden'],paper);
  st.a.forEach((status,i)=>{const x=371+i*169,fill=status.includes('就绪')?peach:status.includes('释放')?sage:paper;v+=box(x,185,160,88,`A${i}`,[status],fill);});
  v+=edge('M705 166 V182')+edge('M332 236 H347 V341 H368')+edge('M705 276 V307');
  v+=box(371,310,667,94,'WG0 / warp2：UMMA',[st.mma,'等 full_fn + full_a；按 atom、route 固定顺序累加'],k===2||k===3?sage:soft);
  v+=edge('M1038 356 H1050 V295 H450 V276',true)+text(1040,287,k===2?'a0 消费完成 → empty_a[0]':'empty_a：消费后释放槽','tiny','end');
  v+=edge('M705 406 V441')+box(371,444,667,114,'TMEM accumulator · 2 槽 → WG3 → global partial',[`task 的 ${blocks} 个 K block 累加到同一份 [64,24]`,'整个 task 完成才 full_accum；WG3 读出后 empty_accum','R′ store / IO release 是另一条链，不由 empty_a 代替']);
  v+=box(20,444,310,114,'跨 K block 的机会',[S===16?'S16：K0→K1→K2→K3':'S64：本 task 只有 K0',S===16?'不同槽可搬下一块 / 算当前块':'没有本 task 的下一 K block','能否隐藏耗时需要 GPU trace']);
 }else if(s.kind==='mega-join'){
  height=shifted?600:575;
  if(!shifted){
   v=box(20,30,300,116,'全部 split 的两个交付',['① GEMM partial + HC 平方和','② BF16 R′ 的 TMA store 完成',`每个 split 满足后，计数达到 S=${S}`]);
   v+=edge('M322 88 H365')+box(368,30,670,116,'Mix barrier：global release → acquire',['WG3 的4个 warp + store worker 共5个本地 arrival，再代表本 split 发布','消费者等同一 token block 全部 split；不是跨 CTA 的 __syncthreads()'],sage);
   v+=edge('M705 148 V190')+box(368,193,670,114,'一个 Normal WG 领取一个 token',['warp0：REDUCE(split) → HC RMS → affine / sigmoid / Sinkhorn','lane 0…3 新 Pre；4…7 新 Post；8…23 Comb','Pre 经 shared + WG barrier 广播；新 Post/Comb 写 global']);
   v+=box(20,339,300,110,'global BF16 R′ [T,4,H]',['Normal 必须重读四路 R′','缓存提示不保证全部命中']);
   v+=edge('M322 390 H365')+edge('M705 309 V338')+box(368,341,670,108,'同一 WG 的4个 warp：Collapse → RMSNorm',['新 Pre 加权四路 → BF16 X1（寄存器）→ H 轴平方和归约','读 H 个 Norm 权重，写下一输入 y[T,H]；可选 FP8 + scale']);
   v+=note(20,508,'WG4/5 立即进池；WG0–3 各自完成静态角色后加入。T4 只有 CTA0…3 各有一个有效 token。');
   v+=note(20,543,'每 CTA 的 WG 竞争 ticket，不能指定哪个 WG 必然拿到 token。Normal 不物化 global X1。');
  }else{
   v=box(20,25,1018,74,'Shifted 的分叉点：Post 已拥有携入的旧 Pre',['当前 X1 不依赖本次生成的新 Pre；下面两条链各等自己的数据'],peach);
   v+=box(20,144,486,102,'WG3：GEMM partial + HC 平方和',['本地4个 epilogue warp 到齐 → Mix arrival',`等全部 S=${S} 个 split 的 Mix barrier`]);
   v+=box(552,144,486,102,'Post + store worker：X1 与平方和',['携入 Pre × R′ → BF16 X1 写 global','store wait + X1 平方和写完 → Norm arrival']);
   v+=edge('M263 248 V286')+box(20,289,486,113,'WG4：一个 warp 处理一个 token',['REDUCE(split) → HC RMS → 新系数 / Sinkhorn','新 Pre[4]、Post[4]、Comb[4,4] → global','本次新 Pre 保存至下一接缝'],sage);
   v+=edge('M795 248 V286')+box(552,289,486,113,'WG5 + 退休的 WG1/2：Norm 队列',[`等 S=${S} 个 split 的独立 Norm barrier`,'重读 BF16 X1、Norm 权重和平方和 partial','不等待本次 Mix / 新 Pre'],sage);
   v+=edge('M263 404 V445')+box(20,448,486,80,'交给下一次接缝的状态',['R′ + 新 Pre / Post / Comb']);
   v+=edge('M795 404 V445')+box(552,448,486,80,'当前下一子层输入 y[T,H]',['BF16 / 可选 FP8 与 scale factor']);
   v+=note(20,574,'两条链允许独立推进；WG0、WG3、WG4 不加入 Shifted Norm。是否 overlap 仍需实测。');
  }
 }
 return `<p class="scene-scroll-hint">源码结构图 · <span class="diagram-pan-hint">← 左右滑动查看全图 · </span>${s.kind==='mega-map'?'上层箭头：任务划分/领取；下层：角色接力':'实线：数据/依赖；虚线：槽位释放'}；布局不表示耗时</p><svg viewBox="0 0 1060 ${height}" role="img" aria-label="${e(s.question)}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#9a8d80"/></marker></defs>${v}</svg>`;
};
