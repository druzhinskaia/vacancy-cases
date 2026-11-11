const el = id => document.getElementById(id);
const done = new Set();
const n = new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0});
const eur = value => n.format(value)+' €';
let selection = 'BANK';
const status = item => !done.has(item.id)?'К проверке':item.id==='VAT'?'Передано · открыто':'Разобрано';
function render() {
  const s = Audit.summarize(done);
  el('score').textContent = done.size+' / '+Audit.cases.length;
  el('progress').style.width = (done.size/Audit.cases.length*100)+'%';
  el('hero-state').textContent = s.ready?'На ревью':'Черновик';
  el('hero-rows').innerHTML = Audit.cases.map(item=>'<div class="hero-row"><span>'+item.title+'</span><b>'+status(item)+'</b></div>').join('');
  el('queue').innerHTML = Audit.cases.map(item=>'<button type="button" data-id="'+item.id+'" aria-pressed="'+(selection===item.id)+'"><span><b>'+item.title+'</b><small>'+item.owner+' · '+item.deadline+'</small></span><em>'+status(item)+'</em></button>').join('');
  const item = Audit.cases.find(item=>item.id===selection);
  el('detail').innerHTML = '<div class="meta">'+[item.entity,item.topic,item.risk,item.ref].map(v=>'<span>'+v+'</span>').join('')+'</div><h3>'+item.title+'</h3><p>'+item.summary+'</p><div class="evidence">'+item.evidence.map(([key,value])=>'<div><span>'+key+'</span><b>'+value+'</b></div>').join('')+'</div>'+(done.has(item.id)?'<p class="feedback good" role="status">'+item.explain+'</p>':'<p><b>'+item.prompt+'</b></p><div class="options">'+item.options.map((label,i)=>'<button class="btn neutral" data-choice="'+i+'">'+label+'</button>').join('')+'</div><p id="feedback" class="feedback hint" role="status"></p>');
  const metrics=[['Разница по банку',eur(s.bankDiff)],['Разница Hub ↔ Studio',eur(s.icDiff)],['Статус VAT',s.vatEscalated?'Открыт у консультанта':'К проверке']];
  el('metrics').innerHTML=metrics.map(([label,value])=>'<article><small>'+label+'</small><strong>'+value+'</strong></article>').join('');
  el('entries').innerHTML=s.entries.length?s.entries.map(row=>'<tr>'+row.map((v,i)=>'<td>'+(i===4?eur(v):v)+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="6">Проекты появятся после разбора проверок.</td></tr>';
  el('package-title').textContent=s.ready?'Готово к ревью Team Lead':'Черновик пакета';
  el('package-status').textContent=s.ready?'Сверки сходятся. VAT-исключение включено в пакет как открытое.':'Разобрано '+done.size+' из '+Audit.cases.length+'. Пакет можно собрать после разбора всех проверок.';
  el('download-entries').disabled=!s.entries.length;
  el('download-package').disabled=!s.ready;
}
function select(id) {
  selection=id;
  render();
  el('queue').querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
}
el('queue').addEventListener('click',event=>{
  const button=event.target.closest('[data-id]');
  if(button)select(button.dataset.id);
});
el('detail').addEventListener('click',event=>{
  const button=event.target.closest('[data-choice]');
  if(!button)return;
  const item=Audit.cases.find(item=>item.id===selection);
  if(Number(button.dataset.choice)!==item.answer){el('feedback').textContent=item.error;return;}
  done.add(item.id);
  select(item.id);
});
el('reset').addEventListener('click',()=>{done.clear();selection='BANK';render();});
function download(name,rows){
  const url=URL.createObjectURL(new Blob(['\uFEFF',Audit.csv(rows)],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;
  link.download=name;
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
el('download-entries').addEventListener('click',()=>{
  const {entries}=Audit.summarize(done);
  if(entries.length)download('proposed-journal-entries.csv',[['ID','Scope','Debit','Credit','EUR','Evidence'],...entries]);
});
el('download-package').addEventListener('click',()=>{
  if(!Audit.summarize(done).ready)return;
  download('audit-review-checklist.csv',[['Check','Entity','Owner','Due','Evidence','Status','Note'],...Audit.cases.map(item=>[item.id,item.entity,item.owner,item.deadline,item.ref,status(item),item.explain])]);
});
render();
