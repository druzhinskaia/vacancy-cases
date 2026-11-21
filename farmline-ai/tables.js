import { defaults, displayNumber, evaluateRow, summarize, tables } from './table-data.js';

const workbench = document.querySelector('#table-workbench');
const mode = workbench.querySelector('#table-mode');
const filter = workbench.querySelector('#table-flagged');
const toolbar = workbench.querySelector('.table-toolbar');
const options = workbench.querySelector('.table-options');
const description = workbench.querySelector('.table-description');
const metrics = workbench.querySelector('.table-metrics');
const grid = workbench.querySelector('.editable-grid');
const thead = grid.tHead;
const tbody = grid.tBodies[0];
const empty = workbench.querySelector('.table-empty');
const status = workbench.querySelector('.table-announcement');
const addRow = workbench.querySelector('#table-add');
const reset = workbench.querySelector('#table-reset');
const exportButton = workbench.querySelector('#table-csv');
const settings = { ...defaults };
const storageKey = 'farmline-worktables-v1';

const sampleRows = id => tables[id].rows.map(row => tables[id].fields.map((_, index) => row[index] ?? ''));
const rows = Object.fromEntries(Object.keys(tables).map(id => [id, sampleRows(id)]));
const nonnegativeInteger = raw => /^\d+$/.test(String(raw)) && Number.isSafeInteger(Number(raw));

try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  for (const [id, table] of Object.entries(tables)) {
    if (Array.isArray(saved?.rows?.[id]) &&
        saved.rows[id].every(row => Array.isArray(row) && row.length === table.fields.length &&
          row.every(value => typeof value === 'string' || typeof value === 'number'))) {
      rows[id] = saved.rows[id];
    }
  }
  for (const key of Object.keys(settings)) {
    if (nonnegativeInteger(saved?.settings?.[key])) settings[key] = saved.settings[key];
  }
} catch {
  // The tables remain usable when storage is disabled or unavailable.
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ rows, settings }));
  } catch {
    workbench.querySelector('.table-local').textContent = 'Хранение в браузере недоступно. Скачайте CSV, чтобы сохранить данные.';
  }
}

const current = () => mode.value;
function evaluate() {
  return rows[current()].map(row => evaluateRow(current(), row, settings));
}

function populate() {
  const id = current();
  const table = tables[id];
  description.textContent = table.description;
  options.hidden = id !== 'stock';
  reset.textContent = id === 'custom' ? 'Очистить таблицу' : 'Вернуть пример';
  grid.caption.textContent = table.title;
  const headings = [...table.fields.map(field => field.label), ...table.results, 'Действие'];
  const header = document.createElement('tr');
  for (const label of headings) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    header.append(cell);
  }
  thead.replaceChildren(header);
  tbody.replaceChildren(...rows[id].map((row, rowIndex) => buildRow(row, rowIndex, table.fields)));
  update();
}

function buildRow(row, rowIndex, fields) {
  const tr = document.createElement('tr');
  fields.forEach((field, columnIndex) => {
    const input = document.createElement('input');
    input.type = field.type;
    input.value = row[columnIndex];
    input.setAttribute('aria-label', `${field.label}, строка ${rowIndex + 1}`);
    if (field.type === 'number') {
      if (field.min !== undefined) input.min = field.min;
      input.step = field.step;
      input.inputMode = field.step === '1' ? 'numeric' : 'decimal';
    } else {
      input.maxLength = 160;
    }
    input.addEventListener('input', () => {
      rows[current()][rowIndex][columnIndex] = input.value;
      update();
      save();
    });
    const cell = tr.insertCell();
    cell.append(input);
  });
  tr.insertCell();
  tr.insertCell();
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = 'Удалить';
  remove.setAttribute('aria-label', `Удалить строку ${rowIndex + 1}`);
  remove.addEventListener('click', () => {
    rows[current()].splice(rowIndex, 1);
    save();
    populate();
    const visibleRows = [...tbody.rows].filter(item => !item.hidden);
    (visibleRows[Math.min(rowIndex, visibleRows.length - 1)]?.querySelector('button') ?? addRow).focus();
    status.textContent = 'Строка удалена.';
  });
  tr.insertCell().append(remove);
  return tr;
}

function update() {
  const results = evaluate();
  const offset = tables[current()].fields.length;
  const focusedRow = document.activeElement?.closest('tr');
  let visible = 0;
  results.forEach((result, index) => {
    const row = tbody.rows[index];
    row.classList.toggle('table-flagged', result.flagged);
    row.hidden = filter.checked && !result.flagged && row !== focusedRow;
    if (!row.hidden) visible += 1;
    row.cells[offset].textContent = displayNumber(result.values[0]);
    row.cells[offset + 1].textContent = result.values[1];
  });
  empty.hidden = visible > 0;
  empty.textContent = filter.checked && results.length ? 'Строк с отметкой нет.' : 'Добавьте строку, чтобы начать.';
  metrics.replaceChildren(...summarize(current(), results).map(([label, value]) => {
    const item = document.createElement('div');
    const name = document.createElement('dt');
    const amount = document.createElement('dd');
    name.textContent = label;
    amount.textContent = value;
    item.append(name, amount);
    return item;
  }));
}

function csvCell(value) {
  if (typeof value === 'number') return String(value).replace('.', ',');
  const text = String(value ?? '');
  const safe = /^[\s]*[=+\-@]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}

function exportCsv() {
  const table = tables[current()];
  const results = evaluate();
  const header = [...table.fields.map(field => field.label), ...table.results];
  const data = rows[current()].map((row, index) => [
    ...row.map((value, column) => table.fields[column].type === 'number' && value !== '' && Number.isFinite(Number(value)) ? Number(value) : value),
    ...results[index].values
  ]);
  const csv = [header, ...data].map(row => row.map(csvCell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `farmline-${current()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

mode.addEventListener('change', () => {
  filter.checked = false;
  populate();
});
filter.addEventListener('change', update);
tbody.addEventListener('focusout', () => requestAnimationFrame(update));
addRow.addEventListener('click', () => {
  rows[current()].push(tables[current()].fields.map(() => ''));
  filter.checked = false;
  save();
  populate();
  tbody.lastElementChild.querySelector('input').focus();
  status.textContent = 'Строка добавлена.';
});
reset.addEventListener('click', () => {
  const custom = current() === 'custom';
  if (!window.confirm(custom ? 'Очистить свою таблицу?' : 'Заменить текущие строки учебным примером?')) return;
  rows[current()] = sampleRows(current());
  if (current() === 'stock') {
    Object.assign(settings, defaults);
    for (const input of options.querySelectorAll('input')) input.value = settings[input.name];
  }
  filter.checked = false;
  save();
  populate();
  status.textContent = custom ? 'Таблица очищена.' : 'Учебный пример восстановлен.';
});
for (const input of options.querySelectorAll('input')) {
  input.value = settings[input.name];
  input.addEventListener('input', () => {
    if (!nonnegativeInteger(input.value)) return;
    settings[input.name] = Number(input.value);
    update();
    save();
  });
  input.addEventListener('blur', () => { input.value = settings[input.name]; });
}
exportButton.addEventListener('click', exportCsv);
toolbar.hidden = false;
workbench.querySelector('.table-interactive').hidden = false;
populate();
