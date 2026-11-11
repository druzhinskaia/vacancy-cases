const BriefLanguage = {
 ru: {
  locale:'ru-RU',
  metrics:['План на D12','Факт на D12','Отклонение','Прогноз / план месяца'],
  drivers:['Эффект объёма лидов','Эффект конверсии'],
  activations:'активаций',
  pace:(required,current,days)=>'Чтобы выполнить план: '+required+' активаций за рабочий день. Текущий темп: '+current+'. Осталось '+days+' рабочих дней.',
  coverage:'Покрытие отчёта: 3 из 4 проектов. План Legacy 250 активаций исключён из сравнения: факт не получен.',
  requests:{
   CRM:'Growth: подтвердить −200 лидов по источникам. Product: проверить шаг онбординга, где просела конверсия.',
   FLOW:'Product: подтвердить рост конверсии и исключить изменение определения активации.',
   DATA:'Delivery: сверить журнал задержанных активаций и подтвердить дату следующей выгрузки.',
   all:'Growth: подтвердить отклонение по CRM Core. Reporting: запросить факт Legacy и указать срок предоставления.'
  },
  taskCount:(late,open)=>'Просрочено: '+late+' · открыто: '+open,
  done:'выполнено', overdue:'просрочено', reopen:'Переоткрыть', mark:'Отметить выполненным', empty:'По выбранному проекту поручений нет.',
  brief:(ids,scenario,actual,cutoff,gap,forecast,plan,next)=>
   'Источники: '+ids+' · '+scenario+'\nФакт: '+actual+' при плане D12 '+cutoff+' ('+gap+'). Прогноз: '+forecast+' из '+plan+'.\nСледующий шаг: '+next,
  noDraft:'Выбери проект и собери сводку.',
  blocked:'Черновик заблокирован.',
  error:(draft,model)=>'Прогноз в черновике '+draft+', по модели '+model+'.',
  mismatch:'Суммы или источники расходятся.',
  checked:'Проверено: пять числовых полей и набор ID совпадают с расчётом.',
  exportTitle:'Сводка для CEO · демонстрация'
 },
 en: {
  locale:'en-US',
  metrics:['Day 12 target','Day 12 actual','Variance','Forecast / monthly target'],
  drivers:['Lead volume effect','Conversion effect'],
  activations:'activations',
  pace:(required,current,days)=>'To hit the target: '+required+' activations per working day. Current pace: '+current+'. '+days+' working days remaining.',
  coverage:'Reporting coverage: 3 of 4 projects. The Legacy target of 250 activations is excluded because actuals are missing.',
  reasons:{'Дубликат ключа':'Duplicate key','Нет факта':'Missing actuals','Некорректный факт':'Invalid actuals'},
  requests:{
   CRM:'Growth: verify the 200-lead shortfall by source. Product: identify where conversion fell in the onboarding funnel.',
   FLOW:'Product: confirm the conversion increase and check whether the definition of an activation changed.',
   DATA:'Delivery: reconcile delayed activations against the event log and confirm when the next extract will be available.',
   all:'Growth: confirm the variance for CRM Core. Reporting: request the Legacy actuals and agree a delivery deadline.'
  },
  actions:{
   'A-01':'Confirm lead volume by channel and identify the sources of the shortfall',
   'A-02':'Review a sample of leads to locate onboarding drop-offs',
   'A-03':'Reconcile delayed activations against the event log'
  },
  taskCount:(late,open)=>'Overdue: '+late+' · open: '+open,
  done:'completed', overdue:'overdue', reopen:'Reopen', mark:'Mark complete', empty:'No actions for this project.',
  scenario:{base:'Baseline',low:'Stress case',high:'Faster pace'},
  brief:(ids,scenario,actual,cutoff,gap,forecast,plan,next)=>
   'Source IDs: '+ids+' · '+scenario+'\nActuals: '+actual+' against a Day 12 target of '+cutoff+' ('+gap+'). Forecast: '+forecast+' against a monthly target of '+plan+'.\nNext step: '+next,
  noDraft:'Choose a project and build the draft.',
  blocked:'Draft blocked.',
  error:(draft,model)=>'The draft forecasts '+draft+', while the model forecasts '+model+'.',
  mismatch:'The figures or source IDs do not match.',
  checked:'Verified: all five numeric fields and the source IDs match the calculation.',
  exportTitle:'CEO brief · demonstration'
 }
};
