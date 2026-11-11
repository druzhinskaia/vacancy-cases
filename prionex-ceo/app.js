const el=id=>document.getElementById(id);
const copy=BriefLanguage[document.documentElement.lang]??BriefLanguage.ru;
const money={style:'currency',currency:'EUR',minimumFractionDigits:0,maximumFractionDigits:0};
const eur=new Intl.NumberFormat(copy.locale,money).format;
const signEur=new Intl.NumberFormat(copy.locale,{...money,signDisplay:'exceptZero'}).format;
const percent=new Intl.NumberFormat(copy.locale,{style:'percent',maximumFractionDigits:1});
const {accepted,rejected}=Brief.validate(Brief.raw);
const closed=new Set();
try {
 const saved=JSON.parse(sessionStorage.getItem('prionex-recovery-actions')??'[]');
 for(const id of saved)if(Brief.tasks.some(task=>task.id===id))closed.add(id);
} catch {}
let draft=null;
let verified=false;
for(const row of accepted)el('project').add(new Option(copy.portfolios[row.id],row.id));
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
 const metrics=[[copy.metrics[0],eur(s.cutoff)],[copy.metrics[1],eur(s.actual)],[copy.metrics[2],signEur(s.gap),s.gap<0?'bad':'good'],[copy.metrics[3],eur(s.forecast)+' / '+eur(s.plan)]];
 el('metrics').innerHTML=metrics.map(([l,v,c=''])=>'<article><small>'+l+'</small><strong class="'+c+'">'+v+'</strong></article>').join('');
 el('drivers').innerHTML=[[copy.drivers[0],s.volume],[copy.drivers[1],s.yield]].map(([l,v])=>'<article><small>'+l+'</small><strong>'+signEur(v)+'</strong></article>').join('');
 el('rows').innerHTML=rows.map(r=>{const m=Brief.calculate([r],el('scenario').value);return '<tr>'+[copy.portfolios[r.id]+' · '+r.id,eur(m.cutoff),eur(m.actual),percent.format(m.rate),signEur(m.gap),eur(m.forecast),eur(m.plan)].map(v=>'<td>'+v+'</td>').join('')+'</tr>';}).join('');
 el('pace').textContent=copy.pace(eur(s.requiredPace),eur(s.pace),s.daysLeft);
 el('forecast-rate').textContent=percent.format(s.forecast/s.plan);
 el('forecast-bar').value=s.forecast/s.plan;
 el('coverage').textContent=copy.coverage;
 const scope=el('project').value;
 el('request').textContent=query[scope];
 el('evidence-panel').hidden=scope!=='all'&&scope!=='NORTH';
 el('quarantine').innerHTML=rejected.map(r=>'<div class="list-row"><b>'+copy.row+' '+r.row+' · '+r.id+'</b><span>'+copy.reasons[r.reason]+'</span></div>').join('');
}
function renderTasks(){
 const rows=Brief.tasks.filter(t=>el('project').value==='all'||t.portfolio===el('project').value);
 const late=rows.filter(t=>t.due<Brief.period.elapsed&&!closed.has(t.id)).length;
 el('task-status').textContent=copy.taskCount(late,rows.filter(t=>!closed.has(t.id)).length);
 el('tasks').innerHTML=rows.length?rows.map(t=>'<div class="list-row"><div><b>'+copy.actions[t.id]+'</b><small>'+t.id+' · '+t.owner+' · D'+t.due+(closed.has(t.id)?' · '+copy.done:t.due<Brief.period.elapsed?' · '+copy.overdue:'')+'</small></div><button class="btn neutral" data-task="'+t.id+'">'+(closed.has(t.id)?copy.reopen:copy.mark)+'</button></div>').join(''):'<p>'+copy.empty+'</p>';
}
function renderDraft(){
 el('verify').disabled=!draft;
 el('export-brief').disabled=!verified;
 el('draft').textContent=draft?copy.brief(
  draft.ids.join(', '),copy.scenario[el('scenario').value],eur(draft.actual),eur(draft.cutoff),signEur(draft.gap),eur(draft.forecast),eur(draft.plan),el('project').value==='all'?copy.decision:query[el('project').value]
 ):copy.noDraft;
 if(!verified)el('validation').textContent='';
}
function createDraft(fault){
 const t=totals();draft={actual:t.actual,cutoff:t.cutoff,gap:t.gap,forecast:t.forecast+(fault?15000:0),plan:t.plan,ids:current().map(r=>r.row)};
 verified=false;renderDraft();
}
el('generate').addEventListener('click',()=>createDraft(false));
el('fake').addEventListener('click',()=>createDraft(true));
el('verify').addEventListener('click',()=>{
 if(!draft)return;
 const t=totals(),keys=['actual','cutoff','gap','forecast','plan'];
 const fails=keys.filter(k=>draft[k]!==t[k]);
 const sourcesMatch=draft.ids.join()===current().map(r=>r.row).join();
 verified=!fails.length&&sourcesMatch;
 el('export-brief').disabled=!verified;
 el('validation').textContent=verified?copy.checked:copy.blocked+' '+(
  fails.includes('forecast')?copy.error(eur(draft.forecast),eur(t.forecast)):copy.mismatch
 );
});
el('export-brief').addEventListener('click',()=>{
 if(!verified)return;
 const text=copy.exportTitle+'\n'+el('draft').textContent+'\n'+el('pace').textContent+'\n'+el('coverage').textContent+'\n'+el('task-status').textContent+'\n'+[...el('tasks').querySelectorAll('.list-row > div')].map(row=>row.querySelector('b').textContent+' — '+row.querySelector('small').textContent).join('\n');
 const href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
 const a=document.createElement('a');a.href=href;a.download='prionex-ceo-brief.txt';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
});
el('tasks').addEventListener('click',event=>{
 const button=event.target.closest('[data-task]');if(!button)return;
 const id=button.dataset.task;if(closed.has(id))closed.delete(id);else closed.add(id);
 try {sessionStorage.setItem('prionex-recovery-actions',JSON.stringify([...closed]));} catch {}
 renderTasks();
 el('tasks').querySelector('[data-task="'+id+'"]')?.focus({preventScroll:true});
});
for(const id of ['project','scenario'])el(id).addEventListener('change',()=>{draft=null;verified=false;renderKpi();renderTasks();renderDraft();});
const smsRate=({delivered,attempted})=>percent.format(delivered/attempted)+' ('+delivered+'/'+attempted+')';
el('evidence').textContent=copy.evidence(smsRate(Brief.delivery.current),smsRate(Brief.delivery.previous));
renderKpi();renderTasks();renderDraft();
