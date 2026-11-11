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
el('model-notes-label').textContent=copy.modelNotes;
const aiAnswer=el('ai-answer');
const aiPrompt=el('ai-prompt');
const aiFields={
 actual_eur:'actual', cutoff_target_eur:'cutoff', variance_eur:'gap',
 forecast_eur:'forecast', month_target_eur:'plan'
};

function expectedReply(){
 const metrics=totals();
 return {
  ...Object.fromEntries(Object.entries(aiFields).map(([field,key])=>[field,metrics[key]])),
  source_row_ids:current().map(row=>row.row)
 };
}

function resetVerification(){
 verified=false;
 el('verify').disabled=!aiAnswer.value.trim();
 el('export-brief').disabled=true;
 el('draft').hidden=true;
 el('model-notes').hidden=true;
 el('validation').textContent='';
}

function renderPrompt(){
 const scope=el('project').value;
 const scenario=el('scenario').value;
 const portfolios=scope==='all'?Brief.raw:Brief.raw.filter(row=>row.id===scope);
 const data={
  scope, scenario, elapsed_days:Brief.period.elapsed, total_days:Brief.period.total,
  remaining_pace_factor:Brief.scenarios[scenario],
  portfolios:portfolios.map(({row,id,plan,plannedBalance,plannedRate,balance,paid})=>({
   row_id:row, portfolio:id, month_target_eur:plan, planned_balance_eur:plannedBalance,
   planned_recovery_rate:plannedRate, assigned_balance_eur:balance, settled_payments_eur:paid
  })),
  context:copy.coverage
 };
 if(scope==='all'||scope==='NORTH')data.north_sms_delivery=Brief.delivery;
 el('ai-scope').textContent=copy.aiScope(scope==='all'?copy.allPortfolios:copy.portfolios[scope],copy.scenario[scenario]);
 aiPrompt.value=copy.prompt+'\n\n'+JSON.stringify(data,null,2);
 aiAnswer.value='';
 el('copy-status').textContent='';
 resetVerification();
}

el('copy-prompt').addEventListener('click',async()=>{
 try {
  await navigator.clipboard.writeText(aiPrompt.value);
  el('copy-status').textContent=copy.copied;
 } catch {
  el('prompt-details').open=true;
  aiPrompt.focus();
  aiPrompt.select();
  el('copy-status').textContent=copy.copyManually;
 }
});

function loadExample(withError){
 const example=expectedReply();
 if(withError)example.forecast_eur+=15000;
 example.summary=copy.exampleSummary;
 aiAnswer.value=JSON.stringify(example,null,2);
 resetVerification();
}
el('generate').addEventListener('click',()=>loadExample(false));
el('fake').addEventListener('click',()=>loadExample(true));
aiAnswer.addEventListener('input',resetVerification);

el('verify').addEventListener('click',()=>{
 resetVerification();
 const input=aiAnswer.value.trim();
 const fenced=input.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
 let reply;
 try {
  reply=JSON.parse(fenced?fenced[1]:input);
 } catch {
  el('validation').textContent=copy.invalidJson;
  return;
 }
 if(!reply||typeof reply!=='object'||Array.isArray(reply)){
  el('validation').textContent=copy.invalidJson;
  return;
 }
 const expected=expectedReply();
 const issues=[];
 for(const field of Object.keys(aiFields)){
  if(reply[field]!==expected[field]){
   const received=Number.isSafeInteger(reply[field])?eur(reply[field]):copy.missingNumber;
   issues.push(field+' — '+copy.difference(received,eur(expected[field])));
  }
 }
 const ids=reply.source_row_ids;
 if(!Array.isArray(ids)||ids.length!==expected.source_row_ids.length||!expected.source_row_ids.every(id=>ids.includes(id))){
  issues.push(copy.wrongRows(expected.source_row_ids.join(', ')));
 }
 if(issues.length){
  el('validation').textContent=copy.blocked+'\n'+issues.join('\n');
  return;
 }
 verified=true;
 const scope=el('project').value;
 const scenario=copy.scenario[el('scenario').value];
 const {actual,cutoff,gap,forecast,plan}=totals();
 el('draft').textContent=copy.brief(ids.join(', '),scenario,eur(actual),eur(cutoff),signEur(gap),eur(forecast),eur(plan),scope==='all'?copy.decision:query[scope]);
 el('draft').hidden=false;
 if(typeof reply.summary==='string'&&reply.summary.trim()){
  el('model-summary').textContent=reply.summary;
  el('model-notes').hidden=false;
 }
 el('export-brief').disabled=false;
 el('validation').textContent=copy.checked;
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
for(const id of ['project','scenario'])el(id).addEventListener('change',()=>{renderKpi();renderTasks();renderPrompt();});
const smsRate=({delivered,attempted})=>percent.format(delivered/attempted)+' ('+delivered+'/'+attempted+')';
el('evidence').textContent=copy.evidence(smsRate(Brief.delivery.current),smsRate(Brief.delivery.previous));
renderKpi();renderTasks();renderPrompt();
