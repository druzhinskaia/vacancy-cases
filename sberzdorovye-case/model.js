const lanes = ['Расписание', 'Контакт-центр', 'Координация'];
const models = {
  asis: {
    note: 'Гипотеза AS-IS: оператор узнаёт об отмене вручную. Если слота нет, исход обращения и срок повторной связи могут потеряться. Проверю это на интервью и по истории событий.',
    nodes: [
      ['start','start',165,45,'Слот отменён'],['list','task',315,45,'Обновить список|отмен'],
      ['notice','task',315,135,'Найти отмену|в списке'],['search','task',465,135,'Искать свободный|слот'],
      ['available','gate',610,135,'Есть слот?'],['confirm','task',770,135,'Связаться|с пациентом'],
      ['end','end',930,135,'Исход зафиксирован'],['later','task',770,225,'Отложить|обращение'],
      ['lost','end',930,225,'Ожидает обработки']
    ],
    edges: [['start','list'],['list','notice'],['notice','search'],['search','available'],['available','confirm','Да'],['confirm','end'],['available','later','Нет',[[610,225]]],['later','lost']]
  },
  tobe: {
    note: 'TO-BE: событие создаёт задачу с таймером. Оператор проверяет доступность слота и согласие пациента. Если перенести запись не удалось, координатор фиксирует причину.',
    nodes: [
      ['start','start',165,45,'Слот отменён'],['dispatch','service',315,45,'Создать задачу|в CRM'],
      ['search','task',315,135,'Проверить слот|и связаться'],['timer','timer',351,161,'30 мин'],
      ['accepted','gate',505,135,'Перенос согласован?'],['book','task',690,135,'Подтвердить|новую запись'],
      ['done','end',915,135,'Запись перенесена'],['review','task',690,225,'Разобрать задачу|и записать исход'],
      ['closed','end',915,225,'Исход зафиксирован']
    ],
    edges: [['start','dispatch'],['dispatch','search'],['search','accepted'],['accepted','book','Да'],['book','done'],['accepted','review','Нет',[[505,225]]],['timer','review','',[[351,225]]],['review','closed']]
  }
};
const visits = [];
for (const cohort of ['before','after']) {
  const after = cohort === 'after';
  for (let number = 0; number < 50; number++) {
    const web = number < 28;
    const channel = web ? 'web' : 'phone';
    const position = web ? number : number - 28;
    const visited = position < (web ? (after ? 22 : 18) : (after ? 16 : 13));
    const confirmed = visited || position < (web ? (after ? 26 : 23) : (after ? 20 : 18));
    const reaction_min = position % 3 === 0 ? (after ? 14 : 28) + position * (after ? 1 : 2) : null;
    visits.push({booking_id: (after ? 1051 : 1001) + number, cohort, channel, confirmed: Number(confirmed), outcome: visited ? 'visited' : (confirmed ? 'no_visit' : 'cancelled'), reaction_min});
  }
}
if (typeof module !== 'undefined') module.exports = { lanes, models, visits };
