const Brief = (() => {
 const period = {elapsed:12, total:20};
 // One snapshot per agency portfolio. Amounts are whole EUR, payments are settled net of reversals.
 const raw = [
  {row:1,id:'NORTH',plan:180000,plannedBalance:600000,plannedRate:.18,balance:500000,paid:75000},
  {row:2,id:'EAST',plan:150000,plannedBalance:500000,plannedRate:.18,balance:500000,paid:97000},
  {row:3,id:'WEST',plan:120000,plannedBalance:400000,plannedRate:.18,balance:400000,paid:68000},
  {row:4,id:'NORTH',plan:180000,plannedBalance:600000,plannedRate:.18,balance:500000,paid:75000},
  {row:5,id:'SOUTH',plan:50000,plannedBalance:166000,plannedRate:.18,balance:null,paid:null},
  {row:6,id:'WEST',plan:120000,plannedBalance:400000,plannedRate:.18,balance:400000,paid:410000}
 ];
 // Aggregated delivery logs. Each attempted SMS contributes at most one final status.
 const delivery = {current:{delivered:360,attempted:500}, previous:{delivered:470,attempted:500}};
 const tasks = [
  {id:'A-01',portfolio:'NORTH',owner:'Operations',due:11},
  {id:'A-02',portfolio:'NORTH',owner:'Product',due:13},
  {id:'A-03',portfolio:'SOUTH',owner:'Finance',due:13},
  {id:'A-04',portfolio:'WEST',owner:'Data',due:13}
 ];
 const scenarios = {base:1,low:.85,high:1.2};

 function validate(input){
  const accepted=[], rejected=[], seen=new Set();
  for(const row of input){
   const reason = row.balance==null || row.paid==null ? 'missing'
    : !Number.isFinite(row.paid) || !Number.isFinite(row.balance) || row.balance<=0 || row.paid<0 || row.paid>row.balance ? 'invalid'
    : seen.has(row.id) ? 'duplicate' : '';
   if(reason){rejected.push({...row,reason});continue;}
   seen.add(row.id);
   accepted.push(row);
  }
  return {accepted,rejected};
 }

 function calculate(rows,key='base'){
  const sums=rows.reduce((a,r)=>{
   a.plan+=r.plan;
   a.actual+=r.paid;
   a.balance+=r.balance;
   a.cutoff+=r.plannedBalance*r.plannedRate;
   a.volume+=(r.balance-r.plannedBalance)*r.plannedRate;
   a.yield+=r.paid-r.balance*r.plannedRate;
   return a;
  },{plan:0,actual:0,balance:0,cutoff:0,volume:0,yield:0});
  const daysLeft=period.total-period.elapsed;
  const pace=sums.actual/period.elapsed;
  const forecast=Math.round(sums.actual+pace*daysLeft*scenarios[key]);
  return {...sums, gap:sums.actual-sums.cutoff, forecast, daysLeft, pace,
   requiredPace:Math.max(0,(sums.plan-sums.actual)/daysLeft), rate:sums.actual/sums.balance};
 }

 return {period,raw,delivery,tasks,scenarios,validate,calculate};
})();
if(typeof module!=='undefined')module.exports=Brief;
