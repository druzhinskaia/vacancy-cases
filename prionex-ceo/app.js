const el=id=>document.getElementById(id);
const copy=BriefLanguage[document.documentElement.lang]??BriefLanguage.ru;
const number=new Intl.NumberFormat(copy.locale,{maximumFractionDigits:1});
const n=x=>number.format(x);
const sign=x=>(x>0?'+':'')+n(x);
const {accepted,rejected}=Brief.validate(Brief.raw);
const closed=new Set();
let draft=null;
let verified=false;
for(const row of accepted)el('project').add(new Option(row.name,row.id));
const current=()=>accepted.filter(r=>el('project').value==='all'||r.id===el('project').value);
const totals=()=>Brief.calculate(current(),el('scenario').value);
const query=copy.requests;
const params=new URLSearchParams(location.search);
for(const id of ['project','scenario']){
 const value=params.get(id);
 if(value&&Array.from(el(id).options).some(option=>option.value===value))el(id).value=value;
}
el('language-link').addEventListener('click',event=>{
 const link=event.currentTarget;
 const destination=new URL(link.getAttribute('href'),location.href);
 destination.searchParams.delete('project');
 destination.searchParams.delete('scenario');
 if(el('project').value!=='all')destination.searchParams.set('project',el('project').value);
 if(el('scenario').value!=='base')destination.searchParams.set('scenario',el('scenario').value);
 destination.hash=location.hash;
 link.href=destination.href;
});
function renderKpi(){
 const rows=current(), s=totals();
 const metrics=[[copy.metrics[0],n(s.cutoff)],[copy.metrics[1],n(s.actual)],[copy.metrics[2],sign(s.gap),s.gap<0?'bad':'good'],[copy.metrics[3],n(s.forecast)+' / '+n(s.plan)]];
 el('metrics').innerHTML=metrics.map(([l,v,c=''])=>'<article><small>'+l+'</small><strong class="'+c+'">'+v+'</strong></article>').join('');
 el('drivers').innerHTML=[[copy.drivers[0],s.volume],[copy.drivers[1],s.conversion]].map(([l,v])=>'<article><small>'+l+'</small><strong>'+sign(v)+' '+copy.activations+'</strong></article>').join('');
 el('rows').innerHTML=rows.map(r=>{const m=Brief.calculate([r],el('scenario').value);return '<tr>'+[r.name,n(m.cutoff),n(m.actual),sign(m.gap),n(m.forecast),n(m.plan)].map(v=>'<td>'+v+'</td>').join('')+'</tr>';}).join('');
 const daysLeft=Brief.period.total-Brief.period.elapsed;
 const currentPace=s.actual/Brief.period.elapsed, requiredPace=Math.max(0,s.remaining/daysLeft);
 el('pace').textContent=copy.pace(n(requiredPace),n(currentPace),daysLeft);
 el('coverage').textContent=copy.coverage;
 el('request').textContent=query[el('project').value];
 el('quarantine').innerHTML=rejected.map(r=>'<div class="list-row"><b>'+r.id+'</b><span>'+(copy.reasons?.[r.reason]??r.reason)+'</span></div>').join('');
}
function renderTasks(){
 const rows=Brief.tasks.filter(t=>el('project').value==='all'||t.project===el('project').value);
 const late=rows.filter(t=>t.due<Brief.period.elapsed&&!closed.has(t.id)).length;
 el('task-status').textContent=copy.taskCount(late,rows.filter(t=>!closed.has(t.id)).length);
 el('tasks').innerHTML=rows.length?rows.map(t=>'<div class="list-row"><div><b>'+(copy.actions?.[t.id]??t.action)+'</b><small>'+t.id+' · '+t.owner+' · D'+t.due+(closed.has(t.id)?' · '+copy.done:t.due<Brief.period.elapsed?' · '+copy.overdue:'')+'</small></div><button class="btn neutral" data-task="'+t.id+'">'+(closed.has(t.id)?copy.reopen:copy.mark)+'</button></div>').join(''):'<p>'+copy.empty+'</p>';
}
function renderDraft(){
 el('verify').disabled=!draft;
 el('export-brief').disabled=!verified;
 el('draft').textContent=draft?copy.brief(
  draft.ids.join(', '),copy.scenario?.[el('scenario').value]??Brief.scenarios[el('scenario').value].label,n(draft.actual),n(draft.cutoff),sign(draft.gap),n(draft.forecast),n(draft.plan),query[el('project').value]
 ):copy.noDraft;
 if(!verified)el('validation').textContent='';
}
function createDraft(fault){
 const t=totals();draft={actual:t.actual,cutoff:t.cutoff,gap:t.gap,forecast:t.forecast+(fault?100:0),plan:t.plan,ids:current().map(r=>r.id)};
 verified=false;renderDraft();
}
el('generate').addEventListener('click',()=>createDraft(false));
el('fake').addEventListener('click',()=>createDraft(true));
el('verify').addEventListener('click',()=>{
 if(!draft)return;
 const t=totals(),keys=['actual','cutoff','gap','forecast','plan'];
 const fails=keys.filter(k=>draft[k]!==t[k]);
 const sourcesMatch=draft.ids.join()===current().map(r=>r.id).join();
 verified=!fails.length&&sourcesMatch;
 el('export-brief').disabled=!verified;
 el('validation').textContent=verified?copy.checked:copy.blocked+' '+(
  fails.includes('forecast')?copy.error(n(draft.forecast),n(t.forecast)):copy.mismatch
 );
});
el('export-brief').addEventListener('click',()=>{
 if(!verified)return;
 const text=copy.exportTitle+'\n'+el('draft').textContent+'\n'+el('pace').textContent+'\n'+el('coverage').textContent+'\n'+el('task-status').textContent;
 const href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
 const a=document.createElement('a');a.href=href;a.download='prionex-ceo-brief.txt';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
});
el('tasks').addEventListener('click',event=>{
 const button=event.target.closest('[data-task]');if(!button)return;
 const id=button.dataset.task;if(closed.has(id))closed.delete(id);else closed.add(id);renderTasks();
 el('tasks').querySelector('[data-task="'+id+'"]')?.focus({preventScroll:true});
});
for(const id of ['project','scenario'])el(id).addEventListener('change',()=>{draft=null;verified=false;renderKpi();renderTasks();renderDraft();});
renderKpi();renderTasks();renderDraft();
