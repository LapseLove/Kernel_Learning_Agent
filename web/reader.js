/* Inline scene primitives: one explanation, one diagram, local source mapping. */
window.KernelReader = (() => {
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function mountFigure(root,{scene,draw,source,describe}){
  let step=0;
  if(scene.interactive===false){
   const paint=()=>{root.innerHTML=`<div class="figure-drawing">${draw(scene,0)}</div><div class="step-source">${source(scene,0)}</div>`;};
   paint();return {refresh:paint};
  }
  const update=()=>{
   root.querySelector('.figure-drawing').innerHTML=draw(scene,step);
   const info=describe?describe(scene,step):scene.steps[step];
   root.querySelector('.step-text').innerHTML=`<span class="step-label">${step+1} / ${scene.steps.length}</span><div><b>${esc(info.title)}</b><p>${esc(info.body)}</p></div>`;
   root.querySelector('[data-action="back"]').disabled=step===0;
   root.querySelector('[data-action="step"]').disabled=step===scene.steps.length-1;
   root.querySelector('.step-source').innerHTML=source(scene,step);
  };
  root.innerHTML=`<div class="figure-drawing"></div><div class="figure-step"><div class="step-text" aria-live="polite"></div><div class="step-buttons"><button data-action="reset" aria-label="重置步骤">↺</button><button data-action="back" aria-label="上一步">←</button><button data-action="step" aria-label="下一步">→</button></div></div><div class="step-source"></div>`;
  root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{step=b.dataset.action==='reset'?0:Math.max(0,Math.min(scene.steps.length-1,step+(b.dataset.action==='step'?1:-1)));update();history.replaceState(null,'',`#${scene.id}-step-${step+1}`);root.querySelector(`[data-action="${b.dataset.action}"]`).focus({preventScroll:true});});
  const restore=()=>{const m=location.hash.match(new RegExp(`^#${scene.id}-step-(\\d+)$`));if(m){step=Math.max(0,Math.min(scene.steps.length-1,+m[1]-1));update();}};
  update();restore();window.addEventListener('hashchange',restore);return {refresh:update};
 }
 return {esc,mountFigure};
})();
