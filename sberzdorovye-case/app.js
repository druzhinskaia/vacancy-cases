const get = id => document.getElementById(id);
const tabs = Array.from(document.querySelectorAll('[role=tab]'));
function openTab(id, focus = false) {
  for (const tab of tabs) {
    const active = tab.getAttribute('aria-controls') === id;
    tab.setAttribute('aria-selected', active);
    tab.tabIndex = active ? 0 : -1;
    get(tab.getAttribute('aria-controls')).hidden = !active;
    if (active && focus) tab.focus();
  }
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => openTab(tab.getAttribute('aria-controls')));
  tab.addEventListener('keydown', event => {
    const next = {ArrowRight:(index+1)%tabs.length,ArrowLeft:(index+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[event.key];
    if (next === undefined) return;
    event.preventDefault();
    openTab(tabs[next].getAttribute('aria-controls'), true);
  });
});
document.querySelectorAll('[data-open]').forEach(link => link.addEventListener('click', () => openTab(link.dataset.open)));

function boundaries(node, point) {
  const [,type,x,y] = node;
  const size = {start:[13,13],end:[13,13],timer:[10,10],gate:[21,21],task:[65,26],service:[65,26]}[type];
  const dx = point[0]-x, dy = point[1]-y;
  if (dx === 0 && dy === 0) return [x,y];
  const divisor = type === 'gate' ? Math.abs(dx)/size[0]+Math.abs(dy)/size[1] : Math.max(Math.abs(dx)/size[0],Math.abs(dy)/size[1]);
  return [x+dx/divisor,y+dy/divisor];
}
function getRoute(nodes, edge) {
  const [from,to,,turns=[]] = edge;
  const source = nodes.find(node => node[0] === from);
  const target = nodes.find(node => node[0] === to);
  return [boundaries(source,turns[0]??target.slice(2,4)), ...turns, boundaries(target,turns.at(-1)??source.slice(2,4))];
}
function drawNode([id,type,x,y,label]) {
  const circle = ['start','end','timer'].includes(type);
  const shape = circle
    ? '<circle cx="'+x+'" cy="'+y+'" r="'+(type==='timer'?10:13)+'" fill="white" stroke="#2e7254" stroke-width="'+(type==='end'?4:1.6)+'"/>'
    : type==='gate'
      ? '<path d="M'+x+' '+(y-21)+' l21 21 -21 21 -21 -21Z" fill="#ecf9dd" stroke="#417c5b" stroke-width="1.6"/><text x="'+x+'" y="'+(y+5)+'" text-anchor="middle" font-size="15">×</text>'
      : '<rect x="'+(x-65)+'" y="'+(y-26)+'" width="130" height="52" rx="9" fill="'+(type==='service'?'#dcf5e6':'white')+'" stroke="#6c9880"/>';
  const marker = type==='timer' ? '<circle cx="'+x+'" cy="'+y+'" r="6" fill="none" stroke="#2e7254"/><path d="M'+x+' '+(y-4)+' v4 l3 2" fill="none" stroke="#2e7254"/>' : '';
  const lines = label.split('|');
  const top = type==='timer'?y+22:circle?y+29:type==='gate'?y+38:y-(lines.length-1)*7+4;
  const labels = lines.map((line,index) => '<text x="'+x+'" y="'+(top+index*15)+'" text-anchor="middle" font-size="'+(type==='timer'?10:12)+'" fill="#24483a">'+line+'</text>').join('');
  return shape+marker+labels;
}
function renderModel(key) {
  const {nodes,edges,note} = models[key];
  const rows = lanes.map((lane,i) => '<rect x="0" y="'+(i*90)+'" width="1050" height="90" fill="'+(i%2?'#f1f7f1':'#fafcf9')+'" stroke="#dce7de"/><text x="14" y="'+(i*90+48)+'" font-size="12" fill="#476559">'+lane+'</text>').join('');
  const connectors = edges.map(edge => {
    const route = getRoute(nodes,edge);
    const [x,y] = route[0], [nx,ny] = route[1];
    const lx = (x+nx)/2+(x===nx?9:0), ly=(y+ny)/2-(y===ny?8:0);
    return '<polyline points="'+route.map(point=>point.join(',')).join(' ')+'" fill="none" stroke="#4f7e67" stroke-width="1.4" marker-end="url(#arrow)"/>'+(edge[2]?'<text x="'+lx+'" y="'+ly+'" font-size="11" fill="#305941">'+edge[2]+'</text>':'');
  }).join('');
  get('diagram').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 270" role="img" aria-label="Модель '+key.toUpperCase()+'"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#4f7e67"/></marker></defs>'+rows+'<path d="M118 0V270" stroke="#dce7de"/>'+connectors+nodes.map(drawNode).join('')+'</svg>';
  get('process-note').textContent = note;
  get('bpmn-download').href = key+'.bpmn';
  document.querySelectorAll('[data-model]').forEach(button => button.setAttribute('aria-pressed',button.dataset.model===key));
}
document.querySelectorAll('[data-model]').forEach(button => button.addEventListener('click',() => renderModel(button.dataset.model)));
renderModel('tobe');

const scenarios = {
  cancel: ['Событие EVT-204 принято для записи BK-1051.', 'CRM создала задачу T-038 и назначила очередь контакт-центра.', 'Таймер SLA установлен на 30 минут.'],
  duplicate: ['Событие EVT-204 уже есть в журнале.', 'CRM вернула ссылку на существующую задачу T-038.', 'Дубликат задачи не создан.'],
  conflict: ['При подтверждении расписание вернуло конфликт слота.', 'Новая запись не создана. Причина сохранена в журнале.', 'Задача вернулась оператору на поиск времени.'],
  timeout: ['30 минут без первого действия по задаче T-038.', 'Задача эскалирована координатору.', 'Просрочка включена в контроль SLA.']
};
get('run-scenario').addEventListener('click', () => {
  get('events').replaceChildren(...scenarios[get('scenario').value].map(step => {
    const li = document.createElement('li');
    li.textContent = step;
    return li;
  }));
});
get('sql-preview').textContent = 'SELECT cohort, channel,\n  COUNT(*) AS bookings,\n  COUNT(*) FILTER (WHERE outcome = \'visited\') AS visits\nFROM bookings\nGROUP BY cohort, channel;';

const selected = () => visits.filter(row => get('channel').value === 'all' || row.channel === get('channel').value);
const number = new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1});
const signed = new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1,signDisplay:'exceptZero'});
function stats(rows) {
  const confirmed = rows.filter(row=>row.confirmed).length;
  const attended = rows.filter(row=>row.outcome==='visited').length;
  const actions = rows.filter(row=>row.reaction_min!==null);
  return {count:rows.length,confirmed,attended,rate:attended/rows.length*100,mean:actions.reduce((sum,row)=>sum+row.reaction_min,0)/actions.length};
}
function renderDashboard() {
  const rows = selected();
  const before = stats(rows.filter(row=>row.cohort==='before'));
  const after = stats(rows.filter(row=>row.cohort==='after'));
  get('sample').textContent = 'Записей в выборке: '+rows.length+' · демоданные';
  const metrics = [
    ['Доля визитов', after.rate, '%', after.rate-before.rate, ' п. п.'],
    ['Состоявшиеся визиты', after.attended, '', after.attended-before.attended, ''],
    ['Среднее время реакции', after.mean, ' мин', after.mean-before.mean, ' мин']
  ];
  get('kpis').innerHTML = metrics.map(([label,value,unit,delta,deltaUnit]) =>
    '<article><h4>'+label+'</h4><strong>'+number.format(value)+unit+'</strong><small>'+signed.format(delta)+deltaUnit+' к периоду до пилота</small></article>').join('');
  const stages = [['Первичные записи','count'],['Подтверждённые записи','confirmed'],['Состоявшиеся визиты','attended']];
  const bar = (count,total,period) => '<div class="bar '+period+'" aria-label="'+(period==='after'?'После':'До')+': '+count+' из '+total+'"><i style="width:'+count/total*100+'%"></i><b>'+count+' / '+total+'</b></div>';
  get('funnel').innerHTML = stages.map(([label,key]) => '<div class="funnel-step"><span>'+label+'</span>'+bar(before[key],before.count,'before')+bar(after[key],after.count,'after')+'</div>').join('');
}
get('channel').addEventListener('change',renderDashboard);
renderDashboard();
get('export').addEventListener('click', () => {
  const columns = Object.keys(visits[0]);
  const csv = columns.join(';')+'\r\n'+selected().map(row=>columns.map(key=>row[key]??'').join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'booking-demo-'+get('channel').value+'.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
});
function updateEconomy() {
  const volume = get('volume'), uplift = get('uplift');
  if (!volume.value || !uplift.value || !volume.validity.valid || !uplift.validity.valid) {
    get('money').textContent = 'Проверь значения';
    return;
  }
  const amount = volume.valueAsNumber*uplift.valueAsNumber/100*500-25000;
  get('money').textContent = new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(amount)+' ₽';
}
get('volume').addEventListener('input',updateEconomy);
get('uplift').addEventListener('input',updateEconomy);
