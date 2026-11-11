const Brief = (() => {
 const period={elapsed:12,total:20};
 const raw=[
  {id:'CRM',name:'CRM Core',owner:'Мария · Growth',plan:1000,expectedLeads:1200,expectedRate:.5,leads:1000,actual:450,received:true},
  {id:'FLOW',name:'Workflow',owner:'Денис · Product',plan:800,expectedLeads:1200,expectedRate:.4,leads:1210,actual:502,received:true},
  {id:'DATA',name:'Data Hub',owner:'Алина · Delivery',plan:600,expectedLeads:800,expectedRate:.45,leads:780,actual:320,received:true},
  {id:'CRM',name:'CRM Core',owner:'Мария · Growth',plan:1000,expectedLeads:1200,expectedRate:.5,leads:1000,actual:450,received:true},
  {id:'LEGACY',name:'Legacy',owner:'Reporting',plan:250,expectedLeads:300,expectedRate:.5,leads:null,actual:null,received:false}
 ];
 const tasks=[
  {id:'A-01',project:'CRM',action:'Подтвердить объём лидов по каналам и источники просадки',owner:'Growth',due:11},
  {id:'A-02',project:'CRM',action:'Проверить потери в онбординге на выборке лидов',owner:'Product',due:14},
  {id:'A-03',project:'DATA',action:'Сверить задержанные активации с журналом событий',owner:'Delivery',due:13}
 ];
 const scenarios={base:{label:'Базовый',factor:1},low:{label:'Стресс',factor:.85},high:{label:'Ускорение',factor:1.2}};
 function validate(input){
  const accepted=[], rejected=[], seen=new Set();
  for(const row of input){
   const reason=seen.has(row.id)?'Дубликат ключа':!row.received||row.actual===null||row.leads===null?'Нет факта':row.leads<0||row.actual<0||row.actual>row.leads?'Некорректный факт':'';
   if(reason){rejected.push({...row,reason});continue;}
   seen.add(row.id);accepted.push(row);
  }
  return {accepted,rejected};
 }
 function calculate(rows,key='base'){
  const s=rows.reduce((a,r)=>{
   a.plan+=r.plan;a.actual+=r.actual;
   a.cutoff+=r.expectedLeads*r.expectedRate;
   a.volume+=(r.leads-r.expectedLeads)*r.expectedRate;
   a.conversion+=r.actual-r.leads*r.expectedRate;
   return a;
  },{plan:0,actual:0,cutoff:0,volume:0,conversion:0});
  s.gap=s.actual-s.cutoff;
  s.forecast=Math.round(s.actual+s.actual/period.elapsed*(period.total-period.elapsed)*scenarios[key].factor);
  s.remaining=s.plan-s.actual;
  return s;
 }
 const csv=rows=>rows.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n');
 return {period,raw,tasks,scenarios,validate,calculate,csv};
})();
if(typeof module!=='undefined')module.exports=Brief;
