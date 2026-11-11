const BriefLanguage = {
 ru: {
  locale:'ru-RU',
  allPortfolios:'Все портфели с фактом',
  aiScope:(portfolio,scenario)=>`${portfolio} · ${scenario}`,
  copied:'Запрос скопирован.',
  copyManually:'Скопируй выделенный текст вручную.',
  invalidJson:'Вставь полный JSON из ответа модели и попробуй снова.',
  missingNumber:'нужно целое число',
  difference:(received,expected)=>`ответ ${received}, расчёт ${expected}`,
  wrongRows:rows=>`Ожидаемые строки источника — ${rows}.`,
  exampleSummary:'Сначала сверить исходные поступления и остатки, затем обновить прогноз.',
  modelNotes:'Текст модели для ручной проверки',
  prompt:`Подготовь короткую сводку для CEO по синтетическим данным CRM взыскания ниже. Используй только выбранный срез и сценарий.
Для каждого портфеля бери первую валидную строку по row_id. Валидная строка содержит остаток в работе больше нуля и платежи от нуля до этого остатка включительно. Пропуски, неверные строки и дубликаты исключи из всех сумм.
Сложи платежи, планы на месяц и планы на дату. План на дату по строке равен planned_balance_eur × planned_recovery_rate. Отклонение равно факту минус план на дату. Прогноз округли до целого евро после расчёта: факт + (факт / elapsed_days) × (total_days − elapsed_days) × remaining_pace_factor.
Верни один JSON-объект. Поля actual_eur, cutoff_target_eur, variance_eur, forecast_eur и month_target_eur должны содержать целые числа. Поле source_row_ids должно содержать массив целых ID принятых строк. В summary укажи риск, ограничение покрытия и ближайшее действие в двух предложениях. Если упоминаешь SMS, представь связь с возвратом как гипотезу. Ответ напиши на русском.`,
  portfolios:{NORTH:'Север',EAST:'Восток',WEST:'Запад',SOUTH:'Юг'},
  metrics:['План на день 12','Получено к дню 12','Отклонение','Прогноз / план месяца'],
  drivers:['Эффект объёма портфеля','Эффект доли возврата'],
  pace:(required,current,days)=>`Для выполнения плана нужно ${required} в рабочий день. Текущий темп — ${current}. Осталось ${days} рабочих дней.`,
  coverage:'В расчёте 3 из 4 портфелей. Прогноз по всей группе пока недоступен. Портфель «Юг» с месячным планом 50 000 € ожидает подтверждённых данных.',
  reasons:{missing:'Не поступили факт и остаток',invalid:'Платежи превышают остаток',duplicate:'Повторная строка портфеля'},
  row:'Строка',
  requests:{
   all:'Operations — подтвердить, какие партии счетов не поступили в «Север» и когда будут загружены. Finance — прислать сверенные данные «Юга» к дню 13.',
   NORTH:'Operations — сверить партии с журналом импорта. Product — проверить коды ошибок SMS по провайдеру и сопоставимым группам счетов к дню 13.',
   EAST:'Operations — сверить рост доли возврата по сопоставимым группам счетов и подтвердить, что он сохранится в следующих партиях.',
   WEST:'Data — сверить строку №6 с реестром платежей и исходным остатком к дню 13. Для отчёта принята валидная строка №3.'
  },
  evidence:(now,before)=>`В «Севере» доставлено ${now} SMS против ${before} в предыдущем сопоставимом срезе. Гипотеза — сбой доставки мог повлиять на возврат. Нужны коды ошибок и сверка платежей по сопоставимым группам счетов.`,
  decision:'CEO: запросить план восстановления импорта по «Северу» и эскалировать отсутствие факта по «Югу». На день 13 назначить повторную сверку и обновление прогноза.',
  actions:{
   'A-01':'Сверить незагруженные партии счетов и дать дату импорта',
   'A-02':'Проверить причины падения доставки SMS и пересчитать по группам счетов',
   'A-03':'Передать сверенные поступления и остаток по «Югу»',
   'A-04':'Сверить аномальную строку №6 с реестром платежей'
  },
  taskCount:(late,open)=>`Просрочено: ${late} · открыто: ${open}`,
  done:'выполнено',overdue:'просрочено',reopen:'Переоткрыть',mark:'Отметить выполненным',empty:'По выбранному портфелю открытых вопросов в реестре нет.',
  scenario:{base:'Базовый',low:'Стресс',high:'Ускорение'},
  brief:(ids,scenario,actual,cutoff,gap,forecast,plan,next)=>`Строки источника: ${ids} · ${scenario}\nК дню 12 поступило ${actual} при плане ${cutoff} (${gap}). Прогноз — ${forecast} при плане месяца ${plan}.\nДействие: ${next}`,
  blocked:'Выгрузка заблокирована.',
  checked:'Пять числовых полей и ссылки на строки совпадают с расчётом.',
  exportTitle:'Сводка для CEO · демоданные'
 },
 en: {
  locale:'en-GB',
  allPortfolios:'All reporting portfolios',
  aiScope:(portfolio,scenario)=>`${portfolio} · ${scenario}`,
  copied:'Prompt copied.',
  copyManually:'Copy the selected text manually.',
  invalidJson:'Paste the complete JSON from the model reply and try again.',
  missingNumber:'whole number required',
  difference:(received,expected)=>`reply ${received}, calculation ${expected}`,
  wrongRows:rows=>`Expected source rows: ${rows}.`,
  exampleSummary:'Reconcile collections and assigned balances, then update the forecast.',
  modelNotes:'Model text for manual review',
  prompt:`Write a short CEO brief based on the synthetic debt collection CRM data below. Use the selected scope and scenario.
Keep the first valid row by row_id for each portfolio. A valid row has an assigned balance above zero and payments between zero and that balance, inclusive. Exclude missing, invalid and duplicate rows from all totals.
Sum payments, monthly targets and targets to date. A row’s target to date is planned_balance_eur × planned_recovery_rate. Variance is actual minus target to date. Round the forecast to whole euros after applying this formula: actual + (actual / elapsed_days) × (total_days − elapsed_days) × remaining_pace_factor.
Return a single JSON object. The fields actual_eur, cutoff_target_eur, variance_eur, forecast_eur and month_target_eur must be integers. The field source_row_ids must be an array of integer IDs for accepted rows. In summary, describe the risk, coverage limit and next action in two sentences. If you mention SMS delivery, treat its link to collections as a hypothesis. Write in English.`,
  portfolios:{NORTH:'North',EAST:'East',WEST:'West',SOUTH:'South'},
  metrics:['Day 12 target','Collected by day 12','Variance','Forecast / monthly target'],
  drivers:['Portfolio balance effect','Recovery rate effect'],
  pace:(required,current,days)=>`Hitting the target requires ${required} per working day. Current pace is ${current}, with ${days} working days left.`,
  coverage:'3 of 4 portfolios are included. A group-wide forecast is pending. South has a €50,000 monthly target and is awaiting reconciled actuals.',
  reasons:{missing:'Actuals and balance missing',invalid:'Payments exceed eligible balance',duplicate:'Duplicate portfolio row'},
  row:'Row',
  requests:{
   all:'Operations — confirm which batches were missing from North and when they will be imported. Finance — deliver reconciled South data by day 13.',
   NORTH:'Operations — reconcile batches with the import log. Product — check SMS error codes by provider and comparable account cohorts by day 13.',
   EAST:'Operations — check whether the increase in recovery rate holds across comparable account cohorts and upcoming batches.',
   WEST:'Data — reconcile row 6 against the payments ledger and eligible balance by day 13. The report uses valid row 3.'
  },
  evidence:(now,before)=>`North delivered ${now} of SMS attempts versus ${before} in the previous comparable cut. Delivery issues could have affected recovery. Check provider error codes and compare payments across matched account cohorts.`,
  decision:'CEO: request an import recovery plan for North and escalate the missing South data. Reconcile the inputs and refresh the forecast on day 13.',
  actions:{
   'A-01':'Reconcile missing account batches and confirm the import date',
   'A-02':'Investigate lower SMS delivery and compare matched account cohorts',
   'A-03':'Provide reconciled collections and eligible balance for South',
   'A-04':'Reconcile invalid row 6 against the payments ledger'
  },
  taskCount:(late,open)=>`Overdue: ${late} · Open: ${open}`,
  done:'completed',overdue:'overdue',reopen:'Reopen',mark:'Mark complete',empty:'There are no tracked actions for this portfolio.',
  scenario:{base:'Baseline',low:'Stress case',high:'Faster pace'},
  brief:(ids,scenario,actual,cutoff,gap,forecast,plan,next)=>`Source rows: ${ids} · ${scenario}\nCollected by day 12: ${actual} against ${cutoff} (${gap}). Month-end forecast: ${forecast} against ${plan}.\nAction: ${next}`,
  blocked:'Export blocked.',
  checked:'All five numeric fields and source rows match the calculation.',
  exportTitle:'CEO brief · synthetic data'
 }
};
