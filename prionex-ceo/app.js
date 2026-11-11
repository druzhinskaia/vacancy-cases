const el=id=>document.getElementById(id);
const number=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1});
const n=x=>number.format(x);
const sign=x=>(x>0?'+':'')+n(x);
const {accepted,rejected}=Brief.validate(Brief.raw);
const closed=new Set();
let draft=null;
let verified=false;
for(const row of accepted)el('project').add(new Option(row.name,row.id));
const current=()=>accepted.filter(r=>el('project').value==='all'||r.id===el('project').value);
const totals=()=>Brief.calculate(current(),el('scenario').value);
const query={
 CRM:'Growth: подтвердить −200 лидов по источникам. Product: проверить шаг онбординга, где просела конверсия.',
 FLOW:'Product: подтвердить рост конверсии и исключить изменение определения активации.',
 DATA:'Delivery: сверить журнал задержанных активаций и подтвердить дату следующей выгрузки.',
 all:'Growth: подтвердить отклонение по CRM Core. Reporting: запросить факт Legacy и указать срок предоставления.'
};
function renderKpi(){
 const rows=current(), s=totals();
 const metrics=[['План на D12',n(s.cutoff)],['Факт на D12',n(s.actual)],['Отклонение',sign(s.gap),s.gap<0?'bad':'good'],['Прогноз / план месяца',n(s.forecast)+' / '+n(s.plan)]];
 el('metrics').innerHTML=metrics.map(([l,v,c=''])=>'<article><small>'+l+'</small><strong class="'+c+'">'+v+'</strong></article>').join('');
 el('drivers').innerHTML=[['Эффект объёма лидов',s.volume],['Эффект конверсии',s.conversion]].map(([l,v])=>'<article><small>'+l+'</small><strong>'+sign(v)+' активаций</strong></article>').join('');
 el('rows').innerHTML=rows.map(r=>{const m=Brief.calculate([r],el('scenario').value);return '<tr>'+[r.name,n(m.cutoff),n(m.actual),sign(m.gap),n(m.forecast),n(m.plan)].map(v=>'<td>'+v+'</td>').join('')+'</tr>';}).join('');
 const daysLeft=Brief.period.total-Brief.period.elapsed;
 const currentPace=s.actual/Brief.period.elapsed, requiredPace=Math.max(0,s.remaining/daysLeft);
 el('pace').textContent='Чтобы выполнить план: '+n(requiredPace)+' активаций за рабочий день. Текущий темп: '+n(currentPace)+'. Осталось '+daysLeft+' рабочих дней.';
 el('coverage').textContent='Покрытие отчёта: 3 из 4 проектов. План Legacy 250 активаций исключён из сравнения: факт не получен.';
 el('request').textContent=query[el('project').value];
 el('quarantine').innerHTML=rejected.map(r=>'<div class="list-row"><b>'+r.id+'</b><span>'+r.reason+'</span></div>').join('');
}
function renderTasks(){
 const rows=Brief.tasks.filter(t=>el('project').value==='all'||t.project===el('project').value);
 const late=rows.filter(t=>t.due<Brief.period.elapsed&&!closed.has(t.id)).length;
 el('task-status').textContent='Просрочено: '+late+' · открыто: '+rows.filter(t=>!closed.has(t.id)).length;
 el('tasks').innerHTML=rows.length?rows.map(t=>'<div class="list-row"><div><b>'+t.action+'</b><small>'+t.id+' · '+t.owner+' · D'+t.due+(closed.has(t.id)?' · выполнено':t.due<Brief.period.elapsed?' · просрочено':'')+'</small></div><button class="btn neutral" data-task="'+t.id+'">'+(closed.has(t.id)?'Переоткрыть':'Выполнено')+'</button></div>').join(''):'<p>По выбранному проекту поручений нет.</p>';
}
function renderDraft(){
 el('verify').disabled=!draft;
 el('export-brief').disabled=!verified;
 el('draft').textContent=draft?'Источники: '+draft.ids.join(', ')+' · '+Brief.scenarios[el('scenario').value].label+'\nФакт: '+n(draft.actual)+' при плане D12 '+n(draft.cutoff)+' ('+sign(draft.gap)+'). Прогноз: '+n(draft.forecast)+' из '+n(draft.plan)+'.\nСледующий шаг: '+query[el('project').value]:'Выбери проект и собери сводку.';
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
 el('validation').textContent=!verified?'Черновик заблокирован. '+(fails.includes('forecast')?'Прогноз в черновике '+n(draft.forecast)+', по модели '+n(t.forecast)+'.':'Суммы или источники расходятся.'):'Проверено: пять числовых полей и набор ID совпадают с расчётом.';
});
el('export-brief').addEventListener('click',()=>{
 if(!verified)return;
 const text='Сводка для CEO · демонстрация\n'+el('draft').textContent+'\n'+el('pace').textContent+'\n'+el('coverage').textContent+'\n'+el('task-status').textContent;
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
