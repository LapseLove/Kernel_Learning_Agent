(() => {
  'use strict';
  const {case:C,sources:SM,license}=window.__KERN__;
  const $=s=>document.querySelector(s), esc=KernelReader.esc;
  const sourceById=Object.fromEntries(SM.sources.map(s=>[s.id,s]));
  const sourceButton=(id,label='源码依据')=>`<button data-source="${esc(id)}">${esc(label)} ↗</button>`;
  $('#short-sha').textContent=C.commit.slice(0,10);
  $('#runtime-link').href=C.repository+'/tree/'+C.commit;
  $('#language-link').href=C.identity.language_readme;
  const bytes=n=>n.toLocaleString('en-US')+' B';
  const layout=C.layout;
  $('#layout-formula').textContent=
    bytes(layout.state_bytes)+'（GDN 状态）÷ '+bytes(layout.kv_block_bytes)+'（1 个小块）→ 向上取整为 '+layout.kernel_blocks+' 块';
  $('#page-blocks').innerHTML=Array.from({length:layout.kernel_blocks},(_,i)=>`<span aria-label="第 ${i+1} 块">${i+1}</span>`).join('');
  $('#layout-result').textContent=
    layout.kernel_blocks+' 块 × '+layout.kernel_block_tokens+' token = '+layout.page_tokens+' token，整页 '+bytes(layout.page_bytes)+'。';
  $('#reported').innerHTML=C.reported.map(record=>`
    <article class="reported-item">
      <h3>${esc(record.label)}</h3><p class="note">${esc(record.setup)}</p>
      <table class="perf-table" aria-label="${esc(record.label)}">
        ${record.metric?`<caption>${esc(record.metric)}</caption>`:''}
        <thead><tr>${record.columns.map(value=>`<th scope="col">${esc(value)}</th>`).join('')}</tr></thead>
        <tbody>${record.rows.map(([label,...values])=>`<tr><th scope="row">${esc(label)}</th>${values.map(value=>`<td>${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
      <p>${esc(record.caveat)}</p>
      ${sourceButton(record.source,'条件与原表')}
    </article>`).join('');
  const wheel=sourceById.wheel.excerpt;
  $('#launch-command').textContent=wheel.split('```bash\n')[1].split('```')[0].trim();

  // Preserve upstream `runs` ordering; capacities here are explicitly teaching values.
  function groupRuns(q,d,p,t) {
    const out=[];
    for(let r=0;r<q.length;r++) {
      const last=out.at(-1), start=last?.[0];
      const same=last && (q[r]===1)===(q[start]===1);
      const fits=last && (q[r]===1 ? r-start<d : r-start<p && q.slice(start,r+1).reduce((a,b)=>a+b,0)<=t);
      if(q[r]>0 && last && last[1]===r && same && fits) last[1]=r+1;
      else if(q[r]>0) out.push([r,r+1]);
    }
    return out;
  }
  function dispatch(q,prefill=true) {
    const b=C.dispatch_demo, total=q.reduce((a,x)=>a+x,0);
    if(q.length>b.max_seqs || total>b.tokens) return {error:`超过练习容量。这轮有 ${total} 个 token、${q.length} 个请求。`,hint:`上限是 ${b.tokens} 个 token、${b.max_seqs} 个请求。`};
    const pure=q.every(x=>x===1);
    if(!pure && !prefill) return {error:'缺少 prefill，无法处理多 token 请求。',hint:'只提供 decode 的清单需要先通过 KV connector 拿到长提示词的缓存。'};
    const spans=pure ? Array.from({length:Math.ceil(q.length/b.decode_rows)},(_,i)=>[i*b.decode_rows,Math.min((i+1)*b.decode_rows,q.length)]) : groupRuns(q,b.decode_rows,b.prefill_seqs,b.tokens);
    const prefix=[0];q.forEach(x=>prefix.push(prefix.at(-1)+x));
    return {total,pure,spans:spans.map(([r0,r1])=>{const tokens=prefix[r1]-prefix[r0],seqs=r1-r0;return {r0,r1,t0:prefix[r0],t1:prefix[r1],tokens,seqs,program:tokens>seqs?'prefill':'decode_batch',cu:prefix.slice(r0,r1+1).map(x=>x-prefix[r0])};})};
  }
  // Exposed only so browser checks can compare this model with the pinned Python AST.
  window.KernLesson={groupRuns,dispatch};
  let current=C.presets[0];
  const selectedPreset=()=>C.presets.indexOf(current);

  function requestName(i) {
    return current.requests?.[i] ?? (i<26 ? String.fromCharCode(65+i) : String(i+1));
  }

  function requestTile(q,i) {
    const dots=q<=16 ? `<span class="token-dots" aria-hidden="true">${'<i></i>'.repeat(q)}</span>` : '';
    return `<div class="request"><strong>${esc(requestName(i))}</strong><span>${q} token</span>${dots}</div>`;
  }

  function explainGrouping(result) {
    if(selectedPreset()===0) return 'E 也是单 token 请求，但 C、D 隔在中间，所以 E 另起一组。';
    if(selectedPreset()===1) return 'E 移到 C、D 前面后，A、B、E 连成一组。C、D 仍走一次 prefill。';
    if(result.pure) return '这轮全是单 token 请求。每组最多装 '+C.dispatch_demo.decode_rows+' 个，超出的接到下一组。';
    return '同类请求相邻且容量足够时合成一组。请求类型变化或组已满时，另起一组。';
  }

  function paintDispatch() {
    const q=current.q;
    const result=dispatch(q,$('#has-prefill').checked);
    const showParams=$('#call-params')?.open;
    document.querySelectorAll('[data-preset]').forEach(button=>{
      button.setAttribute('aria-pressed',String(+button.dataset.preset===selectedPreset()));
    });
    if(result.error) {
      $('#dispatch-result').innerHTML=`<div class="dispatch-error"><strong>${esc(result.error)}</strong><p>${esc(result.hint)}</p></div>`;
      return;
    }

    const groups=result.spans.map((span,i)=>{
      const requests=q.slice(span.r0,span.r1).map((count,j)=>requestTile(count,span.r0+j)).join('');
      const long=span.program==='prefill';
      return `<article class="program-group ${long?'prefill':''}">
        <div class="group-label"><span>第 ${i+1} 次调用</span><span>${long?'多 token':'单 token'}</span></div>
        <h3>${span.program}</h3>
        <div class="request-strip">${requests}</div>
      </article>`;
    }).join('');

    const parameters=result.spans.map((span,i)=>`<li><strong>第 ${i+1} 组</strong>
      <code>tokens=${span.tokens} · seqs=${span.seqs}</code>
      <code>cu_seqlens_q=[${span.cu.join(', ')}]</code>
      <code>hidden [${span.tokens}, H] → out[${span.t0}:${span.t1}]</code>
    </li>`).join('');

    $('#dispatch-result').innerHTML=`
      <div class="dispatch-top"><span>${q.length} 个请求 · ${result.total} 个 token</span><strong>${result.spans.length} 次调用</strong></div>
      <div class="program-groups">${groups}</div>
      <p class="group-explanation">${explainGrouping(result)}</p>
      <div class="dispatch-footer"><span>每个框表示一次清单调用，框的大小不表示耗时。</span>${sourceButton('runs','分组源码')}</div>
      <details id="call-params" ${showParams?'open':''}>
        <summary>看每次调用传入的参数</summary>
        <div class="details-body">
          <p>偏移数组标出每个请求在本组从哪里开始，最后一项是结束位置。这里只列有效项。H 是每行特征数。</p>
          <ol class="call-params">${parameters}</ol>
        </div>
      </details>`;
  }

  function selectPreset(index) {
    current=C.presets[index];
    $('#query-lengths').value=current.q.join(',');
    paintDispatch();
  }

  function applyInput() {
    const value=$('#query-lengths').value.trim();
    if(!/^\d+(\s*[,，]\s*\d+)*$/.test(value)) {
      $('#dispatch-result').innerHTML='<div class="dispatch-error"><strong>请输入逗号分隔的正整数。</strong><p>例如 1,1,4,3,1，每项对应一个请求。</p></div>';
      return;
    }
    const q=value.split(/[,，]/).map(Number);
    if(q.length>32 || q.some(x=>!Number.isSafeInteger(x)||x<1||x>1000000)) {
      $('#dispatch-result').innerHTML='<div class="dispatch-error"><strong>请使用 1–1,000,000 的正整数，最多输入 32 项。</strong></div>';
      return;
    }
    current={q};
    paintDispatch();
  }

  const caps=C.dispatch_demo;
  $('#demo-capacity').textContent=
    `练习上限为整轮 ${caps.tokens} 个 token、${caps.max_seqs} 个请求。decode 每组最多 ${caps.decode_rows} 个请求，prefill 每组最多 ${caps.prefill_seqs} 个请求。实际容量由模型清单和调度配置决定。`;
  const presetButtons=C.presets.map((p,i)=>`<button data-preset="${i}" aria-pressed="false">${esc(p.name)}</button>`);
  $('#presets').innerHTML=presetButtons.slice(0,2).join('');
  $('#more-presets').innerHTML=presetButtons.slice(2).join('');
  for(const button of document.querySelectorAll('[data-preset]')) {
    button.onclick=()=>selectPreset(+button.dataset.preset);
  }
  $('#apply-q').onclick=applyInput;
  $('#query-lengths').addEventListener('keydown',e=>{if(e.key==='Enter')applyInput();});
  $('#has-prefill').onchange=paintDispatch;
  $('#reset-q').onclick=()=>{
    $('#has-prefill').checked=true;
    selectPreset(0);
  };
  selectPreset(0);

  const streamRows=[
    ['写好 7 个 token 的输入','', ''],
    ['记录 before','等 before 再读', '→'],
    ['', '执行 prefill，写出 7 行', ''],
    ['等 after，再复制结果','记录 after', '←']
  ];
  function drawStreams(_,step) {
    return `<div class="stream-board">
      <div class="stream-row stream-head"><span></span><b>vLLM 队列</b><span></span><b>kern 队列</b></div>
      ${streamRows.map(([host,kern,arrow],i)=>`
        <div class="stream-row ${i===step?'is-current':''}" ${i===step?'aria-current="step"':''}>
          <span class="stream-count">${i+1}</span>
          <span class="stream-cell ${host?'occupied':''} ${i===1?'after-prior':''}">${host}</span>
          <span class="stream-arrow" aria-hidden="true">${arrow}</span>
          <span class="stream-cell ${kern?'occupied':''} ${i>=2?'after-prior':''}">${kern}</span>
        </div>`).join('')}
    </div>`;
  }
  const streamFigure=$('#stream-figure');
  KernelReader.mountFigure(streamFigure,{
    scene:{id:'streams',steps:C.stream_steps},
    draw:drawStreams,
    source:(_,step)=>C.stream_steps[step].sources.map(id=>sourceButton(id,sourceById[id].title)).join('')
  });
  for(const [action,label] of [['reset','重置'],['back','上一步'],['step','下一步']]) {
    streamFigure.querySelector(`[data-action="${action}"]`).textContent=label;
  }

  function revealDeepLink() {
    if(/^#streams(?:-step-\d+)?$/.test(location.hash)) $('#streams').open=true;
    if(location.hash==='#binding') $('#binding').open=true;
    if(location.hash==='#layout') $('#layout').open=true;
    if(location.hash==='#evidence') $('#evidence').open=true;
  }
  revealDeepLink();
  if(/^#streams-step-\d+$/.test(location.hash)) $('#streams').scrollIntoView();
  window.addEventListener('hashchange',revealDeepLink);

  const dialog=$('#source-dialog');
  function sourceEntry(s,collapsed=false) {
    const code=`<pre tabindex="0" aria-label="${esc(s.path)} 源码摘录，可滚动">${s.excerpt.split('\n').map((l,i)=>`<span class="code-line"><span class="line-no">${s.start+i}</span>${esc(l)||' '}</span>`).join('')}</pre>`;
    const pinned=`<p class="hash">blob ${esc(s.blob_sha)}<br>excerpt SHA256 ${esc(s.excerpt_sha256)}</p>`;
    return `<article class="source-entry">
      ${collapsed?`<h3>${esc(s.title)}</h3>`:''}
      <a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.path)} · L${s.start}–L${s.end} ↗</a>
      ${collapsed?`<details><summary>展开摘录</summary>${code}${pinned}</details>`:
        `<p class="note">左侧为上游行号。代码可左右、上下滚动。</p>${code}<details><summary>查看摘录校验值</summary>${pinned}</details>`}
    </article>`;
  }
  function openSource(id) {
    const all=id==='all',s=sourceById[id];
    if(!all&&!s)return;
    $('#source-title').textContent=all?'固定来源与已知边界':s.title;
    const meta=`<div class="source-meta">${esc(C.repository)}<br><b>固定 SHA</b> <code>${esc(C.commit)}</code><br>核对于 ${esc(C.reviewed_on)} · Apache-2.0 上游摘录<br>${esc(C.scope.vllm_compatibility)}<br>本项目：源码审阅与浏览器交互验证；没有 GPU 数值或性能复测。</div>`;
    $('#source-content').innerHTML=all
      ? meta+`<div class="source-index">${SM.sources.map(x=>sourceButton(x.id,x.title)).join('')}</div><details><summary>上游 Apache-2.0 许可全文</summary><pre>${esc(license)}</pre></details>`+SM.sources.map(x=>sourceEntry(x,true)).join('')
      : `<div class="source-meta">固定源码 <code>${esc(C.commit)}</code></div>`+sourceEntry(s);
    if(!dialog.open) dialog.showModal();
    dialog.scrollTop=0;
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-source]');if(b)openSource(b.dataset.source);});
  $('#close-source').onclick=()=>dialog.close();
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
})();
