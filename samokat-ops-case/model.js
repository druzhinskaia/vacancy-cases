const Shift = (() => {
  const zones = [
    {id:'north', name:'Север', base:18, peak:[0,0,9,27,31,16]},
    {id:'center', name:'Центр', base:22, peak:[0,1,16,45,54,29]},
    {id:'south', name:'Юг', base:16, peak:[0,0,5,13,17,9]}
  ];
  const times = ['18:00','18:20','18:40','19:00','19:20','19:40'];
  const scenarios = {base:'Обычная смена', peak:'Вечерний пик'};
  const decisions = {none:'Без изменений', couriers:'Добавить курьеров в Центре', assembly:'Усилить сборку в Центре', throttle:'Ограничить приём в Центре'};
  const sla = 25;
  const fields = ['id','scenario','zone','slot','status','pick','wait','ride','total','basket','cost','contribution','flag'];
  function createOrders(scenario) {
    const rows = [];
    for (const [zoneIndex, zone] of zones.entries()) {
      for (const [slot, time] of times.entries()) {
        const extra = scenario === 'peak' ? zone.peak[slot] : 0;
        const count = zone.base + slot % 3 + extra;
        for (let i = 0; i < count; i++) {
          const jitter = (i*13+slot*7+zoneIndex*3)%11;
          const pick = 4 + jitter%5 + Math.floor(extra/22);
          const wait = 2 + jitter%4 + Math.floor(extra/5);
          const ride = 8 + (i*7+slot+zoneIndex)%7;
          const status = i % 29 === 0 ? 'cancelled' : 'delivered';
          const basket = 430 + (i*179 + zoneIndex*101 + slot*39)%970;
          rows.push({id:'O'+(1001+rows.length),scenario,zone:zone.id,slot:time,status,pick,wait,ride,basket});
        }
      }
    }
    return rows;
  }
  function rawOrders(scenario) {
    const rows = createOrders(scenario);
    return [
      ...rows,
      ...[3,41,87,122].map(i => ({...rows[i]})),
      {...rows[8],id:'X01',ride:-8},
      {...rows[21],id:'X02',wait:null},
      {...rows[50],id:'X03',basket:-400}
    ];
  }
  function validate(rows) {
    const seen = new Set(), valid = [], rejected = [];
    for (const row of rows) {
      let flag = '';
      if (seen.has(row.id)) flag = 'Дубликат ID';
      else if (row.wait == null) flag = 'Пропуск ожидания';
      else if (row.ride < 0 || row.pick < 0 || row.wait < 0) flag = 'Отрицательное время';
      else if (row.basket < 0) flag = 'Отрицательный чек';
      if (flag) rejected.push({...row,flag});
      else { seen.add(row.id); valid.push(row); }
    }
    return {valid,rejected};
  }
  function applyDecision(rows, decision) {
    const counter = {};
    return rows.map(row => {
      let {status,pick,wait} = row;
      const intervention = row.scenario === 'peak' && row.zone === 'center' && row.slot >= '19:00';
      let interventionCost = 0;
      if (intervention && decision === 'couriers') {
        wait = Math.max(2,wait-9);
        interventionCost = 26;
      }
      if (intervention && decision === 'assembly') {
        pick = Math.max(3,pick-3);
        interventionCost = 10;
      }
      if (intervention && decision === 'throttle') {
        const position = counter[row.slot] = (counter[row.slot] || 0) + 1;
        if (position % 4 === 0) status = 'deferred';
        else wait = Math.max(2,wait-5);
      }
      const total = status === 'delivered' ? pick+wait+row.ride : null;
      const cost = (status === 'delivered' ? 100 : status === 'cancelled' ? 22 : 0) + interventionCost;
      const contribution = (status === 'delivered' ? Math.round(row.basket*0.24) : 0) - cost;
      return {...row,status,pick,wait,total,cost,contribution,flag:total!==null && total>sla ? 'Просрочка SLA' : ''};
    });
  }
  const sum = (rows,key) => rows.reduce((acc,row)=>acc+row[key],0);
  function summarize(rows) {
    const delivered = rows.filter(row => row.status === 'delivered');
    const late = delivered.filter(row => row.total > sla).length;
    const avg = key => delivered.length ? sum(delivered,key)/delivered.length : null;
    const deferred = rows.filter(row=>row.status==='deferred').length;
    const cancelled = rows.filter(row=>row.status==='cancelled').length;
    return {
      demand:rows.length,delivered:delivered.length,late,deferred,cancelled,
      rate:delivered.length ? (delivered.length-late)/delivered.length : null,
      fulfilment:rows.length ? delivered.length/rows.length : null,
      revenue:sum(delivered,'basket'),contribution:sum(rows,'contribution'),
      total:avg('total'),pick:avg('pick'),wait:avg('wait'),ride:avg('ride')
    };
  }
  function csv(rows, keys=fields) {
    return [keys.join(';'),...rows.map(row=>keys.map(key=>String(row[key]??'').replaceAll(';',',')).join(';'))].join('\r\n');
  }
  return {zones,times,scenarios,decisions,sla,fields,rawOrders,validate,applyDecision,summarize,csv};
})();
if (typeof module !== 'undefined') module.exports = Shift;
