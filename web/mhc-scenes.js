/* Diagrams encode values, memory and dependencies. Geometry is not GPU time. */
window.drawMHCScene=(C,s,index,step)=>{
 if(['mega-map','mega-post','pipeline','mega-join'].includes(s.kind))return window.drawMegaMHCScene(C,s,step);
 const e=window.KernelReader.esc,w=C.teaching_v4.worked_ledger;
 const t=(x,y,value,cls='label',anchor='start')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${e(value)}</text>`;
 const types={'Preℓ':'REDUCE(route)','Collapse':'REDUCE(route)','RMSNorm → Fℓ':'Norm: REDUCE(H)+EW','Postℓ':'EW · broadcast','Combℓ [4,4]':'EW + REDUCE(i)','Post + Comb':'EW + REDUCE(i)','投影 + HC RMS':'MM + REDUCE(4H)','Pre / Post':'EW · affine / sigmoid','Comb':'REDUCE(row/col) + EW','Collapse → Norm':'REDUCE(i) → Norm(H)+EW','系数暂存 shared':'MOVE · CTA reuse','TMA IO':'MOVE · async copy','TMA IO · 搬运':'MOVE · async copy','UMMA · 矩阵乘':'MM · matrix engine','WG3 · 写回':'MOVE · store','Mix · 合并':'REDUCE(split) + EW','Post':'EW + REDUCE(i)','UMMA':'MM · matrix engine','WG3':'MOVE · store','Mix':'REDUCE(split) + EW','四路残差更新':'EW + REDUCE(i)','两列 FMA 点积':'EW(FMA) + REDUCE(h)','三列 FMA 点积':'EW(FMA) + REDUCE(h)','stats 流：系数预测':'MM + REDUCE + EW','join → Post':'SYNC → EW / REDUCE'};
 const b=(x,y,width,height,title,sub='',active=false)=>{const op=types[title];return `<rect x="${x}" y="${y}" width="${width}" height="${height}" class="box ${active?'focus':''}"/>${t(x+width/2,y+height/2-(op?18:sub?5:-5),title,'label','middle')}${sub?t(x+width/2,y+height/2+(op?6:22),sub,'tiny','middle'):''}${op?`<text x="${x+width/2}" y="${y+height/2+28}" text-anchor="middle" style="font:11px Consolas,monospace;fill:#a8552e">${e(op)}</text>`:''}`;};
 const edge=(d,cls='')=>`<path d="${d}" class="edge ${cls}"/>`;
 const note=(x,y,value)=>t(x,y,value,'muted');let v='',height=455;
 if(s.kind==='routes'){
  v=note(30,40,'旧状态 Rℓ [T,4,H]')+note(800,40,'新状态 Rℓ+1 [T,4,H]');
  ['#ba7354','#8e9b85','#9d8a75','#7d939a'].forEach((color,i)=>{let y=94+i*49;v+=`<path d="M35 ${y} H215 M830 ${y} H1015" stroke="${color}" stroke-width="5"/>`+t(45,y-13,`R${i}`,'tiny')+t(970,y-13,`R′${i}`,'tiny');});
  v+=`<path d="M215 94 V241 M830 94 V241" stroke="#b4a494" fill="none" stroke-width="1.5"/>`+b(250,110,130,78,'Collapse','Preℓ · Rℓ → H',step===0)+edge('M215 165 H248')+b(425,110,180,78,'RMSNorm → Fℓ','Attention / FFN',step===1)+edge('M382 149 H423')+b(650,110,125,78,'Postℓ','H → 4 路',step===2)+edge('M607 149 H648')+b(425,280,180,70,'Combℓ [4,4]','旧路 i → 新路 j',step===2)+edge('M215 165 V315 H423','dashed')+edge('M777 149 H810 V242 H830')+edge('M607 315 H810 V242 H830','dashed')+`<circle cx="810" cy="242" r="13" fill="#faf7f2" stroke="#a8552e"/>`+t(810,248,'+','label','middle')+note(250,230,'子层 F 处理的宽度仍是 H')+note(425,398,'每条新路 = 分发的子层输出 + 跨路混合的旧状态');
 }else if(s.kind==='dag'){
  const shifted=s.mode==='shifted';
  v=b(28,140,160,80,'Post + Comb','xℓ、Rℓ → R′',step===0)+edge('M190 180 H243')+b(245,140,210,80,'投影 + HC RMS','4H → 24 logits',step===1)+edge('M457 180 H500 V80 H548')+edge('M500 180 V300 H548')+b(550,42,198,76,'Pre / Post','4 + 4 个输出',step===2)+b(550,263,198,76,'Comb','16 → Sinkhorn',step===2)+b(810,177,225,82,'Collapse → Norm',shifted?'用携入旧 Pre':'用本次新 Pre',step===3)+edge('M188 215 V389 H905 V261','dashed')+note(208,378,'BF16 R′：Collapse 需要的另一路输入');
  if(!shifted)v+=edge('M750 80 H922 V175')+note(808,134,'本次新 Pre');
  else v+=b(810,44,225,62,'携入旧 Pre','来自上一接缝')+edge('M922 108 V175')+note(550,156,'本次新 Pre → 保存至下一接缝');
  v+=note(30,430,'Pre/Post 与 Comb 是并列输出；sigmoid 不产生 Sinkhorn 的输入。');
 }else if(s.kind==='sinkhorn'){
  const toy=C.teaching_v2.sinkhorn_example;
  const matrices=[toy.input,toy.row_normalized,toy.column_normalized];
  ['正矩阵 A','按行归一化','再按列归一化'].forEach((name,i)=>{const x=25+i*355;v+=b(x,45,280,310,'','',step===i)+t(x+140,84,name,'label','middle');matrices[i].flat().forEach((n,j)=>{const a=x+60+(j%2)*100,y=140+Math.floor(j/2)*70;v+=`<rect x="${a-15}" y="${y-28}" width="90" height="57" rx="4" fill="${step===i?'#efd0bc':'#f2e6da'}" stroke="#cfbaaa"/>`+t(a+30,y+8,n,'number','middle').replace('class="number"','style="font:27px Georgia,serif"');});if(i<2)v+=edge(`M${x+288} 195 H${x+345}`);});
  v+=t(165,309,'行和 3、4','muted','middle')+t(520,309,'行和均为 1','muted','middle')+t(875,309,'列和均为 1','muted','middle')+note(375,387,'列和：11/12、13/12')+note(725,387,'行和：148/143、138/143')+note(25,433,'两路正矩阵手算，省略初始 softmax 与 ε；实际 kernel 是 4×4。');
 }else if(s.kind==='fma'){
  const N=s.fmaN||2,S=s.fmaS||8,Hs=s.fmaH||512,I=s.fmaIters||2,tiles=24/N,cols=Array.from({length:N},(_,i)=>N*s.fmaTile+i);
  if(s.fmaView==='data'){
  v=note(25,25,`CTA (${s.fmaToken},${s.fmaTile},${s.fmaSplit})：输出 ${cols.join('/')}；hidden ${Hs*s.fmaSplit}…${Hs*s.fmaSplit+Hs-1}`)+b(25,135,235,82,'读取 R、x',`不同 BF16：4×${Hs}+${Hs}`,step===0)+b(315,45,240,65,'系数暂存 shared','Post[4]/Comb[4,4] → local',step===0)+edge('M262 176 H313')+edge('M435 112 V134')+b(315,136,240,82,'四路残差更新','new_r 留在本 CTA',step===1)+edge('M435 220 V279')+b(315,281,240,82,N===2?'两列 FMA 点积':'三列 FMA 点积','warp / shared 归约',step===2)+b(25,281,235,82,'读取对应 Fn',`不同 FP32：${N}×4×${Hs}`,step===2)+edge('M262 322 H313')+b(750,136,280,82,s.fmaTile===0?'写 BF16 R′':'不写 R′',s.fmaTile===0?'本 CTA 是 tile 0':'交给列 tile 0',step===3)+edge('M557 177 H748')+b(750,281,280,82,'写 FP32 partial',s.fmaTile===0?'投影 + 平方和':`只写本 ${N} 列投影`,step===3)+edge('M557 322 H748')+note(25,419,`256 threads / CTA · 每线程 ${I} 个 hidden 坐标 · 列 tile 之间重算 Post`);

  }else{
   height=640;const token=s.fmaToken,tile=s.fmaTile,split=s.fmaSplit,thread=s.fmaThread,warp=Math.floor(thread/32),lane=thread%32,h0=split*Hs;
   v=note(20,30,`Grid = ${s.fmaT} token × ${tiles} 列 tile × ${S} split = ${s.fmaT*tiles*S} CTA`)+note(20,66,`展开 token ${token} 的 ${tiles*S} 项任务`)+t(85,94,'输出列 tile →','tiny');
   for(let j=0;j<tiles;j++){v+=t(95+j*23,113,j,'tiny','middle');for(let r=0;r<S;r++){const selected=j===tile&&r===split;v+=`<rect x="${85+j*23}" y="${126+r*25}" width="19" height="20" rx="2" data-fma-pick="${j},${r}" role="button" tabindex="0" aria-label="选择列 tile ${j} split ${r}" fill="${selected?'#bb7453':'#efdfd0'}" stroke="${selected?'#a8552e':'#d4bda9'}"/>`;}}
   for(let r=0;r<S;r++)v+=t(63,141+r*25,r,'tiny','middle');
   v+=note(20,348,`行：hidden split 0…${S-1}`)+note(20,376,'一个格子是一项 CTA 工作，不是 SM')+edge('M365 220 H415');
   v+=`<rect x="425" y="55" width="610" height="175" class="box ${step===0?'focus':''}"/>`+t(445,86,`CTA (${token},${tile},${split})：256 threads = 8 warps`);
   for(let j=0;j<8;j++)v+=`<rect x="${445+j*72}" y="112" width="65" height="48" rx="4" fill="${j===warp?'#efd0bc':'#f6ece2'}" stroke="${j===warp?'#a8552e':'#d7c8bc'}"/>`+t(477+j*72,141,`W${j}`,'label','middle');
   v+=note(445,190,'warp w：thread 32w…32w+31')+note(445,215,'每线程都处理四路；8 warp 不是分别分给四路')+edge('M730 232 V267');
   v+=`<rect x="425" y="270" width="610" height="135" class="box ${step===1?'focus':''}"/>`+t(445,299,`thread ${thread} = warp ${warp} / lane ${lane}`)+note(445,330,`${I} 轮负责 h=${Array.from({length:I},(_,i)=>h0+256*i+thread).join('/')}`)+note(445,358,`new_r[4] → local acc[${Array.from({length:N},(_,i)=>i).join('/')}] → 列 ${cols.join('/')}`)+note(445,385,'同线程 local 值复用；不是 shared 中共享 R′');
   v+=edge('M730 407 V427 H250 V479')+note(425,452,'各 warp 先汇总 32 lane，lane 0 写 shared 一行');
   v+=t(30,437,`shared：s_warp[8,${N+1}]`,'label');
   for(let r=0;r<8;r++){v+=t(33,479+r*15,`W${r}`,'tiny');for(let j=0;j<N+1;j++)v+=`<rect x="${80+j*38}" y="${465+r*15}" width="35" height="13" fill="${r===warp?'#e5b89b':'#f2e5d9'}" stroke="#d7c8bc"/>`;}
   v+=Array.from({length:N+1},(_,i)=>t(97+i*38,458,i===N?(tile===0?'Q':'—'):String.fromCharCode(65+i),'tiny','middle')).join('')+note(30,615,N===2?'A/B：投影；Q：平方和':'A/B/C：投影；Q：平方和');
   v+=edge('M225 521 H337')+b(340,480,320,90,'warp 0 跨 8 行求和',N===2?'lane 0 → A；lane 1 → B':'lane 0/1/2 → A/B/C',step===2)+edge('M662 525 H716')+b(719,480,315,90,'写 global partial',`split ${split} / token ${token} / 列 ${cols.join(',')}`,step===3)+note(340,615,'tile 0 的 warp 0 / lane 0 另合并 Q；读 shared 前做 CTA barrier');
  }
 }else if(s.kind==='work'){
  const rows=[['Post：数学上一次',w.post_once_flops,'#81928a'],['Post：12 列 tile 的总量',w.post_repeated_flops,'#bb7453'],['投影：有效 GEMM',w.projection_flops,'#b29b83']];
  rows.forEach(([label,n,color],i)=>{let y=85+i*108;v+=t(25,y-17,label)+`<rect x="25" y="${y}" width="${n/w.post_repeated_flops*690}" height="30" rx="3" fill="${color}" opacity="${step===i?1:.6}"/>`+t(770,y+27,num(n),'number');});
  v+=note(25,415,'乘法计 1、FMA 计 2：条长只表示源码表达式 FLOP，不表示运行时间。');
 }else if(s.kind==='fusion'){
  height=520;
  ['Post','投影 partial','HC RMS','系数 / Sinkhorn','Collapse','Norm'].forEach((name,i)=>v+=t(205+i*137,35,name,'tiny','middle'));
  v+=t(18,106,'vLLM')+note(18,133,'V4 小 T')+t(18,248,'SGLang')+note(18,275,'V4 小 T')+t(18,388,'Mega')+note(18,415,'Normal API');
  v+=`<rect x="137" y="68" width="264" height="95" rx="7" fill="#efd0bc" stroke="#b88d72"/><rect x="417" y="68" width="404" height="95" rx="7" fill="#f4e9df" stroke="#b88d72"/>`+t(270,106,'Launch 1 · producer','label','middle')+t(619,106,'Launch 2 · big_fuse','label','middle')+t(270,137,'局部 FP32 R′ 投影','tiny','middle')+t(619,137,'合并 split → 系数 → Collapse','tiny','middle')+b(833,68,125,95,'Norm','wrapper 外');
  v+=`<rect x="137" y="208" width="264" height="95" rx="7" fill="#efd0bc" stroke="#b88d72"/><rect x="417" y="208" width="541" height="95" rx="7" fill="#f4e9df" stroke="#b88d72"/>`+t(270,246,'Launch 1 · producer','label','middle')+t(690,246,'Launch 2 · big_fuse','label','middle')+t(270,277,'BF16 舍入后投影','tiny','middle')+t(690,277,'Collapse 后可并入 Norm','tiny','middle');
  v+=`<rect x="137" y="348" width="821" height="95" rx="7" fill="#f0ddca" stroke="#a8552e" stroke-width="1.8"/>`+t(547,387,'一次 persistent launch · producer + Mix / Norm','label','middle')+t(547,418,'BF16 R′ / global split scratch / 跨 CTA barrier 仍保留','tiny','middle')+note(137,490,'外框表示 launch 覆盖；并列分支与依赖关系以算子图为准。');
 }else if(s.kind==='overlap'){
  v=b(25,173,140,80,'Rℓ','同一已就绪状态',step===0)+edge('M167 213 H212 V100 H258')+edge('M212 213 V314 H258')+b(260,55,340,90,'主流：Collapse → Fℓ','携入 Pre；子层 / collective',step===1)+b(260,270,340,90,'stats 流：系数预测','投影 / HC RMS → 新系数',step===1)+edge('M602 100 H740 V220')+edge('M602 314 H740 V220')+b(778,180,235,85,'join → Post','xℓ + 所需新系数 + Rℓ',step===2)+`<circle cx="740" cy="220" r="6" fill="#a8552e"/>`+edge('M740 220 H776')+note(655,147,'xℓ 就绪')+note(640,354,'系数就绪；Post 前等待')+note(25,425,'caller 的 Rℓ 分支视角；不同于前面 Postℓ 完成后预测下一接缝系数的视角。');
 }
 function num(n){return Number(n).toLocaleString('en-US');}
 return `<p class="scene-scroll-hint">概念关系图 · <span class="diagram-pan-hint">← 左右滑动查看全图 · </span>线条表示数据与同步关系</p><svg viewBox="0 0 1060 ${height}" role="img" aria-label="${e(s.question)}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#9a8d80"/></marker></defs>${v}</svg>`;
};
