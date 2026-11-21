const text = label => ({ label, type: 'text' });
const count = label => ({ label, type: 'number', min: 0, step: '1' });
const number = label => ({ label, type: 'number', min: 0, step: 'any' });
const signed = label => ({ label, type: 'number', step: 'any' });

export const defaults = { coverage: 14, expiry: 60 };

export const tables = {
  supplies: {
    title: 'Сверка поставок',
    download: 'supply-reconciliation.xlsx',
    description: 'Сравните количество по заказу и по факту. Недостача считается по каждой строке, излишки её не компенсируют.',
    fields: [text('Заказ'), count('Заказано, уп.'), count('Принято, уп.')],
    results: ['Разница, уп.', 'Статус'],
    rows: [['ФЛ-1042', 100, 95], ['ФЛ-1043', 50, 50], ['ФЛ-1044', 120, 129], ['ФЛ-1045', 75, 75], ['ФЛ-1046', 40, 0]]
  },
  stock: {
    title: 'Складские остатки',
    download: 'inventory-control.xlsx',
    description: 'Покрытие равно остатку, делённому на средний расход в день. При нулевом расходе срок покрытия не рассчитывается. Срок годности проверяется для партий с остатком.',
    fields: [text('Партия'), count('Остаток, уп.'), number('Расход, уп./день'), count('До истечения, дней')],
    results: ['Покрытие, дней', 'Статус'],
    rows: [['ФМ-018 · КХ-2705', 164, 10, 87], ['ФМ-025 · КХ-2211', 32, 6, 110], ['ФМ-037 · КХ-2008', 125, 4, 28], ['ФМ-044 · КХ-1997', 18, 3, 0], ['ФМ-061 · КХ-2402', 52, 0, 96]]
  },
  pilot: {
    title: 'Метрики пилота',
    download: 'pilot-metrics.xlsx',
    description: 'Одна строка соответствует одному документу. Экономия считается как медиана разницы времени. Точность и доля пропусков рассчитываются по общему числу полей и расхождений.',
    fields: [text('Документ'), number('Вручную, мин'), number('С ИИ, мин'), count('Полей'), count('Верно'), count('Расхождений'), count('Пропущено')],
    results: ['Экономия, мин', 'Статус'],
    rows: [['УПД-101', 14, 6, 12, 11, 2, 0], ['УПД-102', 12, 4, 10, 10, 1, 0], ['УПД-103', 16, 7, 14, 12, 3, 1], ['УПД-104', 9, 10, 8, 8, 0, 0], ['УПД-105', 12, 5, 6, 6, 1, 0]]
  },
  custom: {
    title: 'Своя таблица',
    download: 'metric-template.xlsx',
    description: 'Добавьте свои показатели и единицы измерения. Разница считается по каждой строке отдельно.',
    fields: [text('Показатель'), text('Единица'), signed('План'), signed('Факт'), text('Комментарий')],
    results: ['Факт − план', 'Статус'],
    rows: [[]]
  }
};

const integer = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const percentage = new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 1 });
export const displayNumber = value => value == null ? '—' : integer.format(value);
const ratio = (n, d) => d ? percentage.format(n / d) : '—';

function readNumber(value, field) {
  if (value == null || String(value).trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < (field.min ?? -Infinity)) return null;
  return field.step === '1' && !Number.isInteger(parsed) ? null : parsed;
}

export function evaluateRow(tableId, row, settings = defaults) {
  if (!row.some(value => value != null && value !== '')) return { values: [null, ''], flagged: false };
  const numbers = tables[tableId].fields.flatMap((field, index) =>
    field.type === 'number' ? [readNumber(row[index], field)] : []
  );
  if (!String(row[0] ?? '').trim() || numbers.some(value => value === null)) {
    return { values: [null, 'Заполните поля'], flagged: true };
  }
  const [first, second, third, fourth, fifth, sixth] = numbers;
  if (tableId === 'supplies') {
    const delta = second - first;
    return { values: [delta, delta < 0 ? 'Недостача' : delta > 0 ? 'Излишек' : 'Совпало'], flagged: delta !== 0 };
  }
  if (tableId === 'stock') {
    const coverage = second > 0 ? first / second : null;
    const low = coverage !== null && coverage < settings.coverage;
    const close = first > 0 && third <= settings.expiry;
    const expiry = third === 0 ? 'Срок истёк' : 'Мало до истечения';
    const status = low && close ? `Мало запаса · ${expiry.toLowerCase()}` :
      low ? 'Мало запаса' : close ? expiry : 'Без сигнала';
    return { values: [coverage, status], flagged: low || close, low, close };
  }
  if (tableId === 'pilot') {
    if (fourth > third || sixth > fifth) return { values: [null, 'Проверьте количество'], flagged: true };
    const saved = first - second;
    const status = sixth > 0 ? 'Есть пропуск' : saved < 0 ? 'Дольше ручной сверки' : 'Проверено';
    return { values: [saved, status], flagged: sixth > 0 || saved < 0, totals: [third, fourth, fifth, sixth] };
  }
  const delta = second - first;
  return { values: [delta, delta < 0 ? 'Ниже плана' : delta > 0 ? 'Выше плана' : 'По плану'], flagged: delta < 0 };
}

export function summarize(tableId, results) {
  const flagged = results.filter(result => result.flagged).length;
  const deltas = results.flatMap(result => result.values[0] === null ? [] : [result.values[0]]);
  const populated = results.filter(result => result.values[1]).length;
  if (tableId === 'supplies') {
    return [
      ['Строк сверено', displayNumber(deltas.length)],
      ['Доля совпадений', ratio(deltas.filter(delta => delta === 0).length, deltas.length)],
      ['Недостача, уп.', displayNumber(deltas.length ? deltas.reduce((sum, delta) => sum + Math.max(0, -delta), 0) : null)]
    ];
  }
  if (tableId === 'stock') {
    const checked = results.some(result => result.low !== undefined);
    return [
      ['Партий с низким запасом', displayNumber(checked ? results.filter(result => result.low).length : null)],
      ['Партий с риском срока', displayNumber(checked ? results.filter(result => result.close).length : null)],
      ['Заполнено партий', displayNumber(results.filter(result => result.low !== undefined).length)]
    ];
  }
  if (tableId === 'pilot') {
    const sorted = deltas.sort((a, b) => a - b);
    const middle = (sorted.length - 1) / 2;
    const median = sorted.length ? (sorted[Math.floor(middle)] + sorted[Math.ceil(middle)]) / 2 : null;
    const [fields, correct, exceptions, missed] = results.reduce(
      (counts, result) => result.totals ? counts.map((count, i) => count + result.totals[i]) : counts,
      [0, 0, 0, 0]
    );
    return [['Медианная экономия, мин', displayNumber(median)], ['Точность полей', ratio(correct, fields)], ['Доля пропусков', ratio(missed, exceptions)]];
  }
  return [['Строк с показателями', displayNumber(populated)], ['Заполнено показателей', displayNumber(deltas.length)], ['Факт ниже плана', displayNumber(flagged - (populated - deltas.length))]];
}
