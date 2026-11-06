/* Rendered from the knowledge-workflow Case and pinned source map. */
(() => {
 'use strict';
 const {case:lesson,sources:manifest}=window.__PR_HISTORY__;
 const esc=KernelReader.esc;
 const $=s=>document.querySelector(s);
 const sourceById=id=>manifest.sources.find(s=>s.id===id);
 const pinned=(path,line)=>`https://github.com/${lesson.repository}/blob/${lesson.commit}/${path}${line?`#L${line}`:''}`;
 const steps=lesson.maintenance_steps;
 $('.stage-tabs').innerHTML=steps.map((s,i)=>`<button data-step="${i}" aria-pressed="false"><span>0${i+1}</span>${esc(s.title)}</button>`).join('');
 KernelReader.mountFigure($('#maintenance-figure'),{
  scene:{id:'maintenance',steps:steps.map(s=>({title:s.title,body:s.body}))},
  draw:(_,i)=>{
   document.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.step===i)));
   $('#maintenance-risk').textContent=steps[i].risk;
   const s=steps[i];
   return `<div class="process-flow" aria-label="第 ${i+1} 阶段：${esc(s.input)}，经${esc(s.operation)}，得到${esc(s.output)}"><div><small>INPUT / 输入</small><b>${esc(s.input)}</b></div><i aria-hidden="true">→</i><div class="process-action"><small>TRANSFORM / 加工</small><b>${esc(s.operation)}</b></div><i aria-hidden="true">→</i><div><small>OUTPUT / 输出</small><b>${esc(s.output)}</b></div></div>`;
  },
  source:(_,i)=>`<span>逻辑加工步骤 · 无时间编码</span><button data-source="${steps[i].source}">固定源码：${esc(sourceById(steps[i].source).title)} ↗</button>`
 });
 document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{
  history.replaceState(null,'',`#maintenance-step-${+b.dataset.step+1}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
 });
 const renderQuery=()=>{
  const fw=$('#framework').value,term=$('#topic').value,sample=manifest.query_samples[fw];
  $('#query-command').textContent=`python scripts/query.py --framework ${fw} --model qwen3-core --lang zh "${term}"`;
  $('#query-path').textContent=sample.path.replace('model-pr-optimization-history/','');
  $('#query-path').href=pinned(sample.path);
  $('#query-matches').innerHTML=sample.topics[term].map(m=>{
   const parts=m.text.split('|').map(x=>x.trim());
   const isTimeline=/^\d{4}-\d{2}-\d{2}$/.test(parts[1]||'');
   const title=isTimeline?parts[4]:m.text.startsWith('|')?(parts[1]||m.text).replace(/`/g,''):m.text.replace(/^###\s*/, '');
   const meta=isTimeline?`${parts[1]} · PR ${parts[2].match(/#\d+/)?.[0]||''} · 档案标记 ${parts[3]}`:m.text.startsWith('|')?'模型实现文件覆盖中的引用':'PR 卡片标题';
   return `<article class="match-line"><a href="${pinned(sample.path,m.line)}" target="_blank" rel="noreferrer" aria-label="查看原文第 ${m.line} 行">L${m.line}</a><div><b class="match-title">${esc(title)}</b><small class="match-meta">${esc(meta)}</small><details><summary>原始匹配行</summary><pre>${esc(m.text)}${m.text.length===220?'…':''}</pre></details></div></article>`;
  }).join('');
 };
 $('#framework').addEventListener('change',renderQuery);$('#topic').addEventListener('change',renderQuery);renderQuery();
 const proofTypes=[['merged','该 PR 在核实的提交上已合入'],['source','已查明目标版本的分支与适用条件'],['trace','该目标请求实际执行了候选路径'],['numeric','已记录所测输入范围内的数值结果'],['perf','已记录同口径负载下的性能比较']];
 const renderProof=()=>{
  const state=Object.fromEntries(proofTypes.map(([id])=>[id,$(`#proof-${id}`).checked]));
  $('#proof-claims').innerHTML=proofTypes.map(([id,text])=>`<div class="proof-row ${state[id]?'supported':''}"><span class="proof-state">${state[id]?'有对应证据':'尚缺证据'}</span><span>${esc(text)}</span></div>`).join('');
  let message='先选一份证据，看看它支持哪条结论。不同证据之间没有自动推导关系。';
  if(state.merged)message='已合入可以说明代码进入某个版本。当前请求是否调用它、结果是否正确、是否更快，仍需分别验证。';
  if(state.source)message='源码给出路径的资格条件；要知道某个真实请求实际走了哪条路，继续核对运行 trace。';
  if(state.trace)message='trace 证明所观察请求的路径命中。正确性和收益仍要在对应输入与测量条件下确认。';
  if(state.numeric||state.perf)message='数值与性能记录各有自己的输入和环境边界。将它们与同一目标版本、同一候选路径对应后，才能合并解释。';
  if(state.source&&state.trace&&state.numeric&&state.perf)message='现在可以报告该版本、该负载的路径、数值与性能结果。是否更快、改善多少，以原始数据为准；结论不自动扩展到其他负载。';
  $('#proof-verdict').textContent=message;
 };
 proofTypes.forEach(([id])=>$(`#proof-${id}`).onchange=renderProof);
 $('#reset-evidence').onclick=()=>{proofTypes.forEach(([id])=>$(`#proof-${id}`).checked=false);renderProof();};renderProof();
 $('#experiments').innerHTML=lesson.experiments.map(e=>`<article class="experiment-row"><h3>${esc(e.title)}</h3><div><small>待验证的假设</small><p>${esc(e.hypothesis)}</p><p class="falsifier">反例：${esc(e.falsifier)}</p></div><div><small>如何获得证据</small><p>${esc(e.method)}</p></div></article>`).join('');
 $('#notes').value=`# Model PR history · 本次证据笔记\n\n知识库 SHA：${lesson.commit}\n目标框架 / 模型族：\n目标源码 SHA：\n推理阶段 / shape / dtype / 并行：\n\n## 读过的档案与关键 PR\n- 路径、行号、PR 状态、审阅 SHA：\n\n## 这份证据改变了哪个决定\n- 发现：\n- 当前判断（源码条件 / trace）：\n- 下一步验证与反例：\n\n## 证据边界\n- reported / reproduced：\n- 原始产物与未覆盖项：\n`;
 $('#download-notes').onclick=()=>{
  const blob=new Blob([$('#notes').value],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='model-pr-history-notes.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  $('#download-status').textContent='已生成 Markdown 下载；请保存你的修改。';
 };
 const dialog=$('#source-dialog');let lastFocus;
 const showSources=id=>{
  lastFocus=document.activeElement;
  const selected=id==='all'?manifest.sources:[sourceById(id)].filter(Boolean);
  $('#source-title').textContent=id==='all'?'固定来源与版本':selected[0]?.title||'来源';
  $('#source-content').innerHTML=`<div class="source-meta"><p>知识库：${esc(lesson.repository)}<br>完整提交：<code>${lesson.commit}</code><br>核对日期：${manifest.verified_on} · 源码审阅与教学整理；无 GPU 复测。</p>${id==='all'?`<p>本页是知识库工作流案例。GPU shape、成本和同步账本不适用；不把本页查询样例当作 kernel 技术审计。</p><ul class="unknown-list">${lesson.unknowns.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}</div>`+selected.map(s=>`<section class="source-entry"><h3>${esc(s.title)}</h3><p>${esc(s.path)} · L${s.start}–L${s.end} · pinned-source</p><a href="${s.url}" target="_blank" rel="noreferrer">打开固定 SHA 原文 ↗</a><details><summary>展开真实源码 / 原文摘录</summary><pre>${esc(s.excerpt.split('\n').map((line,i)=>`${String(s.start+i).padStart(4)}  ${line}`).join('\n'))}</pre></details></section>`).join('');
  dialog.showModal();dialog.scrollTop=0;$('#close-source').focus();
 };
 document.addEventListener('click',e=>{const b=e.target.closest('[data-source]');if(b)showSources(b.dataset.source);});
 $('#close-source').onclick=()=>dialog.close();dialog.addEventListener('close',()=>lastFocus?.focus({preventScroll:true}));
 const nav=[...document.querySelectorAll('.site-header nav a')];
 const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){nav.forEach(a=>{if(a.hash===`#${e.target.id}`)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}});},{rootMargin:'-10% 0px -65% 0px'});
 document.querySelectorAll('main>section').forEach(s=>observer.observe(s));
})();
