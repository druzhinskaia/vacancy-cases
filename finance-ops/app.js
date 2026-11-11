const el = id => document.getElementById(id);
const reconciled = Ops.reconcile(Ops.incidentRows);
const resolved = new Set();
let selected = reconciled.exceptions[0].id;
let account = 'all';
let booked = [];
let journal = [];
let started = false;
const choices = {
  duplicate:['Исключить дубль импорта','Удалить обе строки на эту сумму'],
  amount:['Приравнять нетто к брутто','Учесть комиссию'],
  pending:['Перенести на контроль','Провести по одному реестру'],
  missing:['Удалить строку выписки','Создать ручную запись']
};
const correction = {
  duplicate:'По этой сумме есть две самостоятельные операции. Сравни ID строки выписки и ссылку на операцию.',
  amount:'Брутто и нетто различаются на подтверждённую комиссию. Сохрани обе суммы в истории сверки.',
  pending:'Расчёт провайдера ещё не проведён. Оставь контроль следующей смене.',
  missing:'Выписка подтверждает движение. Нужна запись в реестре со ссылкой на отчёт.'
};
const fmt = (cents,currency) => new Intl.NumberFormat('ru-RU',{style:'currency',currency,currencyDisplay:'code',maximumFractionDigits:2}).format(cents/100);
const filtered = rows => rows.filter(row=>account==='all'||row.account===account);
const balanceFor = key => Ops.balance(key,reconciled,resolved,booked);
const openCount = key => reconciled.exceptions.filter(row=>row.account===key&&!resolved.has(row.id)).length;
function renderHero() {
  const progress = Math.round(resolved.size/reconciled.exceptions.length*100);
  el('hero-percent').textContent = progress+'%';
  el('progress').style.width = progress+'%';
  el('hero-label').textContent = progress===100?'СВЕРЕНО':'18:40';
  el('hero-event').textContent = progress===100?'Остатки сошлись':started?'Исключения разобраны: '+resolved.size+' / '+reconciled.exceptions.length:'Выписка готова к сверке';
  el('hero-accounts').innerHTML = Object.entries(Ops.accounts).map(([key,item])=>'<div class="hero-row"><b>'+item.name+'</b><span>'+item.currency+'</span><span class="'+(openCount(key)?'attention':'')+'">'+(openCount(key)?'Есть исключения':'Сверено')+'</span></div>').join('');
}
function renderBalances() {
  const entries = Object.entries(Ops.accounts).filter(([key])=>account==='all'||key===account);
  el('balances').innerHTML = entries.map(([key,item])=>{
    const b = balanceFor(key);
    const rows = reconciled.unique.filter(row=>row.account===key);
    const incoming = rows.reduce((acc,row)=>acc+Math.max(row.amount,0),0);
    const outgoing = rows.reduce((acc,row)=>acc+Math.max(-row.amount,0),0)+b.withdrawals;
    return '<article><h3>'+item.name+' · '+item.currency+'</h3><p>Остаток по выписке</p><strong>'+fmt(b.closing,item.currency)+'</strong><p>Начало '+fmt(b.opening,item.currency)+'</p><p>Приход '+fmt(incoming,item.currency)+' · Расход '+fmt(outgoing,item.currency)+'</p><p>Реестр после правок '+fmt(b.ledgerClosing,item.currency)+'</p><p class="'+(b.diff?'negative':'positive')+'">Разница <b>'+fmt(b.diff,item.currency)+'</b></p></article>';
  }).join('');
  const issues=filtered(reconciled.exceptions);
  el('recon-summary').textContent = 'Точных совпадений: '+filtered(reconciled.matched).length+' · открытых исключений: '+issues.filter(issue=>!resolved.has(issue.id)).length+' из '+issues.length;
}
function renderIssues() {
  const issues = filtered(reconciled.exceptions);
  const issue = issues.find(row=>row.id===selected)??issues[0];
  selected = issue?.id??'';
  el('issues').innerHTML = issues.map(row=>'<button data-issue="'+row.id+'" aria-pressed="'+(row.id===selected)+'"><div><b>'+Ops.types[row.type].title+'</b><span>'+row.ref+' · '+Ops.accounts[row.account].name+'</span></div><em class="'+(resolved.has(row.id)?'done':'')+'">'+(resolved.has(row.id)?'Закрыто':'Открыто')+'</em></button>').join('');
  if (!issue) {el('issue-detail').innerHTML='<p>По этому счёту нет исключений.</p>';return;}
  const rule = Ops.types[issue.type], currency = Ops.accounts[issue.account].currency;
  const ledger = Ops.ledger.find(row=>row.ref===issue.ref && row.account===issue.account);
  const actual = Ops.incidentRows.filter(row=>row.ref===issue.ref && row.account===issue.account);
  const before = ledger?fmt(ledger.amount,currency):'нет строки';
  const after = actual.length?actual.map(row=>row.id+' · '+fmt(row.amount,currency)).join(' / '):'нет строки';
  const resolvedText = resolved.has(issue.id)?'<p class="feedback positive" id="feedback" role="status">'+rule.note+'</p>':
    '<div class="options">'+choices[issue.type].map((choice,i)=>'<button class="btn outline" data-choice="'+i+'">'+choice+'</button>').join('')+'</div><p class="feedback" id="feedback" role="status"></p>';
  el('issue-detail').innerHTML='<h3>'+rule.title+' · '+issue.ref+'</h3><div class="evidence"><span>Реестр: '+before+'</span><span>Выписка: '+after+'</span></div><p>'+rule.detail+'</p>'+resolvedText;
}
function renderPayouts() {
  el('payouts').innerHTML = Ops.payouts.map(payout=>{
    const item=Ops.accounts[payout.account], balance=balanceFor(payout.account);
    const result=Ops.assess(payout,reconciled,resolved,booked);
    const remaining=result.code==='done'?balance.closing:balance.closing-payout.amount;
    const line=result.code==='done'?'Текущий остаток':'Остаток после вывода';
    return '<article><h3>'+payout.id+' · '+item.name+'</h3><strong>'+fmt(payout.amount,item.currency)+'</strong><p>'+line+': '+fmt(remaining,item.currency)+'</p><p>Минимальный резерв: '+fmt(item.reserve,item.currency)+'</p><p class="'+(result.code==='hold'?'negative':'positive')+'"><b>'+result.text+'</b></p><button class="btn primary" data-payout="'+payout.id+'" '+(result.code==='ready'?'':'disabled')+'>'+(result.code==='done'?'Проведено':'Провести в демо')+'</button></article>';
  }).join('');
}
function renderJournal() {
  el('export-log').disabled = !journal.length;
  el('journal-rows').innerHTML = journal.length?journal.map(item=>'<div class="journal-entry"><b>'+item.reference+'</b><span>'+item.account+'</span><div>'+item.note+'</div></div>').join(''):'<p class="empty">Действия появятся после разбора первого исключения.</p>';
}
function render() {renderHero();renderBalances();renderIssues();renderPayouts();renderJournal();}
function download(name,rows) {
  const url=URL.createObjectURL(new Blob(['\uFEFF',Ops.csv(rows)],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;
  link.download=name;
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
el('launch').addEventListener('click',()=>{
  started=true;
  renderHero();
  el('recon').scrollIntoView({block:'start'});
  el('issues').querySelector('button')?.focus({preventScroll:true});
});
el('account').addEventListener('change',event=>{account=event.target.value;renderBalances();renderIssues();});
el('issues').addEventListener('click',event=>{
  const button=event.target.closest('[data-issue]');
  if(!button) return;
  selected=button.dataset.issue;
  renderIssues();
  el('issues').querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
});
el('issue-detail').addEventListener('click',event=>{
  const button=event.target.closest('[data-choice]');
  if(!button) return;
  const issue=reconciled.exceptions.find(row=>row.id===selected);
  if (!issue||resolved.has(issue.id)) return;
  const rule=Ops.types[issue.type];
  if (choices[issue.type][Number(button.dataset.choice)]!==rule.action) {
    el('feedback').textContent=correction[issue.type];
    return;
  }
  started=true;
  resolved.add(issue.id);
  journal.push({reference:issue.ref,account:issue.account,currency:Ops.accounts[issue.account].currency,adjustment_cents:issue.type==='duplicate'?0:issue.delta,note:rule.note});
  render();
  el('issues').querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
});
el('payouts').addEventListener('click',event=>{
  const button=event.target.closest('[data-payout]');
  if(!button) return;
  const payout=Ops.payouts.find(row=>row.id===button.dataset.payout);
  if(!payout||Ops.assess(payout,reconciled,resolved,booked).code!=='ready') return;
  booked.push(payout);
  const currency=Ops.accounts[payout.account].currency;
  journal.push({reference:payout.id,account:payout.account,currency,adjustment_cents:-payout.amount,note:'Имитация вывода '+fmt(payout.amount,currency)+'. Проверки остатка и резерва пройдены.'});
  renderPayouts();
  renderBalances();
  renderJournal();
  el('export-log').focus({preventScroll:true});
});
el('export-exceptions').addEventListener('click',()=>download('reconciliation-exceptions.csv',filtered(reconciled.exceptions).map(row=>({...row,currency:Ops.accounts[row.account].currency,status:resolved.has(row.id)?'closed':'open'}))));
el('export-log').addEventListener('click',()=>{if(journal.length) download('finance-journal.csv',journal);});
el('reset').addEventListener('click',()=>{
  started=false;
  account='all';
  el('account').value='all';
  selected=reconciled.exceptions[0].id;
  resolved.clear();
  journal=[];
  booked=[];
  render();
});
render();
