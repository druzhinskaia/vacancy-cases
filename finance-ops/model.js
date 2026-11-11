const Ops = (() => {
  const accounts = {
    ALPHA: {name:'PSP Alpha', currency:'EUR', opening:1200000, reserve:500000},
    BETA: {name:'PSP Beta', currency:'EUR', opening:800000, reserve:400000},
    DELTA: {name:'PSP Delta', currency:'USD', opening:900000, reserve:450000}
  };
  const ledger = [
    ['P-1041','ALPHA',250000],['P-1042','ALPHA',180000],['P-1043','ALPHA',180000],
    ['P-1044','ALPHA',-76000],['P-1045','ALPHA',62000],
    ['P-2041','BETA',225000],['P-2042','BETA',-115000],['P-2043','BETA',74000],['P-2044','BETA',135000],
    ['P-3041','DELTA',185000],['P-3042','DELTA',-75000],['P-3043','DELTA',96000],['P-3044','DELTA',-24000]
  ].map(([ref,account,amount])=>({ref,account,amount,currency:accounts[account].currency}));
  const statements = [
    ['S-001','P-1041','ALPHA',250000],['S-002','P-1042','ALPHA',180000],
    ['S-003','P-1043','ALPHA',180000],['S-004','P-1044','ALPHA',-76000],
    ['S-005','P-1045','ALPHA',62000],
    ['S-006','P-2041','BETA',225000],['S-007','P-2042','BETA',-115000],
    ['S-008','P-2043','BETA',74000],['S-009','P-2044','BETA',135000],
    ['S-010','P-3041','DELTA',185000],['S-011','P-3042','DELTA',-75000],
    ['S-012','P-3043','DELTA',96000],['S-013','P-3044','DELTA',-24000]
  ].map(([id,ref,account,amount])=>({id,ref,account,amount,currency:accounts[account].currency}));
  const incidentRows = [
    ...statements.filter(row=>row.ref!=='P-2044').map(row=>row.ref==='P-1042'?{...row,amount:177500}:row),
    {...statements[2]},
    {id:'S-014',ref:'F-3001',account:'DELTA',currency:'USD',amount:-1800}
  ];
  const payouts = [
    {id:'W-501',account:'ALPHA',amount:350000},
    {id:'W-502',account:'BETA',amount:600000},
    {id:'W-503',account:'DELTA',amount:210000}
  ];
  const types = {
    duplicate:{title:'Дубликат строки',detail:'Выписка содержит повтор строки с тем же ID S-003 и теми же полями. Сумма также встречается в другой операции. Проверяю идентификатор строки, а не сумму.',action:'Исключить дубль импорта',note:'Повтор S-003 исключён из импорта. Денежное движение учитывается один раз.'},
    amount:{title:'Разница суммы',detail:'По P-1042 отчёт провайдера показывает 1 800 EUR брутто, 25 EUR комиссии и 1 775 EUR нетто. Подтверждённая комиссия объясняет расхождение.',action:'Учесть комиссию',note:'Добавлена корректировка −25 EUR с привязкой к P-1042.'},
    pending:{title:'Нет строки в выписке',detail:'По P-2044 провайдер подтвердил расчёт на следующий день. Операция остаётся в списке контроля и исключается из остатка текущей смены.',action:'Перенести на контроль',note:'P-2044 перенесена на сверку следующей смены. Из расчёта текущего остатка исключено 1 350 EUR.'},
    missing:{title:'Нет строки в реестре',detail:'F-3001 — комиссия провайдера, подтверждённая отчётом. В выписке она проведена, в реестре строки нет.',action:'Создать ручную запись',note:'Создана запись комиссии −18 USD с привязкой к F-3001.'}
  };
  const key = row => [row.account,row.currency,row.ref].join('|');
  function reconcile(raw) {
    const unique = new Map(), exceptions = [];
    for (const row of raw) {
      if (unique.has(row.id)) {
        exceptions.push({id:'duplicate-'+row.id,type:'duplicate',ref:row.ref,account:row.account,delta:row.amount});
      } else unique.set(row.id,row);
    }
    const actual = new Map([...unique.values()].map(row=>[key(row),row]));
    const expected = new Set(ledger.map(key));
    const matched = [];
    for (const row of ledger) {
      const bank = actual.get(key(row));
      if (!bank) exceptions.push({id:'pending-'+row.ref,type:'pending',ref:row.ref,account:row.account,delta:-row.amount});
      else if (bank.amount!==row.amount) exceptions.push({id:'amount-'+row.ref,type:'amount',ref:row.ref,account:row.account,delta:bank.amount-row.amount});
      else matched.push(row);
    }
    for (const row of actual.values()) {
      if (!expected.has(key(row))) exceptions.push({id:'missing-'+row.ref,type:'missing',ref:row.ref,account:row.account,delta:row.amount});
    }
    return {exceptions,matched,unique:[...unique.values()]};
  }
  function balance(account, reconciled, resolved, booked) {
    const sum = rows => rows.filter(row=>row.account===account).reduce((value,row)=>value+row.amount,0);
    const opening = accounts[account].opening;
    const source = sum(ledger);
    const adjustment = reconciled.exceptions.filter(row=>row.account===account&&row.type!=='duplicate'&&resolved.has(row.id)).reduce((v,row)=>v+row.delta,0);
    const bank = sum(reconciled.unique);
    const withdrawals = sum(booked);
    return {opening,source,adjustment,bank,withdrawals,closing:opening+bank-withdrawals,
      ledgerClosing:opening+source+adjustment-withdrawals,diff:bank-source-adjustment};
  }
  function assess(payout,reconciled,resolved,booked) {
    const {account,amount,id}=payout;
    const current=balance(account,reconciled,resolved,booked);
    if (booked.some(row=>row.id===id)) return {code:'done',text:'Вывод отражён в журнале'};
    if (reconciled.exceptions.some(row=>row.account===account&&!resolved.has(row.id)) || current.diff!==0) return {code:'hold',text:'Сначала закрой исключения по счёту'};
    if (current.closing-amount<accounts[account].reserve) return {code:'hold',text:'После вывода остаток ниже резерва'};
    return {code:'ready',text:'Сверка пройдена, резерв соблюдён'};
  }
  function csv(rows) {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const quote = value => '"'+String(value??'').replaceAll('"','""')+'"';
    return [headers.join(';'),...rows.map(row=>headers.map(key=>quote(row[key])).join(';'))].join('\r\n');
  }
  return {accounts,ledger,statements,incidentRows,payouts,types,reconcile,balance,assess,csv};
})();
if (typeof module!=='undefined') module.exports=Ops;
