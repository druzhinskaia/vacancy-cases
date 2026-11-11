const byId = id => document.getElementById(id);
const n = new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1});
const signed = value => (value>=0.05?'+':'')+n.format(Math.abs(value)<0.05?0:value);
const rub = new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0});
const fmt = (value,suffix='') => value===null ? '—' : n.format(value)+suffix;
const pct = value => fmt(value===null?null:value*100,'%');
const zoneNames = Object.fromEntries(Shift.zones.map(({id,name})=>[id,name]));
const state = {scenario:'base',zone:'all',slot:'all',decision:'none',view:'all',page:0};
const sources = Object.fromEntries(Object.keys(Shift.scenarios).map(scenario=>[scenario,Shift.validate(Shift.rawOrders(scenario))]));
const match = (row,slot=true) => (state.zone==='all'||row.zone===state.zone) && (!slot||state.slot==='all'||row.slot===state.slot);
const pageSize = 8;
let shown = [];
const intervalButtons = Shift.times.map(slot => {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.slot = slot;
  button.innerHTML = '<b></b><i aria-hidden="true"></i><small>'+slot+'</small>';
  byId('bars').append(button);
  return button;
});
function setButtons(selector,key,current) {
  document.querySelectorAll(selector).forEach(button=>button.setAttribute('aria-pressed',button.dataset[key]===current));
}
function hero(scenario,index) {
  const values = Shift.times.map(time=>sources[scenario].valid.filter(row=>row.slot===time).length);
  byId('hero-count').textContent = values[index];
  byId('hero-clock').textContent = Shift.times[index];
  byId('mini-chart').innerHTML = values.map((value,i)=>'<i class="'+(i===index?'current':'')+'" style="--h:'+value/Math.max(...values)*88+'%"></i>').join('');
  byId('mini-chart').setAttribute('aria-label',Shift.times.map((time,i)=>time+' — '+values[i]).join(', '));
  const alert = scenario==='peak' && index>=3;
  byId('incident').classList.toggle('alert',alert);
  byId('incident-title').textContent = alert?'Пик спроса':scenario==='peak'?'Спрос растёт':'Смена открыта';
  byId('incident-detail').textContent = alert?'Проверь ожидание курьера в Центре':'Сравни загрузку по интервалам';
}
function dashboard(orders) {
  const selected = orders.filter(row=>match(row));
  const result = Shift.summarize(selected);
  const metrics = [
    ['Спрос',fmt(result.demand)],['Доставки в SLA',pct(result.rate),result.rate!==null&&result.rate<0.85],
    ['Среднее время',fmt(result.total,' мин')],['Выручка',rub.format(result.revenue)],['Расчётный вклад',rub.format(result.contribution)]
  ];
  byId('metrics').innerHTML = metrics.map(([label,value,warning])=>'<article><small>'+label+'</small><strong class="'+(warning?'bad':'')+'">'+value+'</strong></article>').join('');
  byId('status').textContent = Shift.scenarios[state.scenario]+' · '+result.delivered+' доставлено из '+result.demand+' заявок · '+result.late+' за пределами SLA · '+result.deferred+' отложено';
  const volumes = Shift.times.map(slot=>orders.filter(row=>row.slot===slot&&match(row,false)).length);
  intervalButtons.forEach((button,i) => {
    const slot = Shift.times[i], value = volumes[i];
    button.setAttribute('aria-label',slot+' — '+value+' заявок');
    button.setAttribute('aria-pressed',slot===state.slot);
    button.querySelector('b').textContent = value;
    button.querySelector('i').style.setProperty('--h',value/Math.max(1,...volumes)*78+'%');
  });
  byId('clear-slot').disabled = state.slot==='all';
  const phases = [['Сборка','pick'],['Ждём курьера','wait'],['В пути','ride']];
  byId('stages').innerHTML = phases.map(([label,key])=>'<div class="stage"><span>'+label+'</span><div><i style="width:'+((result[key]??0)/Math.max(1,result.pick,result.wait,result.ride)*100)+'%"></i></div><b>'+fmt(result[key],' мин')+'</b></div>').join('');
  const baseline = Shift.summarize(Shift.applyDecision(sources.base.valid,'none').filter(row=>match(row)));
  const delta = result.wait===null || baseline.wait===null ? null : result.wait-baseline.wait;
  byId('diagnostic').textContent = delta===null?'Нет доставленных заказов в этом срезе.':'Ожидание курьера к обычной смене: '+signed(delta)+' мин. Сравнение для тех же зоны и времени.';
}
function compare() {
  const rawPeak=sources.peak.valid;
  const before=Shift.summarize(Shift.applyDecision(rawPeak,'none'));
  const after=Shift.summarize(Shift.applyDecision(rawPeak,state.decision));
  const notes = {
    none:'Для сравнения выбери действие. База — вечерний пик без вмешательства.',
    couriers:'Дополнительные курьеры сокращают ожидание на срок до 9 минут на заявку в зоне действия. Допрасход в модели — 26 ₽ на каждую такую заявку.',
    assembly:'Усиление сборки сокращает её на срок до 3 минут на заявку в зоне действия. Допрасход — 10 ₽ на каждую такую заявку.',
    throttle:'Каждая четвёртая заявка в зоне действия откладывается, у остальных ожидание сокращается на срок до 5 минут. Проверяй исполнение спроса вместе с SLA.'
  };
  const deltas = [
    ['SLA',pct(before.rate),pct(after.rate),signed((after.rate-before.rate)*100)+' п. п.'],
    ['Исполнение',pct(before.fulfilment),pct(after.fulfilment),signed((after.fulfilment-before.fulfilment)*100)+' п. п.'],
    ['Вклад',rub.format(before.contribution),rub.format(after.contribution),signed(after.contribution-before.contribution)+' ₽']
  ];
  const extraOnTime = (after.delivered-after.late)-(before.delivered-before.late);
  const costPerOrder = extraOnTime>0 ? (before.contribution-after.contribution)/extraOnTime : null;
  const tradeoff = costPerOrder===null ? '' : ' Дополнительно вовремя: '+extraOnTime+' заказов. Цена улучшения: '+rub.format(costPerOrder)+' снижения вклада за дополнительную доставку в SLA.';
  byId('decision-result').innerHTML='<div class="deltas">'+deltas.map(([label,oldValue,newValue,change])=>'<span>'+label+' <b>'+oldValue+' → '+newValue+'</b> ('+change+')</span>').join('')+'</div><p>'+notes[state.decision]+tradeoff+'</p>';
}
function renderTable(orders) {
  const excluded = sources[state.scenario].rejected.filter(row=>match(row));
  const visibleOrders = orders.filter(row=>match(row));
  shown = state.view==='invalid'?excluded:state.view==='late'?visibleOrders.filter(row=>row.flag):visibleOrders;
  const summary = ['Дубликат ID','Пропуск ожидания','Отрицательное время','Отрицательный чек']
    .map(flag=>[flag,excluded.filter(row=>row.flag===flag).length]).filter(([,count])=>count)
    .map(([flag,count])=>flag.toLowerCase()+' '+count).join(' · ');
  byId('quality').textContent = excluded.length?'Исключено при валидации: '+excluded.length+' · '+summary:'В этом срезе ошибки данных не обнаружены.';
  const start = state.page*pageSize;
  const page = shown.slice(start,start+pageSize);
  const statuses = {delivered:'Доставлен',cancelled:'Отменён',deferred:'Отложен'};
  byId('rows').innerHTML = page.length?page.map(row=>'<tr>'+[
    row.id,zoneNames[row.zone],row.slot,fmt(row.pick),fmt(row.wait),fmt(row.ride),fmt(row.total??null),rub.format(row.basket)
  ].map(value=>'<td>'+value+'</td>').join('')+'<td class="'+(row.flag?'flag':'')+'">'+(row.flag||statuses[row.status])+'</td></tr>').join('')
    :'<tr><td colspan="9">В этом срезе нет строк.</td></tr>';
  byId('page-status').textContent = page.length?(start+1)+'–'+(start+page.length)+' из '+shown.length:'0 строк';
  byId('previous').disabled = state.page===0;
  byId('next').disabled = start+pageSize>=shown.length;
  byId('download').disabled = !shown.length;
}
function render() {
  const orders = Shift.applyDecision(sources[state.scenario].valid,state.decision);
  setButtons('[data-scenario]','scenario',state.scenario);
  setButtons('[data-action]','action',state.decision);
  setButtons('[data-view]','view',state.view);
  byId('zone').value=state.zone;
  byId('slot').value=state.slot;
  dashboard(orders);
  compare();
  renderTable(orders);
}
function update(changes) {
  Object.assign(state,{page:0},changes);
  render();
}
document.querySelectorAll('[data-scenario]').forEach(button=>button.addEventListener('click',()=>{
  update({scenario:button.dataset.scenario,decision:'none'});
  hero(state.scenario,state.scenario==='peak'?4:0);
}));
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>{
  update({scenario:'peak',decision:button.dataset.action});
  hero('peak',4);
}));
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>update({view:button.dataset.view})));
byId('zone').addEventListener('change',event=>update({zone:event.target.value}));
byId('slot').addEventListener('change',event=>update({slot:event.target.value}));
byId('bars').addEventListener('click',event=>{
  const button=event.target.closest('[data-slot]');
  if (!button) return;
  const {slot} = button.dataset;
  update({slot});
});
byId('clear-slot').addEventListener('click',()=>update({slot:'all'}));
byId('previous').addEventListener('click',()=>{state.page--;render();});
byId('next').addEventListener('click',()=>{state.page++;render();});
byId('download').addEventListener('click',()=>{
  const data = new Blob(['\uFEFF',Shift.csv(shown)],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(data);
  const a=document.createElement('a');
  a.href=url;
  a.download='shift-'+state.scenario+'-'+state.zone+'-'+state.slot.replace(':','')+'-'+state.view+'.csv';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
byId('start').addEventListener('click',event=>{
  hero('peak',4);
  update({scenario:'peak',zone:'all',slot:'all',decision:'none',view:'all'});
  if (event.currentTarget.tagName === 'BUTTON') location.hash = 'simulator';
});
hero('base',0);
render();
